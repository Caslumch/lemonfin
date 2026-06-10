import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';
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

const MODEL = 'gpt-4o-mini';

const tools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'queryTransactions',
      description:
        'Busca transacoes do usuario em um periodo especifico. Use quando o usuario perguntar sobre transacoes de um periodo como "hoje", "ontem", "semana passada", "mes passado", etc.',
      parameters: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            description: 'Data inicial no formato YYYY-MM-DD',
          },
          endDate: {
            type: 'string',
            description: 'Data final no formato YYYY-MM-DD',
          },
          type: {
            type: 'string',
            description: 'Filtro por tipo: INCOME ou EXPENSE. Omita para buscar ambos.',
          },
        },
        required: ['startDate', 'endDate'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getSummaryByPeriod',
      description:
        'Retorna o resumo financeiro (receitas, despesas, saldo) de um periodo especifico. Use quando o usuario perguntar "quanto gastei ontem", "quanto entrou semana passada", etc.',
      parameters: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            description: 'Data inicial no formato YYYY-MM-DD',
          },
          endDate: {
            type: 'string',
            description: 'Data final no formato YYYY-MM-DD',
          },
        },
        required: ['startDate', 'endDate'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getCategoryBreakdownByPeriod',
      description:
        'Retorna gastos agrupados por categoria em um periodo especifico. Use quando o usuario perguntar "no que mais gastei semana passada", "categorias de gasto de janeiro", etc.',
      parameters: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            description: 'Data inicial no formato YYYY-MM-DD',
          },
          endDate: {
            type: 'string',
            description: 'Data final no formato YYYY-MM-DD',
          },
        },
        required: ['startDate', 'endDate'],
      },
    },
  },
];

@Injectable()
export class ChatCompletionUseCase {
  private readonly logger = new Logger(ChatCompletionUseCase.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly config: ConfigService,
    private readonly transactionsRepository: TransactionsRepository,
    private readonly familyContext: FamilyContextService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.config.getOrThrow<string>('OPENAI_API_KEY'),
    });
  }

  async *execute(userId: string, input: ChatMessageInput) {
    this.logger.log(`Chat request from user ${userId}: "${input.message}"`);

    const userIds = await this.familyContext.resolveUserIds(userId);
    const context = await this.buildFinancialContext(userIds);

    const today = new Date().toISOString().split('T')[0];
    const systemInstruction = `${SYSTEM_PROMPT}\n\nData de hoje: ${today}\n\n## Contexto financeiro atual do usuario:\n${context}`;

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemInstruction },
      ...input.history.map((msg) => ({
        role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
        content: msg.content,
      })),
      { role: 'user', content: input.message },
    ];

    this.logger.log('Starting OpenAI stream...');

    // Loop to support chained tool calls. Each turn streams text to the user;
    // if the model requests tool calls, we execute them, append the results,
    // and loop again until the model produces a final answer with no tool calls.
    const MAX_TURNS = 5;
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const stream = await this.openai.chat.completions.create({
        model: MODEL,
        messages,
        tools,
        stream: true,
      });

      let content = '';
      const toolCalls: {
        id: string;
        name: string;
        arguments: string;
      }[] = [];

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        if (delta.content) {
          content += delta.content;
          this.logger.debug(`Chunk received: "${delta.content.slice(0, 50)}..."`);
          yield delta.content;
        }

        // Tool-call deltas arrive incrementally and must be assembled by index.
        for (const tc of delta.tool_calls ?? []) {
          const slot = (toolCalls[tc.index] ??= {
            id: '',
            name: '',
            arguments: '',
          });
          if (tc.id) slot.id = tc.id;
          if (tc.function?.name) slot.name += tc.function.name;
          if (tc.function?.arguments) slot.arguments += tc.function.arguments;
        }
      }

      if (toolCalls.length === 0) {
        // No tool calls — the model gave its final answer.
        break;
      }

      this.logger.log(
        `Function calls requested: ${toolCalls.map((tc) => tc.name).join(', ')}`,
      );

      // Append the assistant's tool-call request to the conversation.
      messages.push({
        role: 'assistant',
        content: content || null,
        tool_calls: toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.name, arguments: tc.arguments },
        })),
      });

      // Execute each tool call and append its result.
      const results = await Promise.all(
        toolCalls.map(async (tc) => {
          const result = await this.executeFunctionCall(
            tc.name,
            tc.arguments,
            userIds,
          );
          return {
            role: 'tool' as const,
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          };
        }),
      );
      messages.push(...results);
    }

    this.logger.log('Stream completed');
  }

  private async executeFunctionCall(
    name: string,
    rawArgs: string,
    userIds: string[],
  ): Promise<Record<string, unknown>> {
    let args: Record<string, string>;
    try {
      args = rawArgs ? JSON.parse(rawArgs) : {};
    } catch {
      this.logger.warn(`Failed to parse args for ${name}: ${rawArgs}`);
      return { error: 'Argumentos invalidos' };
    }
    this.logger.log(`Executing function ${name} with args: ${JSON.stringify(args)}`);

    switch (name) {
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
        this.logger.warn(`Unknown function: ${name}`);
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
