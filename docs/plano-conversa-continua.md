# Plano — Conversa contínua no WhatsApp (referências ao histórico + refazer/excluir a última ação)

**Problema:** o parser trata cada mensagem como comando isolado e o "desfazer"
só conhece **uma** transação. Falhas observadas (prints de 14/06):

1. *"Pode fazer separado? Criar duas transações **e excluir essa que criou**"* →
   o bot ignorou o "excluir essa que criou" (o parcelamento original ficou),
   e ainda registrou parcial → **duplicação**.
2. *"Pode fazer separado? Criar duas transações"* (sem valor) → respondeu
   *"não entendi"* em vez de usar o histórico pra saber que se referia às blusas.
3. *"...139 cada uma no Bradesco **em 4x** crie duas transações"* → criou 2
   transações simples de R$139, **perdeu o "em 4x"** (deveria ser 2 parcelamentos).

**Raiz comum:** faltam duas capacidades —
(A) resolver referências ao histórico quando a mensagem não traz dados próprios;
(B) operar sobre a **última ação inteira** (N transações: parcelamento/batch),
não só a última transação única.

---

## Visão geral da solução

Introduzir o conceito de **"última ação"** (`lastAction`) persistido na conversa,
e uma intenção **`redo`** que refaz essa ação com ajustes (separar, parcelar,
trocar valor/cartão), **substituindo** o que foi criado (exclui o antigo + cria o
novo, atômico). Além disso, `cancel` passa a apagar a ação inteira.

---

## 1. Persistir a "última ação" — `ConversationState.lastAction`

**Schema** (`prisma/schema.prisma`) — coluna nullable, sem dado destrutivo:

```prisma
model ConversationState {
  phone      String   @id
  pending    Json?
  history    Json     @default("[]")
  lastAction Json?    @map("last_action") // NOVO
  updatedAt  DateTime @updatedAt @map("updated_at")
  @@map("conversation_states")
}
```

**Migration:** `ALTER TABLE conversation_states ADD COLUMN last_action JSONB;`

**Shape do `lastAction`** (em `conversation.repository.ts`, união discriminada):

```ts
type LastAction =
  | { kind: 'transaction'; transactionIds: string[]; data: {...} }
  | { kind: 'installment'; installmentGroupId: string; transactionIds: string[];
      data: { amount; installments; description; categorySlug; cardName? } }
  | { kind: 'batch'; transactionIds: string[]; installmentGroupIds: string[];
      items: BatchItem[] };
```

Guarda os **ids** criados (para excluir tudo depois) e os **dados de origem**
(para refazer com ajuste sem perder atributos como "em 4x" ou o cartão).

**Onde gravar:** ao final de `handleTransaction`, `handleInstallment`,
`handleBatch` (sucesso), gravar `lastAction` via
`conversation.setLastAction(phoneKey, ...)`. Os handlers já recebem `phoneKey`
(adicionado na correção anterior). Os ids vêm do retorno de
`transactionsRepository.create()` (hoje o retorno é descartado nos loops —
passamos a coletar).

Métodos novos no `ConversationRepository`:
- `setLastAction(phone, action | null)`
- `getLastAction(phone): Promise<LastAction | null>`

---

## 2. Nova intenção `redo` no parser — `message-parser.service.ts`

Para mensagens que **referenciam a última ação** e pedem para refazê-la de outro
jeito, sem necessariamente trazer valores novos:

- "faz separado" / "cria duas transações" / "divide isso em dois"
- "na verdade era em 4x" / "parcela em 3x"
- "refaz isso no Nubank"

**Saída:**
```ts
| { intent: 'redo'; adjust: {
      split?: boolean;          // separar um item agregado em N
      installments?: number;    // (re)parcelar em N vezes
      cardName?: string | null; // trocar/remover cartão
    } }
```

**Desambiguação a adicionar no prompt:**
- `redo` SÓ quando a mensagem se refere a algo **já registrado** (referência ao
  passado: "essa que criou", "isso", "o anterior") E pede mudança de forma.
- Se a mensagem traz um gasto NOVO completo com valor → continua `transaction`/
  `installment`/`batch` normal (não é redo).
- "exclui essa que criou" sem recriar → mapeia para `cancel` (que agora apaga a
  ação inteira — ver §4), não `redo`.

> Nota de altitude: hoje frases sem valor caem em `advice`/`unknown`. O `redo`
> dá um caminho estruturado em vez de depender do assessor de chat.

---

## 3. `handleRedo` no service — substituição atômica

```
1. lastAction = getLastAction(phoneKey); se vazio → "não achei o que refazer".
2. Excluir tudo da ação anterior:
   - transactionIds via deleteMany escopado por userIds
   - (ou deleteByInstallmentGroup quando houver grupo)
3. Recriar aplicando o adjust:
   - split=true  → quebra o agregado ("duas blusas" R$278) em N itens
   - installments=K → cada item vira parcelamento de K (reusa createInstallments)
   - cardName → resolve/zera cartão
4. Atualizar lastAction com os NOVOS ids.
5. Responder confirmando o que mudou ("Refiz como 2 parcelamentos de 4x …").
```

**Atomicidade:** envolver exclusão+criação num `prisma.$transaction([...])` para
não deixar estado parcial se algo falhar no meio.

**Ponto sensível — `split`:** "duas blusas de 139 cada" agregadas exigem saber o
valor unitário. Se `lastAction.data` guardou o total sem o detalhamento por item,
o split fica ambíguo. Mitigação: quando o usuário disser o valor unitário na
própria mensagem de redo ("139 cada"), usar isso; senão, dividir igualmente pelo
número pedido e **confirmar** antes (reusa o fluxo de `pending`).

---

## 4. `cancel` apaga a ação inteira (não só a última transação)

`handleCancel` hoje faz `findLastByUser` → deleta **1** registro. Passa a:
- ler `lastAction`; se for `installment`/`batch`, deletar **todos** os
  `transactionIds`/grupos;
- fallback para `findLastByUser` quando não há `lastAction` (mensagens antigas).

Isso conserta "cancela" logo após um parcelamento (hoje sobra 3 de 4).

---

## Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `prisma/schema.prisma` + migration | coluna `last_action JSONB` |
| `conversation.repository.ts` | tipo `LastAction`, `get/setLastAction` |
| `message-parser.service.ts` | intenção `redo` + desambiguação no prompt |
| `whatsapp.service.ts` | gravar `lastAction` nos 3 handlers; `handleRedo`; `cancel` em grupo; coletar ids dos `create()` |
| `message-parser.service.spec.ts` | testes da intenção `redo` |
| (novo) teste de `handleRedo`/cancel-em-grupo | cobertura do service |

---

## Riscos / decisões em aberto

1. **Confiabilidade do `redo` no gpt-4o-mini** — distinguir "refaz o anterior" de
   "novo gasto" é sutil. Mitigação: `redo` exige marcador de referência ao
   passado; na dúvida, pedir confirmação curta antes de excluir/recriar
   (destrutivo). **Nunca** excluir sem ter certeza da referência.
2. **Split de itens agregados** — ver §3; pode exigir confirmação.
3. **Janela do histórico** — `lastAction` é independente do `history` (4 trocas);
   sobrevive enquanto for a última ação, então "exclui o que criou" funciona
   mesmo algumas mensagens depois.
4. **Escopo de tempo** — `lastAction` deve expirar? Sugestão: válido só enquanto
   for de fato a última ação; qualquer nova ação o sobrescreve. Sem TTL explícito.

---

## Sequência de implementação sugerida

1. Schema + migration + `get/setLastAction` (fundação).
2. Gravar `lastAction` nos 3 handlers (coletar ids dos creates).
3. `cancel` em grupo (ganho rápido, baixo risco).
4. Intenção `redo` no parser + testes.
5. `handleRedo` com substituição atômica + confirmação no split.
6. Testes de service e validação ponta a ponta.
