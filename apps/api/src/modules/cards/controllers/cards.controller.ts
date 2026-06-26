import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PremiumGuard } from '../../../common/billing/premium.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CreateCardUseCase } from '../use-cases/create-card.use-case';
import { ListCardsUseCase } from '../use-cases/list-cards.use-case';
import { UpdateCardUseCase } from '../use-cases/update-card.use-case';
import { DeleteCardUseCase } from '../use-cases/delete-card.use-case';
import { GetCardInvoiceUseCase } from '../use-cases/get-card-invoice.use-case';
import { PayInvoiceUseCase } from '../use-cases/pay-invoice.use-case';
import { UndoInvoicePaymentUseCase } from '../use-cases/undo-invoice-payment.use-case';
import {
  createCardSchema,
  updateCardSchema,
  invoiceQuerySchema,
  payInvoiceSchema,
} from '../dtos/card.dto';
import type {
  CreateCardInput,
  UpdateCardInput,
  InvoiceQuery,
  PayInvoiceInput,
} from '../dtos/card.dto';

@Controller('cards')
@UseGuards(JwtAuthGuard, PremiumGuard)
export class CardsController {
  constructor(
    private readonly createCard: CreateCardUseCase,
    private readonly listCards: ListCardsUseCase,
    private readonly updateCard: UpdateCardUseCase,
    private readonly deleteCard: DeleteCardUseCase,
    private readonly getCardInvoice: GetCardInvoiceUseCase,
    private readonly payInvoice: PayInvoiceUseCase,
    private readonly undoInvoicePayment: UndoInvoicePaymentUseCase,
  ) {}

  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(createCardSchema)) body: CreateCardInput,
  ) {
    return this.createCard.execute(user.id, body);
  }

  @Get()
  list(@CurrentUser() user: { id: string }) {
    return this.listCards.execute(user.id);
  }

  @Get(':id/invoice')
  invoice(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Query(new ZodValidationPipe(invoiceQuerySchema)) query: InvoiceQuery,
  ) {
    return this.getCardInvoice.execute(id, user.id, query);
  }

  @Post(':id/invoice/pay')
  pay(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(payInvoiceSchema)) body: PayInvoiceInput,
  ) {
    return this.payInvoice.execute(id, user.id, body);
  }

  // Rota específica ANTES de @Delete(':id') — senão "invoice-payments" casaria
  // como :id do cartão.
  @Delete('invoice-payments/:paymentId')
  undoPayment(
    @CurrentUser() user: { id: string },
    @Param('paymentId') paymentId: string,
  ) {
    return this.undoInvoicePayment.execute(paymentId, user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCardSchema)) body: UpdateCardInput,
  ) {
    return this.updateCard.execute(id, user.id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.deleteCard.execute(id, user.id);
  }
}
