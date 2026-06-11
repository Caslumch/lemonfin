import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface ParsedTransaction {
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  categorySlug: string;
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

export type ParseResult =
  | { intent: 'transaction'; data: ParsedTransaction }
  | { intent: 'query'; queryType: 'summary' | 'expenses' | 'income' | 'balance' | 'forecast' }
  | { intent: 'cancel' }
  | { intent: 'correction'; newAmount: number }
  | { intent: 'installment'; data: ParsedInstallment }
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

Responda: {"intent": "transaction", "amount": number, "type": "INCOME" | "EXPENSE", "categorySlug": string, "description": string, "cardName": string | null}
- cardName: nome específico do cartão se mencionado (ex: "Nubank", "Inter", "Bradesco"), senão null. Se o usuário diz apenas "cartão", "cartão de crédito" ou "crédito" sem nome específico, use "cartao" como valor.

### 2. QUERY — Consultar finanças
Quando o usuário pergunta sobre seus gastos, receitas, saldo ou resumo financeiro.
Exemplos: "quanto gastei esse mês?", "como estão meus gastos?", "qual meu saldo?", "resumo"
Para previsão/projeção: "quanto vou ter no fim do mês?", "quanto vai sobrar?", "vou fechar no positivo?", "como termino o mês?"

Responda: {"intent": "query", "queryType": "summary" | "expenses" | "income" | "balance" | "forecast"}
- summary: resumo geral (gastos + receitas + saldo)
- expenses: foco em despesas
- income: foco em receitas
- balance: foco no saldo
- forecast: previsão de quanto vai sobrar/ter no FIM do mês (considerando contas fixas a vencer)

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

### 6. TIPS — Dicas e orientações financeiras
Quando o usuário pede dicas, ideias, conselhos ou orientações sobre finanças pessoais.
Exemplos: "me dá uma dica", "como economizar?", "ideias para investir", "como juntar dinheiro?"

Responda: {"intent": "tips", "message": string}
Escreva a dica de forma curta, prática e amigável (máx 500 caracteres). Use emojis com moderação.

### 7. UNKNOWN — Mensagem não reconhecida
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

  async parse(message: string): Promise<ParseResult> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: message },
        ],
        response_format: { type: 'json_object' },
      });

      const text = completion.choices[0]?.message?.content?.trim() ?? '';
      const json = JSON.parse(text);

      switch (json.intent) {
        case 'transaction':
          if (!json.amount || !json.type || !json.categorySlug) {
            return {
              intent: 'unknown',
              message: 'Não consegui entender o valor ou a categoria. Tente algo como "Gastei 50 no mercado" ou "Recebi 3000 de salário".',
            };
          }
          return {
            intent: 'transaction',
            data: {
              amount: Number(json.amount),
              type: json.type,
              categorySlug: json.categorySlug,
              description: json.description || message,
              cardName: json.cardName || undefined,
            },
          };

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
              message: 'Não consegui entender o novo valor. Tente algo como "O último era 45, não 50".',
            };
          }
          return { intent: 'correction', newAmount: Number(json.newAmount) };

        case 'installment':
          if (!json.amount || !json.installments || !json.categorySlug) {
            return {
              intent: 'unknown',
              message: 'Não consegui entender o parcelamento. Tente algo como "Comprei tênis de 300 em 3x".',
            };
          }
          return {
            intent: 'installment',
            data: {
              amount: Number(json.amount),
              installments: Number(json.installments),
              description: json.description || '',
              categorySlug: json.categorySlug,
              cardName: json.cardName || undefined,
            },
          };

        case 'tips':
          return {
            intent: 'tips',
            message: json.message,
          };

        default:
          return {
            intent: 'unknown',
            message: json.message || 'Posso te ajudar a registrar gastos, consultar seu resumo financeiro ou dar dicas. Tente "Gastei 50 no mercado", "Resumo" ou "Me dá uma dica".',
          };
      }
    } catch (error) {
      this.logger.error(`Parse error: ${error}`);
      return {
        intent: 'unknown',
        message: 'Desculpe, tive um problema ao processar sua mensagem. Tente novamente.',
      };
    }
  }
}
