import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  SchemaType,
  type FunctionDeclaration,
  type FunctionCall,
  type ChatSession,
} from '@google/generative-ai';
import { TransactionsRepository } from '../../transactions/repositories/transactions.repository';
import { FamilyContextService } from '../../families/services/family-context.service';
import type { ChatMessageInput } from '../dtos/chat.dto';

const SYSTEM_PROMPT = `Voce e o LemonFin, um assistente financeiro inteligente e amigavel. Voce ajuda o usuario a entender seus gastos, identificar padroes e tomar melhores decisoes financeiras.

## Seu papel:
- Analisar os dados financeiros do usuario e dar insights acionaveis
- Responder perguntas sobre gastos, receitas e saldo de forma clara
- Sugerir formas de economizar baseado nos padroes de gasto
- Fazer projecoes simples quando solicitado
- Ser encorajador mas honesto sobre a situacao financeira

## Regras:
- Responda sempre em portugues brasileiro
- Seja conciso e direto (max 3-4 paragrafos)
- Use formatacao simples (sem markdown complexo)
- Quando mencionar valores, use o formato R$ X.XXX,XX
- Nao invente dados — use apenas o contexto financeiro fornecido e os dados retornados pelas funcoes
- Se nao tiver dados suficientes, diga isso claramente
- Nao fale sobre assuntos que nao sejam financas pessoais do usuario

## Funcoes disponiveis:
- Voce tem acesso a funcoes para consultar transacoes, resumos e gastos por categoria em qualquer periodo
- Quando o usuario mencionar periodos como "hoje", "ontem", "semana passada", "mes passado", "janeiro", etc., use as funcoes para buscar os dados do periodo especifico
- Use a data de hoje como referencia: ela sera informada no contexto
- Sempre chame as funcoes quando o usuario perguntar sobre periodos especificos que nao estao no contexto ja fornecido`;

const toolDeclarations: FunctionDeclaration[] = [
  {
    name: 'queryTransactions',
    description:
      'Busca transacoes do usuario em um periodo especifico. Use quando o usuario perguntar sobre transacoes de um periodo como "hoje", "ontem", "semana passada", "mes passado", etc.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        startDate: {
          type: SchemaType.STRING,
          description: 'Data inicial no formato YYYY-MM-DD',
        },
        endDate: {
          type: SchemaType.STRING,
          description: 'Data final no formato YYYY-MM-DD',
        },
        type: {
          type: SchemaType.STRING,
          description: 'Filtro por tipo: INCOME ou EXPENSE. Omita para buscar ambos.',
        },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'getSummaryByPeriod',
    description:
      'Retorna o resumo financeiro (receitas, despesas, saldo) de um periodo especifico. Use quando o usuario perguntar "quanto gastei ontem", "quanto entrou semana passada", etc.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        startDate: {
          type: SchemaType.STRING,
          description: 'Data inicial no formato YYYY-MM-DD',
        },
        endDate: {
          type: SchemaType.STRING,
          description: 'Data final no formato YYYY-MM-DD',
        },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'getCategoryBreakdownByPeriod',
    description:
      'Retorna gastos agrupados por categoria em um periodo especifico. Use quando o usuario perguntar "no que mais gastei semana passada", "categorias de gasto de janeiro", etc.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        startDate: {
          type: SchemaType.STRING,
          description: 'Data inicial no formato YYYY-MM-DD',
        },
        endDate: {
          type: SchemaType.STRING,
          description: 'Data final no formato YYYY-MM-DD',
        },
      },
      required: ['startDate', 'endDate'],
    },
  },
];

@Injectable()
export class ChatCompletionUseCase {
  private readonly logger = new Logger(ChatCompletionUseCase.name);
  private readonly model;

  constructor(
    private readonly config: ConfigService,
    private readonly transactionsRepository: TransactionsRepository,
    private readonly familyContext: FamilyContextService,
  ) {
    const genAI = new GoogleGenerativeAI(
      this.config.getOrThrow<string>('GEMINI_API_KEY'),
    );
    this.model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      tools: [{ functionDeclarations: toolDeclarations }],
    });
  }

  async *execute(userId: string, input: ChatMessageInput) {
    this.logger.log(`Chat request from user ${userId}: "${input.message}"`);

    const userIds = await this.familyContext.resolveUserIds(userId);
    const context = await this.buildFinancialContext(userIds);

    const today = new Date().toISOString().split('T')[0];
    const systemInstruction = `${SYSTEM_PROMPT}\n\nData de hoje: ${today}\n\n## Contexto financeiro atual do usuario:\n${context}`;

    const history = input.history.map((msg) => ({
      role: msg.role === 'user' ? ('user' as const) : ('model' as const),
      parts: [{ text: msg.content }],
    }));

    this.logger.log('Starting Gemini stream...');

    const chat = this.model.startChat({
      systemInstruction: { role: 'user', parts: [{ text: systemInstruction }] },
      history,
    });

    const result = await chat.sendMessageStream(input.message);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        this.logger.debug(`Chunk received: "${text.slice(0, 50)}..."`);
        yield text;
      }
    }

    // Check if the model wants to call functions
    const response = await result.response;
    const functionCalls = response.functionCalls();

    if (functionCalls && functionCalls.length > 0) {
      this.logger.log(`Function calls requested: ${functionCalls.map((fc) => fc.name).join(', ')}`);
      yield* this.handleFunctionCalls(chat, functionCalls, userIds);
    }

    this.logger.log('Stream completed');
  }

  private async *handleFunctionCalls(
    chat: ChatSession,
    functionCalls: FunctionCall[],
    userIds: string[],
  ): AsyncGenerator<string> {
    const functionResponses = await Promise.all(
      functionCalls.map(async (fc) => {
        const result = await this.executeFunctionCall(fc, userIds);
        return {
          functionResponse: {
            name: fc.name,
            response: result,
          },
        };
      }),
    );

    const result = await chat.sendMessageStream(functionResponses);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        this.logger.debug(`Function response chunk: "${text.slice(0, 50)}..."`);
        yield text;
      }
    }

    // Check for additional function calls (chained)
    const response = await result.response;
    const moreCalls = response.functionCalls();
    if (moreCalls && moreCalls.length > 0) {
      this.logger.log(`Chained function calls: ${moreCalls.map((fc) => fc.name).join(', ')}`);
      yield* this.handleFunctionCalls(chat, moreCalls, userIds);
    }
  }

  private async executeFunctionCall(
    fc: FunctionCall,
    userIds: string[],
  ): Promise<Record<string, unknown>> {
    const args = fc.args as Record<string, string>;
    this.logger.log(`Executing function ${fc.name} with args: ${JSON.stringify(args)}`);

    switch (fc.name) {
      case 'queryTransactions': {
        const { data, total } = await this.transactionsRepository.findMany({
          userIds,
          startDate: args.startDate,
          endDate: args.endDate,
          type: args.type as 'INCOME' | 'EXPENSE' | undefined,
          skip: 0,
          take: 20,
          order: 'desc',
          orderBy: 'date',
        });

        return {
          total,
          transactions: data.map((tx) => ({
            date: new Date(tx.date).toLocaleDateString('pt-BR'),
            amount: Number(tx.amount).toFixed(2),
            type: tx.type,
            description: tx.description || (tx as any).category?.name || '',
            category: (tx as any).category?.name || '',
          })),
        };
      }

      case 'getSummaryByPeriod': {
        const summary = await this.transactionsRepository.getSummary(
          userIds,
          args.startDate,
          args.endDate,
        );
        return {
          period: `${args.startDate} a ${args.endDate}`,
          income: summary.income.toFixed(2),
          expense: summary.expense.toFixed(2),
          balance: summary.balance.toFixed(2),
          incomeCount: summary.incomeCount,
          expenseCount: summary.expenseCount,
        };
      }

      case 'getCategoryBreakdownByPeriod': {
        const breakdown = await this.transactionsRepository.getCategoryBreakdown(
          userIds,
          args.startDate,
          args.endDate,
        );
        return {
          period: `${args.startDate} a ${args.endDate}`,
          categories: breakdown.map((cat) => ({
            name: cat.category?.name ?? 'Outros',
            total: cat.total.toFixed(2),
            count: cat.count,
          })),
        };
      }

      default:
        this.logger.warn(`Unknown function: ${fc.name}`);
        return { error: 'Funcao desconhecida' };
    }
  }

  private async buildFinancialContext(userIds: string[]): Promise<string> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0];

    const [summary, monthly, categoryBreakdown, recentTransactions] =
      await Promise.all([
        this.transactionsRepository.getSummary(
          userIds,
          startOfMonth,
          endOfMonth,
        ),
        this.transactionsRepository.getMonthlyBreakdown(userIds, 3),
        this.transactionsRepository.getCategoryBreakdown(
          userIds,
          startOfMonth,
          endOfMonth,
        ),
        this.transactionsRepository.findMany({
          userIds,
          skip: 0,
          take: 10,
          order: 'desc',
          orderBy: 'date',
        }),
      ]);

    const parts: string[] = [];

    parts.push(
      `### Resumo do mes atual (${now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })})`,
    );
    parts.push(`- Receitas: R$ ${summary.income.toFixed(2)}`);
    parts.push(`- Despesas: R$ ${summary.expense.toFixed(2)}`);
    parts.push(
      `- Saldo: R$ ${summary.balance.toFixed(2)} (${summary.balance >= 0 ? 'positivo' : 'negativo'})`,
    );
    parts.push(`- Total de transacoes: ${summary.incomeCount + summary.expenseCount}`);

    if (categoryBreakdown.length > 0) {
      parts.push('\n### Gastos por categoria (mes atual)');
      for (const cat of categoryBreakdown.slice(0, 5)) {
        const name = cat.category?.name ?? 'Outros';
        parts.push(`- ${name}: R$ ${cat.total.toFixed(2)} (${cat.count} transacoes)`);
      }
    }

    if (monthly.length > 0) {
      parts.push('\n### Evolucao mensal (ultimos 3 meses)');
      for (const m of monthly) {
        parts.push(
          `- ${m.month}: Receitas R$ ${m.income.toFixed(2)} | Despesas R$ ${m.expense.toFixed(2)} | Saldo R$ ${m.balance.toFixed(2)}`,
        );
      }
    }

    if (recentTransactions.data.length > 0) {
      parts.push('\n### Ultimas transacoes');
      for (const tx of recentTransactions.data.slice(0, 5)) {
        const sign = tx.type === 'INCOME' ? '+' : '-';
        const cat = (tx as any).category?.name ?? '';
        const date = new Date(tx.date).toLocaleDateString('pt-BR');
        parts.push(
          `- ${date}: ${sign}R$ ${Number(tx.amount).toFixed(2)} — ${tx.description || cat}`,
        );
      }
    }

    return parts.join('\n');
  }
}
