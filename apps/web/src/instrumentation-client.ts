import * as Sentry from "@sentry/nextjs";

// Sentry no browser (client). No-op sem DSN. (Next 16: instrumentation-client.)
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE
      ? Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE)
      : 0.1,
    // Replay opcional fica desligado por padrão (volume/privacidade).
  });
}

// Necessário para o Sentry instrumentar navegações no App Router.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
