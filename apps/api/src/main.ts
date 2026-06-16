// DEVE ser o primeiro import: inicializa o Sentry antes de qualquer módulo do
// app (instrumentação de erros/performance depende disso).
import './instrument';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody: true expõe req.rawBody preservando o parse JSON normal das demais
  // rotas. O webhook do Stripe precisa do corpo cru para validar a assinatura.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Headers de segurança (CSP, HSTS, etc.) e gzip nas respostas.
  app.use(helmet());
  app.use(compression());

  // Origens permitidas: a do front em produção (FRONTEND_URL) + dev local.
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter((o): o is string => Boolean(o));

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
