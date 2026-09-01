# Plano — Memória de conversa no WhatsApp

**Data:** 2026-09-01
**Problema relatado:** "converso com o Lemon no WhatsApp e ele não sabe o que eu já falei."

---

## Diagnóstico

O LemonFin **já tem** as três camadas de memória (contexto da sessão, memória de
longo prazo, recuperação de dados relevantes). O motor é o `ChatCompletionUseCase`,
compartilhado entre chat web e WhatsApp. O problema não é falta de arquitetura —
é **retenção curta demais e cobertura parcial** no canal WhatsApp.

### As três camadas, hoje

| Camada | Chat web | WhatsApp |
|---|---|---|
| 1. Contexto da conversa | até 50 turnos, texto íntegro (o front manda) | **4 trocas**, truncadas em **160 chars** |
| 2. Memória de longo prazo (`AdvisorMemory`) | 30 fatos, tools `rememberFact`/`forgetFact` | existe, mas **só no intent `advice`** |
| 3. Contexto financeiro + tools | sempre | **só no intent `advice`** |

### Causas concretas

**C1 — Janela de contexto minúscula.**
`conversation.repository.ts:104-105`:
```ts
const MAX_HISTORY = 4; // últimas 4 trocas
const MAX_TEXT = 160;  // trunca cada texto
```
4 trocas ≈ 2 idas e voltas. Na 3ª mensagem o que você disse já saiu da janela.
E 160 chars corta a resposta do bot no meio — o modelo lê o próprio turno anterior
mutilado, o que degrada a continuidade ainda mais que o esquecimento puro.

**C2 — `slice(-10)` é código morto.**
`whatsapp.service.ts:1732` pede os últimos 10 turnos ao montar o prompt do
assessor, mas o repositório nunca devolve mais que 4. Dá a impressão, ao ler o
código, de que a memória é maior do que é.

**C3 — Memória só existe num dos 16 intents.**
O roteamento (`whatsapp.service.ts:310-372`) tem 16 casos. Só o `case 'advice'`
chama `handleAdvisor` → `ChatCompletionUseCase` (o motor com `AdvisorMemory` +
contexto financeiro + tools). Todos os outros — `transaction`, `query`, `cancel`,
`correction`, `installment`, `recurring`, `batch`, … — respondem por caminho
determinístico, sem nunca ler nem escrever memória de longo prazo.

Consequência prática: se você contou um objetivo enquanto registrava uma despesa,
esse fato **nunca** é salvo. E o `AdvisorMemory` só cresce nas conversas de
conselho — que são a minoria das mensagens.

**C4 — Qualidade do que é gravado.**
Vários handlers gravam placeholders opacos no lugar do que foi dito:
- `whatsapp.service.ts:157` → `'[dei as boas-vindas e mostrei exemplos]'`
- `whatsapp.service.ts:268` → `'[enviei a lista do que sei fazer]'`
- `whatsapp.service.ts:675` → `'Registrado: R$ 50 em Alimentação'` (perde a descrição)

Então mesmo as 4 trocas que sobrevivem carregam pouca informação real.

**C5 — Nenhum resumo, nada além da janela.**
Não existe compactação. O que sai da janela de 4 é perdido para sempre; não vira
resumo nem fato. É a diferença entre "histórico" e "memória" — hoje o WhatsApp
só tem histórico, e curto.

---

## Plano

Quatro fases, em ordem de custo/benefício. **A Fase 1 sozinha resolve a maior
parte da queixa** e é de baixo risco.

### Fase 1 — Alargar a janela de contexto (impacto alto, risco baixo)

Um PR pequeno, quase todo em `conversation.repository.ts`.

1. `MAX_HISTORY: 4 → 20` (10 idas e voltas — cobre uma conversa real).
2. `MAX_TEXT: 160 → 600` (a resposta do bot deixa de ser cortada no meio).
3. Alinhar `handleAdvisor` para consumir o que existe de fato (remover ou ajustar
   o `slice(-10)` de `whatsapp.service.ts:1732`).
4. **TTL de sessão de conversa:** hoje o histórico não expira. Com uma janela de
   20, uma conversa de ontem contamina a de hoje. Sugestão: descartar turnos com
   mais de ~6h, no mesmo padrão de `isFresh()` que `pending`/`lastAction` já usam.

**Custo de token:** 20 turnos × 600 chars ≈ 3k tokens por chamada — só no intent
`advice`, que é onde há chamada de IA cara. Nos outros intents o histórico vai ao
parser, que é um modelo barato. Aceitável, mas vale medir via `AiUsage`.

**Cuidado:** o `history` é `Json` numa linha única de `conversation_states`. 20
entradas de 600 chars ≈ 12KB por usuário. Sem problema para Postgres, mas é
leitura/escrita da linha inteira a cada mensagem — vale confirmar que não vira
gargalo com volume.

### Fase 2 — Memória de longo prazo em todos os intents (impacto alto)

O `AdvisorMemory` só é alimentado no `advice`. Duas opções:

**2a (recomendada, barata):** extrair fatos em background. Após responder — em
qualquer intent —, se a mensagem do usuário tiver sinal de fato estável
(objetivo, contexto de vida, preferência), rodar uma extração barata assíncrona e
chamar `advisorMemories.remember()`. Não bloqueia a resposta, não muda o
roteamento.

**2b:** injetar o bloco de memórias no prompt do `message-parser` também, para o
parser entender referências ("aquele mercado de sempre"). Mais caro: infla todo
parse. Avaliar depois da 2a.

Também vale **expor o bloco de memórias no `handleQuery`**, para consultas
saírem mais personalizadas.

### Fase 3 — Resumo progressivo (impacto médio)

Quando a conversa passar de N turnos, resumir os mais antigos em 1-2 frases e
guardar como `summary` no `ConversationState` (campo novo), em vez de descartar.
O prompt passa a receber `resumo + últimos N turnos` — o padrão clássico de
janela deslizante com sumarização. Só faz sentido depois da Fase 1 estar medida.

### Fase 4 — Controle do usuário (impacto médio, muito visível)

Hoje só o modelo decide o que lembrar. Faltam comandos diretos:
- `"lembra que eu quero quitar o cartão até dezembro"` → `rememberFact` determinístico
- `"o que você sabe sobre mim?"` → lista os fatos salvos
- `"esquece que eu ..."` / `"esquece tudo"` → `forgetFact`

Isso é o que mais gera percepção de memória, porque o usuário vê o efeito na hora.
Combina com uma tela no web para revisar/apagar fatos (LGPD: são dados pessoais
inferidos, e o usuário precisa poder ver e apagar).

---

## Sugestão de execução

| Fase | Esforço | Impacto na queixa | Status |
|---|---|---|---|
| 1 — janela + TTL | ~1 PR pequeno | **alto** — resolve o núcleo | ✅ feito |
| 4 — comandos de memória | ~1 PR médio | alto (percepção) | ✅ feito |
| 2a — memória em todos os intents | ~1 PR médio | alto | ✅ feito |
| 3 — resumo progressivo | ~1 PR maior | médio | pendente |
| 2b — memória no parser | avaliar | baixo/médio | pendente |

### Correções ao diagnóstico original (durante a implementação)

- **Causa 4 estava errada.** Os placeholders opacos (`[registrei 3 lançamentos]`)
  são defesa DELIBERADA contra o parser re-extrair transações antigas do
  histórico (regras 1-3 do bloco CONTEXTO em `message-parser.service.ts`).
  Trocá-los por texto rico reintroduziria duplicação de lançamentos. Mantidos.
- **A Fase 4 era menor do que parecia.** O system prompt do assessor já instruía
  salvar/esquecer/listar e as tools já existiam — faltava só o ROTEAMENTO das
  frases até o motor, e desambiguar "esquece" (memória) de "esquece" (cancelar
  lançamento).

### Decisões de privacidade da Fase 2a

A extração passiva salva fatos que o usuário NÃO pediu para guardar. Duas
salvaguardas, decididas com o Lucas:
1. **Aviso discreto** após salvar (`_📝 Anotei: <fato>_` + uma linha dizendo que
   basta falar "esquece isso") — a pessoa vê o que foi guardado no
   momento em que acontece e pode desfazer na hora.
2. **Filtro heurístico local** (`hasFactSignal`, sem IA) antes da extração — a
   maioria das mensagens ("gastei 50 no mercado") nunca chega à IA. Segura o
   custo E reduz a superfície de coleta.

Além disso: o prompt de extração proíbe explicitamente salvar dados sensíveis
(saúde, religião, política, orientação sexual, origem racial) e fatos sobre
terceiros; e `forgetAll` NÃO é tool do modelo — só o comando confirmado apaga
em massa.

Ordem recomendada: **1 → 4 → 2a → 3**, medindo custo de token via `AiUsage` entre
cada uma. A Fase 4 sobe antes da 2a porque o ganho percebido é imediato e o
esforço é comparável.

---

## Riscos

- **Custo de IA:** janela maior = prompt maior a cada `advice`. Monitorar `AiUsage`.
- **Contaminação entre sessões:** sem o TTL da Fase 1.4, conversas antigas
  vazam para novas. O TTL não é opcional se a janela crescer.
- **Privacidade:** a Fase 2a passa a salvar fatos sem o usuário pedir
  explicitamente. A Fase 4 (ver/apagar) deveria vir junto ou antes, não depois.
- **Qualidade do histórico (C4):** alargar a janela sem melhorar o que é gravado
  entrega 20 placeholders em vez de 4. Vale corrigir as entradas opacas junto da
  Fase 1.
