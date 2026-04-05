import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../../users/repositories/users.repository';
import { CategoriesRepository } from '../../categories/repositories/categories.repository';
import { TransactionsRepository } from '../../transactions/repositories/transactions.repository';
import { CardsRepository } from '../../cards/repositories/cards.repository';
import { MessageParserService, ParseResult } from './message-parser.service';
import { WmodeClientService } from './wmode-client.service';

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
    private readonly messageParser: MessageParserService,
    private readonly wmodeClient: WmodeClientService,
  ) {}

  async handleIncomingMessage({ from, content, sessionId }: IncomingMessage) {
    this.logger.log(`Message from ${from}: ${content}`);

    const phone = this.normalizePhone(from);
    const user = await this.usersRepository.findByPhone(phone);

    if (!user) {
      // await this.wmodeClient.sendMessage({
      //   to: from,
      //   content:
      //     'Ola! Voce ainda nao tem uma conta no LemonFin vinculada a este numero. ' +
      //     'Acesse o app e cadastre seu telefone nas configuracoes para comecar a registrar transacoes pelo WhatsApp!',
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
    let cardId: string | undefined;
    let cardLabel = '';
    if (data.cardName) {
      if (data.cardName === 'cartao') {
        // Generic "cartão" mention — try to auto-resolve
        const userCards = await this.cardsRepository.findMany(userId);
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
              `*Descricao:* ${data.description}\n\n` +
              `⚠️ Voce tem ${userCards.length} cartoes cadastrados (${names}). ` +
              `Para vincular ao cartao, diga o nome. Ex: _"comprei X no ${userCards[0].name}"_`,
          });

          this.logger.log(`Transaction ${transaction.id} created without card — multiple cards`);
          return;
        }
      } else {
        // Specific card name mentioned
        const card = await this.cardsRepository.findByName(data.cardName, userId);
        if (card) {
          cardId = card.id;
          cardLabel = card.name;
        }
      }
    }

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

    const cardInfo = cardLabel ? `\n*Cartao:* ${cardLabel}` : '';

    await this.wmodeClient.sendMessage({
      to: from,
      content:
        `${emoji} *${typeLabel} registrada!*\n\n` +
        `*Valor:* ${amountFormatted}\n` +
        `*Categoria:* ${category.icon} ${category.name}${cardInfo}\n` +
        `*Descricao:* ${data.description}\n\n` +
        `_Registrado via WhatsApp_`,
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
    const now = new Date();
    const startDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    ).toISOString();
    const endDate = now.toISOString();

    const summary = await this.transactionsRepository.getSummary(
      userId,
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
          `*Transacoes:* ${summary.expenseCount}\n\n` +
          `_Envie "resumo" para ver o quadro completo_`;
        break;

      case 'income':
        message =
          `💰 *Receitas de ${monthName}*\n\n` +
          `*Total:* ${incomeFormatted}\n` +
          `*Transacoes:* ${summary.incomeCount}\n\n` +
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
          `💰 *Receitas:* ${incomeFormatted} (${summary.incomeCount} transacoes)\n` +
          `💸 *Despesas:* ${expenseFormatted} (${summary.expenseCount} transacoes)\n` +
          `${balanceEmoji} *Saldo:* ${balanceFormatted}\n\n` +
          `_Dica: envie "me da uma dica" para receber orientacoes financeiras_`;
        break;
    }

    await this.wmodeClient.sendMessage({ to: from, content: message });
  }

  private async handleCancel(from: string, userId: string) {
    const last = await this.transactionsRepository.findLastByUser(userId);

    if (!last) {
      await this.wmodeClient.sendMessage({
        to: from,
        content: 'Nenhuma transacao encontrada para cancelar.',
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
        `🗑️ *Transacao cancelada!*\n\n` +
        `*Valor:* ${amountFormatted}\n` +
        `*Categoria:* ${last.category.icon} ${last.category.name}\n` +
        `*Descricao:* ${last.description || '-'}\n\n` +
        `_A transacao foi removida com sucesso_`,
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
        content: 'Nenhuma transacao encontrada para corrigir.',
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
        `✏️ *Transacao corrigida!*\n\n` +
        `*Antes:* ${oldFormatted}\n` +
        `*Agora:* ${newFormatted}\n` +
        `*Categoria:* ${last.category.icon} ${last.category.name}\n` +
        `*Descricao:* ${last.description || '-'}\n\n` +
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
    let cardId: string | undefined;
    let cardLabel = '';
    if (data.cardName) {
      if (data.cardName === 'cartao') {
        const userCards = await this.cardsRepository.findMany(userId);
        if (userCards.length === 1) {
          cardId = userCards[0].id;
          cardLabel = userCards[0].name;
        }
        // If multiple cards, just skip — will register without card
      } else {
        const card = await this.cardsRepository.findByName(data.cardName, userId);
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

    const cardInfo = cardLabel ? `\n*Cartao:* ${cardLabel}` : '';

    await this.wmodeClient.sendMessage({
      to: from,
      content:
        `🛍️ *Parcelamento registrado!*\n\n` +
        `*Total:* ${totalFormatted}\n` +
        `*Parcelas:* ${data.installments}x de ${perFormatted}\n` +
        `*Categoria:* ${category.icon} ${category.name}${cardInfo}\n` +
        `*Descricao:* ${data.description}\n\n` +
        `_${data.installments} transacoes criadas com datas futuras_`,
    });

    this.logger.log(
      `Installment created: ${data.installments}x ${perInstallment} for user ${userId}`,
    );
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }
}
