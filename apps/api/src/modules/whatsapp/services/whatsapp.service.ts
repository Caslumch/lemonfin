import { BadRequestException, Injectable, Logger } from '@nestjs/common';
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
import { TtsService } from './tts.service';
import { ReceiptExtractionService } from './receipt-extraction.service';
import { WmodeClientService } from './wmode-client.service';
import { phoneCandidates } from './phone-candidates';
import { GetForecastUseCase } from '../../transactions/use-cases/get-forecast.use-case';
import {
  CreateInstallmentsUseCase,
  buildInstallmentSchedule,
} from '../../transactions/use-cases/create-installments.use-case';
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
  LastAction,
} from '../repositories/conversation.repository';
import { PremiumAccessService } from '../../billing/services/premium-access.service';
import { BillingConfigService } from '../../../common/billing/billing-config.service';
import {
  buildFirstContactWelcome,
  buildWelcomeIntro,
  isGreeting,
} from '../welcome-message';

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
    private readonly tts: TtsService,
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

    // Boas-vindas de primeiro contato: usuário registrado que nunca recebeu a
    // apresentação (vinculou o telefone antes do welcome proativo existir, ou
    // aquele envio falhou). Carimba ANTES de enviar — perder um welcome num
    // crash é melhor que mandar em dobro a cada retry do webhook.
    if (!user.whatsappWelcomedAt) {
      await this.usersRepository.setWhatsappWelcomed(user.id, new Date());
      const isText = !audio && !image;
      // Saudação seca ("oi", "bom dia") ou "ajuda" → a apresentação É a
      // resposta; nem passa pelo parser.
      if (isText && (isGreeting(content) || this.isHelpCommand(content))) {
        await this.wmodeClient.sendMessage({
          to: from,
          content: buildFirstContactWelcome(user.name),
        });
        await this.conversation.appendHistory(phone, [
          { role: 'user', text: content },
          { role: 'bot', text: '[dei as boas-vindas e mostrei exemplos]' },
        ]);
        return;
      }
      // Pedido de verdade já na primeira mensagem: uma linha de boas-vindas e
      // segue o fluxo normal — a resposta ao que a pessoa pediu vem logo atrás.
      await this.wmodeClient.sendMessage({
        to: from,
        content: buildWelcomeIntro(user.name),
      });
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

    // 2) Comando de AJUDA determinístico (sem IA): "ajuda"/"menu"/"comandos"
    // sempre respondem a lista de capacidades. Antes caía no advisor (improviso
    // do LLM) e o usuário não tinha como descobrir o que o bot faz.
    if (this.isHelpCommand(content)) {
      await this.wmodeClient.sendMessage({
        to: from,
        content: this.buildHelpMessage(),
      });
      await this.conversation.appendHistory(phoneKey, [
        { role: 'user', text: content },
        { role: 'bot', text: '[enviei a lista do que sei fazer]' },
      ]);
      return;
    }

    // 3) Fluxo normal — com histórico de conversa como contexto.
    const history = await this.conversation.getHistory(phoneKey);
    // Categorias personalizadas entram no prompt para a IA poder classificar
    // transações nelas (além das de sistema).
    const userIds = await this.familyContext.resolveUserIds(user.id);
    const customCategories = (
      await this.categoriesRepository.findForUser(userIds)
    )
      .filter((c) => c.userId !== null)
      .map((c) => ({ slug: c.slug, name: c.name }));
    // Membros da família (só com 2+) para o parser extrair memberName em
    // consultas tipo "o que a Danielle gastou". Vazio para usuário solo.
    const familyMembers = await this.familyContext.listMembers(user.id);
    const result = await this.messageParser.parse(
      content,
      history,
      customCategories,
      user.id,
      familyMembers.length > 1
        ? familyMembers.map((m) => ({ firstName: m.firstName }))
        : [],
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
        await this.handleQuery(from, user.id, result, phoneKey);
        break;
      case 'cancel':
        await this.handleCancel(from, user.id, result, phoneKey);
        break;
      case 'correction':
        await this.handleCorrection(from, user.id, result, phoneKey);
        break;
      case 'correction_card':
        await this.handleCorrectionCard(
          from,
          user.id,
          result.cardName,
          phoneKey,
        );
        break;
      case 'correction_date':
        await this.handleCorrectionDate(
          from,
          user.id,
          result.newDate,
          phoneKey,
        );
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

  // Data da transação a gravar, SEMPRE ancorada ao MEIO-DIA UTC (convenção do
  // projeto — ver memória transaction-date-noon-utc).
  //
  // Dois caminhos, com tratamento de fuso DIFERENTE — não unificar:
  // - COM purchaseDate: o parser já devolve uma data-só ("dia 5" → 2026-06-05,
  //   meia-noite UTC). O DIA já é o correto; só reancoramos ao meio-dia UTC LENDO
  //   em UTC (getUTC*). Aplicar -3h aqui jogaria "dia 5" para "dia 4" (a meia-
  //   noite UTC menos 3h cai no dia anterior) — bug de off-by-one.
  // - SEM purchaseDate: usamos o instante atual (new Date()). Aí SIM convertemos
  //   para o dia civil de Brasília (-3h) antes de ancorar, senão uma compra à
  //   noite (23h BR = 02h UTC do dia seguinte) cairia no dia errado.
  private resolveTransactionDate(purchaseDate?: string): string {
    if (purchaseDate) {
      const d = new Date(purchaseDate);
      if (!Number.isNaN(d.getTime())) {
        return new Date(
          Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12),
        ).toISOString();
      }
    }
    // Fallback: hoje, no dia civil de Brasília, ancorado ao meio-dia UTC.
    const br = new Date(Date.now() - 3 * 60 * 60 * 1000);
    return new Date(
      Date.UTC(br.getUTCFullYear(), br.getUTCMonth(), br.getUTCDate(), 12),
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
      await this.askCategoryConfirmation(from, phoneKey, userId, data);
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
          content:
            'Tive um problema pra achar a categoria agora 😕 Tenta de novo em instantes?',
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
              description: data.description,
            });
          }

          this.logger.log(
            `Transaction ${transaction.id} created without card — multiple cards`,
          );
          return;
        }
      } else {
        // Nome de cartão específico mencionado. Usa match aproximado (exato →
        // parcial) para "no nubank" achar "Nubank Ultravioleta".
        const matches = await this.cardsRepository.findByNameFuzzy(
          data.cardName,
          userIds,
        );
        if (matches.length === 1) {
          cardId = matches[0].id;
          cardLabel = matches[0].name;
        } else {
          // 0 ou vários: NÃO registra sem cartão calado — avisa e pede o nome
          // certo (registrar silenciosamente no "sem cartão" bagunçava a fatura).
          // A transação em voo fica como PENDÊNCIA: a resposta ("2", "o roxinho",
          // "sem cartão") resolve sem re-parse — antes ela era descartada e o
          // usuário tinha que redigitar o gasto inteiro.
          const cards = await this.cardsRepository.findMany(userIds);
          const amountFmt = data.amount.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          });
          const lead =
            matches.length > 1
              ? `Achei mais de um cartão parecido com *${data.cardName}*.`
              : `Não achei um cartão chamado *${data.cardName}*.`;
          const body =
            `${lead} Ainda não registrei *${amountFmt}* em *${data.description}* ` +
            `pra não vincular no cartão errado.`;

          if (!phoneKey) {
            const tail =
              cards.length > 0
                ? `Seus cartões: ${cards.map((c) => c.name).join(', ')}. Em qual eu registro?`
                : 'Você ainda não tem cartão cadastrado — quer registrar sem cartão?';
            await this.wmodeClient.sendMessage({
              to: from,
              content: `${body}\n\n${tail}`,
            });
            return;
          }

          const options = (matches.length > 1 ? matches : cards).map((c) => ({
            id: c.id,
            name: c.name,
          }));
          await this.conversation.setPending(phoneKey, {
            type: 'card',
            amount: data.amount,
            txType: data.type,
            description: data.description,
            categorySlug: data.categorySlug,
            purchaseDate: data.purchaseDate,
            options,
          });

          const tail =
            options.length > 0
              ? `Em qual eu registro?\n` +
                options.map((c, i) => `${i + 1}. ${c.name}`).join('\n') +
                `\n\n_Responde com o número (ou *sem cartão*)._`
              : `Você ainda não tem cartão cadastrado — quer registrar sem cartão? ` +
                `_Responde *sim* (ou *cancela*)._`;
          await this.wmodeClient.sendMessage({
            to: from,
            content: `${body}\n\n${tail}`,
          });
          return;
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

      // Se a categoria tem META (teto mensal), o insight fecha o loop em tempo
      // real — a promessa do goal_create ("te aviso quando chegar perto do
      // teto") valia só no cron diário das 20h. Meta semanal fica de fora (o
      // total aqui é do mês; o % sairia errado).
      const goal = await this.goalsRepository.findByCategory(
        userIds,
        category.id,
      );
      let insight: string;
      if (goal && goal.period === 'MONTHLY') {
        const limit = goal.amount.toNumber();
        const pct = limit > 0 ? Math.round((monthTotal / limit) * 100) : 0;
        if (monthTotal > limit) {
          insight =
            `\n\n🚨 Estourou a meta de *${category.name}*: ` +
            `*${fmt(monthTotal)}* de ${fmt(limit)} (${pct}%).`;
        } else if (pct >= 80) {
          insight =
            `\n\n⚠️ Você já usou *${pct}%* da meta de *${category.name}* ` +
            `(${fmt(monthTotal)} de ${fmt(limit)}).`;
        } else {
          insight =
            `\n\nVocê já gastou *${fmt(monthTotal)}* em *${category.name}* ` +
            `este mês — ${pct}% da meta de ${fmt(limit)} 👍`;
        }
      } else {
        insight =
          monthTotal > data.amount
            ? `\n\nVocê já gastou *${fmt(monthTotal)}* em *${category.name}* este mês. ` +
              `Quer ver o resumo? 📊`
            : `\n\nFoi o primeiro gasto em *${category.name}* este mês 👀`;
      }

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
        description: data.description,
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
    userId: string,
    data: Extract<ParseResult, { intent: 'transaction' }>['data'],
  ) {
    // Opções a partir das categorias REAIS do usuário (sistema + personalizadas),
    // não de uma lista fixa — senão metade das de sistema e TODAS as
    // personalizadas nunca apareciam, deixando o usuário preso em 4 slugs
    // genéricos. Prioridade até 4: a adivinhada, depois as personalizadas (o
    // usuário as criou de propósito), depois sistema comuns, e "outros" por fim.
    const userIds = await this.familyContext.resolveUserIds(userId);
    const all = await this.categoriesRepository.findForUser(userIds);
    const bySlug = new Map(all.map((c) => [c.slug, c]));
    const customSlugs = all.filter((c) => c.userId !== null).map((c) => c.slug);

    const priority = [
      data.categorySlug,
      ...customSlugs,
      'alimentacao',
      'transporte',
      'compras',
      'lazer',
      'saude',
      'moradia',
      'outros',
    ];
    const seen = new Set<string>();
    const options: { slug: string; label: string }[] = [];
    for (const slug of priority) {
      if (seen.has(slug)) continue;
      const cat = bySlug.get(slug);
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
    if (pending.type === 'card') {
      return this.resolveCardPending(from, phoneKey, userId, pending, content);
    }
    if (pending.type === 'cancel-confirm') {
      return this.resolveCancelConfirm(
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

  // Resolve a pendência de CARTÃO: a transação ficou em voo esperando o usuário
  // dizer em qual cartão registrar (número, nome, "sem cartão" ou cancelar).
  // Antes dessa pendência existir, a resposta era re-parseada fria e o gasto
  // se perdia — o usuário tinha que redigitar tudo.
  private async resolveCardPending(
    from: string,
    phoneKey: string,
    userId: string,
    pending: Extract<PendingConfirmation, { type: 'card' }>,
    content: string,
  ): Promise<boolean> {
    const text = this.normalizeText(content);

    if (['cancela', 'cancelar', 'deixa', 'esquece'].includes(text)) {
      await this.conversation.clearPending(phoneKey);
      await this.wmodeClient.sendMessage({
        to: from,
        content: 'Ok, cancelei. Nada foi registrado.',
      });
      return true;
    }

    const register = async (cardName?: string) => {
      await this.conversation.clearPending(phoneKey);
      await this.handleTransaction(
        from,
        userId,
        {
          intent: 'transaction',
          data: {
            amount: pending.amount,
            type: pending.txType,
            categorySlug: pending.categorySlug,
            // Categoria já passou pelo funil (confiança alta ou confirmada) —
            // não re-perguntar.
            categoryConfidence: 1,
            description: pending.description,
            cardName,
            purchaseDate: pending.purchaseDate,
          },
        },
        phoneKey,
      );
    };

    // "sem cartão" (ou "sim" quando não há cartões pra oferecer).
    const noCardWords = ['sem cartao', 'sem', 'nenhum'];
    const yesWords = ['sim', 's', 'pode', 'pode ser', 'quero'];
    if (
      noCardWords.includes(text) ||
      (pending.options.length === 0 && yesWords.includes(text))
    ) {
      await register(undefined);
      return true;
    }

    // Resolve por número (1, 2, ...) ou por nome.
    let chosen: { id: string; name: string } | undefined;
    const num = parseInt(text, 10);
    if (!Number.isNaN(num) && num >= 1 && num <= pending.options.length) {
      chosen = pending.options[num - 1];
    } else {
      chosen = pending.options.find((o) => {
        const name = this.normalizeText(o.name);
        return name.includes(text) || text.includes(name);
      });
    }

    if (!chosen) return false; // não entendeu a resposta → reprocessa fora

    // O nome EXATO do cartão garante match único no fuzzy (exato vem primeiro).
    await register(chosen.name);
    return true;
  }

  // Resolve a confirmação de um "cancela" cujo alvo não bateu com a última
  // ação: só apaga se o usuário confirmar explicitamente.
  private async resolveCancelConfirm(
    from: string,
    phoneKey: string,
    userId: string,
    pending: Extract<PendingConfirmation, { type: 'cancel-confirm' }>,
    content: string,
  ): Promise<boolean> {
    const text = this.normalizeText(content);

    const yesWords = [
      'sim',
      's',
      'pode',
      'apaga',
      'apagar',
      'confirma',
      'confirmo',
      'isso',
    ];
    const noWords = [
      'nao',
      'n',
      'deixa',
      'esquece',
      'cancela',
      'cancelar',
      'nem',
    ];

    if (yesWords.includes(text)) {
      await this.conversation.clearPending(phoneKey);
      await this.performCancelAction(from, userId, pending.action, phoneKey);
      return true;
    }
    if (noWords.includes(text)) {
      await this.conversation.clearPending(phoneKey);
      await this.wmodeClient.sendMessage({
        to: from,
        content: 'Beleza, não apaguei nada 👍',
      });
      return true;
    }
    return false; // não entendeu a resposta → reprocessa fora
  }

  // "ajuda"/"menu"/"comandos" (e variações diretas) — atalho determinístico
  // para a lista de capacidades, sem passar pelo LLM.
  private isHelpCommand(content: string): boolean {
    const text = this.normalizeText(content);
    return [
      'ajuda',
      'menu',
      'comandos',
      'help',
      'o que voce faz',
      'o que voce faz?',
      'o que voce sabe fazer',
      'o que voce sabe fazer?',
    ].includes(text);
  }

  private buildHelpMessage(): string {
    return [
      '🍋 *O que eu faço por você*',
      '',
      '💸 *Registrar:* _"gastei 50 no mercado"_, _"recebi 3000 de salário"_, _"comprei tênis de 300 em 3x no Nubank"_ — ou manda a *foto do comprovante* 🧾 e até *áudio* 🎤',
      '',
      '📊 *Consultar:* _"resumo"_, _"quanto gastei hoje?"_, _"quanto gastei com mercado?"_, _"minha última compra"_, _"quanto vai sobrar no fim do mês?"_',
      '',
      '🔁 *Contas fixas:* _"todo dia 5 pago 1500 de aluguel"_, _"minhas contas fixas"_',
      '🎯 *Metas de gasto:* _"limite de 800 em alimentação por mês"_, _"minhas metas"_',
      '🏦 *Reservas:* _"quero juntar 5000 pra viagem até dezembro"_, _"guardei 200"_',
      '💳 *Cartão:* _"minha fatura do Nubank"_, _"paguei a fatura"_',
      '✏️ *Corrigir:* _"foi 60 na verdade"_, _"cancela"_, _"foi no Nubank"_, _"foi ontem"_',
      '',
      'E pra conselho ou análise, é só perguntar: _"onde dá pra economizar?"_ 😉',
    ].join('\n');
  }

  // Envia a resposta E grava no histórico da conversa (quando há phoneKey).
  // Consultas precisam disso: sem a fala do bot no histórico, um follow-up
  // ("e alimentação?") chegava ao parser sem contexto do que foi respondido.
  private async sendAndRecord(
    from: string,
    phoneKey: string | undefined,
    content: string,
  ) {
    await this.wmodeClient.sendMessage({ to: from, content });
    if (phoneKey) {
      await this.conversation.appendHistory(phoneKey, [
        // Colapsa quebras de linha: a entrada vira UMA linha no bloco de
        // contexto do parser (o repositório já trunca a 160 chars).
        { role: 'bot', text: content.replace(/\s+/g, ' ').trim() },
      ]);
    }
  }

  // Minúsculas + sem acentos, para comparações tolerantes de nomes/alvos.
  private normalizeText(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  }

  // A transação foi criada há pouco? Guarda de recência para operações que
  // caem na "última transação global" (sem lastAction): corrigir/apagar algo
  // de dias atrás por engano é pior do que pedir pra usar o app.
  private isRecentlyCreated(
    createdAt: Date | string | undefined,
    hours = 24,
  ): boolean {
    if (!createdAt) return false;
    const t = new Date(createdAt).getTime();
    if (Number.isNaN(t)) return false;
    return Date.now() - t <= hours * 60 * 60 * 1000;
  }

  // Resolve a janela de tempo de uma consulta em horário de Brasília (UTC-3) e
  // devolve start/end ISO + um rótulo legível. "today" = hoje; "week" = últimos
  // 7 dias; "month"/ausente = mês civil corrente. As datas das transações são
  // meio-dia UTC, então uma janela [00:00 BR, 23:59 BR] as captura corretamente.
  private resolvePeriodBR(period?: 'today' | 'week' | 'month'): {
    startDate: string;
    endDate: string;
    label: string;
  } {
    // "Agora" no fuso BR (UTC-3) para extrair o dia/mês civil do usuário.
    const nowBR = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const y = nowBR.getUTCFullYear();
    const m = nowBR.getUTCMonth();
    const d = nowBR.getUTCDate();
    const startOfDay = (yy: number, mm: number, dd: number) =>
      new Date(
        `${yy}-${String(mm + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}T00:00:00.000-03:00`,
      ).toISOString();
    const endOfDay = (yy: number, mm: number, dd: number) =>
      new Date(
        `${yy}-${String(mm + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}T23:59:59.999-03:00`,
      ).toISOString();

    if (period === 'today') {
      return {
        startDate: startOfDay(y, m, d),
        endDate: endOfDay(y, m, d),
        label: 'hoje',
      };
    }
    if (period === 'week') {
      // Últimos 7 dias (inclui hoje). Ancorado em meia-noite BR de 6 dias atrás.
      const from = new Date(Date.UTC(y, m, d - 6));
      return {
        startDate: startOfDay(
          from.getUTCFullYear(),
          from.getUTCMonth(),
          from.getUTCDate(),
        ),
        endDate: endOfDay(y, m, d),
        label: 'nos últimos 7 dias',
      };
    }
    // month (padrão): 1º dia do mês até o fim de hoje.
    const monthName = nowBR.toLocaleDateString('pt-BR', {
      month: 'long',
      timeZone: 'UTC',
    });
    return {
      startDate: startOfDay(y, m, 1),
      endDate: endOfDay(y, m, d),
      label: `em ${monthName}`,
    };
  }

  // Resolve o ESCOPO de uma consulta: se o usuário citou um membro ("a Danielle"),
  // filtra só nele; senão, a família inteira. Retorna os userIds e um sufixo de
  // rótulo ("da Danielle") — ou null quando o nome não resolve (já tendo enviado
  // a mensagem de erro/ambiguidade ao usuário).
  private async resolveQueryScope(
    from: string,
    userId: string,
    memberName?: string,
  ): Promise<{ userIds: string[]; who: string } | null> {
    if (!memberName) {
      const userIds = await this.familyContext.resolveUserIds(userId);
      return { userIds, who: '' };
    }
    const res = await this.familyContext.resolveMemberByName(
      userId,
      memberName,
    );
    if (res.status === 'ok') {
      const first = res.name.trim().split(/\s+/)[0];
      return { userIds: [res.userId], who: ` (${first})` };
    }
    if (res.status === 'ambiguous') {
      await this.wmodeClient.sendMessage({
        to: from,
        content:
          `Tem mais de uma pessoa chamada *${memberName}* na família ` +
          `(${res.names.join(', ')}). De quem você quer saber? Me diz o nome completo.`,
      });
      return null;
    }
    await this.wmodeClient.sendMessage({
      to: from,
      content:
        `Não achei ninguém chamado *${memberName}* na sua família. ` +
        `Confere o nome? Ou pergunta sem citar a pessoa pra ver o total da família.`,
    });
    return null;
  }

  private async handleQuery(
    from: string,
    userId: string,
    result: Extract<ParseResult, { intent: 'query' }>,
    phoneKey?: string,
  ) {
    if (result.queryType === 'forecast') {
      await this.handleForecast(from, userId, phoneKey);
      return;
    }

    if (result.queryType === 'budget') {
      // "Metas" = tetos de gasto por categoria (model Goal). O antigo handleBudget
      // (model Budget, teto único do mês) ficou obsoleto para o WhatsApp.
      await this.handleGoalsQuery(from, userId, phoneKey);
      return;
    }

    if (result.queryType === 'reserves') {
      await this.handleReserveQuery(from, userId, phoneKey);
      return;
    }

    if (result.queryType === 'recurring') {
      await this.handleRecurringQuery(from, userId, phoneKey);
      return;
    }

    if (result.queryType === 'category') {
      await this.handleCategoryQuery(
        from,
        userId,
        result.categorySlug,
        phoneKey,
        result.memberName,
      );
      return;
    }

    if (result.queryType === 'card') {
      await this.handleCardQuery(
        from,
        userId,
        result.cardName,
        {
          invoiceMonth: result.invoiceMonth,
          wantItems: result.wantItems,
        },
        phoneKey,
      );
      return;
    }

    if (result.queryType === 'last_transaction') {
      await this.handleLastTransactionQuery(
        from,
        userId,
        phoneKey,
        result.memberName,
      );
      return;
    }

    if (result.queryType === 'top_transaction') {
      await this.handleTopTransactionQuery(
        from,
        userId,
        phoneKey,
        result.memberName,
      );
      return;
    }

    // Escopo (família ou um membro citado) + janela de tempo (hoje/semana/mês).
    const scope = await this.resolveQueryScope(from, userId, result.memberName);
    if (!scope) return; // nome não resolveu — mensagem já enviada
    const { userIds, who } = scope;
    const { startDate, endDate, label } = this.resolvePeriodBR(result.period);

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

    // "who" entra no texto quando a consulta foi por um membro ("(Danielle)").
    let message = '';

    switch (result.queryType) {
      case 'expenses':
        message =
          `💸${who} ${label} gastou *${expenseFormatted}* ` +
          `(${summary.expenseCount} ${summary.expenseCount === 1 ? 'lançamento' : 'lançamentos'}).\n\n` +
          `_Quer o quadro completo? Manda "resumo" 📊_`;
        break;

      case 'income':
        message =
          `💰${who} ${label} entraram *${incomeFormatted}* ` +
          `(${summary.incomeCount} ${summary.incomeCount === 1 ? 'lançamento' : 'lançamentos'}).\n\n` +
          `_Quer o quadro completo? Manda "resumo" 📊_`;
        break;

      case 'balance':
        message =
          `${balanceEmoji}${who} O saldo ${label} é *${balanceFormatted}*.\n\n` +
          `Entrou ${incomeFormatted} 💰 e saiu ${expenseFormatted} 💸.`;
        break;

      case 'summary':
      default:
        message =
          `📊 *Como${who} tá ${label}:*\n\n` +
          `💰 Entrou *${incomeFormatted}* (${summary.incomeCount})\n` +
          `💸 Saiu *${expenseFormatted}* (${summary.expenseCount})\n` +
          `${balanceEmoji} Saldo: *${balanceFormatted}*\n\n` +
          `_Quer uma dica de onde economizar? É só pedir 😉_`;
        break;
    }

    await this.sendAndRecord(from, phoneKey, message);
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
    opts?: { invoiceMonth?: string; wantItems?: boolean },
    phoneKey?: string,
  ) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const fmt = (v: number) =>
      v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const card = await this.resolveCardForCommand(from, userIds, cardName);
    if (!card) return;

    // Mês de referência do ciclo: o mês pedido ("fatura de junho" → 2026-06) ou
    // o mês corrente (fatura ABERTA). O invoiceMonth é o mês em que a fatura
    // FECHA — mesma régua da tela /cartoes (cardCycleRange, em UTC).
    const now = new Date();
    let refYear = now.getUTCFullYear();
    let refMonth = now.getUTCMonth();
    let isCurrent = true;
    if (opts?.invoiceMonth) {
      const [y, m] = opts.invoiceMonth.split('-').map(Number);
      refYear = y;
      refMonth = m - 1;
      isCurrent =
        refYear === now.getUTCFullYear() && refMonth === now.getUTCMonth();
    }
    const { start, end } = cardCycleRange(
      card.closingDay,
      new Date(Date.UTC(refYear, refMonth, 1)),
    );

    const monthLabel = new Date(
      Date.UTC(refYear, refMonth, 1),
    ).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' });
    // "fatura aberta" só quando é o ciclo corrente; senão nomeia pelo mês.
    const faturaLabel = isCurrent
      ? 'A fatura aberta'
      : `A fatura de ${monthLabel}`;

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
      await this.sendAndRecord(
        from,
        phoneKey,
        `${faturaLabel} do *${card.name}* está limpa — nada lançado 👍` +
          dueLine,
      );
      return;
    }

    // Cabeçalho com total + contagem.
    const header =
      `💳 ${faturaLabel} do *${card.name}* está em *${fmt(total)}* ` +
      `(${count} ${count === 1 ? 'compra' : 'compras'}).`;

    // Sem pedido de itens: só o total + vencimento.
    if (!opts?.wantItems) {
      await this.sendAndRecord(from, phoneKey, header + dueLine);
      return;
    }

    // Pediu as compras/itens: lista agrupada (parcelas viram 1 linha, valor
    // total da compra), até 15 linhas. Mesma régua de ciclo (start/end).
    const { data } = await this.transactionsRepository.findManyGrouped({
      userIds,
      cardId: card.id,
      type: 'EXPENSE',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      skip: 0,
      take: 15,
      order: 'desc',
      orderBy: 'date',
    });

    const lines = data.map((tx) => {
      const t = tx as typeof tx & {
        installmentTotal?: number | null;
        installmentSum?: number | null;
        category?: { name?: string };
      };
      const isParc = (t.installmentTotal ?? 0) >= 2 && t.installmentSum != null;
      const valor = isParc ? t.installmentSum! : tx.amount.toNumber();
      const parc = isParc ? ` (${t.installmentTotal}x)` : '';
      const desc = tx.description || t.category?.name || 'compra';
      return `• ${fmt(valor)} — ${desc}${parc}`;
    });
    const extra =
      count > lines.length
        ? `\n_…e mais ${count - lines.length}. Veja tudo no app._`
        : '';

    await this.sendAndRecord(
      from,
      phoneKey,
      `${header}${dueLine}\n\n${lines.join('\n')}${extra}`,
    );
  }

  // "Qual foi minha última transação?" — a REGISTRADA por último (createdAt).
  // Não usa findLatest (por `date`): numa compra parcelada, a parcela mais
  // futura (date em 2027) ganharia o `date desc` e viraria a "última".
  private async handleLastTransactionQuery(
    from: string,
    userId: string,
    phoneKey?: string,
    memberName?: string,
  ) {
    // "a última compra da Dani" filtra pelo membro citado (antes ignorava o
    // nome e respondia pela família inteira, contradizendo o parser).
    const scope = await this.resolveQueryScope(from, userId, memberName);
    if (!scope) return;
    const { userIds, who } = scope;
    const tx = await this.transactionsRepository.findLastCreated(userIds);

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

    await this.sendAndRecord(
      from,
      phoneKey,
      `${icon} *${verb}${who}:* *${amount}* em _${label}_${cardInfo}\n` +
        `🗓️ ${when} • ${tx.category?.name ?? 'sem categoria'}`,
    );
  }

  // "Qual foi minha compra mais cara?" — maior DESPESA do mês corrente.
  private async handleTopTransactionQuery(
    from: string,
    userId: string,
    phoneKey?: string,
    memberName?: string,
  ) {
    const scope = await this.resolveQueryScope(from, userId, memberName);
    if (!scope) return;
    const { userIds, who } = scope;
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

    await this.sendAndRecord(
      from,
      phoneKey,
      `${icon} *${who ? `Maior despesa${who}` : 'Sua maior despesa'} em ${monthName}:* *${amount}* em _${label}_${cardInfo}\n` +
        `🗓️ ${when} • ${tx.category?.name ?? 'sem categoria'}`,
    );
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
    phoneKey?: string,
    memberName?: string,
  ) {
    const fmt = (v: number) =>
      v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // "o que a Dani gastou com alimentação" filtra pelo membro citado.
    const scope = await this.resolveQueryScope(from, userId, memberName);
    if (!scope) return;
    const { userIds, who } = scope;
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
      await this.sendAndRecord(
        from,
        phoneKey,
        `Zero gastos${who} com *${category.name}* em ${monthName} até agora 👍`,
      );
      return;
    }

    await this.sendAndRecord(
      from,
      phoneKey,
      `${label} Em ${monthName}${who ? who : ' você'} gastou *${fmt(row.total)}* com *${category.name}* ` +
        `(${row.count} ${row.count === 1 ? 'lançamento' : 'lançamentos'}).`,
    );
  }

  // "Metas" = tetos de gasto por categoria (model Goal). O gasto é recalculado
  // por período (mês/semana) e o teto persiste — não precisa redefinir todo mês.
  private async handleGoalsQuery(
    from: string,
    userId: string,
    phoneKey?: string,
  ) {
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

    await this.sendAndRecord(
      from,
      phoneKey,
      `🎯 *Suas metas de gasto*\n\n` + blocks.join('\n\n'),
    );
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
    user: { id: string; name: string; ttsEnabled?: boolean },
    message: string,
    history: HistoryEntry[],
    phoneKey: string,
  ) {
    const firstName = user.name?.trim().split(/\s+/)[0];
    // Histórico do WhatsApp → formato do chat (bot vira assistant). A janela já
    // é limitada no repositório (MAX_HISTORY), que também descarta as trocas de
    // sessões vencidas — não cortar de novo aqui: um slice menor que MAX_HISTORY
    // faria o assessor enxergar menos contexto do que o parser.
    const chatHistory = history.map((h) => ({
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

    // Voz é SELETIVA (não toda resposta): só quando a conta tem TTS liberado
    // (flag) E o usuário PEDIU resposta em áudio nesta mensagem ("me responde em
    // áudio", "manda por voz"). Fora isso, texto. speakOrText já cai para texto
    // sozinho se o áudio falhar; quando não é pedido, mandamos texto direto.
    if (user.ttsEnabled && this.wantsVoiceReply(message)) {
      await this.tts.speakOrText(from, reply, user.id);
    } else {
      await this.wmodeClient.sendMessage({ to: from, content: reply });
    }

    await this.conversation.appendHistory(phoneKey, [
      { role: 'bot', text: reply },
    ]);
  }

  // O usuário pediu a resposta em ÁUDIO? Heurística barata (sem chamar IA), no
  // texto normalizado. Cobre as formas comuns: "responde em áudio", "manda um
  // áudio", "me fala", "por voz", "manda por voz".
  private wantsVoiceReply(message: string): boolean {
    const t = this.normalizeText(message);
    if (
      /\b(audio|voz)\b/.test(t) &&
      /\b(responde|manda|envia|quero|em|por|me)\b/.test(t)
    ) {
      return true;
    }
    return /\bme (fala|responde falando)\b/.test(t);
  }

  // Corrige o cartão da ÚLTIMA AÇÃO. cardName=null remove o vínculo; string troca
  // para o cartão informado. Quando a última ação foi um parcelamento/lote, troca
  // o cartão de TODAS as transações dela (não só a parcela mais recente) — usa
  // lastAction.transactionIds, com fallback à última transação para conversas
  // sem lastAction (legado/registro pela web).
  private async handleCorrectionCard(
    from: string,
    userId: string,
    cardName: string | null,
    phoneKey?: string,
  ) {
    const userIds = await this.familyContext.resolveUserIds(userId);

    // Conjunto de transações a corrigir: a ação inteira (parcelas/lote) se houver
    // lastAction; senão, a última transação isolada.
    const lastAction = phoneKey
      ? await this.conversation.getLastAction(phoneKey)
      : null;

    let ids: string[];
    let label: string;
    if (lastAction && lastAction.transactionIds.length > 0) {
      ids = lastAction.transactionIds;
      label = lastAction.label;
    } else {
      // Sem ação recente na conversa: só aceita a última transação global se
      // ela for recente — senão um "foi no nubank" solto trocava o cartão de
      // um lançamento antigo ou feito pelo painel.
      const last = await this.transactionsRepository.findLastByUser(userId);
      if (!last || !this.isRecentlyCreated(last.createdAt)) {
        await this.wmodeClient.sendMessage({
          to: from,
          content:
            'Não encontrei nenhuma transação recente pra trocar o cartão. ' +
            'Pra editar lançamentos antigos, usa o painel de transações 😉',
        });
        return;
      }
      ids = [last.id];
      label = last.description || last.category.name;
    }

    const plural = ids.length > 1 ? `as ${ids.length} parcelas de ` : '';

    // Resolver cartão de destino (null = remover vínculo).
    let targetCardId: string | null = null;
    let cardLabel = '';
    if (cardName !== null) {
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
      targetCardId = card.id;
      cardLabel = card.name;
    }

    const updated = await this.transactionsRepository.updateCardManyByIds(
      ids,
      userIds,
      targetCardId,
    );

    if (updated === 0) {
      await this.wmodeClient.sendMessage({
        to: from,
        content: 'Não consegui trocar o cartão dessa transação. Tenta de novo?',
      });
      return;
    }

    const content =
      targetCardId === null
        ? `Feito! Tirei o cartão de ${plural}*${label}*. Agora tá sem cartão vinculado 👍`
        : `Trocado ✅ ${plural}*${label}* agora tá no *${cardLabel}* 💳`;
    await this.wmodeClient.sendMessage({ to: from, content });
    this.logger.log(
      `Card correction: ${updated} tx -> ${cardLabel || 'sem cartão'} by user ${userId}`,
    );
  }

  // Corrige a DATA da ÚLTIMA AÇÃO ("foi ontem", "a data é dia 14"). Reancora a
  // ação inteira: parcelamento/lote deslocam TODAS as transações pelo mesmo
  // delta (parcelas mantêm o espaçamento). Mesmo padrão de alvo do
  // handleCorrectionCard: lastAction, com fallback à última transação recente.
  private async handleCorrectionDate(
    from: string,
    userId: string,
    newDate: string,
    phoneKey?: string,
  ) {
    const userIds = await this.familyContext.resolveUserIds(userId);

    const lastAction = phoneKey
      ? await this.conversation.getLastAction(phoneKey)
      : null;

    let ids: string[];
    let label: string;
    if (lastAction && lastAction.transactionIds.length > 0) {
      ids = lastAction.transactionIds;
      label = lastAction.label;
    } else {
      // Sem ação recente na conversa: só aceita a última transação global se
      // ela for recente — senão um "foi ontem" solto mudava a data de um
      // lançamento antigo ou feito pelo painel.
      const last = await this.transactionsRepository.findLastByUser(userId);
      if (!last || !this.isRecentlyCreated(last.createdAt)) {
        await this.wmodeClient.sendMessage({
          to: from,
          content:
            'Não encontrei nenhuma transação recente pra corrigir a data. ' +
            'Pra editar lançamentos antigos, usa o painel de transações 😉',
        });
        return;
      }
      ids = [last.id];
      label = last.description || last.category.name;
    }

    const anchorISO = this.resolveTransactionDate(newDate);
    const { count, deltaDays } =
      await this.transactionsRepository.shiftDatesToAnchor(
        ids,
        userIds,
        anchorISO,
      );

    if (count === 0) {
      await this.wmodeClient.sendMessage({
        to: from,
        content: 'Não consegui corrigir a data dessa transação. Tenta de novo?',
      });
      return;
    }

    const dateLabel = new Date(anchorISO).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      timeZone: 'UTC',
    });
    const content =
      deltaDays === 0
        ? `Já estava com a data de *${dateLabel}* 😉 Nada a mudar.`
        : count > 1
          ? `Feito! 📅 Movi as ${count} transações de *${label}* junto — a compra agora tá em *${dateLabel}*.`
          : `Feito! 📅 *${label}* agora tá com a data de *${dateLabel}*.`;
    await this.sendAndRecord(from, phoneKey, content);
    this.logger.log(
      `Date correction: ${count} tx shifted ${deltaDays}d by user ${userId}`,
    );
  }

  private async handleForecast(
    from: string,
    userId: string,
    phoneKey?: string,
  ) {
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

    await this.sendAndRecord(from, phoneKey, lines.join('\n'));
  }

  private async handleCancel(
    from: string,
    userId: string,
    result: Extract<ParseResult, { intent: 'cancel' }>,
    phoneKey?: string,
  ) {
    // Caminho preferido: cancela a ÚLTIMA AÇÃO inteira (parcelamento/lote =
    // N transações), não só a última transação. O lastAction tem TTL — um
    // "cancela" horas depois não pode apagar uma ação que o usuário nem lembra.
    const lastAction = phoneKey
      ? await this.conversation.getLastAction(phoneKey)
      : null;
    const hasAction = !!lastAction && lastAction.transactionIds.length > 0;

    const target = result.target;

    // "cancela a netflix" / "apaga o uber": o usuário NOMEOU o alvo. Só apaga
    // direto se o alvo bate com a última ação — senão o "cancela a netflix"
    // apagava silenciosamente um lançamento sem nenhuma relação.
    if (target) {
      if (hasAction && this.lastActionMatchesTarget(lastAction, target)) {
        await this.performCancelAction(from, userId, lastAction, phoneKey);
        return;
      }

      // O alvo é uma conta fixa/assinatura? "cancela a netflix" NÃO é um
      // lançamento avulso — apagar a última transação aqui era o pior bug.
      const userIds = await this.familyContext.resolveUserIds(userId);
      const recurrings = await this.recurringRepository.findMany(userIds, true);
      const t = this.normalizeText(target);
      const rec = recurrings.find((r) => {
        const name = this.normalizeText(r.description ?? '');
        return name.length > 0 && (name.includes(t) || t.includes(name));
      });
      if (rec) {
        await this.wmodeClient.sendMessage({
          to: from,
          content:
            `*${rec.description}* é uma conta fixa, não um lançamento avulso — ` +
            `então não apaguei nada. Por aqui eu ainda não cancelo contas fixas 😕 ` +
            `Dá pra apagar em *Configurações › Contas fixas* no app.`,
        });
        return;
      }

      if (hasAction && phoneKey) {
        // Alvo não bate com a última ação: confirma antes de apagar qualquer
        // coisa, em vez de chutar.
        await this.conversation.setPending(phoneKey, {
          type: 'cancel-confirm',
          action: lastAction,
        });
        await this.wmodeClient.sendMessage({
          to: from,
          content:
            `Não achei *${target}* nos últimos registros daqui. ` +
            `O último registro foi *${lastAction.label}* — quer que eu apague esse?\n\n` +
            `_Responde *sim* ou *deixa*._`,
        });
        return;
      }

      await this.wmodeClient.sendMessage({
        to: from,
        content:
          `Não achei *${target}* nos registros recentes da nossa conversa, ` +
          `então não apaguei nada. Eu consigo desfazer o último registro feito ` +
          `por aqui — pra excluir outros lançamentos, usa o painel de transações 😉`,
      });
      return;
    }

    // "cancela" genérico.
    if (hasAction) {
      await this.performCancelAction(from, userId, lastAction, phoneKey);
      return;
    }

    // Sem ação recente na conversa: NÃO apaga a última transação global às
    // cegas (podia ser um lançamento antigo ou feito pelo painel). Se houver
    // uma transação recente, oferece com confirmação; senão, orienta.
    const last = await this.transactionsRepository.findLastByUser(userId);
    if (!last || !this.isRecentlyCreated(last.createdAt) || !phoneKey) {
      await this.wmodeClient.sendMessage({
        to: from,
        content:
          'Não achei um registro recente pra cancelar por aqui 🤔 ' +
          'Eu consigo desfazer o último registro da nossa conversa — ' +
          'pra excluir outros lançamentos, usa o painel de transações 😉',
      });
      return;
    }

    const amountFormatted = Number(last.amount).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    const label = `${amountFormatted} em ${last.category.name}`;
    await this.conversation.setPending(phoneKey, {
      type: 'cancel-confirm',
      action: {
        kind: 'transaction',
        transactionIds: [last.id],
        label,
        description: last.description ?? undefined,
      },
    });
    await this.wmodeClient.sendMessage({
      to: from,
      content:
        `Não tenho um registro recente da nossa conversa, mas seu último ` +
        `lançamento foi *${label}* (${last.description || 'sem descrição'}). ` +
        `Quer que eu apague esse?\n\n_Responde *sim* ou *deixa*._`,
    });
  }

  // Alvo nomeado num "cancela <alvo>" bate com a última ação? Compara com o
  // rótulo (valor + categoria) e com a descrição do lançamento.
  private lastActionMatchesTarget(action: LastAction, target: string): boolean {
    const t = this.normalizeText(target);
    if (!t) return false;
    if (this.normalizeText(action.label).includes(t)) return true;
    if (action.kind === 'transaction' && action.description) {
      const d = this.normalizeText(action.description);
      return d.includes(t) || t.includes(d);
    }
    return false;
  }

  // Apaga a última ação inteira (e reverte efeitos colaterais, ex.: aporte de
  // reserva). Usado pelo "cancela" direto e pela confirmação pendente.
  private async performCancelAction(
    from: string,
    userId: string,
    action: LastAction,
    phoneKey?: string,
  ) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const count = await this.transactionsRepository.deleteManyByIds(
      action.transactionIds,
      userIds,
    );

    // Aporte de reserva: além de apagar a despesa, reverte o savedAmount —
    // senão a reserva mostraria dinheiro guardado sem lastro em caixa. Só
    // reverte se a despesa foi de fato removida (count > 0), pra não
    // decrementar duas vezes num "cancela" repetido.
    if (action.kind === 'reserve-contribution' && count > 0) {
      await this.reservesRepository.removeContribution(
        action.reserveId,
        action.amount,
      );
    }

    if (phoneKey) await this.conversation.clearLastAction(phoneKey);

    if (count > 0) {
      const what =
        count === 1
          ? `*${action.label}*`
          : `as *${count}* transações de *${action.label}*`;
      await this.wmodeClient.sendMessage({
        to: from,
        content:
          `Prontinho, removi ✅\n\n` +
          `Apaguei ${what}. Tá tudo certo de novo no painel 🧹`,
      });
      this.logger.log(`Cancelled last action (${count} tx) for user ${userId}`);
      return;
    }

    // Ids já não existem (apagados antes): avisa em vez de cair num fallback
    // que apagava OUTRA transação — um "cancela" repetido virava exclusão dupla.
    await this.wmodeClient.sendMessage({
      to: from,
      content: `Esse registro (*${action.label}*) já tinha sido removido 👍 Não apaguei mais nada.`,
    });
  }

  private async handleCorrection(
    from: string,
    userId: string,
    result: Extract<ParseResult, { intent: 'correction' }>,
    phoneKey?: string,
  ) {
    const fmt = (v: number) =>
      v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Caminho preferido: corrige a ÚLTIMA AÇÃO da conversa (com TTL), pelo
    // tipo dela — nunca a "última transação global", que podia ser outra coisa.
    const lastAction = phoneKey
      ? await this.conversation.getLastAction(phoneKey)
      : null;

    if (lastAction && lastAction.transactionIds.length > 0) {
      // Parcelamento: "o total era X" corrige o GRUPO inteiro (não só a última
      // parcela): redivide o novo total nas N parcelas, mantendo o resíduo de
      // arredondamento na última — senão soma(parcelas) ≠ total.
      if (lastAction.kind === 'installment') {
        const handled = await this.correctInstallmentGroup(
          from,
          userId,
          lastAction,
          result.newAmount,
          phoneKey,
        );
        if (handled) return;
        // Grupo já não existe (parcelas apagadas): avisa em vez de corrigir
        // outra transação qualquer.
        await this.wmodeClient.sendMessage({
          to: from,
          content: `Esse parcelamento (*${lastAction.label}*) já não existe mais — não corrigi nada.`,
        });
        return;
      }

      if (lastAction.kind === 'transaction') {
        const userIds = await this.familyContext.resolveUserIds(userId);
        const rows = await this.transactionsRepository.findManyByIds(
          lastAction.transactionIds,
          userIds,
        );
        const row = rows[0];
        if (!row) {
          await this.wmodeClient.sendMessage({
            to: from,
            content: `Esse registro (*${lastAction.label}*) já não existe mais — não corrigi nada.`,
          });
          return;
        }
        await this.applyAmountCorrection(from, userId, row, result.newAmount);
        // Atualiza o rótulo (o registro segue cancelável com o valor novo).
        if (phoneKey) {
          await this.conversation.setLastAction(phoneKey, {
            ...lastAction,
            label: `${fmt(result.newAmount)} em ${row.category.name}`,
          });
        }
        return;
      }

      if (lastAction.kind === 'reserve-contribution') {
        const userIds = await this.familyContext.resolveUserIds(userId);
        const rows = await this.transactionsRepository.findManyByIds(
          lastAction.transactionIds,
          userIds,
        );
        const row = rows[0];
        if (!row) {
          await this.wmodeClient.sendMessage({
            to: from,
            content: `Esse aporte (*${lastAction.label}*) já não existe mais — não corrigi nada.`,
          });
          return;
        }
        await this.transactionsRepository.update(row.id, {
          amount: result.newAmount,
        });
        // Ajusta o acumulado da reserva pelo DELTA — corrigir só a despesa
        // deixaria a reserva com dinheiro fantasma (ou a menos).
        const delta = result.newAmount - lastAction.amount;
        if (delta > 0) {
          await this.reservesRepository.addContribution(
            lastAction.reserveId,
            delta,
          );
        } else if (delta < 0) {
          await this.reservesRepository.removeContribution(
            lastAction.reserveId,
            -delta,
          );
        }
        if (phoneKey) {
          await this.conversation.setLastAction(phoneKey, {
            ...lastAction,
            amount: result.newAmount,
          });
        }
        await this.wmodeClient.sendMessage({
          to: from,
          content:
            `Corrigido ✏️\n\n` +
            `Ajustei o aporte (*${lastAction.label}*): de ~${fmt(lastAction.amount)}~ ` +
            `pra *${fmt(result.newAmount)}*. A reserva já reflete o valor certo ✨`,
        });
        this.logger.log(
          `Reserve contribution corrected: ${lastAction.amount} → ${result.newAmount} by user ${userId}`,
        );
        return;
      }

      // batch: corrigir "o valor" de um lote é ambíguo — qual item?
      await this.wmodeClient.sendMessage({
        to: from,
        content:
          `Seu último registro foi um lote de *${lastAction.transactionIds.length}* lançamentos, ` +
          `e ainda não consigo corrigir um item só do lote por aqui 😕 ` +
          `Dá pra apagar tudo com *cancela* e registrar de novo, ou ajustar no painel.`,
      });
      return;
    }

    // Sem ação recente na conversa: corrige a última transação global SÓ se
    // ela for recente — sem a guarda, um "corrige pra 30" dias depois editava
    // um lançamento antigo ou feito pelo painel.
    const last = await this.transactionsRepository.findLastByUser(userId);
    if (!last || !this.isRecentlyCreated(last.createdAt)) {
      await this.wmodeClient.sendMessage({
        to: from,
        content:
          'Não achei um registro recente pra corrigir por aqui 🤔 ' +
          'Eu consigo corrigir o último registro da nossa conversa — ' +
          'pra editar outros lançamentos, usa o painel de transações 😉',
      });
      return;
    }

    await this.applyAmountCorrection(from, userId, last, result.newAmount);
  }

  // Aplica a correção de valor numa transação avulsa e responde com o de→para.
  private async applyAmountCorrection(
    from: string,
    userId: string,
    row: NonNullable<
      Awaited<ReturnType<TransactionsRepository['findLastByUser']>>
    >,
    newAmount: number,
  ) {
    const oldAmount = Number(row.amount);
    const oldFormatted = oldAmount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    const newFormatted = newAmount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    await this.transactionsRepository.update(row.id, { amount: newAmount });

    await this.wmodeClient.sendMessage({
      to: from,
      content:
        `Corrigido ✏️\n\n` +
        `${row.category.icon} *${row.category.name}* ` +
        `(${row.description || 'sem descrição'}): ` +
        `de ~${oldFormatted}~ pra *${newFormatted}*. ` +
        `Já ajustei tudo no painel ✨`,
    });

    this.logger.log(
      `Transaction ${row.id} corrected: ${oldAmount} → ${newAmount} by user ${userId}`,
    );
  }

  // Corrige o TOTAL de um parcelamento: redivide newTotal nas N parcelas do
  // grupo (mesma régua de create-installments — resíduo na última) e atualiza
  // cada parcela. Retorna false se o grupo já não existe (cai no fallback de
  // transação avulsa). Mantém soma(parcelas) == newTotal.
  private async correctInstallmentGroup(
    from: string,
    userId: string,
    lastAction: Extract<LastAction, { kind: 'installment' }>,
    newTotal: number,
    phoneKey?: string,
  ): Promise<boolean> {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const rows = await this.transactionsRepository.findManyByIds(
      lastAction.transactionIds,
      userIds,
    );
    if (rows.length === 0) return false;

    // Ordena por nº da parcela (o resíduo vai na última). Parcelas sem número
    // caem para o fim de forma estável.
    const ordered = [...rows].sort(
      (a, b) => (a.installmentNumber ?? 0) - (b.installmentNumber ?? 0),
    );

    const oldTotal = ordered.reduce((sum, r) => sum + Number(r.amount), 0);
    const { amounts, perInstallment } = buildInstallmentSchedule({
      amount: newTotal,
      installments: ordered.length,
    });

    for (let i = 0; i < ordered.length; i++) {
      await this.transactionsRepository.update(ordered[i].id, {
        amount: amounts[i],
      });
    }

    const fmt = (v: number) =>
      v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Descrição-base sem o sufixo "(i/N)" das parcelas, para o rótulo.
    const first = ordered[0];
    const baseDescription = (first.description ?? '').replace(
      /\s*\(\d+\/\d+\)\s*$/,
      '',
    );

    await this.wmodeClient.sendMessage({
      to: from,
      content:
        `Corrigido ✏️\n\n` +
        `Ajustei o parcelamento de *${baseDescription || first.category.name}*: ` +
        `de ~${fmt(oldTotal)}~ pra *${fmt(newTotal)}* ` +
        `(${ordered.length}x de ${fmt(perInstallment)}). ` +
        `Já bateu tudo no painel ✨`,
    });

    // Atualiza o rótulo da última ação para refletir o novo valor (o grupo
    // segue "cancelável"; ids e grupo não mudam).
    if (phoneKey) {
      await this.conversation.setLastAction(phoneKey, {
        ...lastAction,
        label: `${baseDescription || first.category.name} (${ordered.length}x de ${fmt(perInstallment)})`,
      });
    }

    this.logger.log(
      `Installment group corrected: ${oldTotal} → ${newTotal} (${ordered.length}x) by user ${userId}`,
    );
    return true;
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
          content:
            'Tive um problema pra achar a categoria agora 😕 Tenta de novo em instantes?',
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
          content:
            'Tive um problema pra achar a categoria agora 😕 Tenta de novo em instantes?',
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

    const description = data.description || category.name;

    // Dedup: se já existe recorrência ATIVA igual (descrição/valor/dia/categoria),
    // não cria outra — senão a cron lançaria a conta fixa em dobro todo mês.
    // Avisa que já está cadastrada (provável reenvio ou esquecimento).
    const existing = await this.recurringRepository.findDuplicate(userIds, {
      description,
      amount: data.amount,
      dayOfMonth: data.dayOfMonth,
      categoryId: category.id,
    });
    if (existing) {
      const amountFmt = data.amount.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });
      await this.wmodeClient.sendMessage({
        to: from,
        content:
          `Essa conta fixa já está cadastrada 👍\n` +
          `*${description}* de *${amountFmt}* todo dia *${data.dayOfMonth}*. ` +
          `Não criei de novo pra não cobrar em dobro. ` +
          `_Pra mudar o valor ou apagar, é só usar o app._`,
      });
      return;
    }

    const recurring = await this.recurringRepository.create({
      description,
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

    await this.wmodeClient.sendMessage({
      to: from,
      content:
        `${emoji} Anotei sua ${typeLabel}: *${description}* de *${amountFormatted}* ` +
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
    // Prazo ancorado ao meio-dia UTC (convenção do projeto). data.deadline vem
    // como "YYYY-MM-DD" do parser; new Date() cru o leria como meia-noite UTC,
    // que no fuso BR mostraria o mês anterior. Lemos o dia em UTC e reancoramos.
    const rawDeadline = new Date(data.deadline);
    const deadline = new Date(
      Date.UTC(
        rawDeadline.getUTCFullYear(),
        rawDeadline.getUTCMonth(),
        rawDeadline.getUTCDate(),
        12,
        0,
        0,
      ),
    );

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
      timeZone: 'UTC', // prazo é meio-dia UTC; sem isto o mês volta no fuso BR
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

  private async handleReserveQuery(
    from: string,
    userId: string,
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
        timeZone: 'UTC', // prazo é meio-dia UTC; sem isto o mês volta no fuso BR
      });
      return (
        `*${r.name}* — ${deadlineLabel}\n` +
        `${bar} ${percentage}%\n` +
        `${fmt(saved)} de ${fmt(target)}  •  faltam ${fmt(remaining)}\n` +
        `_Sugestão: ${fmt(suggestedMonthly)}/mês (${monthsRemaining} ${monthsRemaining === 1 ? 'mês' : 'meses'})_`
      );
    });

    await this.sendAndRecord(
      from,
      phoneKey,
      `🏦 *Suas reservas*\n\n` + blocks.join('\n\n'),
    );
  }

  // Lista as recorrências (contas fixas / assinaturas) ativas do usuário,
  // separando entradas fixas de saídas fixas e mostrando o dia do mês.
  private async handleRecurringQuery(
    from: string,
    userId: string,
    phoneKey?: string,
  ) {
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

    await this.sendAndRecord(
      from,
      phoneKey,
      `🔁 *Suas contas fixas do mês*\n\n` + sections.join('\n\n'),
    );
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

    // Ciclo a pagar: o mês citado ("paguei a fatura de maio") ou o corrente.
    // UTC para o `cycle` (chave do InvoicePayment) bater com o derivado no web
    // em get-card-invoice. Antes, "fatura de maio" era atribuída silenciosamente
    // ao ciclo corrente — pagamento no mês errado.
    const now = new Date();
    const cycle =
      result.invoiceMonth ??
      `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const [cy, cm] = cycle.split('-').map(Number);
    const cycleLabel = new Date(Date.UTC(cy, cm - 1, 1)).toLocaleDateString(
      'pt-BR',
      { month: 'long', timeZone: 'UTC' },
    );
    const invoiceLabel = result.invoiceMonth
      ? `fatura de ${cycleLabel} do *${card.name}*`
      : `fatura do *${card.name}*`;

    // O use-case calcula o SALDO DEVEDOR (total − já pago), usa-o como default
    // quando o usuário não disse o valor ("paguei a fatura"), valida o teto e
    // barra fatura já quitada — evitando a cobrança em dobro. Passamos amount
    // só quando o usuário informou um valor.
    let res;
    try {
      res = await this.payInvoiceUseCase.execute(card.id, userId, {
        cycle,
        ...(result.amount != null ? { amount: result.amount } : {}),
      });
    } catch (error) {
      // Fatura quitada (ou valor inválido): responde amigável, não vaza erro.
      const msg =
        error instanceof BadRequestException
          ? `A ${invoiceLabel} já está quitada — nada a pagar 👍`
          : `Não consegui registrar o pagamento da ${invoiceLabel} agora. Tenta de novo?`;
      await this.wmodeClient.sendMessage({ to: from, content: msg });
      return;
    }

    const statusLabel =
      res.paymentStatus === 'paid'
        ? 'Fatura quitada ✅'
        : `Parcial: ${fmt(res.paid)} de ${fmt(res.total)}`;

    // res.amount = valor efetivamente pago (clampado ao saldo devedor se o
    // usuário tentou pagar mais do que devia).
    const requested = result.amount;
    const clampNote =
      requested != null && res.amount < requested
        ? ` _(ajustei pro saldo devedor; você tinha dito ${fmt(requested)})_`
        : '';

    await this.wmodeClient.sendMessage({
      to: from,
      content:
        `✅ Registrei o pagamento de *${fmt(res.amount)}* na ` +
        `${invoiceLabel}.${clampNote}\n${statusLabel}`,
    });

    if (phoneKey) {
      await this.conversation.appendHistory(phoneKey, [
        {
          role: 'bot',
          text: `Pagamento de fatura registrado: ${card.name} ${fmt(res.amount)}`,
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
        content:
          'Tive um problema pra registrar o aporte agora 😕 Tenta de novo em instantes? Nada foi guardado.',
      });
      return true;
    }

    // 1) Aporte vira DESPESA (saiu do disponível do mês).
    const expense = await this.transactionsRepository.create({
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

    // 3) Registra a AÇÃO INTEIRA para um "cancela" reverter os dois writes
    //    (deleta a despesa E decrementa savedAmount) — sem isso o fallback
    //    apagaria só a despesa e a reserva ficaria com dinheiro fantasma.
    await this.conversation.setLastAction(phoneKey, {
      kind: 'reserve-contribution',
      transactionIds: [expense.id],
      reserveId: chosen.id,
      amount: pending.amount,
      label: `Guardado em ${chosen.name}`,
    });

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
          // Preserva a DATA original (a compra não mudou de dia só porque trocou
          // de cartão). Sem isto, recriava com hoje e a transação "pulava" de dia.
          date: t.date.toISOString(),
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
