import { AiFeature } from '@prisma/client';
import { AiUsageService } from './ai-usage.service';

describe('AiUsageService', () => {
  let prisma: { aiUsage: { create: jest.Mock } };
  let svc: AiUsageService;

  beforeEach(() => {
    prisma = { aiUsage: { create: jest.fn().mockResolvedValue({}) } };
    svc = new AiUsageService(prisma as never);
  });

  it('estima custo do gpt-4o-mini (input 0.15 / output 0.60 por 1M)', () => {
    // 1M prompt + 1M completion = 0.15 + 0.60 = 0.75 USD
    expect(svc.estimateCost('gpt-4o-mini', 1_000_000, 1_000_000)).toBeCloseTo(
      0.75,
      6,
    );
    // 1000 prompt + 500 completion
    expect(svc.estimateCost('gpt-4o-mini', 1000, 500)).toBeCloseTo(
      (1000 * 0.15 + 500 * 0.6) / 1_000_000,
      9,
    );
  });

  it('usa preço default para modelo desconhecido', () => {
    expect(svc.estimateCost('modelo-x', 1_000_000, 0)).toBeCloseTo(0.15, 6);
  });

  it('grava a linha com tokens e custo calculados', async () => {
    await svc.record({
      userId: 'u1',
      feature: AiFeature.CHAT,
      model: 'gpt-4o-mini',
      promptTokens: 1000,
      completionTokens: 500,
    });
    expect(prisma.aiUsage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'u1',
        feature: AiFeature.CHAT,
        model: 'gpt-4o-mini',
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      }),
    });
  });

  it('não lança se a gravação falhar (falha graciosa)', async () => {
    prisma.aiUsage.create.mockRejectedValue(new Error('db down'));
    await expect(
      svc.record({
        userId: null,
        feature: AiFeature.WHATSAPP_PARSER,
        model: 'gpt-4o-mini',
        promptTokens: 10,
        completionTokens: 5,
      }),
    ).resolves.toBeUndefined();
  });
});
