import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiKeysRepository } from '../repositories/api-keys.repository';
import type { CreateApiKeyInput } from '../dtos/api-key.dto';

@Injectable()
export class ApiKeysService {
  constructor(private readonly apiKeys: ApiKeysRepository) {}

  // Cria uma key e devolve o valor CRU — o controller precisa avisar o cliente
  // de que este é o único momento em que a chave completa aparece.
  create(userId: string, input: CreateApiKeyInput) {
    return this.apiKeys.create(
      userId,
      input.name,
      input.scopes ?? ['read', 'write'],
    );
  }

  list(userId: string) {
    return this.apiKeys.listForUser(userId);
  }

  async revoke(id: string, userId: string) {
    const revoked = await this.apiKeys.revoke(id, userId);
    if (!revoked) {
      throw new NotFoundException('Chave não encontrada ou já revogada.');
    }
    return { revoked: true };
  }
}
