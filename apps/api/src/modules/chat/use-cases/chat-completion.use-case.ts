import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';
import { AiFeature } from '@prisma/client';
import { TransactionsRepository } from '../../transactions/repositories/transactions.repository';
import { GetForecastUseCase } from '../../transactions/use-cases/get-forecast.use-case';
import { GetInsightsUseCase } from '../../transactions/use-cases/get-insights.use-case';
import { ListGoalsUseCase } from '../../goals/use-cases/list-goals.use-case';
import { ReservesRepository } from '../../reserves/repositories/reserves.repository';
import { computeReserveProgress } from '../../reserves/reserve-progress';
import { RecurringRepository } from '../../recurring/repositories/recurring.repository';
import { CardsRepository } from '../../cards/repositories/cards.repository';
import { cardCycleRange, nextDueDate } from '../../cards/utils/card-cycle';
import { FamilyContextService } from '../../families/services/family-context.service';
import { AiUsageService } from '../../ai-usage/ai-usage.service';
import { AdvisorMemoryRepository } from '../repositories/advisor-memory.repository';
import type { ChatMessageInput } from '../dtos/chat.dto';

// O contexto financeiro (resumo do mês, breakdown, evolução, últimas
// transações) custa 4 queries e é reconstruído a cada mensagem do chat. Cache
// curto (2min) evita refazer isso em conversas com várias mensagens seguidas.
const CONTEXT_CACHE_TTL = 2 * 60 * 1000; // 2min

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
- Seu foco e financas pessoais do usuario. Se ele te cumprimentar, perguntar seu nome/como vai, ou trocar uma palavra leve ("bom dia", "tudo bem?", "qual meu nome?"), responda de forma breve, humana e calorosa (use o nome dele quando souber) e reconduza com gentileza para as financas. Para assuntos totalmente fora do escopo (noticias, esportes, codigo, etc.), diga com simpatia que esse nao e o seu forte e lembre no que voce ajuda.

## Funcoes disponiveis:
- Voce tem acesso a funcoes para consultar transacoes, resumos e gastos por categoria em qualquer periodo — e tambem METAS de gasto, RESERVAS, contas fixas, faturas de cartao, previsao de fim de mes e insights do mes.
- O "Contexto financeiro atual" abaixo cobre APENAS o mes corrente inteiro. Ele NAO serve para responder sobre um dia, uma semana ou qualquer recorte mais especifico — nesses casos os numeros do mes estao errados para a pergunta.
- Por isso, quando o usuario pedir QUALQUER recorte que nao seja "o mes inteiro" — incluindo "hoje", "ontem", "essa semana", "semana passada", uma data, um intervalo, um mes diferente do atual — voce DEVE chamar a funcao apropriada (getSummaryByPeriod / queryTransactions / getCategoryBreakdownByPeriod) com as datas certas. NUNCA responda esses recortes com os numeros do mes do contexto, nem derive o dia a partir do total do mes.
- "resumo do dia" / "como foi meu dia" / "gastei com o que hoje" => use as funcoes com startDate=endDate=hoje. Para "hoje", startDate e endDate sao a data de hoje informada abaixo.
- So responda direto do contexto (sem funcao) quando a pergunta for claramente sobre o mes inteiro corrente ou um panorama geral.
- Perguntas sobre METAS de gasto ("como estao minhas metas", "estou dentro da meta de alimentacao", "posso gastar mais X?") => chame getSpendingGoals. NUNCA responda sobre metas sem chamar a funcao.
- Perguntas sobre RESERVAS/poupanca/objetivos ("quanto ja juntei", "quando completo a reserva da viagem") => chame getReserves.
- Perguntas sobre contas fixas/assinaturas ("quais minhas assinaturas", "quanto pago de contas fixas") => chame getRecurringTransactions.
- Perguntas sobre cartao/fatura ("quanto ta minha fatura", "quando vence o cartao") => chame getCardsAndInvoices.
- Perguntas sobre o futuro do mes ("quanto vai sobrar", "fecho o mes no azul?", "da pra gastar mais?") => chame getMonthEndForecast.
- Pedidos de analise/diagnostico do mes ("como estou indo", "onde estou gastando mais que antes", "me da um panorama") => chame getSpendingInsights e combine com o contexto.
- Ao aconselhar (ex.: "da pra comprar X?", "como economizo?"), cruze os dados: metas estouradas, previsao de fim de mes, contas fixas ainda por vencer e fatura aberta mudam a resposta. Prefira chamar as funcoes relevantes a supor.

## Memoria de longo prazo:
- A secao "O que voce lembra deste usuario" (abaixo) traz fatos salvos de conversas passadas. Use-os com naturalidade para personalizar respostas e conselhos — sem recitar a lista nem citar os ids.
- Quando o usuario contar algo ESTAVEL e util para conselhos futuros — um objetivo ("quero quitar o cartao ate dezembro"), contexto de vida (profissao, renda variavel, filhos, mudanca, casamento marcado), uma preferencia ("nao abro mao de delivery") ou uma decisao combinada com voce ("vamos limitar lazer a R$ 300") — chame rememberFact com UMA frase curta e autocontida.
- NAO salve o que ja esta no sistema (transacoes, metas, reservas, contas fixas, faturas) nem fatos que ja aparecem na lista. Nao salve dados sensiveis alheios as financas (saude, religiao, politica).
- Se o usuario pedir para esquecer algo, ou um fato lembrado estiver errado/desatualizado, chame forgetFact com o id do fato (e rememberFact com a versao nova, se houver).
- Se o usuario perguntar o que voce sabe/lembra sobre ele, responda a partir da lista, de forma transparente e amigavel — e diga que ele pode pedir para voce esquecer qualquer item.`;

const MODEL = 'gpt-4o-mini';

const tools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'queryTransactions',
      description:
        'Busca transacoes do usuario num periodo. Use para "o que gastei hoje/ontem/semana passada", "minhas compras de X". O campo `date` de cada item e a DATA DA COMPRA (nao a data de vencimento de parcela). Compras parceladas vem como UMA linha com `amount` = valor TOTAL da compra e `parcelado` = "Nx"; elas aparecem no periodo em que foram COMPRADAS, entao se uma compra parcelada nao esta no resultado de "hoje", ela NAO foi comprada hoje.',
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
            description:
              'Filtro por tipo: INCOME ou EXPENSE. Omita para buscar ambos.',
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
        'Resumo financeiro de um periodo. Use para "quanto gastei ontem", "quanto entrou semana passada". O campo `expense` ja e o gasto TOTAL (inclui cartao) — use ele para "quanto gastei". `expenseOnCard` e a parte no cartao e `expenseOutOfCard` a parte fora do cartao (que sai do bolso); `balance` desconta so o fora-cartao.',
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
  {
    type: 'function',
    function: {
      name: 'getSpendingGoals',
      description:
        'Metas de GASTO do usuario (teto por categoria) com o progresso do periodo atual: limite, quanto ja gastou, %, quanto resta e se estourou. Use para "como estao minhas metas", "estou dentro da meta de X", "quanto ainda posso gastar em Y".',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getReserves',
      description:
        'Reservas de poupanca do usuario (objetivos de juntar dinheiro): valor-alvo, quanto ja guardou, %, quanto falta, prazo e aporte mensal sugerido. Use para "quanto ja juntei", "como esta a reserva da viagem", "quando completo o objetivo".',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getRecurringTransactions',
      description:
        'Contas fixas e assinaturas ativas (despesas e receitas recorrentes mensais): descricao, valor, dia do mes e categoria. Use para "quais minhas contas fixas/assinaturas", "quanto pago por mes de fixo", "quando cai o aluguel".',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getCardsAndInvoices',
      description:
        'Cartoes do usuario com a FATURA ABERTA de cada um: total lancado, quantidade de compras, quando o ciclo fecha e quando vence. Use para "quanto ta minha fatura", "quando vence o cartao", "quanto ja gastei no Nubank".',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getMonthEndForecast',
      description:
        'Previsao de fim do mes: saldo atual, saldo projetado, receitas/despesas recorrentes que ainda vao cair, gasto variavel estimado e dias restantes. Use para "quanto vai sobrar", "fecho o mes no azul?", "da pra gastar mais?".',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'rememberFact',
      description:
        'Salva na memoria de longo prazo UM fato estavel que o usuario contou e que melhora conselhos futuros (objetivo, contexto de vida, preferencia, decisao combinada). NAO use para dados que ja estao no sistema (transacoes, metas, reservas, contas fixas) nem para fatos ja presentes na lista "O que voce lembra deste usuario".',
      parameters: {
        type: 'object',
        properties: {
          fact: {
            type: 'string',
            description:
              'O fato, em UMA frase curta e autocontida, em portugues. Ex: "Quer quitar a fatura do cartao ate dezembro de 2026".',
          },
        },
        required: ['fact'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'forgetFact',
      description:
        'Apaga um fato da memoria de longo prazo. Use quando o usuario pedir para esquecer algo, quando um fato estiver errado/desatualizado, ou antes de salvar a versao corrigida.',
      parameters: {
        type: 'object',
        properties: {
          memoryId: {
            type: 'string',
            description:
              'O id do fato, como aparece entre colchetes na lista "O que voce lembra deste usuario".',
          },
        },
        required: ['memoryId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getSpendingInsights',
      description:
        'Analise do mes atual vs anterior: variacao geral, categorias que mais cresceram/cairam e alertas de gasto acelerado. Use para "como estou indo", "onde estou gastando mais que antes", pedidos de diagnostico/panorama.',
      parameters: { type: 'object', properties: {} },
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
    private readonly aiUsage: AiUsageService,
    private readonly listGoals: ListGoalsUseCase,
    private readonly reservesRepository: ReservesRepository,
    private readonly recurringRepository: RecurringRepository,
    private readonly cardsRepository: CardsRepository,
    private readonly getForecast: GetForecastUseCase,
    private readonly getInsights: GetInsightsUseCase,
    private readonly advisorMemories: AdvisorMemoryRepository,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    this.openai = new OpenAI({
      apiKey: this.config.getOrThrow<string>('OPENAI_API_KEY'),
    });
  }

  // Consome o stream e devolve a resposta completa de uma vez. Usado por canais
  // sem streaming (ex: WhatsApp), reaproveitando todo o motor (contexto + tools).
  async executeSync(
    userId: string,
    input: ChatMessageInput,
    userName?: string,
  ): Promise<string> {
    let full = '';
    for await (const chunk of this.execute(userId, input, userName)) {
      full += chunk;
    }
    return full.trim();
  }

  async *execute(userId: string, input: ChatMessageInput, userName?: string) {
    this.logger.log(`Chat request from user ${userId}: "${input.message}"`);

    const userIds = await this.familyContext.resolveUserIds(userId);
    const context = await this.getFinancialContext(userIds);

    // Memória de longo prazo: fatos do USUÁRIO que conversa (não da família —
    // contexto pessoal). Sem cache: é 1 query leve e o modelo pode ter acabado
    // de salvar/apagar um fato na mensagem anterior.
    const memories = await this.advisorMemories.list(userId);
    const memoriesBlock =
      memories.length > 0
        ? memories.map((m) => `- [${m.id}] ${m.content}`).join('\n')
        : '(nenhum fato salvo ainda)';

    // "Hoje" no fuso do usuario (Brasil) — toISOString() daria a data em UTC,
    // que vira o dia seguinte a partir das 21h locais. en-CA formata YYYY-MM-DD.
    const today = new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/Sao_Paulo',
    });
    const nameLine = userName ? `\nNome do usuario: ${userName}` : '';
    const systemInstruction = `${SYSTEM_PROMPT}\n\nData de hoje: ${today}${nameLine}\n\n## O que voce lembra deste usuario (conversas passadas):\n${memoriesBlock}\n\n## Contexto financeiro atual do usuario:\n${context}`;

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
    // Acumula tokens de todos os turnos (cada turno é uma chamada à OpenAI).
    let promptTokens = 0;
    let completionTokens = 0;

    const MAX_TURNS = 5;
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const stream = await this.openai.chat.completions.create({
        model: MODEL,
        messages,
        tools,
        stream: true,
        // No streaming, usage só vem se pedirmos explicitamente — chega num
        // chunk final com choices vazio.
        stream_options: { include_usage: true },
      });

      let content = '';
      const toolCalls: {
        id: string;
        name: string;
        arguments: string;
      }[] = [];

      for await (const chunk of stream) {
        // O chunk final (com include_usage) traz usage e choices vazio.
        if (chunk.usage) {
          promptTokens += chunk.usage.prompt_tokens ?? 0;
          completionTokens += chunk.usage.completion_tokens ?? 0;
        }
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        if (delta.content) {
          content += delta.content;
          this.logger.debug(
            `Chunk received: "${delta.content.slice(0, 50)}..."`,
          );
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
            userId,
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

    // Registra o consumo acumulado de IA (falha graciosa).
    await this.aiUsage.record({
      userId,
      feature: AiFeature.CHAT,
      model: MODEL,
      promptTokens,
      completionTokens,
    });
  }

  private async executeFunctionCall(
    name: string,
    rawArgs: string,
    userId: string,
    userIds: string[],
  ): Promise<Record<string, unknown>> {
    let args: Record<string, string>;
    try {
      args = rawArgs ? JSON.parse(rawArgs) : {};
    } catch {
      this.logger.warn(`Failed to parse args for ${name}: ${rawArgs}`);
      return { error: 'Argumentos invalidos' };
    }
    this.logger.log(
      `Executing function ${name} with args: ${JSON.stringify(args)}`,
    );

    switch (name) {
      case 'queryTransactions': {
        // AGRUPA compras parceladas numa linha (a compra), ancorada na DATA DA
        // COMPRA (1ª parcela). Sem isto (findMany flat) o assessor via cada
        // parcela solta com a `date` do vencimento — uma parcela de uma compra
        // antiga aparecia com data futura (ex. 2027) e ele dizia "comprou hoje".
        const { data, total } =
          await this.transactionsRepository.findManyGrouped({
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
          transactions: data.map((tx) => {
            const t = tx as typeof tx & {
              installmentTotal?: number | null;
              installmentSum?: number | null;
              category?: { name?: string };
            };
            const isParcelada =
              (t.installmentTotal ?? 0) >= 2 && t.installmentSum != null;
            return {
              // Para compra parcelada, esta é a DATA DA COMPRA (1ª parcela), não
              // a do vencimento de cada parcela.
              date: new Date(tx.date).toLocaleDateString('pt-BR'),
              // Compra parcelada: valor TOTAL da compra; senão o valor da transação.
              amount: (isParcelada
                ? t.installmentSum!
                : Number(tx.amount)
              ).toFixed(2),
              type: tx.type,
              description: tx.description || t.category?.name || '',
              category: t.category?.name || '',
              ...(isParcelada ? { parcelado: `${t.installmentTotal}x` } : {}),
            };
          }),
        };
      }

      case 'getSummaryByPeriod': {
        const summary = await this.transactionsRepository.getSummary(
          userIds,
          args.startDate,
          args.endDate,
        );
        // `expense` do getSummary é só fora-cartão (gasto que sai do bolso); o
        // gasto no cartão vira `cardExpense`. Para o assessor, "quanto gastei" =
        // gasto TOTAL — senão num período em que tudo foi no cartão respondia
        // R$ 0,00. Expomos os três: total, fora-cartão e cartão, sem ambiguidade.
        const totalExpense = summary.expense + summary.cardExpense;
        return {
          period: `${args.startDate} a ${args.endDate}`,
          income: summary.income.toFixed(2),
          // expense = gasto TOTAL (fora-cartão + cartão) — use este para "quanto gastei".
          expense: totalExpense.toFixed(2),
          expenseOutOfCard: summary.expense.toFixed(2),
          expenseOnCard: summary.cardExpense.toFixed(2),
          balance: summary.balance.toFixed(2),
          incomeCount: summary.incomeCount,
          expenseCount: summary.expenseCount,
        };
      }

      case 'getCategoryBreakdownByPeriod': {
        const breakdown =
          await this.transactionsRepository.getCategoryBreakdown(
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

      case 'getSpendingGoals': {
        const goals = await this.listGoals.execute(userId);
        if (goals.length === 0) {
          return { goals: [], note: 'O usuario nao tem metas de gasto.' };
        }
        return {
          goals: goals.map((g) => ({
            category: g.category?.name ?? 'Geral',
            period: g.period,
            limit: g.progress.limit.toFixed(2),
            spent: g.progress.spent.toFixed(2),
            percentage: g.progress.percentage,
            remaining: g.progress.remaining.toFixed(2),
            exceeded: g.progress.exceeded,
          })),
        };
      }

      case 'getReserves': {
        const reserves = await this.reservesRepository.findMany(userIds);
        if (reserves.length === 0) {
          return { reserves: [], note: 'O usuario nao tem reservas.' };
        }
        return {
          reserves: reserves.map((r) => {
            const target = r.targetAmount.toNumber();
            const saved = r.savedAmount.toNumber();
            const progress = computeReserveProgress(target, saved, r.deadline);
            return {
              name: r.name,
              target: target.toFixed(2),
              saved: saved.toFixed(2),
              percentage: progress.percentage,
              remaining: progress.remaining.toFixed(2),
              deadline: r.deadline.toISOString().split('T')[0],
              suggestedMonthly: progress.suggestedMonthly.toFixed(2),
              completed: !r.active && saved >= target,
            };
          }),
        };
      }

      case 'getRecurringTransactions': {
        const recurrings = await this.recurringRepository.findMany(
          userIds,
          true,
        );
        if (recurrings.length === 0) {
          return {
            recurring: [],
            note: 'O usuario nao tem contas fixas cadastradas.',
          };
        }
        const items = recurrings.map((r) => ({
          description: r.description,
          amount: r.amount.toNumber().toFixed(2),
          type: r.type,
          dayOfMonth: r.dayOfMonth,
          category: r.category?.name ?? '',
        }));
        const monthlyExpense = recurrings
          .filter((r) => r.type === 'EXPENSE')
          .reduce((sum, r) => sum + r.amount.toNumber(), 0);
        const monthlyIncome = recurrings
          .filter((r) => r.type === 'INCOME')
          .reduce((sum, r) => sum + r.amount.toNumber(), 0);
        return {
          recurring: items,
          monthlyExpenseTotal: monthlyExpense.toFixed(2),
          monthlyIncomeTotal: monthlyIncome.toFixed(2),
        };
      }

      case 'getCardsAndInvoices': {
        const cards = await this.cardsRepository.findMany(userIds);
        if (cards.length === 0) {
          return { cards: [], note: 'O usuario nao tem cartoes cadastrados.' };
        }
        const now = new Date();
        const ref = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
        );
        const result = await Promise.all(
          cards.map(async (card) => {
            // Mesma régua de ciclo da tela /cartoes e do WhatsApp
            // (cardCycleRange em UTC — fonte única do recorte de fatura).
            const { start, end } = cardCycleRange(card.closingDay, ref);
            const { total, count } =
              await this.transactionsRepository.getCardSummary(
                userIds,
                card.id,
                start.toISOString(),
                end.toISOString(),
              );
            return {
              name: card.name,
              openInvoiceTotal: total.toFixed(2),
              purchases: count,
              closesAt: end.toISOString().split('T')[0],
              dueDate:
                card.dueDay != null
                  ? nextDueDate(card.dueDay, end).toISOString().split('T')[0]
                  : null,
            };
          }),
        );
        return { cards: result };
      }

      case 'getMonthEndForecast': {
        const forecast = await this.getForecast.execute(userId);
        return {
          currentBalance: forecast.currentBalance.toFixed(2),
          projectedBalance: forecast.projectedBalance.toFixed(2),
          pendingIncome: forecast.pendingIncome.toFixed(2),
          pendingExpense: forecast.pendingExpense.toFixed(2),
          estimatedVariableExpense:
            forecast.estimatedVariableExpense.toFixed(2),
          daysRemaining: forecast.daysRemaining,
          pendingRecurrences: forecast.pending.map((p) => ({
            description: p.description,
            amount: p.amount.toFixed(2),
            type: p.type,
            dayOfMonth: p.dayOfMonth,
          })),
        };
      }

      case 'getSpendingInsights': {
        const insights = await this.getInsights.execute(userId);
        const comparison = (c: {
          category: { name: string } | null;
          currentTotal: number;
          previousTotal: number;
          variation: number;
        }) => ({
          category: c.category?.name ?? 'Outros',
          current: c.currentTotal.toFixed(2),
          previous: c.previousTotal.toFixed(2),
          variationPercent: c.variation,
        });
        return {
          currentMonth: insights.currentMonth,
          previousMonth: insights.previousMonth,
          overallVariationPercent: insights.overallVariation,
          topGrowing: insights.topGrowing.map(comparison),
          topShrinking: insights.topShrinking.map(comparison),
          alerts: insights.alerts.map((a) => ({
            category: a.category?.name ?? 'Outros',
            current: a.currentTotal.toFixed(2),
            previousMonthTotal: a.previousTotal.toFixed(2),
            percentOfPrevious: a.percentOfPrevious,
            daysRemaining: a.daysRemaining,
          })),
        };
      }

      case 'rememberFact': {
        const fact = (args.fact ?? '').trim();
        if (!fact) return { error: 'Fato vazio' };
        const saved = await this.advisorMemories.remember(userId, fact);
        return saved.deduped
          ? {
              saved: false,
              memoryId: saved.id,
              note: 'Fato ja estava na memoria.',
            }
          : { saved: true, memoryId: saved.id };
      }

      case 'forgetFact': {
        const id = (args.memoryId ?? '').trim();
        if (!id) return { error: 'memoryId vazio' };
        const forgotten = await this.advisorMemories.forget(userId, id);
        return forgotten
          ? { forgotten: true }
          : {
              forgotten: false,
              note: 'Fato nao encontrado (id invalido ou ja apagado).',
            };
      }

      default:
        this.logger.warn(`Unknown function: ${name}`);
        return { error: 'Funcao desconhecida' };
    }
  }

  // Wrapper com cache curto (2min). Chave estável por conjunto de userIds
  // (família = vários IDs), ordenada para não depender da ordem de resolução.
  private async getFinancialContext(userIds: string[]): Promise<string> {
    const key = `chat:context:${[...userIds].sort().join(',')}`;
    const cached = await this.cache.get<string>(key);
    if (cached) return cached;

    const context = await this.buildFinancialContext(userIds);
    await this.cache.set(key, context, CONTEXT_CACHE_TTL);
    return context;
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
    parts.push(
      `- Total de transacoes: ${summary.incomeCount + summary.expenseCount}`,
    );

    if (categoryBreakdown.length > 0) {
      parts.push('\n### Gastos por categoria (mes atual)');
      for (const cat of categoryBreakdown.slice(0, 5)) {
        const name = cat.category?.name ?? 'Outros';
        parts.push(
          `- ${name}: R$ ${cat.total.toFixed(2)} (${cat.count} transacoes)`,
        );
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
