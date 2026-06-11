import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
