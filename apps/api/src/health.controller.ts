import { Controller, Get, HttpStatus, Logger, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { PrismaService } from './prisma/prisma.service';

type DependencyStatus = 'up' | 'down';

@SkipThrottle()
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  // Liveness: "o processo está de pé?". Consultado com frequência pela
  // plataforma de hosting e pelo keep-alive (a cada ~10min) — precisa ser
  // TRIVIAL e rápido. NÃO faz fan-out para dependências externas: senão um
  // soluço no banco/WhatsApp faria a plataforma reiniciar/derrubar a app à toa.
  @Get()
  check() {
    return { status: 'ok' };
  }

  // Readiness: "as dependências estão saudáveis?". Checa cada dependência e
  // devolve status por item. Retorna 503 quando uma dependência CRÍTICA (o
  // banco) está fora — para alertas de uptime apontarem o problema real.
  //
  // Hoje só o Postgres é checado: é a única dependência que dá pra verificar de
  // forma barata e confiável. A sessão do WMode (WhatsApp) não expõe endpoint de
  // status conhecido, e um ping no Stripe a cada checagem gastaria cota/rate
  // limit — ambos ficam de fora até termos uma checagem barata (ver #136).
  @Get('ready')
  async ready(@Res({ passthrough: true }) res: Response) {
    const database = await this.checkDatabase();

    const allUp = database === 'up';
    res.status(allUp ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);

    return {
      status: allUp ? 'ok' : 'degraded',
      dependencies: { database },
    };
  }

  private async checkDatabase(): Promise<DependencyStatus> {
    try {
      // `SELECT 1` — mais barato possível; só confirma que a conexão responde.
      await this.prisma.$queryRaw`SELECT 1`;
      return 'up';
    } catch (error) {
      this.logger.error(`Health: banco indisponível: ${String(error)}`);
      return 'down';
    }
  }
}
