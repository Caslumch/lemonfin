import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TransactionsRepository } from '../../transactions/repositories/transactions.repository';
import type { ChatMessageInput } from '../dtos/chat.dto';

const SYSTEM_PROMPT = `Voce e o LemonFin, um assistente financeiro inteligente e amigavel. Voce ajuda o usuario a entender seus gastos, identificar padroes e tomar melhores decisoes financeiras.

## Seu papel:
- Analisar os dados financeiros do usuario e dar insights acionaveis
- Responder perguntas sobre gastos, receitas e saldo de forma clara
- Sugerir formas de economizar baseado nos padroes de gasto
- Fazer projecoes simples quando solicitado
- Ser encorajador mas honesto sobre a situacao financeira

## Regras:
- Responda sempre em portugues brasileiro
- Seja conciso e direto (max 3-4 paragrafos)
- Use formatacao simples (sem markdown complexo)
- Quando mencionar valores, use o formato R$ X.XXX,XX
- Nao invente dados — use apenas o contexto financeiro fornecido
- Se nao tiver dados suficientes, diga isso claramente
- Nao fale sobre assuntos que nao sejam financas pessoais do usuario`;

@Injectable()
export class ChatCompletionUseCase {
  private readonly logger = new Logger(ChatCompletionUseCase.name);
  private readonly model;

  constructor(
    private readonly config: ConfigService,
    private readonly transactionsRepository: TransactionsRepository,
  ) {
    const genAI = new GoogleGenerativeAI(
      this.config.getOrThrow<string>('GEMINI_API_KEY'),
    );
    this.model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });
  }

  async *execute(userId: string, input: ChatMessageInput) {
    this.logger.log(`Chat request from user ${userId}: "${input.message}"`);

    const context = await this.buildFinancialContext(userId);

    const systemInstruction = `${SYSTEM_PROMPT}\n\n## Contexto financeiro atual do usuario:\n${context}`;

    const history = input.history.map((msg) => ({
      role: msg.role === 'user' ? ('user' as const) : ('model' as const),
      parts: [{ text: msg.content }],
    }));

    this.logger.log('Starting Gemini stream...');

    const chat = this.model.startChat({
      systemInstruction: { role: 'user', parts: [{ text: systemInstruction }] },
      history,
    });

    const result = await chat.sendMessageStream(input.message);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      this.logger.debug(`Chunk received: "${text?.slice(0, 50)}..."`);
      if (text) {
        yield text;
      }
    }

    this.logger.log('Stream completed');
  }

  private async buildFinancialContext(userId: string): Promise<string> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0];

    const [summary, monthly, categoryBreakdown, recentTransactions] =
      await Promise.all([
        this.transactionsRepository.getSummary(
          userId,
          startOfMonth,
          endOfMonth,
        ),
        this.transactionsRepository.getMonthlyBreakdown(userId, 3),
        this.transactionsRepository.getCategoryBreakdown(
          userId,
          startOfMonth,
          endOfMonth,
        ),
        this.transactionsRepository.findMany({
          userId,
          skip: 0,
          take: 10,
          order: 'desc',
          orderBy: 'date',
        }),
      ]);

    const parts: string[] = [];

    parts.push(
      `### Resumo do mes atual (${now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })})`,
    );
    parts.push(`- Receitas: R$ ${summary.income.toFixed(2)}`);
    parts.push(`- Despesas: R$ ${summary.expense.toFixed(2)}`);
    parts.push(
      `- Saldo: R$ ${summary.balance.toFixed(2)} (${summary.balance >= 0 ? 'positivo' : 'negativo'})`,
    );
    parts.push(`- Total de transacoes: ${summary.incomeCount + summary.expenseCount}`);

    if (categoryBreakdown.length > 0) {
      parts.push('\n### Gastos por categoria (mes atual)');
      for (const cat of categoryBreakdown.slice(0, 5)) {
        const name = cat.category?.name ?? 'Outros';
        parts.push(`- ${name}: R$ ${cat.total.toFixed(2)} (${cat.count} transacoes)`);
      }
    }

    if (monthly.length > 0) {
      parts.push('\n### Evolucao mensal (ultimos 3 meses)');
      for (const m of monthly) {
        parts.push(
          `- ${m.month}: Receitas R$ ${m.income.toFixed(2)} | Despesas R$ ${m.expense.toFixed(2)} | Saldo R$ ${m.balance.toFixed(2)}`,
        );
      }
    }

    if (recentTransactions.data.length > 0) {
      parts.push('\n### Ultimas transacoes');
      for (const tx of recentTransactions.data.slice(0, 5)) {
        const sign = tx.type === 'INCOME' ? '+' : '-';
        const cat = (tx as any).category?.name ?? '';
        const date = new Date(tx.date).toLocaleDateString('pt-BR');
        parts.push(
          `- ${date}: ${sign}R$ ${Number(tx.amount).toFixed(2)} — ${tx.description || cat}`,
        );
      }
    }

    return parts.join('\n');
  }
}
