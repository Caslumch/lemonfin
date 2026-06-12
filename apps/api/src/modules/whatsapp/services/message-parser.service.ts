import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface ParsedTransaction {
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  categorySlug: string;
  // Confiança da IA na categoria (0 a 1). Quando baixa, o bot confirma.
  categoryConfidence: number;
  description: string;
  cardName?: string;
}

export interface ParsedInstallment {
  amount: number;
  installments: number;
  description: string;
  categorySlug: string;
  cardName?: string;
}

export interface ParsedRecurring {
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  dayOfMonth: number;
  description: string;
  categorySlug: string;
  cardName?: string;
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
        | 'budget';
    }
  | { intent: 'cancel' }
  | { intent: 'correction'; newAmount: number }
  | { intent: 'installment'; data: ParsedInstallment }
  | { intent: 'recurring'; data: ParsedRecurring }
  | { intent: 'batch'; items: BatchItem[]; skipped: SkippedItem[] }
  | { intent: 'tips'; message: string }
  | { intent: 'unknown'; message: string };

const SYSTEM_PROMPT = `Você é o LemonFin, um assistente financeiro inteligente via WhatsApp. Você ajuda usuários a registrar transações, consultar gastos e dar dicas financeiras.

Analise a mensagem do usuário e identifique a INTENÇÃO. Responda APENAS com JSON válido (sem markdown, sem backticks, sem explicações).

## INTENÇÕES:

### 1. TRANSACTION — Registrar uma transação
Quando o usuário menciona um gasto, despesa, recebimento ou ganho com valor.
Categorias disponíveis (use exatamente o slug):
- alimentacao: supermercado, restaurante, lanche, padaria, café, delivery, ifood
- transporte: gasolina, uber, ônibus, estacionamento, pedágio, mecânico
- moradia: aluguel, condomínio, luz, água, gás, internet, manutenção
- saude: farmácia, consulta, plano de saúde, academia, dentista
- lazer: cinema, streaming, jogos, viagem, bar, festa, hobby
- educacao: curso, livro, faculdade, escola, material escolar
- compras: roupa, eletrônico, presente, móveis, decoração
- salario: salário mensal, adiantamento, 13º, férias
- freelance: trabalho freelance, projeto, consultoria
- outros: quando não se encaixa em nenhuma categoria

Responda: {"intent": "transaction", "amount": number, "type": "INCOME" | "EXPENSE", "categorySlug": string, "categoryConfidence": number, "description": string, "cardName": string | null}
- cardName: nome específico do cartão se mencionado (ex: "Nubank", "Inter", "Bradesco"), senão null. Se o usuário diz apenas "cartão", "cartão de crédito" ou "crédito" sem nome específico, use "cartao" como valor.
- categoryConfidence: número de 0 a 1 indicando sua confiança na categoria escolhida. Use ALTO (0.9+) quando o texto deixa claro (ex: "mercado", "uber", "salário"). Use BAIXO (< 0.6) quando é vago e você teve que adivinhar (ex: "gastei 50 ali", "paguei 30", "comprei uma coisa"). Seja honesto na incerteza.

### 2. QUERY — Consultar finanças
Quando o usuário pergunta sobre seus gastos, receitas, saldo ou resumo financeiro.
Exemplos: "quanto gastei esse mês?", "como estão meus gastos?", "qual meu saldo?", "resumo"
Para previsão/projeção: "quanto vou ter no fim do mês?", "quanto vai sobrar?", "vou fechar no positivo?", "como termino o mês?"
Para orçamento: "quanto posso gastar?", "como está meu orçamento?", "quanto falta do meu limite?", "estourei o orçamento?"

Responda: {"intent": "query", "queryType": "summary" | "expenses" | "income" | "balance" | "forecast" | "budget"}
- summary: resumo geral (gastos + receitas + saldo)
- expenses: foco em despesas
- income: foco em receitas
- balance: foco no saldo
- forecast: previsão de quanto vai sobrar/ter no FIM do mês (considerando contas fixas a vencer)
- budget: situação do ORÇAMENTO do mês (teto definido, quanto gastou, quanto pode ainda gastar)

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

Responda: {"intent": "installment", "amount": number, "installments": number, "description": string, "categorySlug": string, "cardName": string | null}
- amount: valor TOTAL da compra
- installments: número de parcelas
- cardName: nome do cartão se mencionado, senão null

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
- Use "batch" SOMENTE quando houver 2+ itens. Para 1 item, use a intenção direta.
- Cada objeto em "items" deve ter seu campo "intent" ("transaction", "installment" ou "recurring") e todos os campos daquela intenção.
- "skipped": itens que você reconheceu mas não conseguiu transformar em valor único. Pode ser lista vazia.

### 8. TIPS — Dicas e orientações financeiras
Quando o usuário pede dicas, ideias, conselhos ou orientações sobre finanças pessoais.
Exemplos: "me dá uma dica", "como economizar?", "ideias para investir", "como juntar dinheiro?"

Responda: {"intent": "tips", "message": string}
Escreva a dica de forma curta, prática e amigável (máx 500 caracteres). Use emojis com moderação.

### 9. UNKNOWN — Mensagem não reconhecida
Quando a mensagem não se encaixa em nenhuma das intenções acima.

Responda: {"intent": "unknown", "message": string}
Explique brevemente o que você pode fazer e dê exemplos.`;

const MODEL = 'gpt-4o-mini';

@Injectable()
export class MessageParserService {
  private readonly logger = new Logger(MessageParserService.name);
  private readonly openai: OpenAI;

  constructor(private readonly config: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.config.getOrThrow<string>('OPENAI_API_KEY'),
    });
  }

  async parse(
    message: string,
    history: { role: 'user' | 'bot'; text: string }[] = [],
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
            'CONTEXTO (apenas para entender referências; NÃO registre nem ' +
            'reaproveite valores/categorias daqui — classifique somente a ' +
            `mensagem atual):\n${transcript}`,
        });
      }

      const completion = await this.openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...userTurns,
          { role: 'user', content: `MENSAGEM ATUAL: ${message}` },
        ],
        response_format: { type: 'json_object' },
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

        case 'query':
          return {
            intent: 'query',
            queryType: json.queryType || 'summary',
          };

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

        case 'batch':
          return this.parseBatch(json, message);

        case 'tips':
          return {
            intent: 'tips',
            message: json.message,
          };

        default:
          return {
            intent: 'unknown',
            message:
              json.message ||
              'Posso te ajudar a registrar gastos, consultar seu resumo financeiro ou dar dicas. Tente "Gastei 50 no mercado", "Resumo" ou "Me dá uma dica".',
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
        categoryConfidence:
          typeof json.categoryConfidence === 'number'
            ? json.categoryConfidence
            : 1,
        description: (json.description as string) || fallbackDescription,
        cardName: (json.cardName as string) || undefined,
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
      },
    };
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
}
