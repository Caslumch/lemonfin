import { PushDispatchService } from './push-dispatch.service';

function build(overrides: {
  tokens?: string[];
  invalidTokens?: string[];
}) {
  const tokensRepo = {
    findByUser: jest.fn().mockResolvedValue(overrides.tokens ?? []),
    removeMany: jest.fn().mockResolvedValue(undefined),
  };
  const expo = {
    send: jest
      .fn()
      .mockResolvedValue({ invalidTokens: overrides.invalidTokens ?? [] }),
  };
  const service = new PushDispatchService(
    tokensRepo as never,
    expo as never,
  );
  return { service, tokensRepo, expo };
}

const NOTE = { title: 't', body: 'b' };

describe('PushDispatchService', () => {
  it('retorna false e não envia quando o usuário não tem devices', async () => {
    const { service, expo } = build({ tokens: [] });
    expect(await service.sendToUser('u1', NOTE)).toBe(false);
    expect(expo.send).not.toHaveBeenCalled();
  });

  it('envia e retorna true quando há entrega', async () => {
    const { service, expo, tokensRepo } = build({ tokens: ['tk1'] });
    expect(await service.sendToUser('u1', NOTE)).toBe(true);
    expect(expo.send).toHaveBeenCalledWith(['tk1'], NOTE);
    expect(tokensRepo.removeMany).not.toHaveBeenCalled();
  });

  it('poda tokens inválidos reportados pelo Expo', async () => {
    const { service, tokensRepo } = build({
      tokens: ['tk1', 'tk2'],
      invalidTokens: ['tk2'],
    });
    expect(await service.sendToUser('u1', NOTE)).toBe(true);
    expect(tokensRepo.removeMany).toHaveBeenCalledWith(['tk2']);
  });

  it('retorna false quando TODOS os tokens eram inválidos', async () => {
    const { service } = build({
      tokens: ['tk1'],
      invalidTokens: ['tk1'],
    });
    expect(await service.sendToUser('u1', NOTE)).toBe(false);
  });
});
