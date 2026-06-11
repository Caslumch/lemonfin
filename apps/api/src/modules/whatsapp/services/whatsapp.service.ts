import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../../users/repositories/users.repository';
import { CategoriesRepository } from '../../categories/repositories/categories.repository';
import { TransactionsRepository } from '../../transactions/repositories/transactions.repository';
import { CardsRepository } from '../../cards/repositories/cards.repository';
import { FamilyContextService } from '../../families/services/family-context.service';
import { MessageParserService, ParseResult } from './message-parser.service';
import { WmodeClientService } from './wmode-client.service';
import { GetForecastUseCase } from '../../transactions/use-cases/get-forecast.use-case';
import { RecurringRepository } from '../../recurring/repositories/recurring.repository';
import { GetBudgetUseCase } from '../../budgets/use-cases/get-budget.use-case';

interface IncomingMessage {
  from: string;
  content: string;
  sessionId: string;
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly categoriesRepository: CategoriesRepository,
    private readonly transactionsRepository: TransactionsRepository,
    private readonly cardsRepository: CardsRepository,
    private readonly familyContext: FamilyContextService,
    private readonly messageParser: MessageParserService,
    private readonly wmodeClient: WmodeClientService,
    private readonly getForecast: GetForecastUseCase,
    private readonly recurringRepository: RecurringRepository,
    private readonly getBudget: GetBudgetUseCase,
  ) {}

  async handleIncomingMessage({ from, content, sessionId }: IncomingMessage) {
    this.logger.log(`Message from ${from}: ${content}`);

    const phone = this.normalizePhone(from);
    const phoneWithout55 = phone.startsWith('55') ? phone.slice(2) : phone;
    const phoneWith55 = phone.startsWith('55') ? phone : `55${phone}`;
    const user =
      (await this.usersRepository.findByPhone(phone)) ??
      (await this.usersRepository.findByPhone(phoneWithout55)) ??
      (await this.usersRepository.findByPhone(phoneWith55));

    if (!user) {
      // await this.wmodeClient.sendMessage({
      //   to: from,
      //   content:
      //     'Olá! Você ainda não tem uma conta no LemonFin vinculada a este número. ' +
      //     'Acesse o app e cadastre seu telefone nas configurações para começar a registrar transações pelo WhatsApp!',
      // });
      this.logger.log(`Ignoring message from unregistered phone: ${phone}`);
      return;
    }

    const result = await this.messageParser.parse(content);

    switch (result.intent) {
      case 'transaction':
        await this.handleTransaction(from, user.id, result);
        break;
      case 'query':
        await this.handleQuery(from, user.id, result);
        break;
      case 'cancel':
        await this.handleCancel(from, user.id);
        break;
      case 'correction':
        await this.handleCorrection(from, user.id, result);
        break;
      case 'installment':
        await this.handleInstallment(from, user.id, result);
        break;
      case 'recurring':
        await this.handleRecurring(from, user.id, result);
        break;
      case 'tips':
        await this.wmodeClient.sendMessage({
          to: from,
          content: result.message,
        });
        break;
      case 'unknown':
        await this.wmodeClient.sendMessage({
          to: from,
          content: result.message,
        });
        break;
    }
  }

  private async handleTransaction(
    from: string,
    userId: string,
    result: Extract<ParseResult, { intent: 'transaction' }>,
  ) {
    const { data } = result;

    let category = await this.categoriesRepository.findBySlug(
      data.categorySlug,
    );
    if (!category) {
      this.logger.warn(
        `Category not found: ${data.categorySlug}, falling back to "outros"`,
      );
      category = await this.categoriesRepository.findBySlug('outros');
      if (!category) {
        await this.wmodeClient.sendMessage({
          to: from,
          content: 'Erro interno ao processar categoria. Tente novamente.',
        });
        return;
      }
    }

    // Resolve card if mentioned
    const userIds = await this.familyContext.resolveUserIds(userId);
    let cardId: string | undefined;
    let cardLabel = '';
    if (data.cardName) {
      if (data.cardName === 'cartao') {
        // Generic "cartão" mention — try to auto-resolve
        const userCards = await this.cardsRepository.findMany(userIds);
        if (userCards.length === 1) {
          cardId = userCards[0].id;
          cardLabel = userCards[0].name;
        } else if (userCards.length > 1) {
          const names = userCards.map((c) => c.name).join(', ');
          // Register without card but inform user
          const transaction = await this.transactionsRepository.create({
            amount: data.amount,
            type: data.type,
            description: data.description,
            source: 'WHATSAPP',
            userId,
            categoryId: category.id,
          });

          const emoji = data.type === 'EXPENSE' ? '💸' : '💰';
          const amountFormatted = data.amount.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          });

          await this.wmodeClient.sendMessage({
            to: from,
            content:
              `${emoji} *Despesa registrada!*\n\n` +
              `*Valor:* ${amountFormatted}\n` +
              `*Categoria:* ${category.icon} ${category.name}\n` +
              `*Descrição:* ${data.description}\n\n` +
              `⚠️ Você tem ${userCards.length} cartões cadastrados (${names}). ` +
              `Para vincular ao cartão, diga o nome. Ex: _"comprei X no ${userCards[0].name}"_`,
          });

          this.logger.log(
            `Transaction ${transaction.id} created without card — multiple cards`,
          );
          return;
        }
      } else {
        // Specific card name mentioned
        const card = await this.cardsRepository.findByName(
          data.cardName,
          userIds,
        );
        if (card) {
          cardId = card.id;
          cardLabel = card.name;
        }
      }
    }

    // Detecta possível duplicata ANTES de criar (para não pegar a própria).
    const duplicate = await this.transactionsRepository.findPossibleDuplicate(
      userIds,
      {
        amount: data.amount,
        categoryId: category.id,
        type: data.type,
        withinHours: 48,
      },
    );

    const transaction = await this.transactionsRepository.create({
      amount: data.amount,
      type: data.type,
      description: data.description,
      source: 'WHATSAPP',
      userId,
      categoryId: category.id,
      cardId,
    });

    const emoji = data.type === 'EXPENSE' ? '💸' : '💰';
    const typeLabel = data.type === 'EXPENSE' ? 'Despesa' : 'Receita';
    const amountFormatted = data.amount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    const cardInfo = cardLabel ? `\n*Cartão:* ${cardLabel}` : '';

    let duplicateWarning = '';
    if (duplicate) {
      const when = this.relativeWhen(duplicate.createdAt);
      duplicateWarning =
        `\n\n⚠️ _Você já registrou ${amountFormatted} em ${category.name} ${when}. ` +
        `Se foi engano, responda *cancela* para remover._`;
    }

    await this.wmodeClient.sendMessage({
      to: from,
      content:
        `${emoji} *${typeLabel} registrada!*\n\n` +
        `*Valor:* ${amountFormatted}\n` +
        `*Categoria:* ${category.icon} ${category.name}${cardInfo}\n` +
        `*Descrição:* ${data.description}\n\n` +
        `_Registrado via WhatsApp_` +
        duplicateWarning,
    });

    this.logger.log(
      `Transaction created: ${transaction.id} for user ${userId}`,
    );
  }

  private async handleQuery(
    from: string,
    userId: string,
    result: Extract<ParseResult, { intent: 'query' }>,
  ) {
    if (result.queryType === 'forecast') {
      await this.handleForecast(from, userId);
      return;
    }

    if (result.queryType === 'budget') {
      await this.handleBudget(from, userId);
      return;
    }

    const userIds = await this.familyContext.resolveUserIds(userId);
    const now = new Date();
    const startDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    ).toISOString();
    const endDate = now.toISOString();

    const summary = await this.transactionsRepository.getSummary(
      userIds,
      startDate,
      endDate,
    );

    const incomeFormatted = summary.income.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    const expenseFormatted = summary.expense.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    const balanceFormatted = summary.balance.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    const balanceEmoji = summary.balance >= 0 ? '✅' : '🔴';

    const monthName = now.toLocaleDateString('pt-BR', { month: 'long' });

    let message = '';

    switch (result.queryType) {
      case 'expenses':
        message =
          `💸 *Despesas de ${monthName}*\n\n` +
          `*Total:* ${expenseFormatted}\n` +
          `*Transações:* ${summary.expenseCount}\n\n` +
          `_Envie "resumo" para ver o quadro completo_`;
        break;

      case 'income':
        message =
          `💰 *Receitas de ${monthName}*\n\n` +
          `*Total:* ${incomeFormatted}\n` +
          `*Transações:* ${summary.incomeCount}\n\n` +
          `_Envie "resumo" para ver o quadro completo_`;
        break;

      case 'balance':
        message =
          `${balanceEmoji} *Saldo de ${monthName}*\n\n` +
          `*Saldo:* ${balanceFormatted}\n\n` +
          `💰 Receitas: ${incomeFormatted}\n` +
          `💸 Despesas: ${expenseFormatted}`;
        break;

      case 'summary':
      default:
        message =
          `📊 *Resumo de ${monthName}*\n\n` +
          `💰 *Receitas:* ${incomeFormatted} (${summary.incomeCount} transações)\n` +
          `💸 *Despesas:* ${expenseFormatted} (${summary.expenseCount} transações)\n` +
          `${balanceEmoji} *Saldo:* ${balanceFormatted}\n\n` +
          `_Dica: envie "me da uma dica" para receber orientacoes financeiras_`;
        break;
    }

    await this.wmodeClient.sendMessage({ to: from, content: message });
  }

  private async handleForecast(from: string, userId: string) {
    const forecast = await this.getForecast.execute(userId);

    const fmt = (v: number) =>
      v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const emoji = forecast.projectedBalance >= 0 ? '✅' : '🔴';
    const daysLabel =
      forecast.daysRemaining > 0
        ? `faltam ${forecast.daysRemaining} ${forecast.daysRemaining === 1 ? 'dia' : 'dias'}`
        : 'último dia do mês';

    const lines = [
      `${emoji} *Previsão de fim do mês*`,
      '',
      `*Saldo hoje:* ${fmt(forecast.currentBalance)}`,
    ];

    if (forecast.pendingIncome > 0) {
      lines.push(`💰 *A receber:* ${fmt(forecast.pendingIncome)}`);
    }
    if (forecast.pendingExpense > 0) {
      lines.push(`💸 *A pagar:* ${fmt(forecast.pendingExpense)}`);
    }

    lines.push(
      '',
      `${emoji} *Previsão:* ${fmt(forecast.projectedBalance)}`,
      `_${daysLabel} no mês_`,
    );

    if (forecast.pending.length > 0) {
      lines.push('', '*Contas fixas ainda neste mês:*');
      for (const p of forecast.pending) {
        const sign = p.type === 'INCOME' ? '+' : '−';
        const icon = p.category?.icon ?? '';
        lines.push(
          `  ${icon} ${p.description} (dia ${p.dayOfMonth}): ${sign} ${fmt(p.amount)}`,
        );
      }
    }

    await this.wmodeClient.sendMessage({
      to: from,
      content: lines.join('\n'),
    });
  }

  private async handleBudget(from: string, userId: string) {
    const budget = await this.getBudget.execute(userId);

    const fmt = (v: number) =>
      v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    if (budget.amount === null) {
      await this.wmodeClient.sendMessage({
        to: from,
        content:
          '📊 *Orçamento do mês*\n\n' +
          'Você ainda não definiu um orçamento para este mês.\n\n' +
          '_Defina em Orçamento no app para acompanhar quanto pode gastar._',
      });
      return;
    }

    const emoji = budget.exceeded ? '🔴' : budget.percentage >= 80 ? '⚠️' : '✅';
    const paceLabel =
      budget.pace === 'over'
        ? '📈 acima do previsto — no ritmo atual você estoura o limite'
        : budget.pace === 'under'
          ? '📉 abaixo do previsto — bom controle!'
          : '✅ dentro do previsto';

    const remainingLine = budget.exceeded
      ? `*Estourou:* ${fmt(Math.abs(budget.remaining))} acima`
      : `*Pode gastar ainda:* ${fmt(budget.remaining)}`;

    const daysLabel =
      budget.daysRemaining > 0
        ? `faltam ${budget.daysRemaining} ${budget.daysRemaining === 1 ? 'dia' : 'dias'}`
        : 'último dia do mês';

    await this.wmodeClient.sendMessage({
      to: from,
      content:
        `${emoji} *Orçamento do mês*\n\n` +
        `*Limite:* ${fmt(budget.amount)}\n` +
        `*Gasto:* ${fmt(budget.spent)} (${budget.percentage}%)\n` +
        `${remainingLine}\n` +
        `_${daysLabel}_\n\n` +
        `*Ritmo:* ${paceLabel}\n` +
        `_Projeção do mês: ${fmt(budget.projectedSpend)}_`,
    });
  }

  private async handleCancel(from: string, userId: string) {
    const last = await this.transactionsRepository.findLastByUser(userId);

    if (!last) {
      await this.wmodeClient.sendMessage({
        to: from,
        content: 'Nenhuma transação encontrada para cancelar.',
      });
      return;
    }

    const amountFormatted = Number(last.amount).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    await this.transactionsRepository.delete(last.id);

    await this.wmodeClient.sendMessage({
      to: from,
      content:
        `🗑️ *Transação cancelada!*\n\n` +
        `*Valor:* ${amountFormatted}\n` +
        `*Categoria:* ${last.category.icon} ${last.category.name}\n` +
        `*Descrição:* ${last.description || '-'}\n\n` +
        `_A transação foi removida com sucesso_`,
    });

    this.logger.log(`Transaction ${last.id} cancelled by user ${userId}`);
  }

  private async handleCorrection(
    from: string,
    userId: string,
    result: Extract<ParseResult, { intent: 'correction' }>,
  ) {
    const last = await this.transactionsRepository.findLastByUser(userId);

    if (!last) {
      await this.wmodeClient.sendMessage({
        to: from,
        content: 'Nenhuma transação encontrada para corrigir.',
      });
      return;
    }

    const oldAmount = Number(last.amount);
    const oldFormatted = oldAmount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    const newFormatted = result.newAmount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    await this.transactionsRepository.update(last.id, {
      amount: result.newAmount,
    });

    await this.wmodeClient.sendMessage({
      to: from,
      content:
        `✏️ *Transação corrigida!*\n\n` +
        `*Antes:* ${oldFormatted}\n` +
        `*Agora:* ${newFormatted}\n` +
        `*Categoria:* ${last.category.icon} ${last.category.name}\n` +
        `*Descrição:* ${last.description || '-'}\n\n` +
        `_Valor atualizado com sucesso_`,
    });

    this.logger.log(
      `Transaction ${last.id} corrected: ${oldAmount} → ${result.newAmount} by user ${userId}`,
    );
  }

  private async handleInstallment(
    from: string,
    userId: string,
    result: Extract<ParseResult, { intent: 'installment' }>,
  ) {
    const { data } = result;

    let category = await this.categoriesRepository.findBySlug(
      data.categorySlug,
    );
    if (!category) {
      category = await this.categoriesRepository.findBySlug('outros');
      if (!category) {
        await this.wmodeClient.sendMessage({
          to: from,
          content: 'Erro interno ao processar categoria. Tente novamente.',
        });
        return;
      }
    }

    const perInstallment =
      Math.round((data.amount / data.installments) * 100) / 100;
    const now = new Date();

    // Try to link to card if cardName was mentioned
    const userIds = await this.familyContext.resolveUserIds(userId);
    let cardId: string | undefined;
    let cardLabel = '';
    if (data.cardName) {
      if (data.cardName === 'cartao') {
        const userCards = await this.cardsRepository.findMany(userIds);
        if (userCards.length === 1) {
          cardId = userCards[0].id;
          cardLabel = userCards[0].name;
        }
        // If multiple cards, just skip — will register without card
      } else {
        const card = await this.cardsRepository.findByName(
          data.cardName,
          userIds,
        );
        if (card) {
          cardId = card.id;
          cardLabel = card.name;
        }
      }
    }

    for (let i = 0; i < data.installments; i++) {
      const installmentDate = new Date(
        now.getFullYear(),
        now.getMonth() + i,
        now.getDate(),
      );

      await this.transactionsRepository.create({
        amount: perInstallment,
        type: 'EXPENSE',
        description: `${data.description} (${i + 1}/${data.installments})`,
        date: installmentDate.toISOString(),
        source: 'WHATSAPP',
        userId,
        categoryId: category.id,
        cardId,
      });
    }

    const totalFormatted = data.amount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    const perFormatted = perInstallment.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    const cardInfo = cardLabel ? `\n*Cartão:* ${cardLabel}` : '';

    await this.wmodeClient.sendMessage({
      to: from,
      content:
        `🛍️ *Parcelamento registrado!*\n\n` +
        `*Total:* ${totalFormatted}\n` +
        `*Parcelas:* ${data.installments}x de ${perFormatted}\n` +
        `*Categoria:* ${category.icon} ${category.name}${cardInfo}\n` +
        `*Descrição:* ${data.description}\n\n` +
        `_${data.installments} transações criadas com datas futuras_`,
    });

    this.logger.log(
      `Installment created: ${data.installments}x ${perInstallment} for user ${userId}`,
    );
  }

  private async handleRecurring(
    from: string,
    userId: string,
    result: Extract<ParseResult, { intent: 'recurring' }>,
  ) {
    const { data } = result;

    let category = await this.categoriesRepository.findBySlug(
      data.categorySlug,
    );
    if (!category) {
      category = await this.categoriesRepository.findBySlug('outros');
      if (!category) {
        await this.wmodeClient.sendMessage({
          to: from,
          content: 'Erro interno ao processar categoria. Tente novamente.',
        });
        return;
      }
    }

    // Resolve cartão se mencionado (somente nome específico).
    const userIds = await this.familyContext.resolveUserIds(userId);
    let cardId: string | undefined;
    let cardLabel = '';
    if (data.cardName && data.cardName !== 'cartao') {
      const card = await this.cardsRepository.findByName(data.cardName, userIds);
      if (card) {
        cardId = card.id;
        cardLabel = card.name;
      }
    }

    const recurring = await this.recurringRepository.create({
      description: data.description || category.name,
      amount: data.amount,
      type: data.type,
      dayOfMonth: data.dayOfMonth,
      userId,
      categoryId: category.id,
      cardId,
    });

    const amountFormatted = data.amount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    const typeLabel = data.type === 'INCOME' ? 'Receita fixa' : 'Conta fixa';
    const emoji = data.type === 'INCOME' ? '💰' : '🔁';
    const cardInfo = cardLabel ? `\n*Cartão:* ${cardLabel}` : '';

    await this.wmodeClient.sendMessage({
      to: from,
      content:
        `${emoji} *${typeLabel} cadastrada!*\n\n` +
        `*Valor:* ${amountFormatted}\n` +
        `*Categoria:* ${category.icon} ${category.name}${cardInfo}\n` +
        `*Descrição:* ${data.description || category.name}\n` +
        `*Todo dia:* ${data.dayOfMonth}\n\n` +
        `_Vou lançar automaticamente todo mês. Gerencie em Recorrentes no app._`,
    });

    this.logger.log(
      `Recurring created: ${recurring.id} (day ${data.dayOfMonth}) for user ${userId}`,
    );
  }

  // "hoje" / "ontem" / "há N dias" a partir de uma data passada.
  private relativeWhen(date: Date): string {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfThat = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );
    const diffDays = Math.round(
      (startOfToday.getTime() - startOfThat.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays <= 0) return 'hoje';
    if (diffDays === 1) return 'ontem';
    return `há ${diffDays} dias`;
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }
}
