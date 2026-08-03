import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';

// Prefixo das chaves. "lmn" = LemonFin; "live" abre espaço para um dia termos
// chaves de teste ("lmn_test_") sem colidir. O que vem depois é o segredo.
const KEY_PREFIX = 'lmn_live_';
// Quantos caracteres do valor cru guardamos em claro (junto do prefixo) só para
// o usuário identificar a key no painel — NÃO dá para reconstruir o segredo a
// partir disso.
const DISPLAY_PREFIX_LEN = KEY_PREFIX.length + 4;
// Throttle do lastUsedAt: escrever a cada request seria um UPDATE por chamada.
// 5min é granular o bastante para "visto por último" sem custo de escrita.
const LAST_USED_THROTTLE_MS = 5 * 60 * 1000;

export interface GeneratedApiKey {
  id: string;
  name: string;
  prefix: string;
  // O valor CRU completo. Só existe aqui, na criação — o banco guarda só o hash.
  // Exibido uma única vez ao usuário; depois é irrecuperável.
  key: string;
}

@Injectable()
export class ApiKeysRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Cria uma key nova. Devolve o valor cru (única vez que ele existe fora do
  // cliente); no banco fica só o hash + o prefixo legível.
  async create(
    userId: string,
    name: string,
    scopes: string[] = ['read', 'write'],
  ): Promise<GeneratedApiKey> {
    const raw = `${KEY_PREFIX}${randomBytes(32).toString('base64url')}`;
    const prefix = raw.slice(0, DISPLAY_PREFIX_LEN);
    const created = await this.prisma.apiKey.create({
      data: { userId, name, keyHash: this.hash(raw), prefix, scopes },
      select: { id: true, name: true, prefix: true },
    });
    return { ...created, key: raw };
  }

  // Resolve uma key crua para o registro ATIVO (não revogado). Retorna null se
  // não existe ou está revogada — o guard trata os dois como 401.
  async findActiveByKey(raw: string) {
    const key = await this.prisma.apiKey.findUnique({
      where: { keyHash: this.hash(raw) },
    });
    if (!key || key.revokedAt) return null;
    return key;
  }

  // Lista as keys do usuário para o painel. NUNCA devolve keyHash — só os
  // metadados seguros (prefixo, nome, uso).
  async listForUser(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId, revokedAt: null },
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Revoga (soft). Escopado por userId para um usuário não revogar key de outro.
  async revoke(id: string, userId: string): Promise<boolean> {
    const result = await this.prisma.apiKey.updateMany({
      where: { id, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count > 0;
  }

  // Marca a key como usada agora — com throttle, para não gerar um UPDATE por
  // request. Best-effort: falha aqui não deve derrubar a chamada autenticada.
  async touchLastUsed(id: string, lastUsedAt: Date | null): Promise<void> {
    if (
      lastUsedAt &&
      Date.now() - lastUsedAt.getTime() < LAST_USED_THROTTLE_MS
    ) {
      return;
    }
    await this.prisma.apiKey
      .update({ where: { id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);
  }

  private hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
