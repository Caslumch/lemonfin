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

export function registerTools(server: McpServer, api: ApiClient): void {
  server.registerTool(
    'get_summary',
    {
      title: 'Resumo financeiro',
      description:
        'Totais do período (receita, gasto, saldo, fatura). IMPORTANTE: gasto no cartão NÃO entra em `expense` (que é só consumo pix/débito) — está em `cardExpense` (no mês) e `cardInvoice` (fatura do ciclo). Para "quanto gastei", some `expense` + `cardExpense`, ou use `cardInvoice` para a fatura. A resposta traz um bloco `_meta` explicando cada campo.',
      inputSchema: {
        startDate: z
          .string()
          .optional()
          .describe('Início do período, ISO (ex: 2026-08-01).'),
        endDate: z
          .string()
          .optional()
          .describe('Fim do período, ISO (ex: 2026-08-31).'),
      },
    },
    async ({ startDate, endDate }) => {
      try {
        return ok(await api.get(`/v1/summary${qs({ startDate, endDate })}`));
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
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        page: z.number().int().positive().optional(),
        perPage: z.number().int().positive().max(100).optional(),
      },
    },
    async (args) => {
      try {
        const params: Record<string, string | undefined> = {
          type: args.type,
          search: args.search,
          startDate: args.startDate,
          endDate: args.endDate,
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
        'Despesas agrupadas por categoria no período. Exclui a categoria de sistema de pagamento de fatura (não é consumo novo).',
      inputSchema: {
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      },
    },
    async ({ startDate, endDate }) => {
      try {
        return ok(await api.get(`/v1/by-category${qs({ startDate, endDate })}`));
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
}
