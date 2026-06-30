import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiFeature } from '@prisma/client';
import OpenAI from 'openai';
import { AiUsageService } from '../../ai-usage/ai-usage.service';

export interface ParsedTransaction {
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  categorySlug: string;
  // Confiança da IA na categoria (0 a 1). Quando baixa, o bot confirma.
  categoryConfidence: number;
  description: string;
  cardName?: string;
  // Data da transação, ISO 'YYYY-MM-DD...'. Só quando o usuário menciona
  // ("ontem", "anteontem", "dia 5", "semana passada"). Aceita passado (registro
  // retroativo); o validador descarta datas inválidas/no futuro. Ausente = hoje.
  purchaseDate?: string;
}

export interface ParsedInstallment {
  amount: number;
  installments: number;
  description: string;
  categorySlug: string;
  cardName?: string;
  // Data da compra (= 1ª parcela), ISO 'YYYY-MM-DD'. Só quando o usuário
  // menciona ("mês passado", "dia 5", "ontem"). Aceita passado (compra
  // retroativa); o validador descarta datas inválidas/no futuro. Ausente = hoje.
  purchaseDate?: string;
}

export interface ParsedRecurring {
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  dayOfMonth: number;
  description: string;
  categorySlug: string;
  cardName?: string;
}

export interface ParsedReserve {
  name: string;
  targetAmount: number;
  deadline: string; // ISO 'YYYY-MM-DD...'; sempre futura (validador garante)
}

export interface ParsedGoal {
  categorySlug: string;
  amount: number; // teto de gasto
  period: 'MONTHLY' | 'WEEKLY';
}

// Um item de um lote (várias transações/contas numa só mensagem). Cada item é
// processado individualmente pelos mesmos handlers do fluxo de item único.
export type BatchItem =
  | { intent: 'transaction'; data: ParsedTransaction }
  | { intent: 'installment'; data: ParsedInstallment }
  | { intent: 'recurring'; data: ParsedRecurring };

// Item que o modelo identificou mas não conseguiu estruturar (ex.: valor
// variável "água varia entre 80 e 90"). Vira aviso ao usuário, nunca registro.
export interface SkippedItem {
  description: string;
  reason: string;
}

export type ParseResult =
  | { intent: 'transaction'; data: ParsedTransaction }
  | {
      intent: 'query';
      queryType:
        | 'summary'
        | 'expenses'
        | 'income'
        | 'balance'
        | 'forecast'
        | 'budget'
        | 'reserves'
        | 'recurring'
        | 'category'
        | 'card'
        // última transação registrada (mais recente)
        | 'last_transaction'
        // transação de maior valor (mais cara) do mês
        | 'top_transaction';
      // Só presente quando queryType === 'card'. "cartao" = genérico (sem nome).
      cardName?: string;
      // Só presente quando queryType === 'category'. Slug da categoria perguntada.
      categorySlug?: string;
    }
  | { intent: 'cancel' }
  | { intent: 'correction'; newAmount: number }
  // Corrige o cartão da última transação. null = remover vínculo; string = trocar.
  | { intent: 'correction_card'; cardName: string | null }
  | { intent: 'installment'; data: ParsedInstallment }
  | { intent: 'recurring'; data: ParsedRecurring }
  | { intent: 'reserve_create'; data: ParsedReserve }
  | { intent: 'reserve_contribution'; amount: number }
  // Registrar o pagamento da fatura de um cartão. cardName: nome do cartão na
  // mensagem, "cartao" se genérico, ou null. amount: valor pago se mencionado
  // (senão usa o total da fatura aberta).
  | { intent: 'pay_invoice'; cardName: string | null; amount: number | null }
  | { intent: 'goal_create'; data: ParsedGoal }
  | { intent: 'batch'; items: BatchItem[]; skipped: SkippedItem[] }
  // Refaz a ÚLTIMA AÇÃO de outro jeito: o bot exclui o que registrou por último
  // e recria com o ajuste. Sempre referencia algo JÁ registrado.
  // - installments: (re)parcelar a mesma compra em N vezes (reusa valor total,
  //   categoria, descrição e cartão da ação anterior).
  // - items: separar/refazer com itens explícitos que o usuário forneceu (com
  //   valores). Cada item segue o formato de transaction/installment.
  // - cardName: trocar/remover o cartão ao refazer.
  // Pelo menos um ajuste é obrigatório (o validador garante).
  | {
      intent: 'redo';
      adjust: {
        installments?: number;
        items?: BatchItem[];
        cardName?: string | null;
      };
    }
  // Pergunta aberta de assessoria, dica, small talk ou qualquer coisa que não
  // seja um comando estruturado. O texto original é repassado ao motor de chat
  // (assessor financeiro com acesso aos dados do usuário).
  | { intent: 'advice' }
  | { intent: 'unknown'; message: string };

// Categorias de SISTEMA com palavras-chave ricas para a classificação. São
// fixas (não incluem "reservas", que é tratada por reserve_*). As categorias
// personalizadas do usuário entram dinamicamente via buildCategoryList.
const SYSTEM_CATEGORY_LINES = [
  '- alimentacao: supermercado, restaurante, lanche, padaria, café, delivery, ifood',
  '- transporte: gasolina, uber, ônibus, estacionamento, pedágio, mecânico',
  '- moradia: aluguel, condomínio, luz, água, gás, internet, manutenção',
  '- saude: farmácia, consulta, plano de saúde, academia, dentista',
  '- lazer: cinema, streaming, jogos, viagem, bar, festa, hobby',
  '- educacao: curso, livro, faculdade, escola, material escolar',
  '- compras: roupa, eletrônico, presente, móveis, decoração',
  '- salario: salário mensal, adiantamento, 13º, férias',
  '- freelance: trabalho freelance, projeto, consultoria',
];
const OUTROS_LINE = '- outros: quando não se encaixa em nenhuma categoria';

// Categorias personalizadas vão ANTES de "outros" (catch-all) para terem
// prioridade na escolha do modelo. Exportada para o fluxo de imagem
// (receipt-extraction) usar exatamente o mesmo mapa de categorias.
export function buildCategoryList(
  custom: { slug: string; name: string }[],
): string {
  const lines = [...SYSTEM_CATEGORY_LINES];
  for (const c of custom) {
    lines.push(`- ${c.slug}: ${c.name} (categoria personalizada do usuário)`);
  }
  lines.push(OUTROS_LINE);
  return lines.join('\n');
}

function buildSystemPrompt(
  custom: { slug: string; name: string }[],
  today: string,
): string {
  return `Você é o LemonFin, um assistente financeiro inteligente via WhatsApp. Você ajuda usuários a registrar transações, consultar gastos e dar dicas financeiras.

Hoje é ${today}. Use esta data como referência para resolver expressões de tempo relativas ("mês passado", "ontem", "dia 5", "até dezembro").

Analise a mensagem do usuário e identifique a INTENÇÃO. Responda APENAS com JSON válido (sem markdown, sem backticks, sem explicações).

## INTENÇÕES:

### 1. TRANSACTION — Registrar uma transação
Quando o usuário menciona um gasto, despesa, recebimento ou ganho com valor.
Categorias disponíveis (use exatamente o slug):
${buildCategoryList(custom)}

Responda: {"intent": "transaction", "amount": number, "type": "INCOME" | "EXPENSE", "categorySlug": string, "categoryConfidence": number, "description": string, "cardName": string | null, "purchaseDate": string | null}
- cardName: nome específico do cartão se mencionado (ex: "Nubank", "Inter", "Bradesco"), senão null. Se o usuário diz apenas "cartão", "cartão de crédito" ou "crédito" sem nome específico, use "cartao" como valor.
- categoryConfidence: número de 0 a 1 indicando sua confiança na categoria escolhida. Use ALTO (0.9+) quando o texto deixa claro (ex: "mercado", "uber", "salário"). Use BAIXO (< 0.6) quando é vago e você teve que adivinhar (ex: "gastei 50 ali", "paguei 30", "comprei uma coisa"). Seja honesto na incerteza.
- purchaseDate: data em que o gasto/recebimento ACONTECEU, no formato ISO "YYYY-MM-DD", SOMENTE se o usuário mencionar quando foi ("ontem", "anteontem", "dia 5", "semana passada", "segunda-feira", "no dia 10"). Resolva a expressão relativa usando a data de HOJE informada acima. Se NÃO houver menção de data, retorne null (vai usar hoje). Não invente datas nem use datas no futuro.

### 2. QUERY — Consultar finanças
Quando o usuário pergunta sobre seus gastos, receitas, saldo ou resumo financeiro.
Exemplos: "quanto gastei esse mês?", "como estão meus gastos?", "qual meu saldo?", "resumo"
Para previsão/projeção: "quanto vou ter no fim do mês?", "quanto vai sobrar?", "vou fechar no positivo?", "como termino o mês?"
Para METAS / orçamento (teto de gasto): "minhas metas", "quais são minhas metas", "que metas eu tenho", "como estão minhas metas?", "quanto posso gastar?", "como está meu orçamento?", "quanto falta do meu limite?", "estourei o orçamento?"
Para reservas (juntar dinheiro): "minhas reservas", "como tá minha reserva?", "quanto já juntei pra viagem?", "como vão meus objetivos?"
Para RECORRÊNCIAS / contas fixas: "minhas recorrências", "minhas recorrencias", "quais são minhas contas fixas?", "minhas assinaturas", "o que tenho fixo todo mês?", "meus gastos fixos", "contas que se repetem"
Para uma CATEGORIA específica: "quanto gastei com comida esse mês?", "gastos com transporte", "quanto foi de mercado?", "quanto gastei em saúde?", "meus gastos com lazer", "quanto torrei em ifood?"
Para um CARTÃO específico: "como está meu cartão Bradesco?", "gastos no Nubank", "quanto gastei no Inter?", "meu cartão X", "fatura do Bradesco", "o que gastei no <cartão>?", "quando vence a fatura do Bradesco?", "qual o vencimento do meu cartão?"
Para a ÚLTIMA transação (mais recente): "qual foi minha última compra?", "qual foi meu último gasto?", "minha última transação", "o que registrei por último?", "qual foi a última coisa que gastei?"
Para a transação MAIS CARA (maior valor do mês): "qual foi minha compra mais cara?", "qual o maior gasto do mês?", "qual foi minha transação mais alta?", "no que gastei mais de uma vez só?", "minha maior despesa"

Responda: {"intent": "query", "queryType": "summary" | "expenses" | "income" | "balance" | "forecast" | "budget" | "reserves" | "recurring" | "category" | "card" | "last_transaction" | "top_transaction", "cardName": string | null, "categorySlug": string | null}
- summary: resumo geral (gastos + receitas + saldo)
- expenses: foco em despesas
- income: foco em receitas
- balance: foco no saldo
- forecast: previsão de quanto vai sobrar/ter no FIM do mês (considerando contas fixas a vencer)
- budget: situação das METAS / ORÇAMENTO do mês (teto de GASTO definido, quanto gastou, quanto pode ainda gastar)
- reserves: situação das RESERVAS / objetivos de juntar dinheiro (quanto já juntou de cada reserva, quanto falta)
- recurring: lista das RECORRÊNCIAS / contas fixas / assinaturas que se repetem todo mês (quanto, em que dia)
- category: gasto numa CATEGORIA específica de despesa (alimentação, transporte, etc.) no mês
- card: gastos de um CARTÃO específico (total da fatura aberta E/OU data de vencimento)
- last_transaction: a ÚLTIMA transação registrada (a mais recente), com valor, categoria e quando
- top_transaction: a transação de MAIOR valor (mais cara) do mês
- cardName: SÓ quando queryType="card". Nome do cartão mencionado (ex: "Bradesco", "Nubank"), ou "cartao" se disser só "meu cartão" sem nome. Nos outros queryTypes, null.
- categorySlug: SÓ quando queryType="category". O slug EXATO da categoria perguntada, da lista de TRANSACTION (ex: "comida"/"mercado"/"ifood" → "alimentacao"; "ônibus"/"uber"/"gasolina" → "transporte"; "farmácia"/"academia" → "saude"). Nos outros queryTypes, null.
IMPORTANTE — DOIS conceitos que parecem iguais mas NÃO são:
- "METAS" no LemonFin = teto/limite de GASTO do mês → queryType "budget". "minhas metas", "minhas metas de economia", "quais minhas metas" são budget.
- "RESERVAS" = juntar dinheiro para um objetivo (viagem, carro) → queryType "reserves". SÓ use reserves quando o usuário fala explicitamente de "reserva", "juntar", "guardar" ou um objetivo nomeado. NUNCA classifique "metas" como reserves.
- "RECORRÊNCIAS"/"contas fixas"/"assinaturas" (consulta, sem valor novo) → queryType "recurring".
- Pergunta que cita UMA categoria de gasto ("comida", "transporte", "mercado", "saúde", "lazer"...) → queryType "category" com o categorySlug, NUNCA "expenses". "expenses" é SÓ o total geral de despesas, sem categoria citada.
- "como está meu cartão X" / "gastos no X" → queryType "card", NUNCA o resumo geral.

### 3. CANCEL — Cancelar última transação
Quando o usuário quer cancelar, desfazer ou apagar a última transação registrada.
Exemplos: "cancela o último gasto", "apaga a última transação", "desfaz o último", "remove o último registro"

Responda: {"intent": "cancel"}

### 4. CORRECTION — Corrigir valor da última transação
Quando o usuário quer corrigir o VALOR da última transação registrada.
Exemplos: "o último era 45, não 50", "corrige pra 30", "o valor era 120", "era 25 e não 35"

Responda: {"intent": "correction", "newAmount": number}

### 5. INSTALLMENT — Compra parcelada
Quando o usuário menciona uma compra parcelada (em X vezes, Xx, parcelas).
Exemplos: "comprei tênis de 300 em 3x", "comprei geladeira de 2400 em 12x no Nubank", "parcelei 600 em 6x"

Responda: {"intent": "installment", "amount": number, "installments": number, "description": string, "categorySlug": string, "cardName": string | null, "purchaseDate": string | null}
- amount: valor TOTAL da compra
- installments: número de parcelas
- cardName: nome do cartão se mencionado, senão null
- purchaseDate: data da COMPRA (quando a 1ª parcela cai), no formato ISO "YYYY-MM-DD", SOMENTE se o usuário mencionar quando comprou ("mês passado", "mês retrasado", "dia 5", "ontem", "semana passada", "em janeiro"). Resolva a expressão relativa usando a data de HOJE informada acima. Se NÃO houver menção de data, retorne null (vai usar hoje). Não invente datas.

### 6. RECURRING — Conta fixa / recorrência mensal
Quando o usuário descreve um gasto ou receita que se repete TODO MÊS num dia fixo.
Palavras-chave: "todo mês", "todo dia X", "mensalmente", "fixo", "assinatura", "sempre no dia".
Exemplos: "todo dia 5 pago 1500 de aluguel", "todo mês recebo 4000 de salário dia 1", "assinatura da Netflix 55 todo dia 10", "fixo 120 de internet dia 8"

Responda: {"intent": "recurring", "amount": number, "type": "INCOME" | "EXPENSE", "dayOfMonth": number, "description": string, "categorySlug": string, "cardName": string | null}
- dayOfMonth: dia do mês (1 a 31) em que cai a recorrência
- type: EXPENSE para contas/gastos fixos, INCOME para receitas fixas (salário, etc.)
- cardName: nome do cartão se mencionado, senão null

### 7. BATCH — Vários itens numa mensagem
Quando a mensagem contém MAIS DE UM lançamento (várias transações, contas fixas ou parcelamentos numa frase só). Exemplos: "gastei 50 no mercado e 30 no uber", "todo dia 5 pago 227 de seguro, internet 157 e aluguel 1500".
Quebre em itens INDEPENDENTES. Cada item segue o mesmo formato da sua intenção (transaction, installment ou recurring).
Se um item for descrito mas você NÃO conseguir extrair um valor único e definido (ex.: "água e luz varia entre 80 e 90"), NÃO invente: coloque-o em "skipped" com o motivo.

Responda: {"intent": "batch", "items": [ <objeto transaction|installment|recurring, cada um com seu próprio "intent"> ], "skipped": [ {"description": string, "reason": string} ]}
- Use "batch" SOMENTE quando houver 2+ itens NA MENSAGEM ATUAL. Para 1 item, use a intenção direta.
- NUNCA inclua no batch itens que vieram do histórico/contexto — apenas o que está escrito na mensagem atual. Se a mensagem atual descreve um único gasto, é "transaction" (ou a intenção correspondente), NUNCA "batch", mesmo que o histórico tenha outros lançamentos.
- Cada objeto em "items" deve ter seu campo "intent" ("transaction", "installment" ou "recurring") e todos os campos daquela intenção.
- "skipped": itens que você reconheceu mas não conseguiu transformar em valor único. Pode ser lista vazia.

### 8. RESERVE_CREATE — Criar uma reserva (objetivo de poupança)
Quando o usuário quer JUNTAR/GUARDAR dinheiro para um objetivo, com um valor-alvo (e opcionalmente um prazo).
Exemplos: "quero juntar 5000 pra viagem até dezembro", "reserva de 10 mil pro carro", "quero guardar 2000 até março", "objetivo: 3000 de reserva de emergência".

Responda: {"intent": "reserve_create", "name": string, "targetAmount": number, "deadline": string | null}
- name: objetivo curto (ex: "viagem", "carro", "reserva de emergência").
- targetAmount: valor-alvo TOTAL a juntar. Se NÃO houver valor claro, responda intent "unknown" (NÃO invente um valor).
- deadline: data ISO "YYYY-MM-DD". Converta nomes de mês ("dezembro", "até dez", "março") para o ÚLTIMO dia daquele mês. Use SEMPRE o próximo mês futuro: se o mês citado já passou neste ano, use o ano seguinte. Se NÃO houver prazo, retorne null.

### 9. RESERVE_CONTRIBUTION — Guardar dinheiro numa reserva
Quando o usuário diz que GUARDOU/SEPAROU/DEPOSITOU/JUNTOU um valor para uma reserva existente.
Exemplos: "guardei 200 na viagem", "separei 500 pra reserva", "depositei 1000 na poupança", "juntei mais 300 pro carro".

Responda: {"intent": "reserve_contribution", "amount": number}
- amount: valor guardado. IGNORE o nome da reserva (o app vai perguntar em qual reserva lançar). Se não houver valor, responda "unknown".

### 10. ADVICE — Conversa aberta, dicas, análise dos gastos e small talk
Use para QUALQUER mensagem que NÃO seja um comando estruturado das outras intenções: pedidos de dica/conselho, perguntas abertas/analíticas sobre as finanças, e também saudações ou perguntas pessoais leves.
Exemplos: "me ajuda a organizar meus gastos", "no que eu mais tenho gastado?", "como posso gastar menos com ifood?", "como anda minha vida financeira?", "me dá uma dica", "como economizar?", "qual seria um bom plano pra mim?", "oi", "bom dia", "tudo bem?", "qual é o meu nome?".
Diferença para QUERY: query é um número/resumo pronto e direto (totais, saldo, gastos de uma categoria/cartão). advice é quando a pessoa quer ANÁLISE, CONSELHO, COMPARAÇÃO, PLANO ou conversa — algo que exige raciocínio sobre os dados, não só um total.

Responda: {"intent": "advice"}
NÃO escreva a resposta aqui — outro componente (com acesso aos dados do usuário) vai responder. Só identifique a intenção.

### 11. CORRECTION_CARD — Corrigir/remover o cartão da última transação
Quando o usuário corrige em QUAL cartão a ÚLTIMA transação registrada caiu, OU diz que não foi em cartão nenhum. É SEMPRE sobre algo JÁ REGISTRADO (referência ao passado), não um gasto novo.
Trocar de cartão: "não foi no Bradesco, foi no Nubank", "troca pro Nubank", "foi no Nubank", "muda pro Inter".
Remover o cartão: "não foi no Bradesco", "não foi em cartão nenhum", "tira o cartão", "não era no cartão", "foi no débito", "foi no dinheiro".

Responda: {"intent": "correction_card", "cardName": string | null}
- cardName: nome do cartão NOVO quando o usuário troca de cartão.
- cardName: null quando o usuário REMOVE o vínculo (não foi em cartão nenhum / tira o cartão / "não foi no X" sem indicar outro cartão).
IMPORTANTE: só use correction_card quando NÃO há um gasto NOVO com valor na mensagem. Se a mensagem descreve um gasto novo com valor (ex: "gastei 50 no Nubank"), use transaction.

### 12. GOAL_CREATE — Criar uma META (teto de gasto por categoria)
Quando o usuário quer DEFINIR um limite/teto de quanto pode gastar numa categoria (por mês ou semana). NÃO é juntar dinheiro (isso é reserve) nem um gasto realizado (isso é transaction).
Exemplos: "limite de 800 em alimentação por mês", "quero gastar no máximo 500 com lazer", "meta de 300 de transporte", "não quero passar de 1000 em compras no mês", "teto de 200 por semana em alimentação".

Responda: {"intent": "goal_create", "categorySlug": string, "amount": number, "period": "MONTHLY" | "WEEKLY"}
- categorySlug: slug EXATO da categoria (mesma lista de TRANSACTION). Se não houver categoria clara, responda "unknown".
- amount: valor do teto. Se não houver valor, responda "unknown".
- period: "WEEKLY" se o usuário disser "por semana"/"semanal"; caso contrário "MONTHLY".

### 13. REDO — Refazer a ÚLTIMA ação de outro jeito
Quando o usuário quer que você REFAÇA o que acabou de registrar, de forma diferente — separar em vários, (re)parcelar, ou trocar o cartão. É SEMPRE uma referência ao que JÁ foi registrado ("essa que criou", "isso", "o anterior", "o último"). O bot vai EXCLUIR o registro anterior e recriar com o ajuste.
Exemplos:
- "faz separado, uma de 139 e outra de 139" / "cria duas transações: 139 e 139" → separar em itens (com valores informados).
- "na verdade era em 4x" / "parcela isso em 3x" / "divide em 6 vezes" → re-parcelar a MESMA compra.
- "refaz no Nubank" / "troca tudo pro Inter" → trocar o cartão ao refazer.

Responda: {"intent": "redo", "adjust": { "installments": number | null, "items": [ <transaction|installment> ] | null, "cardName": string | null }}
- installments: número de parcelas, quando o usuário pede pra (re)parcelar a mesma compra. Senão null.
- items: SÓ quando o usuário FORNECEU os itens separados COM VALORES (ex: "139 e 139"). Cada item segue o formato de TRANSACTION ou INSTALLMENT (com seu "intent"). Se o usuário disser "separa" mas NÃO der os valores, deixe items null (o bot vai pedir os valores — NÃO invente divisão).
- cardName: novo cartão se ele mandar trocar; null se não mencionar cartão.
- Pelo menos um dos três deve estar preenchido. Se nenhum, isso não é redo.
IMPORTANTE: redo NÃO é um gasto novo. Se a mensagem descreve uma compra NOVA com valor próprio (sem referência ao registro anterior), use transaction/installment/batch normalmente.

### 14. UNKNOWN — Mensagem vazia ou totalmente ininteligível
Use SOMENTE quando a mensagem não tem sentido algum (ex: "asdkjh", figurinha sem texto). Para saudações, perguntas pessoais leves, assuntos fora de finanças ou qualquer conversa, use "advice" (o assessor responde com tom humano). Na dúvida entre unknown e advice, escolha "advice".

Responda: {"intent": "unknown", "message": string}
Escreva a mensagem em tom humano e conversacional (máx 400 caracteres), sem soar robótico.

### 15. PAY_INVOICE — Pagar a fatura do cartão
Quando o usuário diz que PAGOU (ou está pagando) a fatura de um cartão.
Exemplos: "paguei a fatura do Bradesco", "quitei o cartão Nubank", "paguei 3000 da fatura", "paguei minha fatura".

Responda: {"intent": "pay_invoice", "cardName": string | null, "amount": number | null}
- cardName: nome do cartão na mensagem (ex: "Bradesco"), "cartao" se disser só "minha fatura/meu cartão" sem nome, ou null.
- amount: valor pago SÓ se mencionado (ex: "paguei 3000 da fatura" → 3000). Senão null (o bot usa o total da fatura).
NÃO confunda com query "card" (consultar quanto deve) — pay_invoice é registrar que PAGOU.

## DESAMBIGUAÇÃO (evite confundir):
- "guardei/separei/juntei/depositei + valor" → reserve_contribution (NÃO transaction).
- "quero juntar/guardar + valor", "reserva de + valor" ou "objetivo de + valor" → reserve_create (NÃO transaction, NÃO recurring).
- "limite/teto/meta de + valor + EM/DE uma categoria", "não quero passar de X em Y", "gastar no máximo X com Y" → goal_create (definir teto de gasto). NÃO confunda com reserve_create (juntar dinheiro) nem com query (consultar). goal_create SEMPRE tem categoria + valor de teto.
- "minhas metas" / "minhas metas de economia" / "quais minhas metas" → query com queryType "budget" (METAS = teto de gasto), NÃO reserves.
- "minhas reservas" / "como tá minha reserva" / "quanto juntei pra viagem" → query com queryType "reserves" (objetivo de poupança), NÃO budget, NÃO saudação.
- "minhas recorrências" / "minhas contas fixas" / "minhas assinaturas" (consulta, sem valor novo) → query com queryType "recurring".
- "não foi no <cartão>" / "tira o cartão" / "foi no <outro cartão>" logo após um registro → correction_card (corrige o cartão da ÚLTIMA transação), NUNCA uma transação nova.
- "como está meu cartão X" / "gastos no X" / "quanto gastei no X" / "quando vence a fatura do X" / "vencimento do cartão X" → query queryType "card" com cardName, NUNCA o resumo geral (summary).
- "minha última compra/transação/gasto" / "o que registrei por último" → query queryType "last_transaction", NUNCA "summary"/"expenses" (que dão totais, não um item).
- "minha compra mais cara" / "maior gasto do mês" / "transação mais alta" / "maior despesa" → query queryType "top_transaction", NUNCA "expenses" nem "advice" (é um item específico, não análise).
- "paguei a fatura do X" / "quitei o cartão X" / "paguei 500 da fatura" → pay_invoice (REGISTRAR pagamento), NÃO query "card" (que é consultar).
- "faz separado" / "cria duas transações" / "separa isso" / "na verdade era em Nx" / "parcela isso" / "refaz ..." referindo-se ao que ACABOU de registrar → redo (refazer a última ação), NÃO um gasto novo. Se vierem valores ("139 e 139"), preencha redo.adjust.items; se for só "em 4x", preencha redo.adjust.installments.
- "exclui essa que criou" / "apaga o que registrou" / "cancela isso" (SEM recriar) → cancel (apaga a última AÇÃO inteira), NÃO redo.
- redo SEMPRE se refere a algo já registrado. Uma compra nova e completa (com valor) que não referencia o anterior é transaction/installment/batch, não redo.

## CARTÃO — regra crítica:
SÓ defina cardName quando o cartão estiver na MENSAGEM ATUAL. NUNCA herde o nome de um cartão que apareceu no histórico de mensagens anteriores. Se a mensagem atual não cita cartão, cardName é null — mesmo que uma mensagem anterior tenha citado um cartão.`;
}

const MODEL = 'gpt-4o-mini';

@Injectable()
export class MessageParserService {
  private readonly logger = new Logger(MessageParserService.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly config: ConfigService,
    private readonly aiUsage: AiUsageService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.config.getOrThrow<string>('OPENAI_API_KEY'),
    });
  }

  async parse(
    message: string,
    history: { role: 'user' | 'bot'; text: string }[] = [],
    customCategories: { slug: string; name: string }[] = [],
    userId: string | null = null,
  ): Promise<ParseResult> {
    try {
      // O histórico serve APENAS para resolver referências ("e o mês passado?",
      // "muda pra 30"). Ele NÃO pode entrar como turns reais da conversa: o
      // modelo passa a imitar a última troca e acaba reprocessando uma transação
      // antiga em vez da mensagem atual (contaminação cruzada). Por isso vai como
      // contexto inerte dentro de um único bloco, claramente separado da
      // mensagem a classificar, com instrução explícita de não reaproveitar
      // dados antigos.
      const userTurns: OpenAI.Chat.ChatCompletionMessageParam[] = [];
      if (history.length > 0) {
        const transcript = history
          .map((h) => `${h.role === 'bot' ? 'LemonFin' : 'Usuário'}: ${h.text}`)
          .join('\n');
        userTurns.push({
          role: 'user',
          content:
            'CONTEXTO (apenas para entender referências como "e o mês passado?" ou ' +
            '"muda pra 30"). REGRAS ABSOLUTAS sobre este histórico:\n' +
            '1. NÃO registre nada daqui. Gastos, compras, parcelamentos e contas ' +
            'que aparecem no histórico JÁ FORAM registrados antes — NUNCA os ' +
            'registre de novo nem os inclua num "batch".\n' +
            '2. NÃO reaproveite NENHUM dado do histórico (valor, categoria, ' +
            'descrição e principalmente CARTÃO). Se a mensagem atual não cita um ' +
            'cartão, NÃO use um cartão que apareceu aqui.\n' +
            '3. Classifique e registre SOMENTE os itens presentes na MENSAGEM ' +
            'ATUAL. Se a mensagem atual tem só um item, a intenção NÃO é "batch" — ' +
            'mesmo que o histórico contenha outros itens.\n' +
            `HISTÓRICO:\n${transcript}`,
        });
      }

      // Data de hoje (YYYY-MM-DD) para ancorar expressões relativas no prompt.
      const today = new Date().toISOString().slice(0, 10);
      const completion = await this.openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: buildSystemPrompt(customCategories, today),
          },
          ...userTurns,
          { role: 'user', content: `MENSAGEM ATUAL: ${message}` },
        ],
        response_format: { type: 'json_object' },
      });

      // Registra o consumo de IA (falha graciosa). usage vem na resposta
      // não-streaming.
      await this.aiUsage.record({
        userId,
        feature: AiFeature.WHATSAPP_PARSER,
        model: MODEL,
        promptTokens: completion.usage?.prompt_tokens ?? 0,
        completionTokens: completion.usage?.completion_tokens ?? 0,
      });

      const text = completion.choices[0]?.message?.content?.trim() ?? '';
      const json = JSON.parse(text);

      switch (json.intent) {
        case 'transaction': {
          const item = this.parseTransactionItem(json, message);
          if (!item) {
            return {
              intent: 'unknown',
              message:
                'Não consegui entender o valor ou a categoria. Tente algo como "Gastei 50 no mercado" ou "Recebi 3000 de salário".',
            };
          }
          return item;
        }

        case 'query': {
          const queryType = json.queryType || 'summary';
          // cardName/categorySlug só entram no objeto quando presentes (mantém o
          // shape antigo dos outros queryTypes — evita quebrar comparações estritas).
          const cardName =
            typeof json.cardName === 'string' && json.cardName.trim()
              ? json.cardName.trim()
              : undefined;
          const categorySlug =
            typeof json.categorySlug === 'string' && json.categorySlug.trim()
              ? json.categorySlug.trim()
              : undefined;
          // Categoria sem slug identificado: não dá pra consultar — vira unknown.
          if (queryType === 'category' && !categorySlug) {
            return {
              intent: 'unknown',
              message:
                'Não consegui identificar a categoria. Tente algo como "quanto gastei com transporte?" ou "gastos com alimentação".',
            };
          }
          const out: Extract<ParseResult, { intent: 'query' }> = {
            intent: 'query',
            queryType,
          };
          if (cardName) out.cardName = cardName;
          if (categorySlug) out.categorySlug = categorySlug;
          return out;
        }

        case 'cancel':
          return { intent: 'cancel' };

        case 'correction':
          if (!json.newAmount || typeof json.newAmount !== 'number') {
            return {
              intent: 'unknown',
              message:
                'Não consegui entender o novo valor. Tente algo como "O último era 45, não 50".',
            };
          }
          return { intent: 'correction', newAmount: Number(json.newAmount) };

        case 'correction_card':
          return this.parseCorrectionCard(json);

        case 'installment': {
          const item = this.parseInstallmentItem(json);
          if (!item) {
            return {
              intent: 'unknown',
              message:
                'Não consegui entender o parcelamento. Tente algo como "Comprei tênis de 300 em 3x".',
            };
          }
          return item;
        }

        case 'recurring': {
          const item = this.parseRecurringItem(json);
          if (!item) {
            return {
              intent: 'unknown',
              message:
                'Não consegui entender a recorrência. Tente algo como "Todo dia 5 pago 1500 de aluguel".',
            };
          }
          return item;
        }

        case 'reserve_create': {
          const item = this.parseReserveItem(json);
          if (!item) {
            return {
              intent: 'unknown',
              message:
                'Não consegui entender a reserva. Tente algo como "quero juntar 5000 pra viagem até dezembro".',
            };
          }
          return item;
        }

        case 'reserve_contribution':
          if (!json.amount || typeof json.amount !== 'number') {
            return {
              intent: 'unknown',
              message:
                'Não consegui entender o valor guardado. Tente algo como "guardei 200 na viagem".',
            };
          }
          return {
            intent: 'reserve_contribution',
            amount: Number(json.amount),
          };

        case 'pay_invoice':
          return {
            intent: 'pay_invoice',
            cardName: typeof json.cardName === 'string' ? json.cardName : null,
            amount:
              typeof json.amount === 'number' && json.amount > 0
                ? Number(json.amount)
                : null,
          };

        case 'goal_create': {
          const item = this.parseGoalItem(json);
          if (!item) {
            return {
              intent: 'unknown',
              message:
                'Não consegui entender a meta. Tente algo como "limite de 800 em alimentação por mês".',
            };
          }
          return item;
        }

        case 'batch':
          return this.parseBatch(json, message);

        case 'redo':
          return this.parseRedo(json, message);

        case 'advice':
          return { intent: 'advice' };

        default:
          return {
            intent: 'unknown',
            message:
              json.message ||
              'Posso te ajudar a registrar gastos, consultar seu resumo, criar reservas ou dar dicas. Tente "Gastei 50 no mercado", "Resumo", "Quero juntar 5000 pra viagem" ou "Me dá uma dica".',
          };
      }
    } catch (error) {
      this.logger.error(`Parse error: ${error}`);
      return {
        intent: 'unknown',
        message:
          'Desculpe, tive um problema ao processar sua mensagem. Tente novamente.',
      };
    }
  }

  // --- Validação/normalização de um único item (reaproveitada pelo batch) ---
  // Retornam null quando os campos obrigatórios faltam, para o chamador decidir
  // o que fazer (erro único) ou simplesmente pular (dentro de um lote).

  private parseTransactionItem(
    json: Record<string, unknown>,
    fallbackDescription: string,
  ): Extract<ParseResult, { intent: 'transaction' }> | null {
    if (!json.amount || !json.type || !json.categorySlug) return null;
    return {
      intent: 'transaction',
      data: {
        amount: Number(json.amount),
        type: json.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
        categorySlug: json.categorySlug as string,
        // Confiança AUSENTE/inválida → 0 (não 1): quando o modelo esquece o
        // campo, é justamente quando menos se deve confiar na categoria, então
        // forçamos a confirmação (gate < 0.6) em vez de registrar um chute.
        categoryConfidence:
          typeof json.categoryConfidence === 'number'
            ? json.categoryConfidence
            : 0,
        description: (json.description as string) || fallbackDescription,
        cardName: (json.cardName as string) || undefined,
        purchaseDate: this.normalizePurchaseDate(
          json.purchaseDate as string | null | undefined,
        ),
      },
    };
  }

  private parseInstallmentItem(
    json: Record<string, unknown>,
  ): Extract<ParseResult, { intent: 'installment' }> | null {
    if (!json.amount || !json.installments || !json.categorySlug) return null;
    return {
      intent: 'installment',
      data: {
        amount: Number(json.amount),
        installments: Number(json.installments),
        description: (json.description as string) || '',
        categorySlug: json.categorySlug as string,
        cardName: (json.cardName as string) || undefined,
        purchaseDate: this.normalizePurchaseDate(
          json.purchaseDate as string | null | undefined,
        ),
      },
    };
  }

  // Normaliza a data da compra de um parcelamento. Aceita datas no passado
  // (compra retroativa). Descarta o que não der pra usar como data de compra:
  // ausente, inválida, ou no futuro (compra futura não faz sentido) — nesses
  // casos retorna undefined e o use-case usa hoje como base.
  private normalizePurchaseDate(
    raw: string | null | undefined,
  ): string | undefined {
    if (!raw) return undefined;
    const parsed = new Date(raw);
    // Tolerância de 1 dia no futuro para fuso/horário; além disso, descarta.
    const maxFuture = Date.now() + 24 * 60 * 60 * 1000;
    if (Number.isNaN(parsed.getTime()) || parsed.getTime() > maxFuture) {
      return undefined;
    }
    return parsed.toISOString();
  }

  private parseRecurringItem(
    json: Record<string, unknown>,
  ): Extract<ParseResult, { intent: 'recurring' }> | null {
    const day = Number(json.dayOfMonth);
    if (!json.amount || !json.categorySlug || !day || day < 1 || day > 31) {
      return null;
    }
    return {
      intent: 'recurring',
      data: {
        amount: Number(json.amount),
        type: json.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
        dayOfMonth: day,
        description: (json.description as string) || '',
        categorySlug: json.categorySlug as string,
        cardName: (json.cardName as string) || undefined,
      },
    };
  }

  // Correção de cartão da última transação. cardName string (≠ "cartao") =
  // trocar; null/vazio/"cartao" = remover o vínculo. Nunca vira "unknown" —
  // ambos os desfechos são válidos.
  private parseCorrectionCard(
    json: Record<string, unknown>,
  ): Extract<ParseResult, { intent: 'correction_card' }> {
    const raw = typeof json.cardName === 'string' ? json.cardName.trim() : '';
    const cardName = raw && raw.toLowerCase() !== 'cartao' ? raw : null;
    return { intent: 'correction_card', cardName };
  }

  private parseReserveItem(
    json: Record<string, unknown>,
  ): Extract<ParseResult, { intent: 'reserve_create' }> | null {
    // Valor-alvo é obrigatório — sem ele, não dá pra criar a reserva (não inventa).
    if (!json.targetAmount || typeof json.targetAmount !== 'number')
      return null;
    const name = (json.name as string)?.trim() || 'minha reserva';
    const deadline = this.normalizeDeadline(
      json.deadline as string | null | undefined,
    );
    return {
      intent: 'reserve_create',
      data: { name, targetAmount: Number(json.targetAmount), deadline },
    };
  }

  private parseGoalItem(
    json: Record<string, unknown>,
  ): Extract<ParseResult, { intent: 'goal_create' }> | null {
    // Categoria e valor de teto são obrigatórios — sem eles não dá pra criar.
    const categorySlug =
      typeof json.categorySlug === 'string' ? json.categorySlug.trim() : '';
    if (!categorySlug || !json.amount || typeof json.amount !== 'number') {
      return null;
    }
    const period = json.period === 'WEEKLY' ? 'WEEKLY' : 'MONTHLY';
    return {
      intent: 'goal_create',
      data: { categorySlug, amount: Number(json.amount), period },
    };
  }

  // Normaliza o prazo: aceita o ISO do modelo se for futuro; null/inválido/
  // passado caem num default de 12 meses à frente (último dia do mês). O ano
  // dos meses nomeados é resolvido pelo prompt; este é o backstop determinístico.
  private normalizeDeadline(raw: string | null | undefined): string {
    const fallback = () => {
      const d = new Date();
      // dia 0 do mês +13 = último dia do mês +12.
      return new Date(d.getFullYear(), d.getMonth() + 13, 0).toISOString();
    };
    if (!raw) return fallback();
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
      return fallback();
    }
    return parsed.toISOString();
  }

  // Lote: valida cada item; os que não passam viram "skipped" (com motivo) em
  // vez de serem registrados com dados inventados. Se sobrar 0 ou 1 item válido,
  // degrada para o fluxo de item único / desconhecido — nunca registra lixo.
  private parseBatch(
    json: Record<string, unknown>,
    message: string,
  ): ParseResult {
    const rawItems = Array.isArray(json.items) ? json.items : [];
    const items: BatchItem[] = [];
    const skipped: SkippedItem[] = [];

    for (const raw of rawItems) {
      if (!raw || typeof raw !== 'object') continue;
      const obj = raw as Record<string, unknown>;
      let parsed: BatchItem | null = null;
      if (obj.intent === 'installment') {
        parsed = this.parseInstallmentItem(obj);
      } else if (obj.intent === 'recurring') {
        parsed = this.parseRecurringItem(obj);
      } else {
        // default: trata como transação
        parsed = this.parseTransactionItem(obj, message);
      }

      if (parsed) {
        items.push(parsed);
      } else {
        skipped.push({
          description:
            (obj.description as string) || 'um dos itens da mensagem',
          reason: 'não consegui identificar o valor com clareza',
        });
      }
    }

    // Itens que o modelo já marcou como não-estruturáveis (ex.: valor variável).
    const rawSkipped = Array.isArray(json.skipped) ? json.skipped : [];
    for (const raw of rawSkipped) {
      if (!raw || typeof raw !== 'object') continue;
      const obj = raw as Record<string, unknown>;
      skipped.push({
        description: (obj.description as string) || 'um item',
        reason: (obj.reason as string) || 'não consegui estruturar',
      });
    }

    // Sem nenhum item válido: se houve algo pulado, avisa; senão, desconhecido.
    if (items.length === 0) {
      if (skipped.length > 0) {
        return {
          intent: 'unknown',
          message:
            'Entendi que você quis registrar mais de uma coisa, mas não ' +
            'consegui identificar os valores com clareza. Pode mandar uma de ' +
            'cada vez? Ex: _"todo dia 5 pago 227 de seguro da moto"_.',
        };
      }
      return {
        intent: 'unknown',
        message:
          'Não consegui entender os itens. Tente mandar um de cada vez, ex: _"gastei 50 no mercado"_.',
      };
    }

    // Um único item válido: degrada para o fluxo direto (mais simples).
    if (items.length === 1 && skipped.length === 0) {
      return items[0];
    }

    return { intent: 'batch', items, skipped };
  }

  // Refazer a última ação. Aceita installments (re-parcelar a mesma compra),
  // items (separar com valores fornecidos) e/ou cardName (trocar cartão). Exige
  // ao menos um ajuste — sem nenhum, não há o que refazer (vira unknown).
  private parseRedo(
    json: Record<string, unknown>,
    message: string,
  ): ParseResult {
    const adjustRaw =
      json.adjust && typeof json.adjust === 'object'
        ? (json.adjust as Record<string, unknown>)
        : json; // tolera o modelo devolver os campos no nível de cima

    const adjust: Extract<ParseResult, { intent: 'redo' }>['adjust'] = {};

    const inst = Number(adjustRaw.installments);
    if (Number.isFinite(inst) && inst >= 2 && inst <= 48) {
      adjust.installments = inst;
    }

    // Itens explícitos: valida cada um como transação/parcelamento. Só entram os
    // que têm valor — nunca inventa (decisão: split exige valores na mensagem).
    const rawItems = Array.isArray(adjustRaw.items) ? adjustRaw.items : [];
    const items: BatchItem[] = [];
    for (const raw of rawItems) {
      if (!raw || typeof raw !== 'object') continue;
      const obj = raw as Record<string, unknown>;
      const parsed =
        obj.intent === 'installment'
          ? this.parseInstallmentItem(obj)
          : this.parseTransactionItem(obj, message);
      if (parsed) items.push(parsed);
    }
    if (items.length > 0) adjust.items = items;

    // cardName: presente (troca) ou explicitamente null no JSON (remove). Só
    // consideramos "trocar cartão" quando veio uma string não-vazia.
    if (typeof adjustRaw.cardName === 'string' && adjustRaw.cardName.trim()) {
      adjust.cardName = adjustRaw.cardName.trim();
    }

    if (
      adjust.installments === undefined &&
      adjust.items === undefined &&
      adjust.cardName === undefined
    ) {
      return {
        intent: 'unknown',
        message:
          'Pra refazer, me diz como: _"faz em 4x"_, _"separa em 139 e 139"_ ou _"refaz no Nubank"_.',
      };
    }

    return { intent: 'redo', adjust };
  }
}
