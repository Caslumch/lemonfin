import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Idempotência durável do webhook do WhatsApp por messageId. Substitui o Set em
 * memória (que não sobrevivia a restart/redeploy nem era compartilhado entre
 * instâncias) por unicidade no banco — um retry do WMode não reprocessa a mesma
 * mensagem (evita transação duplicada).
 */
@Injectable()
export class ProcessedMessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tenta "reivindicar" o processamento de uma mensagem. Retorna `true` se é a
   * PRIMEIRA vez (deve processar); `false` se já foi processada (ignorar). O
   * insert é atômico: se outra instância/retry já inseriu, a violação de PK
   * (P2002) é capturada e devolve `false` — sem race condition.
   */
  async claim(messageId: string): Promise<boolean> {
    try {
      await this.prisma.processedMessage.create({ data: { messageId } });
      return true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return false; // já processada
      }
      throw error;
    }
  }

  /**
   * Limpa registros mais antigos que `olderThan`. Chamado por uma rotina de
   * manutenção (a tabela só precisa reter a janela em que retries acontecem).
   */
  async purgeOlderThan(olderThan: Date): Promise<number> {
    const { count } = await this.prisma.processedMessage.deleteMany({
      where: { createdAt: { lt: olderThan } },
    });
    return count;
  }
}
