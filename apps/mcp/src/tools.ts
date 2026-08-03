import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ApiError, type ApiClient } from './api-client.js';

// Registra todas as tools do LemonFin num McpServer, ligadas ao cliente /v1 de
// um usuário. As descrições são escritas PARA O AGENTE: ensinam as convenções do
// app (em especial cartão vs. consumo) para que ele interprete os números certo.

// Formata o retorno de uma tool no formato esperado pelo MCP (content[]).
function ok(data: unknown) {
  return {
    content: [
      { type: 'text' as const, text: JSON.stringify(data, null, 2) },
    ],
  };
}

function fail(err: unknown) {
  const message =
    err instanceof ApiError
      ? `Erro ${err.status}: ${err.message}`
      : err instanceof Error
        ? err.message
        : 'Erro desconhecido';
  return {
    content: [{ type: 'text' as const, text: message }],
    isError: true,
  };
}

function qs(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(
    (e): e is [string, string] => e[1] !== undefined && e[1] !== '',
  );
  const s = new URLSearchParams(entries).toString();
  return s ? `?${s}` : '';
}

// Normaliza uma data ISO curta (YYYY-MM-DD) — aceita também formatos maiores,
// mantendo só o dia. Retorna undefined para valores vazios/ inválidos.
function isoDay(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const m = /^\d{4}-\d{2}-\d{2}/.exec(v.trim());
  return m ? m[0] : undefined;
}

// Período do mês corrente (YYYY-MM-DD), em horário do Brasil: do 1º dia do mês
// até HOJE — não até o fim do mês. Espelha o resolvePeriodBR do WhatsApp: "esse
// mês" significa o que já foi gasto até agora, senão a janela incluiria dias
// futuros vazios (e confundiria "quanto gastei" com "quanto vou gastar"). O
// backend interpreta o range no fuso BR; deslocamos UTC-3 para o dia civil bater.
function currentMonthRange(): { startDate: string; endDate: string } {
  const now = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const first = new Date(Date.UTC(y, m, 1));
  return {
    startDate: first.toISOString().slice(0, 10),
    endDate: now.toISOString().slice(0, 10),
  };
}

// Resolve o período de uma consulta a partir de nomes de parâmetro VARIADOS —
// agentes diferentes mandam startDate/endDate, from/to, fromPeriod/toPeriod,
// since/until, etc. Sem nenhuma data, assume o MÊS ATUAL (nunca all-time
// silencioso, que já confundiu: uma pergunta "quanto gastei esse mês" sem datas
// resolvidas trazia o total de todos os tempos). `defaulted` sinaliza que caímos
// no default para o chamador saber o período efetivo.
function resolvePeriod(args: Record<string, unknown>): {
  startDate: string;
  endDate: string;
  defaulted: boolean;
} {
  const pick = (...keys: string[]): string | undefined => {
    for (const k of keys) {
      const v = args[k];
      if (typeof v === 'string') {
        const d = isoDay(v);
        if (d) return d;
      }
    }
    return undefined;
  };
  const start = pick('startDate', 'fromPeriod', 'from', 'since', 'start');
  const end = pick('endDate', 'toPeriod', 'to', 'until', 'end');
  if (start || end) {
    // Se veio só uma ponta, completa a outra com o mês da ponta informada.
    const anchor = start ?? end!;
    const [y, m] = anchor.split('-').map(Number);
    const lastDay = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    const firstDay = `${anchor.slice(0, 7)}-01`;
    return {
      startDate: start ?? firstDay,
      endDate: end ?? lastDay,
      defaulted: false,
    };
  }
  return { ...currentMonthRange(), defaulted: true };
}

// Só resolve aliases de data, SEM aplicar default de mês atual — para tools onde
// "sem período" é uma intenção válida (listar/agrupar tudo).
function pickDates(args: Record<string, unknown>): {
  startDate?: string;
  endDate?: string;
} {
  const pick = (...keys: string[]): string | undefined => {
    for (const k of keys) {
      const v = args[k];
      if (typeof v === 'string') {
        const d = isoDay(v);
        if (d) return d;
      }
    }
    return undefined;
  };
  return {
    startDate: pick('startDate', 'fromPeriod', 'from', 'since', 'start'),
    endDate: pick('endDate', 'toPeriod', 'to', 'until', 'end'),
  };
}

// Aliases de data comuns, para incluir no inputSchema das tools que filtram por
// período (o SDK descarta chaves fora do schema antes do handler).
const dateAliasSchema = {
  fromPeriod: z.string().optional().describe('Alias de startDate.'),
  toPeriod: z.string().optional().describe('Alias de endDate.'),
  from: z.string().optional().describe('Alias de startDate.'),
  to: z.string().optional().describe('Alias de endDate.'),
  since: z.string().optional().describe('Alias de startDate.'),
  until: z.string().optional().describe('Alias de endDate.'),
};

export function registerTools(server: McpServer, api: ApiClient): void {
  server.registerTool(
    'get_summary',
    {
      title: 'Resumo financeiro',
      description:
        'Totais do período. Período: use `startDate` e `endDate` no formato ISO YYYY-MM-DD (ex: startDate=2026-08-01, endDate=2026-08-31). SEM datas, assume o MÊS ATUAL (1º até hoje). Para "quanto gastei", use o campo `totalSpent` — ele JÁ soma consumo (fora-cartão) + cartão. `expenseOnCard`/`expenseOutOfCard` mostram a divisão; `cardInvoice` é a fatura do ciclo (≠ gasto do mês). Cada campo é explicado no `_meta` da resposta.',
      inputSchema: {
        startDate: z
          .string()
          .optional()
          .describe('Início do período, ISO YYYY-MM-DD (ex: 2026-08-01).'),
        endDate: z
          .string()
          .optional()
          .describe('Fim do período, ISO YYYY-MM-DD (ex: 2026-08-31).'),
        // Aliases aceitos porque agentes variam o nome do parâmetro. Sem eles no
        // schema, o SDK descartaria antes do handler e a consulta cairia no
        // default (mês atual) mesmo com o agente "tendo mandado" a data.
        fromPeriod: z.string().optional().describe('Alias de startDate.'),
        toPeriod: z.string().optional().describe('Alias de endDate.'),
        from: z.string().optional().describe('Alias de startDate.'),
        to: z.string().optional().describe('Alias de endDate.'),
        since: z.string().optional().describe('Alias de startDate.'),
        until: z.string().optional().describe('Alias de endDate.'),
      },
    },
    async (args) => {
      try {
        const { startDate, endDate, defaulted } = resolvePeriod(args);
        const raw = (await api.get(
          `/v1/summary${qs({ startDate, endDate })}`,
        )) as Record<string, number | undefined>;

        // AGREGAÇÃO NO SERVIDOR — não delegar a soma ao modelo. O `expense` do
        // backend é SÓ consumo fora-cartão; num mês "só cartão" vale 0. O gasto
        // real = expense + cardExpense. Espelha o getSummaryByPeriod do assessor
        // do chat (chat-completion.use-case.ts): entrega campos INEQUÍVOCOS já
        // somados, para o agente nunca subcontar por não somar sozinho.
        const expenseOutOfCard = Number(raw.expense ?? 0);
        const expenseOnCard = Number(raw.cardExpense ?? 0);
        const totalSpent = expenseOutOfCard + expenseOnCard;

        return ok({
          period: `${startDate} a ${endDate}`,
          income: Number(raw.income ?? 0),
          // "quanto gastei" = ESTE campo (consumo + cartão). Já vem somado.
          totalSpent,
          expenseOnCard, // gasto no cartão no período (mês civil)
          expenseOutOfCard, // consumo pix/débito fora do cartão
          cardInvoice: raw.cardInvoice, // fatura do CICLO de fechamento (≠ mês)
          invoicePayment: raw.invoicePayment, // quitação de fatura (saída de caixa)
          balance: raw.balance,
          incomeCount: raw.incomeCount,
          expenseCount: raw.expenseCount,
          _period: { startDate, endDate, defaultedToCurrentMonth: defaulted },
          _meta: {
            totalSpent:
              'GASTO TOTAL do período (consumo fora-cartão + cartão). Use este para "quanto gastei".',
            expenseOnCard: 'Parte do gasto que foi no cartão (mês civil).',
            expenseOutOfCard: 'Parte do gasto em pix/débito, fora do cartão.',
            cardInvoice:
              'Fatura do CICLO de fechamento do cartão (número da tela de cartões). Diferente de expenseOnCard, que é o mês civil.',
            invoicePayment:
              'Quanto foi pago de fatura no período. Saída de caixa, mas NÃO é gasto novo (as compras já contaram no cartão).',
            balance:
              'Fluxo de caixa: income − expenseOutOfCard − invoicePayment.',
          },
        });
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'list_transactions',
    {
      title: 'Listar transações',
      description:
        'Lista transações, paginada. Por padrão agrupa compras parceladas numa linha só. Use os filtros para recortar (tipo, categoria, texto, período, membro da família).',
      inputSchema: {
        type: z.enum(['INCOME', 'EXPENSE']).optional(),
        search: z.string().optional().describe('Busca por descrição.'),
        startDate: z
          .string()
          .optional()
          .describe('Início do período, ISO YYYY-MM-DD.'),
        endDate: z
          .string()
          .optional()
          .describe('Fim do período, ISO YYYY-MM-DD.'),
        ...dateAliasSchema,
        page: z.number().int().positive().optional(),
        perPage: z.number().int().positive().max(100).optional(),
      },
    },
    async (args) => {
      try {
        const { startDate, endDate } = pickDates(args);
        const params: Record<string, string | undefined> = {
          type: args.type,
          search: args.search,
          startDate,
          endDate,
          page: args.page?.toString(),
          perPage: args.perPage?.toString(),
        };
        return ok(await api.get(`/v1/transactions${qs(params)}`));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'create_transaction',
    {
      title: 'Criar transação',
      description:
        'Cria uma receita ou despesa. Para gasto no cartão, informe `cardId`. Para parcelar, informe `installments` (2–48): nesse caso `amount` é o valor TOTAL da compra e o backend cria as parcelas.',
      inputSchema: {
        amount: z.number().positive().describe('Valor (> 0).'),
        type: z.enum(['INCOME', 'EXPENSE']),
        categoryId: z.string().describe('ID da categoria (obrigatório).'),
        description: z.string().optional(),
        date: z
          .string()
          .optional()
          .describe('Data ISO. Default: hoje.'),
        cardId: z
          .string()
          .optional()
          .describe('ID do cartão, para gasto no cartão.'),
        installments: z
          .number()
          .int()
          .min(2)
          .max(48)
          .optional()
          .describe('Nº de parcelas (2–48). amount vira o total da compra.'),
      },
    },
    async (args) => {
      try {
        return ok(await api.post('/v1/transactions', args));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'get_category_breakdown',
    {
      title: 'Gasto por categoria',
      description:
        'Despesas agrupadas por categoria no período (ISO YYYY-MM-DD em `startDate`/`endDate`). SEM datas, assume o MÊS ATUAL. Exclui a categoria de sistema de pagamento de fatura (não é consumo novo).',
      inputSchema: {
        startDate: z
          .string()
          .optional()
          .describe('Início do período, ISO YYYY-MM-DD.'),
        endDate: z
          .string()
          .optional()
          .describe('Fim do período, ISO YYYY-MM-DD.'),
        ...dateAliasSchema,
      },
    },
    async (args) => {
      try {
        const { startDate, endDate, defaulted } = resolvePeriod(args);
        const result = await api.get(
          `/v1/by-category${qs({ startDate, endDate })}`,
        );
        return ok({
          categories: result,
          _period: { startDate, endDate, defaultedToCurrentMonth: defaulted },
          _meta: {
            total:
              'Este breakdown INCLUI gasto no cartão (ao contrário do campo `expenseOutOfCard` de get_summary, que é só fora-cartão). A soma dos `total` das categorias corresponde ao `totalSpent` de get_summary no mesmo período.',
          },
        });
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'get_insights',
    {
      title: 'Insights financeiros',
      description:
        'Observações automáticas sobre os gastos (tendências, categorias em alta, comparativos).',
      inputSchema: {},
    },
    async () => {
      try {
        return ok(await api.get('/v1/insights'));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'get_forecast',
    {
      title: 'Previsão do mês',
      description:
        'Projeção de fechamento do mês corrente a partir do realizado até agora.',
      inputSchema: {},
    },
    async () => {
      try {
        return ok(await api.get('/v1/forecast'));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'list_cards',
    {
      title: 'Listar cartões',
      description:
        'Cartões da conta com o gasto do ciclo de fatura aberto (`currentSpend`). Use o `id` de um cartão ao criar transações de cartão.',
      inputSchema: {},
    },
    async () => {
      try {
        return ok(await api.get('/v1/cards'));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'get_goals',
    {
      title: 'Metas de gasto',
      description:
        'Metas de gasto (teto por categoria) com progresso: limite, gasto no período, % usado, quanto resta e se estourou (`exceeded`). Use para "como estão minhas metas", "estou dentro da meta de X", "posso gastar mais em Y".',
      inputSchema: {},
    },
    async () => {
      try {
        return ok(await api.get('/v1/goals'));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'get_reserves',
    {
      title: 'Reservas / poupança',
      description:
        'Reservas (objetivos de poupança): valor-alvo, quanto já foi guardado, % concluído, prazo e aporte mensal sugerido. Use para "quanto já juntei", "quando completo a reserva da viagem".',
      inputSchema: {},
    },
    async () => {
      try {
        return ok(await api.get('/v1/reserves'));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'get_recurring',
    {
      title: 'Contas fixas / assinaturas',
      description:
        'Transações recorrentes ativas (contas fixas, assinaturas): descrição, valor, tipo, dia do mês e categoria. Use para "quais minhas assinaturas", "quanto pago de contas fixas por mês".',
      inputSchema: {},
    },
    async () => {
      try {
        return ok(await api.get('/v1/recurring'));
      } catch (err) {
        return fail(err);
      }
    },
  );
}
