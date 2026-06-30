import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../../users/repositories/users.repository';
import { CategoriesRepository } from '../../categories/repositories/categories.repository';
import { TransactionsRepository } from '../../transactions/repositories/transactions.repository';
import { CardsRepository } from '../../cards/repositories/cards.repository';
import { cardCycleRange, nextDueDate } from '../../cards/utils/card-cycle';
import { FamilyContextService } from '../../families/services/family-context.service';
import {
  MessageParserService,
  ParseResult,
  BatchItem,
  ParsedTransaction,
} from './message-parser.service';
import { TranscriptionService } from './transcription.service';
import { ReceiptExtractionService } from './receipt-extraction.service';
import { WmodeClientService } from './wmode-client.service';
import { phoneCandidates } from './phone-candidates';
import { GetForecastUseCase } from '../../transactions/use-cases/get-forecast.use-case';
import { CreateInstallmentsUseCase } from '../../transactions/use-cases/create-installments.use-case';
import { PayInvoiceUseCase } from '../../cards/use-cases/pay-invoice.use-case';
import { RecurringRepository } from '../../recurring/repositories/recurring.repository';
import { ReservesRepository } from '../../reserves/repositories/reserves.repository';
import { computeReserveProgress } from '../../reserves/reserve-progress';
import { GoalsRepository } from '../../goals/repositories/goals.repository';
import { ListGoalsUseCase } from '../../goals/use-cases/list-goals.use-case';
import { ChatCompletionUseCase } from '../../chat/use-cases/chat-completion.use-case';
import {
  ConversationRepository,
  PendingConfirmation,
  HistoryEntry,
} from '../repositories/conversation.repository';
import { PremiumAccessService } from '../../billing/services/premium-access.service';
import { BillingConfigService } from '../../../common/billing/billing-config.service';

interface IncomingMessage {
  from: string;
  content: string;
  sessionId: string;
  // Presente quando a mensagem é um áudio do WhatsApp (base64 + mimetype vindos
  // do WMode). Transcrito para texto antes do parsing.
  audio?: { data: string; mimetype?: string };
  // Presente quando a mensagem é uma imagem (comprovante/nota). Lida por visão
  // (gpt-4o-mini) e convertida direto em transação, sem passar pelo parser de
  // texto.
  image?: { data: string; mimetype?: string };
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
    private readonly createInstallmentsUseCase: CreateInstallmentsUseCase,
    private readonly messageParser: MessageParserService,
    private readonly transcription: TranscriptionService,
    private readonly receiptExtraction: ReceiptExtractionService,
    private readonly wmodeClient: WmodeClientService,
    private readonly getForecast: GetForecastUseCase,
    private readonly recurringRepository: RecurringRepository,
    private readonly reservesRepository: ReservesRepository,
    private readonly goalsRepository: GoalsRepository,
    private readonly listGoals: ListGoalsUseCase,
    private readonly chatCompletion: ChatCompletionUseCase,
    private readonly conversation: ConversationRepository,
    private readonly premiumAccess: PremiumAccessService,
    private readonly billingConfig: BillingConfigService,
    private readonly payInvoiceUseCase: PayInvoiceUseCase,
  ) {}

  async handleIncomingMessage({
    from,
    content,
    audio,
    image,
  }: IncomingMessage) {
    this.logger.log(
      `Message from ${from}: ${audio ? '[áudio]' : image ? '[imagem]' : content}`,
    );

    const phone = this.normalizePhone(from);
    // Casa por qualquer forma equivalente do número (com/sem nono dígito,
    // com/sem 55). O WhatsApp entrega a mesma pessoa ora com 9, ora sem — quem
    // se cadastra com 9 pode responder sem 9 (e vice-versa). Sem isso, a resposta
    // do cliente caía como "unregistered".
    const user = await this.usersRepository.findByPhoneCandidates(
      phoneCandidates(phone),
    );

    if (!user) {
      // Convida quem ainda não tem conta vinculada a este número, com o link do
      // app. Sem isso, a mensagem caía no vazio (só log) — perdendo um lead.
      const appUrl = process.env.FRONTEND_URL ?? 'https://app.lemonfin.com.br';
      await this.wmodeClient.sendMessage({
        to: from,
        content:
          'Olá! 👋 Este número ainda não tem uma conta no LemonFin. ' +
          `Crie a sua e cadastre seu telefone nas configurações para registrar ` +
          `e consultar suas finanças por aqui: ${appUrl}`,
      });
      this.logger.log(`Replied invite to unregistered phone: ${phone}`);
      return;
    }

    // Paywall hard (no-op enquanto BILLING_ENFORCEMENT != 'on'). Sem acesso
    // premium efetivo (considerando a família), qualquer mensagem responde com
    // o link para assinar — o WhatsApp não tem como exibir tela.
    if (this.billingConfig.enforcementEnabled) {
      const hasAccess = await this.premiumAccess.hasAccess(user.id);
      if (!hasAccess) {
        const appUrl =
          process.env.FRONTEND_URL ?? 'https://app.lemonfin.com.br';
        await this.wmodeClient.sendMessage({
          to: from,
          content:
            'Seu acesso ao LemonFin expirou. Para continuar registrando e ' +
            `consultando suas finanças por aqui, assine em: ${appUrl}/assinar`,
        });
        this.logger.log(
          `Blocked WhatsApp message from user ${user.id} (no access)`,
        );
        return;
      }
    }

    // Áudio: transcreve para texto (Whisper) e segue o fluxo normal a partir
    // daqui — todo o resto opera sobre `content` como se fosse texto digitado.
    if (audio) {
      const buffer = Buffer.from(audio.data, 'base64');
      const text = await this.transcription.transcribe({
        buffer,
        mimetype: audio.mimetype,
        userId: user.id,
      });
      if (!text) {
        await this.wmodeClient.sendMessage({
          to: from,
          content:
            'Não consegui entender o áudio 😕. Pode tentar de novo falando ' +
            'mais devagar, ou mandar por texto? Ex: _"Gastei 50 no mercado"_.',
        });
        return;
      }
      this.logger.log(`Áudio transcrito de ${from}: ${text}`);
      content = text;
    }

    // Imagem (comprovante/nota): lida por visão e convertida direto em
    // transação. Não passa pelo parser de texto nem pelo fluxo de pendências —
    // a foto já produz o lançamento. Os demais intents (query, batch, etc.) não
    // fazem sentido para uma foto de comprovante.
    if (image) {
      const phoneKey = this.normalizePhone(from);
      const userIds = await this.familyContext.resolveUserIds(user.id);
      const customCategories = (
        await this.categoriesRepository.findForUser(userIds)
      )
        .filter((c) => c.userId !== null)
        .map((c) => ({ slug: c.slug, name: c.name }));

      const buffer = Buffer.from(image.data, 'base64');
      const data = await this.receiptExtraction.extract({
        buffer,
        mimetype: image.mimetype,
        userId: user.id,
        customCategories,
        // `content` numa mensagem de imagem é a legenda que o usuário escreveu
        // junto da foto (ex: "no cartão Bradesco") — vai como contexto.
        caption: content,
      });

      if (!data) {
        await this.wmodeClient.sendMessage({
          to: from,
          content:
            'Não consegui ler esse comprovante 😕. Pode mandar uma foto mais ' +
            'nítida, ou digitar? Ex: _"Gastei 50 no mercado"_.',
        });
        return;
      }

      const result: ParseResult = { intent: 'transaction', data };
      // Aviso natural do que foi entendido, antes de registrar/confirmar.
      const ack = this.buildImageAck(data);
      if (ack) {
        await this.wmodeClient.sendMessage({ to: from, content: ack });
      }
      await this.handleTransaction(from, user.id, result, phoneKey);
      return;
    }

    // Quando a mensagem veio por áudio, mandamos um aviso natural do que foi
    // entendido ANTES da resposta final — mas só depois do parse, para a frase
    // refletir a ação ("vou registrar...") em vez de ecoar a transcrição crua.
    const wasAudio = !!audio;

    const phoneKey = this.normalizePhone(from);

    // 1) Há uma confirmação pendente? Tenta resolver SEM chamar a IA.
    const pending = await this.conversation.getPending(phoneKey);
    if (pending) {
      const resolved = await this.tryResolvePending(
        from,
        phoneKey,
        user.id,
        pending,
        content,
      );
      if (resolved) return; // resposta consumida pela confirmação
      // Se não resolveu (usuário ignorou e mandou outra coisa), limpa o
      // pendente e processa a nova mensagem normalmente.
      await this.conversation.clearPending(phoneKey);
    }

    // 2) Fluxo normal — com histórico de conversa como contexto.
    const history = await this.conversation.getHistory(phoneKey);
    // Categorias personalizadas entram no prompt para a IA poder classificar
    // transações nelas (além das de sistema).
    const userIds = await this.familyContext.resolveUserIds(user.id);
    const customCategories = (
      await this.categoriesRepository.findForUser(userIds)
    )
      .filter((c) => c.userId !== null)
      .map((c) => ({ slug: c.slug, name: c.name }));
    const result = await this.messageParser.parse(
      content,
      history,
      customCategories,
      user.id,
    );

    // Registra a mensagem do usuário no histórico.
    await this.conversation.appendHistory(phoneKey, [
      { role: 'user', text: content },
    ]);

    // Áudio: aviso natural do que foi entendido, antes da resposta final.
    if (wasAudio) {
      const ack = this.buildAudioAck(result);
      if (ack) {
        await this.wmodeClient.sendMessage({ to: from, content: ack });
      }
    }

    switch (result.intent) {
      case 'transaction':
        await this.handleTransaction(from, user.id, result, phoneKey);
        break;
      case 'query':
        await this.handleQuery(from, user.id, result);
        break;
      case 'cancel':
        await this.handleCancel(from, user.id, phoneKey);
        break;
      case 'correction':
        await this.handleCorrection(from, user.id, result);
        break;
      case 'correction_card':
        await this.handleCorrectionCard(from, user.id, result.cardName);
        break;
      case 'installment':
        await this.handleInstallment(from, user.id, result, phoneKey);
        break;
      case 'recurring':
        await this.handleRecurring(from, user.id, result);
        break;
      case 'reserve_create':
        await this.handleReserveCreate(from, user.id, result, phoneKey);
        break;
      case 'reserve_contribution':
        await this.handleReserveContribution(from, user.id, result, phoneKey);
        break;
      case 'pay_invoice':
        await this.handlePayInvoice(from, user.id, result, phoneKey);
        break;
      case 'goal_create':
        await this.handleGoalCreate(from, user.id, result.data);
        break;
      case 'batch':
        await this.handleBatch(from, user.id, result, phoneKey);
        break;
      case 'redo':
        await this.handleRedo(from, user.id, result, phoneKey);
        break;
      case 'advice':
        await this.handleAdvisor(from, user, content, history, phoneKey);
        break;
      case 'unknown':
        await this.wmodeClient.sendMessage({
          to: from,
          content: result.message,
        });
        break;
    }
  }

  // Data da transação a gravar: quando o usuário menciona "ontem"/"dia 5", o
  // parser devolve purchaseDate (ISO). Reancoramos no MEIO-DIA UTC (convenção do
  // projeto) para a data não deslocar 1 dia no fuso do Brasil. Sem menção,
  // retorna undefined e o repositório usa `new Date()` (hoje).
  private resolveTransactionDate(purchaseDate?: string): string | undefined {
    if (!purchaseDate) return undefined;
    const d = new Date(purchaseDate);
    if (Number.isNaN(d.getTime())) return undefined;
    return new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0),
    ).toISOString();
  }

  private async handleTransaction(
    from: string,
    userId: string,
    result: Extract<ParseResult, { intent: 'transaction' }>,
    phoneKey?: string,
  ) {
    const { data } = result;
    const txDate = this.resolveTransactionDate(data.purchaseDate);

    // Confiança baixa na categoria → confirma com o usuário antes de registrar
    // (não chuta). Só quando temos a chave da conversa para guardar o pendente.
    if (phoneKey && data.categoryConfidence < 0.6) {
      await this.askCategoryConfirmation(from, phoneKey, data);
      return;
    }

    const userIds = await this.familyContext.resolveUserIds(userId);
    let category = await this.categoriesRepository.findBySlug(
      data.categorySlug,
      userIds,
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
            date: txDate,
          });

          const amountFormatted = data.amount.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          });

          await this.wmodeClient.sendMessage({
            to: from,
            content:
              `Anotado! ${category.icon} *${amountFormatted}* em *${data.description}* ` +
              `registrado em *${category.name}*.\n\n` +
              `Só uma coisa: você tem ${userCards.length} cartões (${names}), ` +
              `então deixei sem cartão por enquanto. ` +
              `Se quiser vincular, é só dizer o nome — tipo _"foi no ${userCards[0].name}"_ 💳`,
          });

          if (phoneKey) {
            await this.conversation.setLastAction(phoneKey, {
              kind: 'transaction',
              transactionIds: [transaction.id],
              label: `${amountFormatted} em ${category.name}`,
            });
          }

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
      date: txDate,
    });

    const amountFormatted = data.amount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    const fmt = (v: number) =>
      v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const cardInfo = cardLabel ? ` no *${cardLabel}*` : '';

    let duplicateWarning = '';
    if (duplicate) {
      const when = this.relativeWhen(duplicate.createdAt);
      duplicateWarning =
        `\n\n⚠️ _Você já registrou ${amountFormatted} em ${category.name} ${when}. ` +
        `Se foi engano, responda *cancela* que eu removo._`;
    }

    let message: string;
    if (data.type === 'INCOME') {
      message =
        `Boa! 🎉 *${amountFormatted}* de *${data.description}* ` +
        `registrado em *${category.name}*${cardInfo}.\n\n` +
        `Já tá no seu painel ✨`;
    } else {
      // Insight: total gasto na categoria no mês (inclui a transação recém-criada).
      const now = new Date();
      const startDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      ).toISOString();
      const breakdown = await this.transactionsRepository.getCategoryBreakdown(
        userIds,
        startDate,
        now.toISOString(),
      );
      const row = breakdown.find((b) => b.categoryId === category.id);
      const monthTotal = row?.total ?? data.amount;

      const opener = this.pick([
        `Anotado!`,
        `Pronto!`,
        `Show, registrei!`,
        `Feito!`,
      ]);

      const insight =
        monthTotal > data.amount
          ? `\n\nVocê já gastou *${fmt(monthTotal)}* em *${category.name}* este mês. ` +
            `Quer ver o resumo? 📊`
          : `\n\nFoi o primeiro gasto em *${category.name}* este mês 👀`;

      message =
        `${opener} ${category.icon} *${amountFormatted}* em *${data.description}* ` +
        `registrado em *${category.name}*${cardInfo}.` +
        insight +
        duplicateWarning;
    }

    await this.wmodeClient.sendMessage({
      to: from,
      content: message,
    });

    if (phoneKey) {
      await this.conversation.appendHistory(phoneKey, [
        {
          role: 'bot',
          text: `Registrado: ${amountFormatted} em ${category.name}`,
        },
      ]);
      // Última ação = esta transação, para "cancela"/"refaz".
      await this.conversation.setLastAction(phoneKey, {
        kind: 'transaction',
        transactionIds: [transaction.id],
        label: `${amountFormatted} em ${category.name}`,
      });
    }

    this.logger.log(
      `Transaction created: ${transaction.id} for user ${userId}`,
    );
  }

  // Pergunta a categoria quando a IA está incerta; salva o pendente para a
  // próxima mensagem resolver (sem chamar a IA de novo).
  private async askCategoryConfirmation(
    from: string,
    phoneKey: string,
    data: Extract<ParseResult, { intent: 'transaction' }>['data'],
  ) {
    // Monta opções: a categoria adivinhada primeiro, depois alternativas
    // comuns, terminando em "Outros". Dedup e no máx 4.
    const guessed = data.categorySlug;
    const candidates = [
      guessed,
      'alimentacao',
      'transporte',
      'compras',
      'lazer',
      'outros',
    ];
    const seen = new Set<string>();
    const options: { slug: string; label: string }[] = [];
    for (const slug of candidates) {
      if (seen.has(slug)) continue;
      const cat = await this.categoriesRepository.findBySlug(slug);
      if (!cat) continue;
      seen.add(slug);
      options.push({
        slug: cat.slug,
        label: `${cat.icon ?? ''} ${cat.name}`.trim(),
      });
      if (options.length >= 4) break;
    }

    const pending: PendingConfirmation = {
      type: 'category',
      amount: data.amount,
      txType: data.type,
      description: data.description,
      cardName: data.cardName,
      purchaseDate: data.purchaseDate,
      options,
    };
    await this.conversation.setPending(phoneKey, pending);

    const amountFormatted = data.amount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    const optionsText = options
      .map((o, i) => `${i + 1}. ${o.label}`)
      .join('\n');

    await this.wmodeClient.sendMessage({
      to: from,
      content:
        `Anotei *${amountFormatted}* em _${data.description}_ 👍\n\n` +
        `Só me diz em qual categoria entra:\n${optionsText}\n\n` +
        `_Responde com o número._`,
    });
  }

  // Tenta resolver uma confirmação pendente a partir da resposta do usuário,
  // SEM chamar a IA. Retorna true se consumiu a mensagem.
  private async tryResolvePending(
    from: string,
    phoneKey: string,
    userId: string,
    pending: PendingConfirmation,
    content: string,
  ): Promise<boolean> {
    if (pending.type === 'reserve-contribution') {
      return this.resolveReserveContribution(
        from,
        phoneKey,
        userId,
        pending,
        content,
      );
    }
    if (pending.type !== 'category') return false;

    const text = content.trim().toLowerCase();

    // Cancelamento explícito.
    if (['cancela', 'cancelar', 'deixa', 'esquece'].includes(text)) {
      await this.conversation.clearPending(phoneKey);
      await this.wmodeClient.sendMessage({
        to: from,
        content: 'Ok, cancelei. Nada foi registrado.',
      });
      return true;
    }

    // Resolve por número (1, 2, ...) ou por nome/slug.
    let chosen: { slug: string; label: string } | undefined;
    const num = parseInt(text, 10);
    if (!Number.isNaN(num) && num >= 1 && num <= pending.options.length) {
      chosen = pending.options[num - 1];
    } else {
      chosen = pending.options.find(
        (o) =>
          o.slug === text ||
          o.label.toLowerCase().includes(text) ||
          text.includes(o.slug),
      );
    }

    if (!chosen) return false; // não entendeu a resposta → reprocessa fora

    await this.conversation.clearPending(phoneKey);

    // Recria a transação com a categoria escolhida (confiança alta → não
    // re-pergunta). Reusa toda a lógica de cartão/duplicata/mensagem.
    await this.handleTransaction(
      from,
      userId,
      {
        intent: 'transaction',
        data: {
          amount: pending.amount,
          type: pending.txType,
          categorySlug: chosen.slug,
          categoryConfidence: 1,
          description: pending.description,
          cardName: pending.cardName,
          purchaseDate: pending.purchaseDate,
        },
      },
      phoneKey,
    );
    return true;
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
      // "Metas" = tetos de gasto por categoria (model Goal). O antigo handleBudget
      // (model Budget, teto único do mês) ficou obsoleto para o WhatsApp.
      await this.handleGoalsQuery(from, userId);
      return;
    }

    if (result.queryType === 'reserves') {
      await this.handleReserveQuery(from, userId);
      return;
    }

    if (result.queryType === 'recurring') {
      await this.handleRecurringQuery(from, userId);
      return;
    }

    if (result.queryType === 'category') {
      await this.handleCategoryQuery(from, userId, result.categorySlug);
      return;
    }

    if (result.queryType === 'card') {
      await this.handleCardQuery(from, userId, result.cardName);
      return;
    }

    if (result.queryType === 'last_transaction') {
      await this.handleLastTransactionQuery(from, userId);
      return;
    }

    if (result.queryType === 'top_transaction') {
      await this.handleTopTransactionQuery(from, userId);
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
          `💸 Em ${monthName} você gastou *${expenseFormatted}* ` +
          `(${summary.expenseCount} ${summary.expenseCount === 1 ? 'lançamento' : 'lançamentos'}).\n\n` +
          `_Quer o quadro completo? Manda "resumo" 📊_`;
        break;

      case 'income':
        message =
          `💰 Em ${monthName} entraram *${incomeFormatted}* ` +
          `(${summary.incomeCount} ${summary.incomeCount === 1 ? 'lançamento' : 'lançamentos'}).\n\n` +
          `_Quer o quadro completo? Manda "resumo" 📊_`;
        break;

      case 'balance':
        message =
          `${balanceEmoji} Seu saldo de ${monthName} é *${balanceFormatted}*.\n\n` +
          `Entrou ${incomeFormatted} 💰 e saiu ${expenseFormatted} 💸.`;
        break;

      case 'summary':
      default:
        message =
          `📊 *Como ${monthName} tá indo:*\n\n` +
          `💰 Entrou *${incomeFormatted}* (${summary.incomeCount})\n` +
          `💸 Saiu *${expenseFormatted}* (${summary.expenseCount})\n` +
          `${balanceEmoji} Saldo: *${balanceFormatted}*\n\n` +
          `_Quer uma dica de onde economizar? É só pedir 😉_`;
        break;
    }

    await this.wmodeClient.sendMessage({ to: from, content: message });
  }

  // Resolve o cartão de um comando (consulta/pagamento). cardName indefinido ou
  // "cartao" = genérico (resolve só se houver exatamente 1 cartão). Se não der
  // pra resolver, JÁ envia a mensagem apropriada e retorna null.
  private async resolveCardForCommand(
    from: string,
    userIds: string[],
    cardName?: string | null,
    purpose: 'ver a fatura' | 'pagar a fatura' = 'ver a fatura',
  ): Promise<{
    id: string;
    name: string;
    closingDay: number;
    dueDay: number | null;
  } | null> {
    if (!cardName || cardName.toLowerCase() === 'cartao') {
      const cards = await this.cardsRepository.findMany(userIds);
      if (cards.length === 0) {
        await this.wmodeClient.sendMessage({
          to: from,
          content:
            'Você ainda não tem nenhum cartão cadastrado. ' +
            'Cadastre um no app pra eu acompanhar a fatura dele 💳',
        });
        return null;
      }
      if (cards.length > 1) {
        const names = cards.map((c) => c.name).join(', ');
        await this.wmodeClient.sendMessage({
          to: from,
          content:
            `Você tem mais de um cartão (${names}). ` +
            `De qual você quer ${purpose}? É só me dizer o nome.`,
        });
        return null;
      }
      return cards[0];
    }

    const card = await this.cardsRepository.findByName(cardName, userIds);
    if (!card) {
      const cards = await this.cardsRepository.findMany(userIds);
      const tail =
        cards.length > 0
          ? `Seus cartões são: ${cards.map((c) => c.name).join(', ')}.`
          : 'Você ainda não tem nenhum cartão cadastrado.';
      await this.wmodeClient.sendMessage({
        to: from,
        content: `Não achei um cartão chamado *${cardName}*. ${tail}`,
      });
      return null;
    }
    return card;
  }

  // Gastos de um cartão específico no mês. cardName indefinido ou "cartao" =
  // genérico (tenta resolver se o usuário só tem 1 cartão).
  private async handleCardQuery(
    from: string,
    userId: string,
    cardName?: string,
  ) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const fmt = (v: number) =>
      v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const card = await this.resolveCardForCommand(from, userIds, cardName);
    if (!card) return;

    // Fatura ABERTA = ciclo de fechamento (mesmo critério da tela /cartoes),
    // não o gasto do mês civil. Assim "qual minha fatura?" bate com o app.
    // ref em UTC para casar com cardCycleRange (régua em UTC).
    const now = new Date();
    const { start, end } = cardCycleRange(
      card.closingDay,
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    );

    const { total, count } = await this.transactionsRepository.getCardSummary(
      userIds,
      card.id,
      start.toISOString(),
      end.toISOString(),
    );

    // Linha de vencimento (só se o cartão tiver dueDay cadastrado). A fatura
    // fecha em `end`; vence na próxima ocorrência do dueDay a partir daí.
    const dueLine =
      card.dueDay != null
        ? `\n📅 Vence em *${this.formatTxDate(nextDueDate(card.dueDay, end))}*.`
        : '';

    if (count === 0) {
      await this.wmodeClient.sendMessage({
        to: from,
        content:
          `Nada no *${card.name}* nesta fatura ainda — fatura limpa 👍` +
          dueLine,
      });
      return;
    }

    await this.wmodeClient.sendMessage({
      to: from,
      content:
        `💳 A fatura aberta do *${card.name}* está em *${fmt(total)}* ` +
        `(${count} ${count === 1 ? 'compra' : 'compras'}).` +
        dueLine,
    });
  }

  // "Qual foi minha última transação?" — a mais recente (por data do gasto).
  private async handleLastTransactionQuery(from: string, userId: string) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const tx = await this.transactionsRepository.findLatest(userIds);

    if (!tx) {
      await this.wmodeClient.sendMessage({
        to: from,
        content:
          'Você ainda não tem nenhuma transação registrada. ' +
          'Manda algo como _"gastei 50 no mercado"_ que eu anoto 😉',
      });
      return;
    }

    const fmt = (v: number) =>
      v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const amount = fmt(tx.amount.toNumber());
    const icon = tx.category?.icon ?? (tx.type === 'INCOME' ? '💰' : '💸');
    const label = tx.description || tx.category?.name || 'transação';
    const when = this.formatTxDate(tx.date);
    const cardInfo = tx.card ? ` no *${tx.card.name}*` : '';
    const verb = tx.type === 'INCOME' ? 'Última entrada' : 'Último gasto';

    await this.wmodeClient.sendMessage({
      to: from,
      content:
        `${icon} *${verb}:* *${amount}* em _${label}_${cardInfo}\n` +
        `🗓️ ${when} • ${tx.category?.name ?? 'sem categoria'}`,
    });
  }

  // "Qual foi minha compra mais cara?" — maior DESPESA do mês corrente.
  private async handleTopTransactionQuery(from: string, userId: string) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const now = new Date();
    const startDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    ).toISOString();
    const endDate = now.toISOString();

    const tx = await this.transactionsRepository.findMostExpensive(userIds, {
      type: 'EXPENSE',
      startDate,
      endDate,
    });

    const monthName = now.toLocaleDateString('pt-BR', { month: 'long' });

    if (!tx) {
      await this.wmodeClient.sendMessage({
        to: from,
        content: `Você ainda não tem gastos em ${monthName} 👍`,
      });
      return;
    }

    const fmt = (v: number) =>
      v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const amount = fmt(tx.amount.toNumber());
    const icon = tx.category?.icon ?? '💸';
    const label = tx.description || tx.category?.name || 'gasto';
    const when = this.formatTxDate(tx.date);
    const cardInfo = tx.card ? ` no *${tx.card.name}*` : '';

    await this.wmodeClient.sendMessage({
      to: from,
      content:
        `${icon} *Sua maior despesa em ${monthName}:* *${amount}* em _${label}_${cardInfo}\n` +
        `🗓️ ${when} • ${tx.category?.name ?? 'sem categoria'}`,
    });
  }

  // Formata a data de uma transação para exibição (dd/mm/aaaa). Em UTC porque as
  // datas são ancoradas ao meio-dia UTC; formatar no fuso local puxaria datas
  // próximas da meia-noite para o dia anterior.
  private formatTxDate(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(date));
  }

  // Gasto numa CATEGORIA específica (alimentação, transporte...) no mês corrente.
  private async handleCategoryQuery(
    from: string,
    userId: string,
    categorySlug?: string,
  ) {
    const fmt = (v: number) =>
      v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const userIds = await this.familyContext.resolveUserIds(userId);
    const category = categorySlug
      ? await this.categoriesRepository.findBySlug(categorySlug, userIds)
      : null;
    if (!category) {
      await this.wmodeClient.sendMessage({
        to: from,
        content:
          'Não consegui identificar a categoria. Tente algo como ' +
          '_"quanto gastei com transporte?"_ ou _"gastos com alimentação"_.',
      });
      return;
    }
    const now = new Date();
    const startDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    ).toISOString();
    const endDate = now.toISOString();

    const breakdown = await this.transactionsRepository.getCategoryBreakdown(
      userIds,
      startDate,
      endDate,
    );
    const row = breakdown.find((b) => b.categoryId === category.id);
    const monthName = now.toLocaleDateString('pt-BR', { month: 'long' });
    const label = `${category.icon ?? ''} ${category.name}`.trim();

    if (!row || row.count === 0) {
      await this.wmodeClient.sendMessage({
        to: from,
        content: `Zero gastos com *${category.name}* em ${monthName} até agora 👍`,
      });
      return;
    }

    await this.wmodeClient.sendMessage({
      to: from,
      content:
        `${label} Em ${monthName} você gastou *${fmt(row.total)}* com *${category.name}* ` +
        `(${row.count} ${row.count === 1 ? 'lançamento' : 'lançamentos'}).`,
    });
  }

  // "Metas" = tetos de gasto por categoria (model Goal). O gasto é recalculado
  // por período (mês/semana) e o teto persiste — não precisa redefinir todo mês.
  private async handleGoalsQuery(from: string, userId: string) {
    const goals = await this.listGoals.execute(userId);

    const fmt = (v: number) =>
      v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    if (goals.length === 0) {
      await this.wmodeClient.sendMessage({
        to: from,
        content:
          `Você ainda não tem nenhuma meta de gasto 🎯\n\n` +
          `Que tal criar uma? É só dizer algo como ` +
          `_"limite de 800 em alimentação por mês"_.`,
      });
      return;
    }

    const blocks = goals.map((g) => {
      const { spent, limit, percentage, remaining, exceeded } = g.progress;
      const bar = this.progressBar(percentage);
      const periodLabel = g.period === 'WEEKLY' ? 'semana' : 'mês';
      const icon = g.category?.icon ?? '🎯';
      const name = g.category?.name ?? g.name;
      const status = exceeded
        ? `⚠️ estourou ${fmt(spent - limit)}`
        : `restam ${fmt(remaining)}`;
      return (
        `${icon} *${name}* — por ${periodLabel}\n` +
        `${bar} ${percentage}%\n` +
        `${fmt(spent)} de ${fmt(limit)}  •  ${status}`
      );
    });

    await this.wmodeClient.sendMessage({
      to: from,
      content: `🎯 *Suas metas de gasto*\n\n` + blocks.join('\n\n'),
    });
  }

  // Cria uma meta (teto de gasto por categoria, model Goal) a partir de uma
  // mensagem. categorySlug e amount vêm do parser; period default MONTHLY.
  private async handleGoalCreate(
    from: string,
    userId: string,
    data: {
      categorySlug: string;
      amount: number;
      period: 'MONTHLY' | 'WEEKLY';
    },
  ) {
    const fmt = (v: number) =>
      v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const userIds = await this.familyContext.resolveUserIds(userId);
    const category = await this.categoriesRepository.findBySlug(
      data.categorySlug,
      userIds,
    );
    if (!category) {
      await this.wmodeClient.sendMessage({
        to: from,
        content:
          'Não consegui identificar a categoria da meta. Tente algo como ' +
          '_"limite de 800 em alimentação por mês"_.',
      });
      return;
    }
    const existing = await this.goalsRepository.findByCategory(
      userIds,
      category.id,
    );
    if (existing) {
      await this.wmodeClient.sendMessage({
        to: from,
        content:
          `Você já tem uma meta para *${category.name}* (${fmt(existing.amount.toNumber())}). ` +
          `Pra mudar o valor, é só ajustar no app por enquanto 😉`,
      });
      return;
    }

    const periodLabel = data.period === 'WEEKLY' ? 'semana' : 'mês';
    await this.goalsRepository.create({
      name: category.name,
      amount: data.amount,
      period: data.period,
      userId,
      categoryId: category.id,
    });

    await this.wmodeClient.sendMessage({
      to: from,
      content:
        `Meta criada! ${category.icon ?? '🎯'} ` +
        `Vou segurar *${category.name}* em até *${fmt(data.amount)}* por ${periodLabel}.\n\n` +
        `_Pode deixar que eu te aviso quando chegar perto do teto 👀_`,
    });

    this.logger.log(
      `Goal created for category ${category.slug} (${fmt(data.amount)}/${data.period}) for user ${userId}`,
    );
  }

  // Assessor financeiro: perguntas abertas, conselhos, análises e small talk.
  // Delega ao mesmo motor do chat web (ChatCompletionUseCase), que tem acesso
  // aos dados reais do usuário e a ferramentas para consultar qualquer período.
  // O nome (primeiro nome) entra no contexto para um tom mais pessoal.
  private async handleAdvisor(
    from: string,
    user: { id: string; name: string },
    message: string,
    history: HistoryEntry[],
    phoneKey: string,
  ) {
    const firstName = user.name?.trim().split(/\s+/)[0];
    // Histórico do WhatsApp → formato do chat (bot vira assistant). Limita aos
    // últimos turnos para não inflar o prompt.
    const chatHistory = history.slice(-10).map((h) => ({
      role: h.role === 'bot' ? ('assistant' as const) : ('user' as const),
      content: h.text,
    }));

    let reply = '';
    try {
      reply = await this.chatCompletion.executeSync(
        user.id,
        { message, history: chatHistory },
        firstName,
      );
    } catch (error) {
      this.logger.error(`Advisor error: ${error}`);
    }

    if (!reply) {
      reply =
        'Tive um probleminha pra pensar nisso agora 😅. ' +
        'Pode tentar de novo? Posso te ajudar a entender seus gastos, ' +
        'achar onde dá pra economizar e organizar suas metas.';
    }

    await this.wmodeClient.sendMessage({ to: from, content: reply });
    await this.conversation.appendHistory(phoneKey, [
      { role: 'bot', text: reply },
    ]);
  }

  // Corrige o cartão da última transação. cardName=null remove o vínculo;
  // string troca para o cartão informado (igual handleCorrection, mas no cartão).
  private async handleCorrectionCard(
    from: string,
    userId: string,
    cardName: string | null,
  ) {
    const last = await this.transactionsRepository.findLastByUser(userId);
    if (!last) {
      await this.wmodeClient.sendMessage({
        to: from,
        content: 'Não encontrei nenhuma transação recente pra trocar o cartão.',
      });
      return;
    }

    const fmt = (v: number) =>
      v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const desc = last.description || '-';
    const amount = fmt(Number(last.amount));

    // Remover o vínculo de cartão.
    if (cardName === null) {
      await this.transactionsRepository.update(last.id, { cardId: null });
      await this.wmodeClient.sendMessage({
        to: from,
        content:
          `Feito! Tirei o cartão de *${desc}* (${amount}). ` +
          `Agora tá sem cartão vinculado 👍`,
      });
      this.logger.log(`Transaction ${last.id} card removed by user ${userId}`);
      return;
    }

    // Trocar para outro cartão.
    const userIds = await this.familyContext.resolveUserIds(userId);
    const card = await this.cardsRepository.findByName(cardName, userIds);
    if (!card) {
      const cards = await this.cardsRepository.findMany(userIds);
      const tail =
        cards.length > 0
          ? `Seus cartões são: ${cards.map((c) => c.name).join(', ')}. Pra qual eu troco?`
          : 'Você ainda não tem nenhum cartão cadastrado.';
      await this.wmodeClient.sendMessage({
        to: from,
        content: `Não achei um cartão chamado *${cardName}*. ${tail}`,
      });
      return;
    }

    await this.transactionsRepository.update(last.id, { cardId: card.id });
    await this.wmodeClient.sendMessage({
      to: from,
      content: `Trocado ✅ *${desc}* (${amount}) agora tá no *${card.name}* 💳`,
    });
    this.logger.log(
      `Transaction ${last.id} card changed to ${card.name} by user ${userId}`,
    );
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
      `Te conto como o mês deve fechar 👇`,
      '',
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
    if (forecast.estimatedVariableExpense > 0) {
      lines.push(
        `📊 *Gastos estimados:* ${fmt(forecast.estimatedVariableExpense)}`,
      );
    }

    lines.push(
      '',
      `${emoji} *Previsão:* ${fmt(forecast.projectedBalance)}`,
      `_${daysLabel} no mês_`,
    );

    if (forecast.estimatedVariableExpense > 0) {
      lines.push(
        `_inclui ~${fmt(forecast.estimatedVariableExpense)} de gastos variáveis estimados pela sua média_`,
      );
    }

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

  private async handleCancel(from: string, userId: string, phoneKey?: string) {
    const userIds = await this.familyContext.resolveUserIds(userId);

    // Caminho preferido: cancela a ÚLTIMA AÇÃO inteira (parcelamento/lote =
    // N transações), não só a última transação. Fallback para a última
    // transação quando não há ação registrada (ex.: conversas antigas).
    const lastAction = phoneKey
      ? await this.conversation.getLastAction(phoneKey)
      : null;

    if (lastAction && lastAction.transactionIds.length > 0) {
      const count = await this.transactionsRepository.deleteManyByIds(
        lastAction.transactionIds,
        userIds,
      );
      if (phoneKey) await this.conversation.clearLastAction(phoneKey);

      if (count > 0) {
        const what =
          count === 1
            ? `*${lastAction.label}*`
            : `as *${count}* transações de *${lastAction.label}*`;
        await this.wmodeClient.sendMessage({
          to: from,
          content:
            `Prontinho, removi ✅\n\n` +
            `Apaguei ${what}. Tá tudo certo de novo no painel 🧹`,
        });
        this.logger.log(
          `Cancelled last action (${count} tx) for user ${userId}`,
        );
        return;
      }
      // Se nada foi apagado (ids já removidos), cai no fallback abaixo.
    }

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
    if (phoneKey) await this.conversation.clearLastAction(phoneKey);

    await this.wmodeClient.sendMessage({
      to: from,
      content:
        `Prontinho, removi ✅\n\n` +
        `Apaguei *${amountFormatted}* de *${last.category.name}* ` +
        `(${last.description || 'sem descrição'}). ` +
        `Tá tudo certo de novo no painel 🧹`,
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
        `Corrigido ✏️\n\n` +
        `${last.category.icon} *${last.category.name}* ` +
        `(${last.description || 'sem descrição'}): ` +
        `de ~${oldFormatted}~ pra *${newFormatted}*. ` +
        `Já ajustei tudo no painel ✨`,
    });

    this.logger.log(
      `Transaction ${last.id} corrected: ${oldAmount} → ${result.newAmount} by user ${userId}`,
    );
  }

  private async handleInstallment(
    from: string,
    userId: string,
    result: Extract<ParseResult, { intent: 'installment' }>,
    phoneKey?: string,
  ) {
    const { data } = result;

    const userIds = await this.familyContext.resolveUserIds(userId);
    let category = await this.categoriesRepository.findBySlug(
      data.categorySlug,
      userIds,
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

    // Try to link to card if cardName was mentioned
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

    const { perInstallment, installmentGroupId, transactionIds } =
      await this.createInstallmentsUseCase.execute({
        amount: data.amount,
        installments: data.installments,
        description: data.description,
        userId,
        categoryId: category.id,
        cardId,
        // Data da compra captada do texto (ex: "comprei mês passado"); sem
        // menção, o use-case usa hoje.
        startDate: data.purchaseDate,
        source: 'WHATSAPP',
      });

    const totalFormatted = data.amount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    const perFormatted = perInstallment.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    const cardInfo = cardLabel ? ` no *${cardLabel}*` : '';

    await this.wmodeClient.sendMessage({
      to: from,
      content:
        `Parcelamento anotado! 🛍️ ${category.icon} *${data.description}* ` +
        `em *${category.name}*${cardInfo}.\n\n` +
        `*${data.installments}x de ${perFormatted}* (total ${totalFormatted}). ` +
        `Já dividi tudo nos próximos meses pra você 📅`,
    });

    if (phoneKey) {
      // Resumo NEUTRO no histórico (não os itens em si): impede o parser de
      // re-extrair o parcelamento de uma mensagem anterior do usuário num batch.
      await this.conversation.appendHistory(phoneKey, [
        {
          role: 'bot',
          text: `[parcelamento registrado: ${data.installments}x]`,
        },
      ]);
      // Última ação = este parcelamento inteiro, para "cancela"/"refaz".
      await this.conversation.setLastAction(phoneKey, {
        kind: 'installment',
        transactionIds,
        installmentGroupId,
        installments: data.installments,
        label: `${data.description} (${data.installments}x de ${perFormatted})`,
      });
    }

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

    const userIds = await this.familyContext.resolveUserIds(userId);
    let category = await this.categoriesRepository.findBySlug(
      data.categorySlug,
      userIds,
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
    let cardId: string | undefined;
    let cardLabel = '';
    if (data.cardName && data.cardName !== 'cartao') {
      const card = await this.cardsRepository.findByName(
        data.cardName,
        userIds,
      );
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
    const typeLabel = data.type === 'INCOME' ? 'entrada fixa' : 'conta fixa';
    const emoji = data.type === 'INCOME' ? '💰' : '🔁';
    const cardInfo = cardLabel ? ` no *${cardLabel}*` : '';
    const desc = data.description || category.name;

    await this.wmodeClient.sendMessage({
      to: from,
      content:
        `${emoji} Anotei sua ${typeLabel}: *${desc}* de *${amountFormatted}* ` +
        `todo dia *${data.dayOfMonth}*${cardInfo} (${category.icon} ${category.name}).\n\n` +
        `_Eu lanço sozinho todo mês — pode esquecer 😉_`,
    });

    this.logger.log(
      `Recurring created: ${recurring.id} (day ${data.dayOfMonth}) for user ${userId}`,
    );
  }

  // --- Reservas (objetivos de poupança) ------------------------------------

  private async handleReserveCreate(
    from: string,
    userId: string,
    result: Extract<ParseResult, { intent: 'reserve_create' }>,
    phoneKey?: string,
  ) {
    const { data } = result;
    const deadline = new Date(data.deadline);

    const reserve = await this.reservesRepository.create({
      name: data.name,
      targetAmount: data.targetAmount,
      deadline,
      userId,
    });

    const fmt = (v: number) =>
      v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const deadlineLabel = deadline.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });
    const { suggestedMonthly, monthsRemaining } = computeReserveProgress(
      data.targetAmount,
      0,
      deadline,
    );

    await this.wmodeClient.sendMessage({
      to: from,
      content:
        `Reserva criada! 🏦 Bora juntar *${fmt(data.targetAmount)}* pra *${data.name}* ` +
        `até ${deadlineLabel}.\n\n` +
        `Pra chegar lá tranquilo, guarda uns *${fmt(suggestedMonthly)}/mês* ` +
        `(${monthsRemaining} ${monthsRemaining === 1 ? 'mês' : 'meses'}) 💪\n\n` +
        `_Quando guardar, é só me dizer: "guardei 200 na ${data.name}"._`,
    });

    if (phoneKey) {
      await this.conversation.appendHistory(phoneKey, [
        {
          role: 'bot',
          text: `Reserva criada: ${data.name} (${fmt(data.targetAmount)})`,
        },
      ]);
    }

    this.logger.log(`Reserve created: ${reserve.id} for user ${userId}`);
  }

  private async handleReserveQuery(from: string, userId: string) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const reserves = await this.reservesRepository.findManyActive(userIds);

    const fmt = (v: number) =>
      v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    if (reserves.length === 0) {
      await this.wmodeClient.sendMessage({
        to: from,
        content:
          `Você ainda não tem nenhuma reserva 🏦\n\n` +
          `Bora começar? Me diz um objetivo, tipo ` +
          `_"quero juntar 5000 pra viagem até dezembro"_.`,
      });
      return;
    }

    const blocks = reserves.map((r) => {
      const target = r.targetAmount.toNumber();
      const saved = r.savedAmount.toNumber();
      const { remaining, percentage, monthsRemaining, suggestedMonthly } =
        computeReserveProgress(target, saved, r.deadline);
      const bar = this.progressBar(percentage);
      const deadlineLabel = r.deadline.toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric',
      });
      return (
        `*${r.name}* — ${deadlineLabel}\n` +
        `${bar} ${percentage}%\n` +
        `${fmt(saved)} de ${fmt(target)}  •  faltam ${fmt(remaining)}\n` +
        `_Sugestão: ${fmt(suggestedMonthly)}/mês (${monthsRemaining} ${monthsRemaining === 1 ? 'mês' : 'meses'})_`
      );
    });

    await this.wmodeClient.sendMessage({
      to: from,
      content: `🏦 *Suas reservas*\n\n` + blocks.join('\n\n'),
    });
  }

  // Lista as recorrências (contas fixas / assinaturas) ativas do usuário,
  // separando entradas fixas de saídas fixas e mostrando o dia do mês.
  private async handleRecurringQuery(from: string, userId: string) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const recurrences = await this.recurringRepository.findMany(userIds, true);

    const fmt = (v: number) =>
      v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    if (recurrences.length === 0) {
      await this.wmodeClient.sendMessage({
        to: from,
        content:
          `Você ainda não tem nenhuma conta fixa cadastrada 🔁\n\n` +
          `Cadastra uma assim: _"todo dia 5 pago 1500 de aluguel"_.`,
      });
      return;
    }

    const line = (r: (typeof recurrences)[number]) =>
      `• Dia ${r.dayOfMonth} — *${r.description}* ${fmt(r.amount.toNumber())}`;

    const expenses = recurrences.filter((r) => r.type === 'EXPENSE');
    const incomes = recurrences.filter((r) => r.type === 'INCOME');

    const sections: string[] = [];
    if (expenses.length > 0) {
      const total = expenses.reduce((s, r) => s + r.amount.toNumber(), 0);
      sections.push(
        `💸 *Saídas fixas* (${fmt(total)}/mês)\n` +
          expenses.map(line).join('\n'),
      );
    }
    if (incomes.length > 0) {
      const total = incomes.reduce((s, r) => s + r.amount.toNumber(), 0);
      sections.push(
        `💰 *Entradas fixas* (${fmt(total)}/mês)\n` +
          incomes.map(line).join('\n'),
      );
    }

    await this.wmodeClient.sendMessage({
      to: from,
      content: `🔁 *Suas contas fixas do mês*\n\n` + sections.join('\n\n'),
    });
  }

  // SEMPRE pergunta em qual reserva lançar (decisão de produto): guarda o aporte
  // como pendente e lista as reservas numeradas. A resposta é resolvida sem IA
  // por resolveReserveContribution.
  private async handleReserveContribution(
    from: string,
    userId: string,
    result: Extract<ParseResult, { intent: 'reserve_contribution' }>,
    phoneKey?: string,
  ) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const reserves = await this.reservesRepository.findManyActive(userIds);

    const fmt = (v: number) =>
      v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    if (reserves.length === 0) {
      await this.wmodeClient.sendMessage({
        to: from,
        content:
          `Você ainda não tem nenhuma reserva pra guardar. ` +
          `Crie uma: "quero juntar 5000 pra viagem até dezembro".`,
      });
      return;
    }

    if (!phoneKey) return; // sem chave de conversa não dá pra pendurar a pergunta

    const options = reserves.map((r) => ({ id: r.id, name: r.name }));
    const pending: PendingConfirmation = {
      type: 'reserve-contribution',
      amount: result.amount,
      options,
    };
    await this.conversation.setPending(phoneKey, pending);

    const list = options.map((o, i) => `${i + 1}. ${o.name}`).join('\n');
    await this.wmodeClient.sendMessage({
      to: from,
      content:
        `Boa! Vou guardar *${fmt(result.amount)}* — em qual reserva? 🏦\n\n${list}\n\n` +
        `_Responde com o número._`,
    });
  }

  // Registra o pagamento da fatura de um cartão. Sem valor informado, paga o
  // total da fatura aberta (ciclo de fechamento). cardName "cartao"/null =
  // genérico (resolve se houver 1 cartão; senão pede o nome).
  private async handlePayInvoice(
    from: string,
    userId: string,
    result: Extract<ParseResult, { intent: 'pay_invoice' }>,
    phoneKey?: string,
  ) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const fmt = (v: number) =>
      v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const card = await this.resolveCardForCommand(
      from,
      userIds,
      result.cardName,
      'pagar a fatura',
    );
    if (!card) return;

    // Ciclo aberto = mês corrente (mesma régua de getInvoice). UTC para o `cycle`
    // (chave do InvoicePayment) bater com o derivado no web em get-card-invoice.
    const now = new Date();
    const cycle = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const { start, end } = cardCycleRange(
      card.closingDay,
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    );
    const { total } = await this.transactionsRepository.getCardSummary(
      userIds,
      card.id,
      start.toISOString(),
      end.toISOString(),
    );

    const amount = result.amount ?? total;
    if (amount <= 0) {
      await this.wmodeClient.sendMessage({
        to: from,
        content: `A fatura do *${card.name}* está zerada — nada a pagar 👍`,
      });
      return;
    }

    const res = await this.payInvoiceUseCase.execute(card.id, userId, {
      cycle,
      amount,
    });

    const statusLabel =
      res.paymentStatus === 'paid'
        ? 'Fatura quitada ✅'
        : `Parcial: ${fmt(res.paid)} de ${fmt(res.total)}`;

    await this.wmodeClient.sendMessage({
      to: from,
      content:
        `✅ Registrei o pagamento de *${fmt(amount)}* na fatura do ` +
        `*${card.name}*.\n${statusLabel}`,
    });

    if (phoneKey) {
      await this.conversation.appendHistory(phoneKey, [
        {
          role: 'bot',
          text: `Pagamento de fatura registrado: ${card.name} ${fmt(amount)}`,
        },
      ]);
    }
  }

  // Resolve o aporte pendente (sem IA): identifica a reserva por número ou nome,
  // cria a DESPESA em "reservas" e incrementa o acumulado da reserva.
  private async resolveReserveContribution(
    from: string,
    phoneKey: string,
    userId: string,
    pending: Extract<PendingConfirmation, { type: 'reserve-contribution' }>,
    content: string,
  ): Promise<boolean> {
    const text = content.trim().toLowerCase();

    if (['cancela', 'cancelar', 'deixa', 'esquece'].includes(text)) {
      await this.conversation.clearPending(phoneKey);
      await this.wmodeClient.sendMessage({
        to: from,
        content: 'Ok, cancelei. Nada foi guardado.',
      });
      return true;
    }

    let chosen: { id: string; name: string } | undefined;
    const num = parseInt(text, 10);
    if (!Number.isNaN(num) && num >= 1 && num <= pending.options.length) {
      chosen = pending.options[num - 1];
    } else {
      chosen = pending.options.find((o) => o.name.toLowerCase().includes(text));
    }

    if (!chosen) return false; // não entendeu → reprocessa a mensagem fora

    await this.conversation.clearPending(phoneKey);

    const category = await this.categoriesRepository.findBySlug('reservas');
    if (!category) {
      await this.wmodeClient.sendMessage({
        to: from,
        content: 'Erro interno: categoria de reservas não encontrada.',
      });
      return true;
    }

    // 1) Aporte vira DESPESA (saiu do disponível do mês).
    await this.transactionsRepository.create({
      amount: pending.amount,
      type: 'EXPENSE',
      description: `Guardado: ${chosen.name}`,
      source: 'WHATSAPP',
      userId,
      categoryId: category.id,
    });

    // 2) Incrementa o acumulado da reserva (desativa se completou).
    const updated = await this.reservesRepository.addContribution(
      chosen.id,
      pending.amount,
    );

    const fmt = (v: number) =>
      v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const target = updated.targetAmount.toNumber();
    const saved = updated.savedAmount.toNumber();
    const { percentage, remaining } = computeReserveProgress(
      target,
      saved,
      updated.deadline,
    );

    const done = saved >= target;
    const body = done
      ? `🎉 É isso! Você completou *${chosen.name}* — ` +
        `${fmt(saved)} de ${fmt(target)}. Que orgulho, parabéns! 🥳`
      : `Guardado! 🏦 Coloquei *${fmt(pending.amount)}* em *${chosen.name}*.\n\n` +
        `Você já tem *${fmt(saved)}* de ${fmt(target)} (${percentage}%) — ` +
        `faltam só ${fmt(remaining)} 💪`;

    await this.wmodeClient.sendMessage({ to: from, content: body });

    await this.conversation.appendHistory(phoneKey, [
      {
        role: 'bot',
        text: `Guardado ${fmt(pending.amount)} em ${chosen.name}`,
      },
    ]);

    this.logger.log(
      `Reserve contribution: ${pending.amount} to reserve ${chosen.id} by user ${userId}`,
    );
    return true;
  }

  // Escolhe uma variação de frase para dar um tom mais humano sem repetir
  // sempre a mesma abertura. Usa o minuto atual como índice — varia ao longo do
  // dia sem depender de Math.random (determinístico por minuto).
  private pick(options: string[]): string {
    if (options.length === 0) return '';
    const idx = new Date().getMinutes() % options.length;
    return options[idx];
  }

  // Barra de progresso textual (10 blocos): ████░░░░░░
  private progressBar(percentage: number): string {
    const filled = Math.max(
      0,
      Math.min(10, Math.round(Math.min(percentage, 100) / 10)),
    );
    return '█'.repeat(filled) + '░'.repeat(10 - filled);
  }

  // Vários itens numa só mensagem. Persiste cada item reaproveitando os mesmos
  // repositórios dos handlers individuais, mas envia UMA mensagem-resumo (e não
  // uma por item). Itens que não puderam ser estruturados (skipped) entram no
  // resumo como aviso — nunca são registrados com dados inventados.
  private async handleBatch(
    from: string,
    userId: string,
    result: Extract<ParseResult, { intent: 'batch' }>,
    phoneKey?: string,
  ) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const lines: string[] = [];
    const allTransactionIds: string[] = [];
    const installmentGroupIds: string[] = [];

    for (const item of result.items) {
      try {
        const r = await this.persistBatchItem(userId, userIds, item);
        lines.push(r.line);
        allTransactionIds.push(...r.transactionIds);
        if (r.installmentGroupId)
          installmentGroupIds.push(r.installmentGroupId);
      } catch (error) {
        this.logger.error(`Batch item failed: ${error}`);
        lines.push('⚠️ um item falhou ao registrar');
      }
    }

    const parts: string[] = [];
    if (lines.length > 0) {
      parts.push(
        `Prontinho! Registrei ${lines.length} ${lines.length === 1 ? 'lançamento' : 'lançamentos'} de uma vez 🚀\n\n` +
          lines.map((l) => `• ${l}`).join('\n'),
      );
    }
    if (result.skipped.length > 0) {
      parts.push(
        `⚠️ Só ${result.skipped.length} ficaram de fora:\n` +
          result.skipped
            .map((s) => `• ${s.description} — ${s.reason}`)
            .join('\n') +
          `\n\n_Me manda esses de novo com o valor certinho 😉_`,
      );
    }

    await this.wmodeClient.sendMessage({
      to: from,
      content: parts.join('\n\n'),
    });

    if (phoneKey && lines.length > 0) {
      // Resumo NEUTRO no histórico (não os itens em si): impede o parser de
      // re-extrair os lançamentos deste lote numa mensagem posterior do usuário.
      await this.conversation.appendHistory(phoneKey, [
        {
          role: 'bot',
          text: `[registrei ${lines.length} ${lines.length === 1 ? 'lançamento' : 'lançamentos'}]`,
        },
      ]);
      // Última ação = este lote inteiro, para "cancela"/"refaz" (só transações;
      // recorrências do lote ficam de fora pois não são Transaction).
      if (allTransactionIds.length > 0) {
        await this.conversation.setLastAction(phoneKey, {
          kind: 'batch',
          transactionIds: allTransactionIds,
          installmentGroupIds,
          count: lines.length,
          label: `${lines.length} ${lines.length === 1 ? 'lançamento' : 'lançamentos'}`,
        });
      }
    }

    this.logger.log(
      `Batch processed: ${lines.length} registered, ${result.skipped.length} skipped for user ${userId}`,
    );
  }

  // Refaz a ÚLTIMA AÇÃO de outro jeito: recria com o ajuste e remove o registro
  // anterior. Estratégia "cria-depois-apaga": cria o novo PRIMEIRO e só então
  // apaga o antigo — se a criação falhar, nada é perdido (o antigo permanece).
  private async handleRedo(
    from: string,
    userId: string,
    result: Extract<ParseResult, { intent: 'redo' }>,
    phoneKey?: string,
  ) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const lastAction = phoneKey
      ? await this.conversation.getLastAction(phoneKey)
      : null;

    if (!lastAction || lastAction.transactionIds.length === 0) {
      await this.wmodeClient.sendMessage({
        to: from,
        content:
          'Não achei um registro recente pra refazer. Me manda o lançamento ' +
          'que você quer e eu registro 😉',
      });
      return;
    }

    // Reconstrói os dados da ação anterior a partir das transações em si (fonte
    // da verdade — não depende de o lastAction guardar valor/categoria).
    const prev = await this.transactionsRepository.findManyByIds(
      lastAction.transactionIds,
      userIds,
    );
    if (prev.length === 0) {
      if (phoneKey) await this.conversation.clearLastAction(phoneKey);
      await this.wmodeClient.sendMessage({
        to: from,
        content:
          'Esse registro não está mais aqui (já foi removido). Manda de novo ' +
          'que eu registro 😉',
      });
      return;
    }

    const { adjust } = result;
    const fmt = (v: number) =>
      v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Cartão a aplicar no refazer: se o usuário mandou trocar, resolve pelo
    // nome; senão herda o cartão da ação anterior.
    let cardId: string | undefined;
    if (adjust.cardName) {
      const card = await this.cardsRepository.findByName(
        adjust.cardName,
        userIds,
      );
      cardId = card?.id;
    } else {
      cardId = prev[0].cardId ?? undefined;
    }

    const newTransactionIds: string[] = [];
    const newGroupIds: string[] = [];
    const lines: string[] = [];

    if (adjust.items && adjust.items.length > 0) {
      // Separar/refazer com itens explícitos fornecidos pelo usuário (já têm
      // valores e categoria). Reaproveita o mesmo caminho do lote.
      for (const item of adjust.items) {
        const withCard: BatchItem = adjust.cardName
          ? ({
              ...item,
              data: { ...item.data, cardName: adjust.cardName },
            } as BatchItem)
          : item;
        const r = await this.persistBatchItem(userId, userIds, withCard);
        lines.push(r.line);
        newTransactionIds.push(...r.transactionIds);
        if (r.installmentGroupId) newGroupIds.push(r.installmentGroupId);
      }
    } else if (adjust.installments) {
      // (Re)parcelar a MESMA compra: total = soma da ação anterior; herda
      // categoria e descrição-base (sem o sufixo "(n/N)").
      const total = prev.reduce((s, t) => s + Number(t.amount), 0);
      const baseDescription = (prev[0].description || prev[0].category.name)
        .replace(/\s*\(\d+\/\d+\)\s*$/, '')
        .trim();
      const { perInstallment, installmentGroupId, transactionIds } =
        await this.createInstallmentsUseCase.execute({
          amount: total,
          installments: adjust.installments,
          description: baseDescription,
          userId,
          categoryId: prev[0].categoryId,
          cardId,
          // Re-parcelar mantém a data de compra original da ação anterior.
          startDate: prev[0].date,
          source: 'WHATSAPP',
        });
      newTransactionIds.push(...transactionIds);
      newGroupIds.push(installmentGroupId);
      lines.push(
        `🛍️ ${baseDescription}: ${adjust.installments}x de ${fmt(perInstallment)}`,
      );
    } else {
      // Só troca de cartão (sem split nem parcelamento): recria cada transação
      // anterior igual, apenas com o novo cartão.
      for (const t of prev) {
        const created = await this.transactionsRepository.create({
          amount: Number(t.amount),
          type: t.type,
          description: t.description ?? undefined,
          source: 'WHATSAPP',
          userId,
          categoryId: t.categoryId,
          cardId,
        });
        newTransactionIds.push(created.id);
        lines.push(
          `${t.description || t.category.name}: ${fmt(Number(t.amount))}`,
        );
      }
    }

    // Nada recriado (ex.: itens não validaram) → aborta SEM apagar o anterior.
    if (newTransactionIds.length === 0) {
      await this.wmodeClient.sendMessage({
        to: from,
        content:
          'Não consegui montar o novo registro. Me diz os valores, ex: ' +
          '_"separa em 139 e 139"_ ou _"faz em 4x"_.',
      });
      return;
    }

    // Agora que o novo está criado, remove a ação anterior.
    await this.transactionsRepository.deleteManyByIds(
      lastAction.transactionIds,
      userIds,
    );

    // Atualiza a última ação para apontar ao que acabou de ser criado.
    if (phoneKey) {
      const newLabel =
        lines.length === 1 ? lines[0] : `${lines.length} lançamentos`;
      if (newGroupIds.length === 1 && lines.length === 1) {
        await this.conversation.setLastAction(phoneKey, {
          kind: 'installment',
          transactionIds: newTransactionIds,
          installmentGroupId: newGroupIds[0],
          installments: adjust.installments ?? 0,
          label: newLabel,
        });
      } else {
        await this.conversation.setLastAction(phoneKey, {
          kind: 'batch',
          transactionIds: newTransactionIds,
          installmentGroupIds: newGroupIds,
          count: lines.length,
          label: newLabel,
        });
      }
    }

    await this.wmodeClient.sendMessage({
      to: from,
      content:
        `Refiz pra você ✅\n\n` +
        lines.map((l) => `• ${l}`).join('\n') +
        `\n\n_Troquei o registro anterior por esse 🔁_`,
    });

    this.logger.log(
      `Redo: replaced ${lastAction.transactionIds.length} tx with ${newTransactionIds.length} for user ${userId}`,
    );
  }

  // Persiste um único item de lote e devolve uma linha curta para o resumo.
  // Resolve categoria (com fallback "outros") e cartão por nome, como nos
  // handlers individuais.
  private async persistBatchItem(
    userId: string,
    userIds: string[],
    item: BatchItem,
  ): Promise<{
    line: string;
    transactionIds: string[];
    installmentGroupId?: string;
  }> {
    const category =
      (await this.categoriesRepository.findBySlug(
        item.data.categorySlug,
        userIds,
      )) ?? (await this.categoriesRepository.findBySlug('outros'));
    if (!category) {
      throw new Error('categoria indisponível');
    }

    // Cartão só por nome específico (ignora "cartao" genérico no lote para não
    // depender de quantos cartões o usuário tem).
    let cardId: string | undefined;
    if (item.data.cardName && item.data.cardName !== 'cartao') {
      const card = await this.cardsRepository.findByName(
        item.data.cardName,
        userIds,
      );
      if (card) cardId = card.id;
    }

    const fmt = (v: number) =>
      v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    if (item.intent === 'installment') {
      const { data } = item;
      const { perInstallment, installmentGroupId, transactionIds } =
        await this.createInstallmentsUseCase.execute({
          amount: data.amount,
          installments: data.installments,
          description: data.description,
          userId,
          categoryId: category.id,
          cardId,
          startDate: data.purchaseDate,
          source: 'WHATSAPP',
        });
      return {
        line: `🛍️ ${data.description || category.name}: ${data.installments}x de ${fmt(perInstallment)}`,
        transactionIds,
        installmentGroupId,
      };
    }

    if (item.intent === 'recurring') {
      const { data } = item;
      await this.recurringRepository.create({
        description: data.description || category.name,
        amount: data.amount,
        type: data.type,
        dayOfMonth: data.dayOfMonth,
        userId,
        categoryId: category.id,
        cardId,
      });
      const emoji = data.type === 'INCOME' ? '💰' : '🔁';
      // Recorrência não é uma Transaction — fica fora do "cancela" deste lote.
      return {
        line: `${emoji} ${data.description || category.name}: ${fmt(data.amount)} (todo dia ${data.dayOfMonth})`,
        transactionIds: [],
      };
    }

    // transaction
    const { data } = item;
    const tx = await this.transactionsRepository.create({
      amount: data.amount,
      type: data.type,
      description: data.description,
      source: 'WHATSAPP',
      userId,
      categoryId: category.id,
      cardId,
    });
    const emoji = data.type === 'EXPENSE' ? '💸' : '💰';
    return {
      line: `${emoji} ${data.description}: ${fmt(data.amount)}`,
      transactionIds: [tx.id],
    };
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

  // Aviso humano do que foi entendido a partir de um áudio, mandado ANTES da
  // resposta final. Descreve a AÇÃO (não ecoa a transcrição crua) e varia a
  // abertura pra não soar robótico. Retorna null quando não vale anunciar
  // (mensagem não entendida) — nesse caso a própria resposta final basta.
  private buildAudioAck(result: ParseResult): string | null {
    const open = ['Beleza', 'Boa', 'Show', 'Certo', 'Perfeito'][
      Math.floor(Math.random() * 5)
    ];
    const fmt = (v: number) =>
      v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const verb = (t: 'INCOME' | 'EXPENSE') =>
      t === 'INCOME' ? 'recebeu' : 'gastou';

    switch (result.intent) {
      case 'transaction': {
        const { amount, type, description } = result.data;
        const what = description ? ` com ${description}` : '';
        return `🎤 ${open}, você ${verb(type)} ${fmt(amount)}${what}, vou registrar 👍`;
      }
      case 'installment': {
        const { amount, installments, description } = result.data;
        const what = description ? ` com ${description}` : '';
        return `🎤 ${open}, ${fmt(amount)}${what} em ${installments}x, vou parcelar 👍`;
      }
      case 'recurring': {
        const { amount, type, description } = result.data;
        const what = description ? ` de ${description}` : '';
        return `🎤 ${open}, vou anotar a recorrência${what} de ${fmt(amount)} (${verb(type)}) 👍`;
      }
      case 'batch':
        return `🎤 ${open}, vou registrar esses lançamentos 👍`;
      case 'reserve_create':
        return `🎤 ${open}, vou criar essa reserva pra você 👍`;
      case 'reserve_contribution':
        return `🎤 ${open}, vou guardar ${fmt(result.amount)} 👍`;
      case 'pay_invoice':
        return `🎤 ${open}, vou registrar o pagamento da fatura 👍`;
      case 'goal_create':
        return `🎤 ${open}, vou definir essa meta 👍`;
      case 'cancel':
        return `🎤 ${open}, vou cancelar o último lançamento 👍`;
      case 'correction':
      case 'correction_card':
      case 'redo':
        return `🎤 ${open}, já ajusto isso pra você 👍`;
      case 'query':
        return `🎤 ${open}, deixa eu ver isso aqui 👀`;
      case 'advice':
        return `🎤 ${open}, deixa eu analisar 👀`;
      default:
        // unknown: a própria resposta de erro/orientação já basta.
        return null;
    }
  }

  // Aviso humano do que foi lido de um comprovante (imagem), mandado ANTES de
  // registrar/confirmar. Espelha o buildAudioAck, mas com emoji de recibo e a
  // partir da transação já estruturada pela visão.
  private buildImageAck(data: ParsedTransaction): string {
    const open = ['Beleza', 'Boa', 'Show', 'Certo', 'Perfeito'][
      Math.floor(Math.random() * 5)
    ];
    const fmt = (v: number) =>
      v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const verb = data.type === 'INCOME' ? 'recebeu' : 'gastou';
    const what = data.description ? ` com ${data.description}` : '';
    return `🧾 ${open}, li o comprovante: você ${verb} ${fmt(data.amount)}${what}, vou registrar 👍`;
  }
}
