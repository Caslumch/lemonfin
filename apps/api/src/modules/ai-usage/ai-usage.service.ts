import { Injectable, Logger } from '@nestjs/common';
import { AiFeature } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// Preços por 1M de tokens (USD). Fonte: tabela da OpenAI. Atualizar aqui se
// trocar de modelo. Default conservador para modelos não mapeados.
const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4o': { input: 2.5, output: 10 },
};
const DEFAULT_PRICING = { input: 0.15, output: 0.6 };

export interface RecordUsageInput {
  userId: string | null;
  feature: AiFeature;
  model: string;
  promptTokens: number;
  completionTokens: number;
}

@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Custo estimado (USD) a partir dos tokens e do preço do modelo. */
  estimateCost(model: string, prompt: number, completion: number): number {
    const p = PRICING[model] ?? DEFAULT_PRICING;
    return (prompt * p.input + completion * p.output) / 1_000_000;
  }

  /**
   * Registra uma chamada de IA. Falha graciosa: erro de gravação só loga, nunca
   * derruba o fluxo que disparou (chat/parser). Tokens ausentes viram 0.
   */
  async record(input: RecordUsageInput): Promise<void> {
    const promptTokens = input.promptTokens || 0;
    const completionTokens = input.completionTokens || 0;
    const totalTokens = promptTokens + completionTokens;
    const costUsd = this.estimateCost(
      input.model,
      promptTokens,
      completionTokens,
    );
    try {
      await this.prisma.aiUsage.create({
        data: {
          userId: input.userId,
          feature: input.feature,
          model: input.model,
          promptTokens,
          completionTokens,
          totalTokens,
          costUsd,
        },
      });
    } catch (err) {
      this.logger.error(`Falha ao registrar AiUsage: ${String(err)}`);
    }
  }
}
