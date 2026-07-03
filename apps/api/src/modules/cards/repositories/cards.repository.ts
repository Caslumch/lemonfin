import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { cardCycleRange } from '../utils/card-cycle';

@Injectable()
export class CardsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    name: string;
    brand?: string;
    limit?: number;
    closingDay: number;
    dueDay?: number;
    colorPreset?: string | null;
    userId: string;
  }) {
    return this.prisma.card.create({
      data: {
        name: data.name,
        brand: data.brand,
        limit: data.limit ? new Prisma.Decimal(data.limit) : undefined,
        closingDay: data.closingDay,
        dueDay: data.dueDay,
        colorPreset: data.colorPreset ?? undefined,
        userId: data.userId,
      },
    });
  }

  async findById(id: string, userIds: string[]) {
    return this.prisma.card.findFirst({
      where: { id, userId: { in: userIds } },
    });
  }

  async findByName(name: string, userIds: string[]) {
    return this.prisma.card.findFirst({
      where: {
        userId: { in: userIds },
        name: { equals: name, mode: 'insensitive' },
      },
    });
  }

  // Resolve um cartão por nome aproximado: tenta match EXATO (case-insensitive)
  // e, se não houver, match PARCIAL (contains) — para "no nubank" achar "Nubank
  // Ultravioleta". Retorna a LISTA de candidatos para o chamador tratar
  // ambiguidade (0 = não achou, 1 = resolvido, >1 = pedir desambiguação) em vez
  // de registrar sem cartão silenciosamente. Escopo familiar (userIds).
  async findByNameFuzzy(name: string, userIds: string[]) {
    const exact = await this.prisma.card.findMany({
      where: {
        userId: { in: userIds },
        name: { equals: name, mode: 'insensitive' },
      },
      orderBy: { name: 'asc' },
    });
    if (exact.length > 0) return exact;

    return this.prisma.card.findMany({
      where: {
        userId: { in: userIds },
        name: { contains: name, mode: 'insensitive' },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findMany(userIds: string[]) {
    return this.prisma.card.findMany({
      where: { userId: { in: userIds } },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Gasto (apenas EXPENSE) da FATURA ABERTA de cada cartão informado, indexado
   * por cardId. Usa o MESMO critério de ciclo de getInvoice (cardCycleRange,
   * baseado no mês de referência), de modo que o "limite usado" do card bate
   * exatamente com o total da tela de fatura.
   *
   * Importante: NÃO limitamos por `date <= hoje`. A fatura aberta inclui as
   * compras já lançadas com data dentro do ciclo, mesmo que a data seja "no
   * futuro" dentro do próprio ciclo (ex.: parcelas reconstruídas a partir de uma
   * fatura importada). Limitar em `now` subestimava a fatura.
   *
   * Como cada cartão tem seu próprio closingDay, buscamos uma janela ampla
   * (~2 meses cobrindo qualquer ciclo aberto) e somamos em memória respeitando o
   * ciclo de cada cartão. Para a escala de um app pessoal é barato e evita N
   * queries.
   */
  async getCurrentCycleSpendByCard(
    cards: { id: string; closingDay: number }[],
    userIds: string[],
    now: Date = new Date(),
  ): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    if (cards.length === 0) return result;

    // Referência = mês corrente. O ciclo aberto é a fatura que fecha neste mês.
    // Tudo em UTC para casar com cardCycleRange e a gravação noon-UTC (ver util).
    const ref = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    // Janela de busca ampla cobrindo o ciclo aberto de qualquer closingDay:
    // do início do mês anterior ao fim do mês corrente.
    const windowStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
    );
    const windowEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
    );

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId: { in: userIds },
        cardId: { in: cards.map((c) => c.id) },
        type: 'EXPENSE',
        date: { gte: windowStart, lte: windowEnd },
      },
      select: { cardId: true, amount: true, date: true },
    });

    for (const card of cards) {
      const { start, end } = cardCycleRange(card.closingDay, ref);
      const spent = transactions
        .filter(
          (tx) => tx.cardId === card.id && tx.date >= start && tx.date <= end,
        )
        .reduce((sum, tx) => sum + tx.amount.toNumber(), 0);
      result[card.id] = spent;
    }

    return result;
  }

  async update(
    id: string,
    data: {
      name?: string;
      brand?: string;
      limit?: number;
      closingDay?: number;
      dueDay?: number;
      colorPreset?: string | null;
    },
  ) {
    const updateData: Prisma.CardUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.brand !== undefined) updateData.brand = data.brand;
    if (data.limit !== undefined)
      updateData.limit = new Prisma.Decimal(data.limit);
    if (data.closingDay !== undefined) updateData.closingDay = data.closingDay;
    if (data.dueDay !== undefined) updateData.dueDay = data.dueDay;
    // null = limpar (voltar ao tema da bandeira); string = definir a cor.
    if (data.colorPreset !== undefined)
      updateData.colorPreset = data.colorPreset;

    return this.prisma.card.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string) {
    return this.prisma.card.delete({
      where: { id },
    });
  }

  // Fatura paginada no servidor. A decisão original era trazer o ciclo inteiro e
  // ordenar no cliente, mas com importação de faturas reais um ciclo pode ter
  // centenas de linhas (compras parceladas reconstruídas espalham o histórico).
  // Como previsto no comentário antigo, paginamos AQUI com orderBy + skip/take
  // acoplados. O total (R$) e a contagem são do ciclo FILTRADO inteiro (via
  // aggregate/count), não da página — senão o rodapé "Total" mostraria só a fatia.
  //
  // Só EXPENSE entra na fatura. Sem esse filtro, uma INCOME lançada no cartão
  // (ex.: estorno registrado como receita) era somada ao total e bagunçava a
  // fatura — foi a causa raiz do incidente da fatura Bradesco. Mesmo critério de
  // getCurrentCycleSpendByCard, mantendo o total da tela igual ao "limite usado".
  async getInvoice(
    cardId: string,
    userIds: string[],
    startDate: Date,
    endDate: Date,
    opts: {
      skip: number;
      take: number;
      search?: string;
      categoryId?: string;
      installment?: 'all' | 'yes' | 'no';
      orderBy?: 'date' | 'amount' | 'installment';
      order?: 'asc' | 'desc';
    },
  ) {
    const where: Prisma.TransactionWhereInput = {
      userId: { in: userIds },
      cardId,
      type: 'EXPENSE',
      date: { gte: startDate, lte: endDate },
    };

    if (opts.search) {
      where.description = { contains: opts.search, mode: 'insensitive' };
    }
    if (opts.categoryId) {
      where.categoryId = opts.categoryId;
    }
    // Parcelada vs à vista: discriminador é installmentNumber (não groupId).
    if (opts.installment === 'yes') {
      where.installmentNumber = { not: null };
    } else if (opts.installment === 'no') {
      where.installmentNumber = null;
    }

    const order = opts.order ?? 'desc';
    // "installment" ordena pela presença de parcela. À vista = installmentNumber
    // null. Em desc (parceladas primeiro) os nulls vão para o FIM; em asc (à
    // vista primeiro) vão para o COMEÇO — por isso nulls acompanha o order.
    // Empate por data.
    const orderBy: Prisma.TransactionOrderByWithRelationInput[] =
      opts.orderBy === 'amount'
        ? [{ amount: order }, { date: 'desc' }]
        : opts.orderBy === 'installment'
          ? [
              {
                installmentNumber: {
                  sort: order,
                  nulls: order === 'desc' ? 'last' : 'first',
                },
              },
              { date: 'desc' },
            ]
          : [{ date: order }];

    const [data, count, agg] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        include: { category: true },
        orderBy,
        skip: opts.skip,
        take: opts.take,
      }),
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.aggregate({ where, _sum: { amount: true } }),
    ]);

    const total = agg._sum.amount?.toNumber() ?? 0;

    return { transactions: data, total, count };
  }
}
