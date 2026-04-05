import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
  | { intent: 'query'; queryType: 'summary' | 'expenses' | 'income' | 'balance' }
  | { intent: 'cancel' }
  | { intent: 'correction'; newAmount: number }
  | { intent: 'installment'; data: ParsedInstallment }
  | { intent: 'tips'; message: string }
  | { intent: 'unknown'; message: string };

const SYSTEM_PROMPT = `Voce e o LemonFin, um assistente financeiro inteligente via WhatsApp. Voce ajuda usuarios a registrar transacoes, consultar gastos e dar dicas financeiras.

Analise a mensagem do usuario e identifique a INTENCAO. Responda APENAS com JSON valido (sem markdown, sem backticks, sem explicacoes).

## INTENCOES:

### 1. TRANSACTION — Registrar uma transacao
Quando o usuario menciona um gasto, despesa, recebimento ou ganho com valor.
Categorias disponiveis (use exatamente o slug):
- alimentacao: supermercado, restaurante, lanche, padaria, cafe, delivery, ifood
- transporte: gasolina, uber, onibus, estacionamento, pedagio, mecanico
- moradia: aluguel, condominio, luz, agua, gas, internet, manutencao
- saude: farmacia, consulta, plano de saude, academia, dentista
- lazer: cinema, streaming, jogos, viagem, bar, festa, hobby
- educacao: curso, livro, faculdade, escola, material escolar
- compras: roupa, eletronico, presente, moveis, decoracao
- salario: salario mensal, adiantamento, 13o, ferias
- freelance: trabalho freelance, projeto, consultoria
- outros: quando nao se encaixa em nenhuma categoria

Responda: {"intent": "transaction", "amount": number, "type": "INCOME" | "EXPENSE", "categorySlug": string, "description": string, "cardName": string | null}
- cardName: nome especifico do cartao se mencionado (ex: "Nubank", "Inter", "Bradesco"), senao null. Se o usuario diz apenas "cartao", "cartao de credito" ou "credito" sem nome especifico, use "cartao" como valor.

### 2. QUERY — Consultar financas
Quando o usuario pergunta sobre seus gastos, receitas, saldo ou resumo financeiro.
Exemplos: "quanto gastei esse mes?", "como estao meus gastos?", "qual meu saldo?", "resumo"

Responda: {"intent": "query", "queryType": "summary" | "expenses" | "income" | "balance"}
- summary: resumo geral (gastos + receitas + saldo)
- expenses: foco em despesas
- income: foco em receitas
- balance: foco no saldo

### 3. CANCEL — Cancelar ultima transacao
Quando o usuario quer cancelar, desfazer ou apagar a ultima transacao registrada.
Exemplos: "cancela o ultimo gasto", "apaga a ultima transacao", "desfaz o ultimo", "remove o ultimo registro"

Responda: {"intent": "cancel"}

### 4. CORRECTION — Corrigir valor da ultima transacao
Quando o usuario quer corrigir o VALOR da ultima transacao registrada.
Exemplos: "o ultimo era 45, nao 50", "corrige pra 30", "o valor era 120", "era 25 e nao 35"

Responda: {"intent": "correction", "newAmount": number}

### 5. INSTALLMENT — Compra parcelada
Quando o usuario menciona uma compra parcelada (em X vezes, Xx, parcelas).
Exemplos: "comprei tenis de 300 em 3x", "comprei geladeira de 2400 em 12x no Nubank", "parcelei 600 em 6x"

Responda: {"intent": "installment", "amount": number, "installments": number, "description": string, "categorySlug": string, "cardName": string | null}
- amount: valor TOTAL da compra
- installments: numero de parcelas
- cardName: nome do cartao se mencionado, senao null

### 6. TIPS — Dicas e orientacoes financeiras
Quando o usuario pede dicas, ideias, conselhos ou orientacoes sobre financas pessoais.
Exemplos: "me da uma dica", "como economizar?", "ideias para investir", "como juntar dinheiro?"

Responda: {"intent": "tips", "message": string}
Escreva a dica de forma curta, pratica e amigavel (max 500 caracteres). Use emojis com moderacao.

### 7. UNKNOWN — Mensagem nao reconhecida
Quando a mensagem nao se encaixa em nenhuma das intencoes acima.

Responda: {"intent": "unknown", "message": string}
Explique brevemente o que voce pode fazer e de exemplos.`;

@Injectable()
export class MessageParserService {
  private readonly logger = new Logger(MessageParserService.name);
  private readonly model;

  constructor(private readonly config: ConfigService) {
    const genAI = new GoogleGenerativeAI(
      this.config.getOrThrow<string>('GEMINI_API_KEY'),
    );
    this.model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
    });
  }

  async parse(message: string): Promise<ParseResult> {
    try {
      const result = await this.model.generateContent(message);
      let text = result.response.text().trim();

      // Strip markdown code blocks if present
      const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        text = codeBlockMatch[1].trim();
      }

      const json = JSON.parse(text);

      switch (json.intent) {
        case 'transaction':
          if (!json.amount || !json.type || !json.categorySlug) {
            return {
              intent: 'unknown',
              message: 'Nao consegui entender o valor ou a categoria. Tente algo como "Gastei 50 no mercado" ou "Recebi 3000 de salario".',
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
              message: 'Nao consegui entender o novo valor. Tente algo como "O ultimo era 45, nao 50".',
            };
          }
          return { intent: 'correction', newAmount: Number(json.newAmount) };

        case 'installment':
          if (!json.amount || !json.installments || !json.categorySlug) {
            return {
              intent: 'unknown',
              message: 'Nao consegui entender o parcelamento. Tente algo como "Comprei tenis de 300 em 3x".',
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
            message: json.message || 'Posso te ajudar a registrar gastos, consultar seu resumo financeiro ou dar dicas. Tente "Gastei 50 no mercado", "Resumo" ou "Me da uma dica".',
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
