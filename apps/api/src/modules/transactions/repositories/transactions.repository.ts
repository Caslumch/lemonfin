import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

interface FindManyOptions {
  userIds: string[];
  type?: 'INCOME' | 'EXPENSE';
  categoryId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  orderBy?: string;
  order?: 'asc' | 'desc';
  skip: number;
  take: number;
}

const txInclude = {
  category: true,
  card: { select: { id: true, name: true, brand: true } },
  user: { select: { id: true, name: true } },
} as const;

// Fuso do usuário (Brasil, UTC-3). As datas de filtro chegam como "YYYY-MM-DD"
// (sem hora). Interpretá-las direto com `new Date("YYYY-MM-DD")` cai em meia-
// noite UTC, o que (a) joga o fim do dia para o COMEÇO do dia — excluindo todas
// as transações daquele dia — e (b) desalinha o "dia" do usuário do dia UTC.
// Por isso ancoramos o início no começo do dia e o fim no FIM do dia, ambos em
// horário de Brasília. Datas com hora explícita (contendo "T") passam direto.
const BR_OFFSET = '-03:00';

function startOfDayBR(date: string): Date {
  return new Date(
    date.includes('T') ? date : `${date}T00:00:00.000${BR_OFFSET}`,
  );
}

function endOfDayBR(date: string): Date {
  return new Date(
    date.includes('T') ? date : `${date}T23:59:59.999${BR_OFFSET}`,
  );
}

// Monta o filtro Prisma de intervalo de datas (gte/lte) já com a correção de
// fuso/fim-de-dia. Retorna undefined quando não há nenhuma ponta (sem filtro).
function dateRangeFilter(
  startDate?: string,
  endDate?: string,
): Prisma.DateTimeFilter | undefined {
  if (!startDate && !endDate) return undefined;
  const range: Prisma.DateTimeFilter = {};
  if (startDate) range.gte = startOfDayBR(startDate);
  if (endDate) range.lte = endOfDayBR(endDate);
  return range;
}

@Injectable()
export class TransactionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    description?: string;
    date?: string;
    source?: 'MANUAL' | 'WHATSAPP' | 'RECURRING';
    userId: string;
    categoryId: string;
    cardId?: string;
    recurringId?: string;
    installmentGroupId?: string;
    installmentNumber?: number;
    installmentTotal?: number;
  }) {
    return this.prisma.transaction.create({
      data: {
        amount: new Prisma.Decimal(data.amount),
        type: data.type,
        description: data.description,
        date: data.date ? new Date(data.date) : new Date(),
        source: data.source ?? 'MANUAL',
        userId: data.userId,
        categoryId: data.categoryId,
        cardId: data.cardId,
        recurringId: data.recurringId,
        installmentGroupId: data.installmentGroupId,
        installmentNumber: data.installmentNumber,
        installmentTotal: data.installmentTotal,
      },
      include: txInclude,
    });
  }

  async findById(id: string, userIds: string[]) {
    return this.prisma.transaction.findFirst({
      where: { id, userId: { in: userIds } },
      include: txInclude,
    });
  }

  async findLastByUser(userId: string) {
    return this.prisma.transaction.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: txInclude,
    });
  }

  // Possível duplicata: mesma valor + categoria + tipo dentro da janela (horas).
  // Usado para alertar registros repetidos acidentais.
  async findPossibleDuplicate(
    userIds: string[],
    params: {
      amount: number;
      categoryId: string;
      type: 'INCOME' | 'EXPENSE';
      withinHours: number;
    },
  ) {
    const since = new Date(Date.now() - params.withinHours * 60 * 60 * 1000);
    return this.prisma.transaction.findFirst({
      where: {
        userId: { in: userIds },
        categoryId: params.categoryId,
        type: params.type,
        amount: new Prisma.Decimal(params.amount),
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      include: txInclude,
    });
  }

  async findMany(options: FindManyOptions) {
    const where: Prisma.TransactionWhereInput = {
      userId: { in: options.userIds },
    };

    if (options.type) where.type = options.type;
    if (options.categoryId) where.categoryId = options.categoryId;
    if (options.search)
      where.description = {
        contains: options.search,
        mode: 'insensitive',
      };
    const dateRange = dateRangeFilter(options.startDate, options.endDate);
    if (dateRange) where.date = dateRange;

    const orderBy = { [options.orderBy || 'date']: options.order || 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        include: txInclude,
        orderBy,
        skip: options.skip,
        take: options.take,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { data, total };
  }

  async update(
    id: string,
    data: {
      amount?: number;
      type?: 'INCOME' | 'EXPENSE';
      description?: string;
      date?: string;
      categoryId?: string;
      cardId?: string | null;
    },
  ) {
    const updateData: Prisma.TransactionUpdateInput = {};
    if (data.amount !== undefined)
      updateData.amount = new Prisma.Decimal(data.amount);
    if (data.type !== undefined) updateData.type = data.type;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.categoryId !== undefined)
      updateData.category = { connect: { id: data.categoryId } };
    if (data.cardId === null) updateData.card = { disconnect: true };
    else if (data.cardId !== undefined)
      updateData.card = { connect: { id: data.cardId } };

    return this.prisma.transaction.update({
      where: { id },
      data: updateData,
      include: txInclude,
    });
  }

  async delete(id: string) {
    return this.prisma.transaction.delete({
      where: { id },
    });
  }

  // Exclui todas as parcelas de um grupo, escopadas aos usuários (isolamento de
  // tenant: nunca apaga parcela de outra família). Retorna a contagem removida.
  async deleteByInstallmentGroup(
    installmentGroupId: string,
    userIds: string[],
  ): Promise<number> {
    const { count } = await this.prisma.transaction.deleteMany({
      where: { installmentGroupId, userId: { in: userIds } },
    });
    return count;
  }

  // Substitui (atomicamente) todas as parcelas de um grupo: apaga as atuais e
  // recria a partir da lista informada, tudo numa transação. Usado ao EDITAR um
  // grupo de parcelas (o nº de parcelas/valor/data podem mudar). Escopa o
  // delete aos usuários (isolamento de tenant). Retorna as parcelas criadas.
  async replaceInstallmentGroup(
    installmentGroupId: string,
    userIds: string[],
    rows: Array<{
      amount: number;
      description?: string;
      date: string;
      source?: 'MANUAL' | 'WHATSAPP' | 'RECURRING';
      userId: string;
      categoryId: string;
      cardId?: string;
      installmentNumber: number;
      installmentTotal: number;
    }>,
  ) {
    // Apaga as parcelas atuais e recria o cronograma numa única transação.
    // Usa createMany (1 query em lote) em vez de N creates sequenciais: com o
    // banco remoto (Neon), parcelamentos longos estouravam o timeout de 5s da
    // interactive transaction (P2028 "Transaction already closed"). Retornamos
    // só a contagem — o único chamador (UpdateInstallmentGroupUseCase) usa
    // apenas o nº de parcelas recriadas.
    const data = rows.map((row) => ({
      amount: new Prisma.Decimal(row.amount),
      type: 'EXPENSE' as const,
      description: row.description,
      date: new Date(row.date),
      source: row.source ?? ('MANUAL' as const),
      userId: row.userId,
      categoryId: row.categoryId,
      cardId: row.cardId,
      installmentGroupId,
      installmentNumber: row.installmentNumber,
      installmentTotal: row.installmentTotal,
    }));

    const [, created] = await this.prisma.$transaction([
      this.prisma.transaction.deleteMany({
        where: { installmentGroupId, userId: { in: userIds } },
      }),
      this.prisma.transaction.createMany({ data }),
    ]);

    return { count: created.count };
  }

  // Exclui um conjunto de transações por id, escopado aos usuários (isolamento
  // de tenant). Usado para cancelar a "última ação" inteira (lote/parcelamento).
  async deleteManyByIds(ids: string[], userIds: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const { count } = await this.prisma.transaction.deleteMany({
      where: { id: { in: ids }, userId: { in: userIds } },
    });
    return count;
  }

  // Busca transações por id (com categoria/cartão), escopado aos usuários.
  // Usado para reconstruir os dados da "última ação" ao refazê-la (redo).
  async findManyByIds(ids: string[], userIds: string[]) {
    if (ids.length === 0) return [];
    return this.prisma.transaction.findMany({
      where: { id: { in: ids }, userId: { in: userIds } },
      include: txInclude,
      orderBy: { date: 'asc' },
    });
  }

  // Despesas com descrição num período — usado para detectar assinaturas
  // (mesma descrição recorrendo em meses distintos).
  async findExpensesWithDescriptionSince(userIds: string[], since: Date) {
    return this.prisma.transaction.findMany({
      where: {
        userId: { in: userIds },
        type: 'EXPENSE',
        date: { gte: since },
        description: { not: null },
      },
      select: { description: true, amount: true, date: true, categoryId: true },
      orderBy: { date: 'asc' },
    });
  }

  async getMonthlyBreakdown(userIds: string[], months: number = 6) {
    const since = new Date();
    since.setMonth(since.getMonth() - months + 1);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const transactions = await this.prisma.transaction.findMany({
      where: { userId: { in: userIds }, date: { gte: since } },
      select: { amount: true, type: true, date: true, cardId: true },
    });

    const map = new Map<
      string,
      { income: number; expense: number; cardExpense: number }
    >();

    // Initialize all months
    for (let i = 0; i < months; i++) {
      const d = new Date(since);
      d.setMonth(d.getMonth() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, { income: 0, expense: 0, cardExpense: 0 });
    }

    for (const tx of transactions) {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = map.get(key);
      if (entry) {
        if (tx.type === 'INCOME') {
          entry.income += tx.amount.toNumber();
        } else if (tx.cardId) {
          entry.cardExpense += tx.amount.toNumber();
        } else {
          entry.expense += tx.amount.toNumber();
        }
      }
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        income: data.income,
        expense: data.expense + data.cardExpense,
        cardExpense: data.cardExpense,
        balance: data.income - data.expense,
      }));
  }

  async getCategoryBreakdown(
    userIds: string[],
    startDate?: string,
    endDate?: string,
  ) {
    const where: Prisma.TransactionWhereInput = {
      userId: { in: userIds },
      type: 'EXPENSE',
    };
    const dateRange = dateRangeFilter(startDate, endDate);
    if (dateRange) where.date = dateRange;

    const result = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where,
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
    });

    const categoryIds = result.map((r) => r.categoryId);
    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
    });
    const catMap = new Map(categories.map((c) => [c.id, c]));

    return result.map((r) => ({
      categoryId: r.categoryId,
      category: catMap.get(r.categoryId) ?? null,
      total: r._sum.amount?.toNumber() ?? 0,
      count: r._count,
    }));
  }

  // Total de gasto variável "em dinheiro" num período: despesa avulsa que sai
  // direto do saldo. Exclui cartão (pago depois via fatura, não afeta o saldo
  // corrente) e recorrências (tratadas à parte na previsão). Usado para
  // estimar quanto ainda deve ser gasto no resto do mês com base na média.
  async getVariableExpenseTotal(
    userIds: string[],
    start: Date,
    end: Date,
  ): Promise<number> {
    const agg = await this.prisma.transaction.aggregate({
      where: {
        userId: { in: userIds },
        type: 'EXPENSE',
        cardId: null,
        recurringId: null,
        date: { gte: start, lt: end },
      },
      _sum: { amount: true },
    });
    return agg._sum.amount?.toNumber() ?? 0;
  }

  async getSummary(userIds: string[], startDate?: string, endDate?: string) {
    const where: Prisma.TransactionWhereInput = { userId: { in: userIds } };
    const dateRange = dateRangeFilter(startDate, endDate);
    if (dateRange) where.date = dateRange;

    const [income, expenseNoCard, expenseCard] = await this.prisma.$transaction(
      [
        this.prisma.transaction.aggregate({
          where: { ...where, type: 'INCOME' },
          _sum: { amount: true },
          _count: true,
        }),
        this.prisma.transaction.aggregate({
          where: { ...where, type: 'EXPENSE', cardId: null },
          _sum: { amount: true },
          _count: true,
        }),
        this.prisma.transaction.aggregate({
          where: { ...where, type: 'EXPENSE', cardId: { not: null } },
          _sum: { amount: true },
          _count: true,
        }),
      ],
    );

    const totalIncome = income._sum.amount?.toNumber() ?? 0;
    const totalExpenseNoCard = expenseNoCard._sum.amount?.toNumber() ?? 0;
    const totalCardExpense = expenseCard._sum.amount?.toNumber() ?? 0;

    return {
      income: totalIncome,
      // "Saídas" = só o que sai do bolso agora (pix/débito, fora cartão). O gasto
      // no cartão NÃO entra aqui — vira fatura (cardExpense), paga depois.
      expense: totalExpenseNoCard,
      // Gasto no cartão DENTRO do range recebido (mês civil). O endpoint de
      // summary sobrescreve isto pelo total do CICLO de fatura (ver
      // GetSummaryUseCase). Mantido para compatibilidade de outros chamadores.
      cardExpense: totalCardExpense,
      // Saldo = receita − saídas do bolso. Fatura do cartão fica de fora até ser
      // paga (aí vira uma despesa fora-cartão na data do pagamento).
      balance: totalIncome - totalExpenseNoCard,
      incomeCount: income._count,
      expenseCount: expenseNoCard._count,
    };
  }

  // Gasto (DESPESA) num cartão específico, no período. Método focado — não
  // reusa getSummary porque lá o balance/expense separam cartão de não-cartão;
  // aqui é só o total daquele cartão.
  async getCardSummary(
    userIds: string[],
    cardId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{ total: number; count: number }> {
    const where: Prisma.TransactionWhereInput = {
      userId: { in: userIds },
      cardId,
      type: 'EXPENSE',
    };
    const dateRange = dateRangeFilter(startDate, endDate);
    if (dateRange) where.date = dateRange;

    const agg = await this.prisma.transaction.aggregate({
      where,
      _sum: { amount: true },
      _count: true,
    });
    return { total: agg._sum.amount?.toNumber() ?? 0, count: agg._count };
  }
}
