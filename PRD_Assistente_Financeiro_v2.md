# PRD — Assistente Financeiro Inteligente com WhatsApp

**Versão:** 2.1
**Última atualização:** Abril 2026
**Status:** Draft

---

## 1. Visão do Produto

Criar uma plataforma de controle financeiro pessoal com input conversacional via WhatsApp, que permita ao usuário registrar gastos de forma natural e receba orientação financeira inteligente em tempo real.

O produto resolve o maior problema do controle financeiro pessoal: **o atrito no registro**. Ao encontrar o usuário onde ele já está (WhatsApp), eliminamos a barreira de abrir um app dedicado e transformamos o registro de gastos em algo tão simples quanto mandar uma mensagem.

---

## 2. Problema

Apps de finanças pessoais têm alta taxa de abandono porque exigem disciplina constante do usuário. Os principais pontos de dor são:

- **Alto atrito para registrar gastos:** abrir app → navegar → preencher campos → salvar. A maioria desiste na segunda semana.
- **Experiência passiva:** o app espera o usuário ir até ele, em vez de ir até o usuário.
- **Falta de clareza sobre padrões:** dados existem, mas faltam insights acionáveis e no momento certo.
- **Processo manual e repetitivo:** consultar extratos, categorizar, somar — trabalho que deveria ser automatizado.

---

## 3. Persona Principal

**João, 28 anos — Analista de Marketing em São Paulo**

- Renda: R$ 5.500/mês
- Usa 2 cartões de crédito (Nubank e C6)
- Já tentou planilha, Mobills e Organizze — abandonou todos em menos de 1 mês
- Gasta mais do que deveria em delivery e saídas, mas não tem clareza de quanto
- Usa WhatsApp 3+ horas por dia
- Quer controlar gastos, mas não quer "trabalhar" pra isso

**Frase-chave:** _"Eu sei que gasto demais, mas não tenho paciência pra ficar anotando tudo."_

---

## 4. Público-Alvo

- Pessoas de 22-40 anos com renda de R$ 3.000-15.000
- Usuários de cartão de crédito que perdem o controle da fatura
- Pessoas que já tentaram apps de finanças e abandonaram
- Early adopters que valorizam automação e praticidade

**Tamanho estimado do mercado:** ~50 milhões de brasileiros usam apps de banco digital e têm WhatsApp ativo.

---

## 5. Objetivos e Métricas de Sucesso

| Objetivo | Métrica | Meta (3 meses) |
|---|---|---|
| Reduzir atrito no registro | Transações registradas via WhatsApp / total | > 60% |
| Engajamento sustentável | Retenção D30 | > 40% |
| Cobertura de gastos | % dos gastos reais registrados (auto-report) | > 70% |
| Satisfação | NPS | > 50 |
| Validação do modelo | Usuários pagantes (pós-trial) | > 5% da base |

---

## 6. Funcionalidades

### Fase 1 — MVP (Semanas 1-6)

O MVP valida a hipótese central: **as pessoas registram gastos com mais consistência quando podem fazê-lo via WhatsApp.**

#### 6.1 Autenticação
- Login com e-mail/senha via NextAuth
- Sessão segura com JWT

#### 6.2 Registro de Transações via WhatsApp
O coração do produto. O usuário envia uma mensagem de texto e o sistema cria a transação automaticamente.

**Mensagens suportadas no MVP:**

| Mensagem do usuário | Interpretação |
|---|---|
| "Gastei 50 no mercado" | Saída, R$ 50, categoria: Alimentação |
| "Almocei 32 reais" | Saída, R$ 32, categoria: Alimentação |
| "Uber 18,50" | Saída, R$ 18,50, categoria: Transporte |
| "Recebi 5500 de salário" | Entrada, R$ 5.500, categoria: Salário |
| "Paguei 120 de luz" | Saída, R$ 120, categoria: Moradia |

**Critérios de aceitação:**
- O sistema deve identificar corretamente valor, tipo (entrada/saída) e categoria em > 85% dos casos com mensagens simples.
- Quando não tiver certeza, o sistema pergunta ao usuário antes de registrar: _"Entendi: R$ 50 em Alimentação. Confirma?"_
- Se não conseguir interpretar, responde: _"Não entendi. Pode reformular? Ex: 'Gastei 50 no mercado'"_
- Tempo de resposta < 5 segundos.
- Cada transação registrada gera confirmação com resumo.

**Fora do escopo do MVP:** áudios, imagens de comprovantes, parcelamento, múltiplas transações em uma mensagem.

#### 6.3 Painel de Transações (Web)
- Lista de transações com filtros (período, categoria, tipo)
- Edição e exclusão manual
- Totalizadores: entradas, saídas, saldo do mês
- Registro manual via formulário simples (fallback)

**Critérios de aceitação:**
- A lista atualiza em tempo real após registro via WhatsApp (polling de 30s ou WebSocket).
- Filtros funcionam combinados (ex: "Alimentação" + "Março 2026").

#### 6.4 Categorias
Categorias pré-definidas no MVP (sem customização):

Alimentação, Transporte, Moradia, Saúde, Lazer, Educação, Compras, Salário, Freelance, Outros.

---

### Fase 2 — Dashboard e WhatsApp Avançado (Semanas 7-10)

#### 6.5 Dashboard Financeiro
- Saldo atual (entradas - saídas)
- Gastos do mês por categoria (gráfico de pizza/barras)
- Evolução mensal (gráfico de linha)
- Top 3 categorias de gasto

#### 6.6 WhatsApp — Funcionalidades Avançadas
- Consultas: _"Quanto gastei esse mês?"_, _"Quanto gastei com delivery?"_
- Correções: _"Cancela o último gasto"_, _"O último era 45, não 50"_
- Parcelamento: _"Comprei um tênis de 300 em 3x no Nubank"_ → gera 3 transações de R$ 100

#### 6.7 Cartões e Faturas
- Cadastro de cartões (nome, bandeira, limite, dia de fechamento)
- Visualização de fatura por cartão
- Associação de transações a cartões

---

### Fase 3 — Inteligência (Semanas 11-14)

#### 6.8 Agente de IA (Chat no App)
- Chat embutido no app (bubble flutuante)
- Integração com AI SDK (Vercel)
- Acesso ao contexto financeiro completo do usuário

**Exemplos de interação:**
- _"Estou gastando muito?"_ → análise comparativa com meses anteriores
- _"Onde posso economizar?"_ → sugestões baseadas em padrões
- _"Consigo guardar 500 esse mês?"_ → projeção com base nos gastos atuais

#### 6.9 Insights e Alertas
- Alertas proativos via WhatsApp: _"Você já gastou 80% do que gastou com delivery o mês inteiro passado, e ainda faltam 12 dias."_
- Resumo semanal automático (domingo à noite)
- Comparativo mensal

---

### Fase 4 — Refinamento e Monetização (Semanas 15-20)

- Importação de fatura via PDF (cartão de crédito)
- Metas financeiras: _"Quero gastar no máximo 800 com alimentação"_
- Score de disciplina financeira
- Onboarding guiado
- Polimento de UX e performance

---

## 7. Funcionalidades Futuras (Backlog)

- Open Finance (integração bancária direta)
- Multi-contas e multi-cartões avançado
- Gamificação (streaks de registro, conquistas)
- Planejamento de orçamento mensal
- Compartilhamento de controle (casais/famílias)
- App mobile nativo

---

## 8. Arquitetura Técnica

### Frontend
- **Next.js 14+** (App Router)
- **TailwindCSS** (estilização)
- **Jotai** (gerenciamento de estado)
- **Zod** (validação de formulários)
- **NextAuth** (autenticação)
- **AI SDK** (chat com IA — Fase 3)

### Backend
- **NestJS** (framework)
- **Prisma ORM** (acesso a dados)
- **PostgreSQL** (banco de dados)

### Integrações
- **WMode Connect** (plataforma própria de conexão WhatsApp, NestJS + Baileys) — API interna com webhooks, filas e anti-ban integrados
- **OpenAI / Anthropic API** (NLP para parsing de mensagens e chat)

> **Nota:** O n8n foi removido da arquitetura. Como a WMode e o backend do LemonFin são ambos NestJS, a comunicação é direta via webhook + chamada HTTP, sem necessidade de orquestrador intermediário.

### Estrutura Backend (DDD)

```
modules/
  transactions/
    controllers/
    use-cases/
    dtos/
    entities/
    repositories/
  users/
  categories/
  cards/
  invoices/
  whatsapp/
    controllers/
    use-cases/     ← parsing de mensagens
    dtos/
```

### Camadas
- **Controller** → entrada HTTP / webhook
- **Use Case** → regra de negócio
- **Repository** → acesso a dados (Prisma)
- **Entity** → modelo de domínio

---

## 9. Fluxo de Dados (WhatsApp)

```
Usuário envia mensagem no WhatsApp
        ↓
WMode Connect recebe via Baileys
        ↓
WMode dispara webhook "message.received"
  (POST para o Backend LemonFin com HMAC signature)
        ↓
Backend LemonFin recebe a mensagem
        ↓
Backend envia texto para LLM (parsing)
        ↓
LLM retorna JSON estruturado:
  { valor: 50, categoria: "alimentação", tipo: "saída" }
        ↓
Backend valida e salva transação
        ↓
Backend chama WMode API: POST /api/v1/messages/send
  { sessionId, to, content: "✅ Registrado: R$ 50,00 em Alimentação" }
        ↓
WMode envia resposta ao usuário via WhatsApp
  (com delay anti-ban e simulação de digitação)
```

### Autenticação entre LemonFin e WMode
- O backend LemonFin se autentica na WMode via API Key (header `X-Api-Key`)
- Os webhooks da WMode são verificados via HMAC SHA256 (header `X-Webhook-Signature`)

---

## 10. Regras de Negócio

- Toda transação deve ter: valor, categoria, tipo e data.
- Se a IA não tiver confiança > 80% na interpretação, deve pedir confirmação ao usuário.
- Parcelamentos geram N transações individuais com datas futuras.
- O saldo é calculado em tempo real (entradas - saídas).
- Categorias são fixas no MVP; customizáveis a partir da Fase 4.
- Um usuário só acessa suas próprias transações (isolamento por tenant).
- Mensagens não reconhecidas são logadas para análise e melhoria do modelo.

---

## 11. Monetização (Hipótese Inicial)

**Modelo: Freemium com assinatura mensal**

| | Gratuito | Premium (R$ 14,90/mês) |
|---|---|---|
| Transações via WhatsApp | 30/mês | Ilimitadas |
| Dashboard básico | ✅ | ✅ |
| Gráficos e insights | Limitado | Completo |
| Agente de IA (chat) | 5 msgs/mês | Ilimitado |
| Alertas proativos | ❌ | ✅ |
| Importação de fatura PDF | ❌ | ✅ |
| Resumo semanal | ❌ | ✅ |

**Validação:** os primeiros 500 usuários terão acesso completo gratuito por 90 dias. A conversão para pagante será a métrica principal de product-market fit.

---

## 12. Diferenciais Competitivos

| App | Registro fácil | IA ativa | WhatsApp | Insights |
|---|---|---|---|---|
| Mobills | ❌ Manual | ❌ | ❌ | Básico |
| Organizze | ❌ Manual | ❌ | ❌ | Básico |
| Guiabolso | Open Finance | ❌ | ❌ | Médio |
| **Este produto** | **WhatsApp** | **✅** | **✅** | **Inteligente** |

O diferencial principal não é o dashboard — é o **canal de entrada** (WhatsApp) combinado com **IA proativa** que vai até o usuário.

---

## 13. Riscos e Mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|---|---|---|---|
| Parsing incorreto de mensagens | Alto | Média | Confirmação obrigatória quando confiança < 80%. Log de erros para retreino. Fallback para formulário manual. |
| Ban do número WhatsApp (API não oficial) | Alto | Média | Anti-ban integrado na WMode (delay 5-15s, simulação de digitação, presence modes). Manter número reserva pronto. Ter Telegram como canal alternativo no backlog. |
| Instabilidade da conexão WMode | Médio | Baixa | Health check a cada 30s com reconexão automática (exponential backoff). Monitoramento via métricas e BullBoard. |
| Custo de API de IA por usuário | Médio | Alta | Usar modelos menores (Haiku/GPT-4o-mini) para parsing. Cache de padrões comuns. Limitar uso no plano gratuito. |
| Segurança de dados financeiros | Crítico | Baixa | Criptografia em trânsito e em repouso. Isolamento por tenant. Não armazenar dados bancários reais no MVP. |
| Baixa retenção após 30 dias | Alto | Média | Alertas proativos, resumo semanal, gamificação (backlog). Medir e iterar agressivamente. |

---

## 14. Roadmap Visual

```
Semana  1-6   ██████████████████  Fase 1: MVP
                                   Auth + WhatsApp básico + Lista de transações

Semana  7-10  ████████████        Fase 2: Dashboard + WhatsApp avançado
                                   Gráficos + Consultas + Cartões

Semana 11-14  ████████████        Fase 3: Inteligência
                                   Chat IA + Insights + Alertas

Semana 15-20  ██████████████████  Fase 4: Monetização
                                   PDF import + Metas + Polimento + Lançamento
```

---

## 15. Critérios de Go/No-Go por Fase

| Transição | Critério para avançar |
|---|---|
| Fase 1 → 2 | ≥ 50 usuários beta ativos, ≥ 85% de acurácia no parsing, feedback qualitativo positivo |
| Fase 2 → 3 | Retenção D14 ≥ 30%, ≥ 200 transações/semana na base |
| Fase 3 → 4 | Retenção D30 ≥ 25%, NPS ≥ 40, demanda qualitativa por features premium |
