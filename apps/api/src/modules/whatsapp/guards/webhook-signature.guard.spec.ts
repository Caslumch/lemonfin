import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { WebhookSignatureGuard } from './webhook-signature.guard';

const SECRET = 'test-webhook-secret';

const config = {
  getOrThrow: () => SECRET,
} as never;

// Monta um ExecutionContext mínimo com headers + rawBody, como o Nest entrega.
function ctx(opts: { rawBody?: Buffer; signature?: string }): ExecutionContext {
  const request = {
    headers: opts.signature ? { 'x-webhook-signature': opts.signature } : {},
    rawBody: opts.rawBody,
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as never;
}

function sign(raw: Buffer | string): string {
  const hash = createHmac('sha256', SECRET).update(raw).digest('hex');
  return `sha256=${hash}`;
}

describe('WebhookSignatureGuard', () => {
  let guard: WebhookSignatureGuard;

  beforeEach(() => {
    guard = new WebhookSignatureGuard(config);
  });

  it('aceita a assinatura calculada sobre os BYTES CRUS do corpo', () => {
    const raw = Buffer.from('{"event":"message.received","x":1}', 'utf8');
    expect(guard.canActivate(ctx({ rawBody: raw, signature: sign(raw) }))).toBe(
      true,
    );
  });

  it('rejeita corpo adulterado (assinatura não bate)', () => {
    const raw = Buffer.from('{"amount":10}', 'utf8');
    const adulterado = Buffer.from('{"amount":1000}', 'utf8');
    expect(() =>
      guard.canActivate(ctx({ rawBody: adulterado, signature: sign(raw) })),
    ).toThrow(UnauthorizedException);
  });

  it('rejeita quando falta o header de assinatura', () => {
    const raw = Buffer.from('{}', 'utf8');
    expect(() => guard.canActivate(ctx({ rawBody: raw }))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejeita quando o rawBody não está disponível', () => {
    const raw = Buffer.from('{}', 'utf8');
    expect(() => guard.canActivate(ctx({ signature: sign(raw) }))).toThrow(
      UnauthorizedException,
    );
  });

  // Garante que a correção não regrediu: com acentos (português), JSON.stringify
  // do corpo parseado emite os caracteres literais, enquanto o emissor pode
  // escapar como \uXXXX (ou vice-versa). A verificação por rawBody usa os bytes
  // reais; assinar uma reserialização diferente NÃO pode passar.
  it('verifica os bytes crus, não uma reserialização do corpo', () => {
    const raw = Buffer.from('{"content":"almo\\u00e7o no mercado"}', 'utf8');
    // Bytes "equivalentes" porém diferentes (acento literal em vez de ç):
    const reserializado = Buffer.from(
      '{"content":"almoço no mercado"}',
      'utf8',
    );
    expect(() =>
      guard.canActivate(ctx({ rawBody: raw, signature: sign(reserializado) })),
    ).toThrow(UnauthorizedException);
    // E a assinatura correta sobre os bytes crus passa.
    expect(guard.canActivate(ctx({ rawBody: raw, signature: sign(raw) }))).toBe(
      true,
    );
  });
});
