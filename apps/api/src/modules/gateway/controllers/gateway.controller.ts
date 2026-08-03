import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiQuery,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../../api-keys/guards/api-key.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { GetSummaryUseCase } from '../../transactions/use-cases/get-summary.use-case';
import { ListTransactionsUseCase } from '../../transactions/use-cases/list-transactions.use-case';
import { CreateTransactionUseCase } from '../../transactions/use-cases/create-transaction.use-case';
import { GetCategoryBreakdownUseCase } from '../../transactions/use-cases/get-category-breakdown.use-case';
import { GetInsightsUseCase } from '../../transactions/use-cases/get-insights.use-case';
import { GetForecastUseCase } from '../../transactions/use-cases/get-forecast.use-case';
import { ListCardsUseCase } from '../../cards/use-cases/list-cards.use-case';
import {
  createTransactionSchema,
  listTransactionsQuerySchema,
} from '../../transactions/dtos/transaction.dto';
import type {
  CreateTransactionInput,
  ListTransactionsQuery,
} from '../../transactions/dtos/transaction.dto';

// Gateway REST versionado para agentes de IA e integrações externas. Autentica
// por API KEY (não JWT) via ApiKeyGuard, que popula request.user — daí os
// use-cases abaixo são EXATAMENTE os mesmos do controller de browser, sem
// duplicar regra de negócio. O PremiumGuard global (APP_GUARD) continua valendo:
// a key herda o status premium do dono.
//
// Princípio deste namespace: respostas AUTO-EXPLICATIVAS. Um agente (ou humano
// lendo o JSON cru) não deve precisar conhecer as convenções internas do app.
// Por isso enriquecemos as respostas com um bloco `_meta` que documenta os
// campos que costumam confundir — em especial a distinção cartão vs. consumo.
@ApiTags('Gateway v1')
// 'apiKey' referencia o esquema de segurança declarado no DocumentBuilder
// (main.ts): header Authorization: Bearer lmn_... (ou X-API-Key).
@ApiSecurity('apiKey')
@Controller('v1')
@UseGuards(ApiKeyGuard)
export class GatewayController {
  constructor(
    private readonly getSummary: GetSummaryUseCase,
    private readonly listTransactions: ListTransactionsUseCase,
    private readonly createTransaction: CreateTransactionUseCase,
    private readonly getCategoryBreakdown: GetCategoryBreakdownUseCase,
    private readonly getInsights: GetInsightsUseCase,
    private readonly getForecast: GetForecastUseCase,
    private readonly listCards: ListCardsUseCase,
  ) {}

  // Resumo financeiro do período. As chaves de gasto são a maior fonte de
  // confusão do app (gasto no cartão NÃO entra em `expense`), então o `_meta`
  // abaixo é anexado justamente para tornar isso explícito ao consumidor.
  @ApiOperation({
    summary: 'Resumo financeiro do período',
    description:
      'Totais do período. ATENÇÃO: gasto no cartão NÃO entra em `expense` (que é só consumo pix/débito) — está em `cardExpense` (mês) e `cardInvoice` (fatura do ciclo). Veja o bloco `_meta` da resposta para a definição de cada campo.',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Início do período, ISO (ex: 2026-08-01).',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Fim do período, ISO (ex: 2026-08-31).',
  })
  @Get('summary')
  async summary(
    @CurrentUser() user: { id: string },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const summary = await this.getSummary.execute(user.id, startDate, endDate);
    return {
      ...summary,
      _meta: {
        fields: {
          income: 'Receitas (entradas) no período.',
          expense:
            'Gasto de CONSUMO fora do cartão (pix/débito). NÃO inclui compras no cartão nem pagamento de fatura.',
          cardExpense:
            'Gasto no cartão dentro do período (mês civil). Compras no cartão vivem AQUI, não em `expense`.',
          cardInvoice:
            'Total da FATURA do ciclo de fechamento de cada cartão (o mesmo número da tela de cartões). Pode diferir de `cardExpense` porque o ciclo atravessa a virada do mês.',
          invoicePayment:
            'Quitação de fatura no período. É saída de caixa, mas não é gasto novo (as compras já foram contadas quando lançadas no cartão).',
          balance:
            'Fluxo de caixa = income − expense − invoicePayment. O gasto no cartão só afeta o caixa quando a fatura é paga.',
        },
        note: 'Para o "gasto total no cartão" use `cardExpense` (mês) ou `cardInvoice` (fatura do ciclo). `expense` é só consumo fora do cartão.',
      },
    };
  }

  @ApiOperation({
    summary: 'Lista transações',
    description:
      'Lista paginada. Por padrão agrupa compras parceladas numa linha só (grouped=true). Aceita filtros: type (INCOME/EXPENSE), categoryId, cardId, search, startDate, endDate, memberId, page, perPage.',
  })
  @Get('transactions')
  listTx(
    @CurrentUser() user: { id: string },
    @Query(new ZodValidationPipe(listTransactionsQuerySchema))
    query: ListTransactionsQuery,
  ) {
    return this.listTransactions.execute(user.id, query);
  }

  @ApiOperation({
    summary: 'Cria uma transação',
    description:
      'Cria receita ou despesa. Campos: amount (>0), type (INCOME/EXPENSE), categoryId (obrigatório), description, date (ISO; default hoje), cardId (para gasto no cartão), installments (2–48 para parcelar; amount vira o total da compra).',
  })
  @Post('transactions')
  createTx(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(createTransactionSchema))
    body: CreateTransactionInput,
  ) {
    return this.createTransaction.execute(user.id, body);
  }

  @ApiOperation({
    summary: 'Gasto por categoria no período',
    description:
      'Breakdown de despesas por categoria. Exclui a categoria de sistema pagamento-fatura (não é consumo).',
  })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @Get('by-category')
  byCategory(
    @CurrentUser() user: { id: string },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.getCategoryBreakdown.execute(user.id, startDate, endDate);
  }

  @ApiOperation({
    summary: 'Insights financeiros',
    description:
      'Observações automáticas sobre os gastos (tendências, categorias em alta, comparativos).',
  })
  @Get('insights')
  insights(@CurrentUser() user: { id: string }) {
    return this.getInsights.execute(user.id);
  }

  @ApiOperation({
    summary: 'Previsão do mês',
    description:
      'Projeção de fechamento do mês corrente a partir do realizado até agora.',
  })
  @Get('forecast')
  forecast(@CurrentUser() user: { id: string }) {
    return this.getForecast.execute(user.id);
  }

  @ApiOperation({
    summary: 'Lista cartões',
    description:
      'Cartões da conta com o gasto do ciclo de fatura aberto (currentSpend).',
  })
  @Get('cards')
  cards(@CurrentUser() user: { id: string }) {
    return this.listCards.execute(user.id);
  }
}
