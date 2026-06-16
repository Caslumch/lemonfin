import * as Sentry from '@sentry/nestjs';

// Inicialização do Sentry. PRECISA rodar antes de qualquer outro import do app
// (por isso é o primeiro import do main.ts). Sem SENTRY_DSN, o init vira no-op:
// a app sobe normal e nada é enviado — seguro para dev/local.
const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    // Performance (tracing): amostra uma fração das transações. Em produção,
    // ajustável por env (SENTRY_TRACES_SAMPLE_RATE). Default conservador (10%)
    // para não estourar volume/custo.
    tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE
      ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE)
      : 0.1,
    // Não enviar PII por padrão pelo SDK; o userId/email são anexados
    // explicitamente pelo nosso interceptor (controle fino).
    sendDefaultPii: false,
  });
}
