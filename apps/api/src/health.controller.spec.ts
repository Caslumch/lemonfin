import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Response } from 'express';
import { HealthController } from './health.controller';
import { PrismaService } from './prisma/prisma.service';

// Mock de Response com só o que o controller usa (.status()).
function buildRes() {
  const res = { status: jest.fn().mockReturnThis() } as unknown as Response & {
    status: jest.Mock;
  };
  return res;
}

function buildController(dbOk: boolean) {
  const prisma = {
    $queryRaw: dbOk
      ? jest.fn().mockResolvedValue([{ '?column?': 1 }])
      : jest.fn().mockRejectedValue(new Error('connection refused')),
  };
  return { controller: new HealthController(prisma as never), prisma };
}

describe('HealthController', () => {
  it('resolve via DI com PrismaService injetado (contrato de injeção)', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: { $queryRaw: jest.fn() } },
      ],
    }).compile();

    expect(moduleRef.get(HealthController)).toBeInstanceOf(HealthController);
  });

  it('liveness (/health) responde ok sem tocar dependências', () => {
    const { controller, prisma } = buildController(true);
    expect(controller.check()).toEqual({ status: 'ok' });
    // Liveness NÃO faz fan-out — não consulta o banco.
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('readiness (/health/ready) 200 + database up quando o banco responde', async () => {
    const { controller, prisma } = buildController(true);
    const res = buildRes();

    const body = await controller.ready(res);

    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(body).toEqual({
      status: 'ok',
      dependencies: { database: 'up' },
    });
  });

  it('readiness 503 + database down quando o banco falha', async () => {
    const { controller } = buildController(false);
    const res = buildRes();

    const body = await controller.ready(res);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(body).toEqual({
      status: 'degraded',
      dependencies: { database: 'down' },
    });
  });
});
