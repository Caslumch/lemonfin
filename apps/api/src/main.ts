// DEVE ser o primeiro import: inicializa o Sentry antes de qualquer módulo do
// app (instrumentação de erros/performance depende disso).
import './instrument';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import compression from 'compression';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { setupSwagger } from './setup-swagger';

async function bootstrap() {
  // rawBody: true expõe req.rawBody preservando o parse JSON normal das demais
  // rotas. O webhook do Stripe precisa do corpo cru para validar a assinatura.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // O webhook do WhatsApp (WMode) entrega mídia embutida em base64 — uma foto de
  // comprovante passa fácil do default de 100 KB do body parser (resultava em
  // 413 PayloadTooLarge antes de chegar ao controller). Sobe o limite para 5 MB.
  // useBodyParser preserva o rawBody do Stripe configurado acima.
  app.useBodyParser('json', { limit: '5mb' });
  app.useBodyParser('urlencoded', { limit: '5mb', extended: true });

  // Headers de segurança (CSP, HSTS, etc.) e gzip nas respostas. O Swagger UI
  // (/v1/docs) usa scripts/estilos inline e carrega assets próprios; a CSP
  // padrão do helmet os bloquearia. Como é uma página estática de documentação
  // (sem dados do usuário no corpo), desligamos a CSP SÓ nessa rota — o resto do
  // app mantém a política estrita.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/v1/docs')) return next();
    return helmet()(req, res, next);
  });
  app.use(
    '/v1/docs',
    helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }),
  );
  app.use(compression());

  // Contrato OpenAPI do gateway: /v1/docs (UI) e /v1/openapi.json (spec p/ LLMs).
  setupSwagger(app);

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
