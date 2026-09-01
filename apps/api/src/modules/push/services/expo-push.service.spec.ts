import { ExpoPushService } from './expo-push.service';

const VALID = 'ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]';
const VALID2 = 'ExponentPushToken[bbbbbbbbbbbbbbbbbbbbbb]';

function mockFetchOnce(data: unknown, ok = true, status = 200) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok,
    status,
    json: async () => ({ data }),
  });
}

describe('ExpoPushService', () => {
  let service: ExpoPushService;

  beforeEach(() => {
    global.fetch = jest.fn();
    service = new ExpoPushService();
  });

  it('valida o formato do Expo push token', () => {
    expect(ExpoPushService.isExpoPushToken(VALID)).toBe(true);
    expect(ExpoPushService.isExpoPushToken('ExpoPushToken[x]')).toBe(true);
    expect(ExpoPushService.isExpoPushToken('lixo')).toBe(false);
    expect(ExpoPushService.isExpoPushToken('')).toBe(false);
  });

  it('marca tokens de formato inválido sem chamar o Expo', async () => {
    const { invalidTokens } = await service.send(['lixo'], {
      title: 't',
      body: 'b',
    });
    expect(invalidTokens).toEqual(['lixo']);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('poda tokens com DeviceNotRegistered (na ordem enviada)', async () => {
    mockFetchOnce([
      { status: 'ok', id: '1' },
      { status: 'error', details: { error: 'DeviceNotRegistered' } },
    ]);
    const { invalidTokens } = await service.send([VALID, VALID2], {
      title: 't',
      body: 'b',
    });
    expect(invalidTokens).toEqual([VALID2]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('não lança quando o Expo retorna erro HTTP', async () => {
    mockFetchOnce(null, false, 502);
    const { invalidTokens } = await service.send([VALID], {
      title: 't',
      body: 'b',
    });
    expect(invalidTokens).toEqual([]);
  });

  it('não lança quando o fetch rejeita', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network'));
    await expect(
      service.send([VALID], { title: 't', body: 'b' }),
    ).resolves.toEqual({ invalidTokens: [] });
  });
});
