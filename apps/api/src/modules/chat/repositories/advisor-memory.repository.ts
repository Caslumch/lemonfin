import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

// Teto de fatos por usuário: o suficiente para um perfil rico sem inflar o
// prompt (30 linhas curtas ≈ poucas centenas de tokens). No teto, o mais
// antigo sai (FIFO) — fatos re-mencionados podem ser salvos de novo pelo
// modelo, então o que importa tende a sobreviver.
const MAX_MEMORIES = 30;
// Fato é UMA frase; textos longos são truncados (o modelo é instruído a ser
// curto, isto é só cinto de segurança de prompt/armazenamento).
const MAX_CONTENT = 240;

@Injectable()
export class AdvisorMemoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Mais antigos primeiro: a ordem cronológica ajuda o modelo a perceber
  // evolução ("queria X, depois mudou para Y").
  async list(userId: string) {
    return this.prisma.advisorMemory.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, content: true, createdAt: true },
    });
  }

  // Salva um fato novo. Conteúdo idêntico já salvo é no-op (devolve o
  // existente) — o modelo às vezes re-salva o que acabou de ler no prompt.
  async remember(userId: string, content: string) {
    const trimmed = content.trim().slice(0, MAX_CONTENT);

    const existing = await this.prisma.advisorMemory.findFirst({
      where: { userId, content: { equals: trimmed, mode: 'insensitive' } },
      select: { id: true, content: true },
    });
    if (existing) return { ...existing, deduped: true };

    // No teto, abre espaço apagando o mais antigo ANTES de criar.
    const count = await this.prisma.advisorMemory.count({ where: { userId } });
    if (count >= MAX_MEMORIES) {
      const oldest = await this.prisma.advisorMemory.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      if (oldest) {
        await this.prisma.advisorMemory.delete({ where: { id: oldest.id } });
      }
    }

    const created = await this.prisma.advisorMemory.create({
      data: { userId, content: trimmed },
      select: { id: true, content: true },
    });
    return { ...created, deduped: false };
  }

  // Apaga um fato — sempre escopado ao dono (o id vem do modelo, que leu do
  // prompt; o filtro por userId impede apagar memória de outro usuário).
  async forget(userId: string, id: string): Promise<boolean> {
    const { count } = await this.prisma.advisorMemory.deleteMany({
      where: { id, userId },
    });
    return count > 0;
  }

  // Apaga TUDO que se lembra do usuário. Só o comando explícito "esquece tudo"
  // (confirmado) chama isto — o modelo NÃO tem tool para apagar em massa, para
  // não haver como uma conversa varrer a memória sem o usuário mandar.
  async forgetAll(userId: string): Promise<number> {
    const { count } = await this.prisma.advisorMemory.deleteMany({
      where: { userId },
    });
    return count;
  }
}
