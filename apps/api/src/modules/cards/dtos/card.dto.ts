import { z } from 'zod';

// Chaves de cor do cartão. Fonte da verdade do conjunto aceito; o web resolve
// cada chave para o gradiente/tema correspondente (ver credit-card-visual).
// Nulo/ausente = sem escolha → o visual cai no tema derivado da bandeira.
export const CARD_COLOR_PRESET_KEYS = [
  'grafite',
  'azul',
  'roxo',
  'verde',
  'vinho',
  'teal',
  'ambar',
  'indigo',
] as const;

const colorPresetSchema = z.enum(CARD_COLOR_PRESET_KEYS);

export const createCardSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio'),
  brand: z.string().optional(),
  limit: z.number().positive('Limite deve ser positivo').optional(),
  closingDay: z
    .number()
    .int()
    .min(1)
    .max(31, 'Dia de fechamento deve ser entre 1 e 31'),
  dueDay: z
    .number()
    .int()
    .min(1)
    .max(31, 'Dia de vencimento deve ser entre 1 e 31')
    .optional(),
  colorPreset: colorPresetSchema.nullable().optional(),
});

export const updateCardSchema = z.object({
  name: z.string().min(1).optional(),
  brand: z.string().optional(),
  limit: z.number().positive().optional(),
  closingDay: z.number().int().min(1).max(31).optional(),
  dueDay: z.number().int().min(1).max(31).optional(),
  colorPreset: colorPresetSchema.nullable().optional(),
});

export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;

// Filtros/paginação da fatura. A fatura passou a ser paginada no servidor (ver
// comentário em cards.repository.getInvoice): busca/categoria/parcelamento e
// ordenação acoplados a skip/take. `installment` discrimina pela presença de
// installmentNumber (parcela), não de installmentGroupId — compras à vista
// importadas em lote têm groupId mas number nulo.
export const invoiceQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Mês deve ser YYYY-MM')
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().min(1).max(100).optional(),
  categoryId: z.string().cuid().optional(),
  installment: z.enum(['all', 'yes', 'no']).default('all'),
  orderBy: z.enum(['date', 'amount', 'installment']).default('date'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type InvoiceQuery = z.infer<typeof invoiceQuerySchema>;

// Pagamento de fatura: cycle = "YYYY-MM" (mês de referência do ciclo), amount =
// valor pago (total ou parcial), paidAt = data do pagamento (default agora).
export const payInvoiceSchema = z.object({
  cycle: z.string().regex(/^\d{4}-\d{2}$/, 'Ciclo deve ser YYYY-MM'),
  amount: z.number().positive('O valor deve ser positivo'),
  paidAt: z.string().datetime().optional(),
});

export type PayInvoiceInput = z.infer<typeof payInvoiceSchema>;

// Conferência da fatura: cycle = "YYYY-MM", informedTotal = total real da fatura
// que o usuário leu no app do banco. O backend compara com o total do ciclo e
// cria um ajuste se faltar (ver ReconcileInvoiceUseCase).
export const reconcileInvoiceSchema = z.object({
  cycle: z.string().regex(/^\d{4}-\d{2}$/, 'Ciclo deve ser YYYY-MM'),
  informedTotal: z.number().nonnegative('O total não pode ser negativo'),
});

export type ReconcileInvoiceInput = z.infer<typeof reconcileInvoiceSchema>;
