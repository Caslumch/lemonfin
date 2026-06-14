import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

// Uma troca curta de conversa (texto, não o JSON parseado — leve no contexto).
export interface HistoryEntry {
  role: 'user' | 'bot';
  text: string;
}

// Confirmação aguardando resposta do usuário. União discriminada por `type`:
// só o WhatsappService lê isso (o repositório trata como JSON opaco).
export type PendingConfirmation =
  | {
      type: 'category';
      // Dados da transação a confirmar (já parseados).
      amount: number;
      txType: 'INCOME' | 'EXPENSE';
      description: string;
      cardName?: string;
      // Opções de categoria oferecidas (slug + label), na ordem dos números.
      options: { slug: string; label: string }[];
    }
  | {
      // Aporte aguardando o usuário escolher EM QUAL reserva lançar.
      type: 'reserve-contribution';
      amount: number;
      // Reservas ativas oferecidas (id + nome), na ordem dos números.
      options: { id: string; name: string }[];
    };

// Última ação de registro na conversa. Guarda os ids criados (para excluir a
// ação INTEIRA depois — "cancela"/"refaz") e dados de origem mínimos para
// mensagens/refazer. União discriminada por `kind`; o repositório trata como
// JSON opaco (só o WhatsappService interpreta).
export type LastAction =
  | {
      kind: 'transaction';
      transactionIds: string[];
      // Rótulo curto para a mensagem de cancelamento ("R$ 50 em Alimentação").
      label: string;
    }
  | {
      kind: 'installment';
      transactionIds: string[];
      installmentGroupId: string;
      installments: number;
      label: string;
    }
  | {
      kind: 'batch';
      transactionIds: string[];
      installmentGroupIds: string[];
      count: number;
      label: string;
    };

const MAX_HISTORY = 4; // últimas 4 trocas
const MAX_TEXT = 160; // trunca cada texto

@Injectable()
export class ConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async get(phone: string) {
    return this.prisma.conversationState.findUnique({ where: { phone } });
  }

  async getPending(phone: string): Promise<PendingConfirmation | null> {
    const state = await this.get(phone);
    return (state?.pending as PendingConfirmation | null) ?? null;
  }

  async getHistory(phone: string): Promise<HistoryEntry[]> {
    const state = await this.get(phone);
    return (state?.history as HistoryEntry[] | undefined) ?? [];
  }

  async getLastAction(phone: string): Promise<LastAction | null> {
    const state = await this.get(phone);
    return (state?.lastAction as LastAction | null) ?? null;
  }

  // Salva (ou limpa) a última ação, preservando histórico/pending.
  async setLastAction(phone: string, action: LastAction | null) {
    const value: Prisma.InputJsonValue | Prisma.NullTypes.JsonNull = action
      ? (action as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull;
    await this.prisma.conversationState.upsert({
      where: { phone },
      create: { phone, lastAction: value, history: [] },
      update: { lastAction: value },
    });
  }

  async clearLastAction(phone: string) {
    await this.setLastAction(phone, null);
  }

  // Salva (ou limpa) a confirmação pendente, preservando o histórico.
  async setPending(phone: string, pending: PendingConfirmation | null) {
    const value: Prisma.InputJsonValue | Prisma.NullTypes.JsonNull = pending
      ? (pending as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull;
    await this.prisma.conversationState.upsert({
      where: { phone },
      create: { phone, pending: value, history: [] },
      update: { pending: value },
    });
  }

  async clearPending(phone: string) {
    await this.setPending(phone, null);
  }

  // Adiciona uma troca ao histórico (mantendo só as últimas MAX_HISTORY,
  // com cada texto truncado).
  async appendHistory(phone: string, entries: HistoryEntry[]) {
    const current = await this.getHistory(phone);
    const trimmed = entries.map((e) => ({
      role: e.role,
      text: e.text.slice(0, MAX_TEXT),
    }));
    const next = [...current, ...trimmed].slice(-MAX_HISTORY);

    await this.prisma.conversationState.upsert({
      where: { phone },
      create: { phone, history: next as unknown as Prisma.InputJsonValue },
      update: { history: next as unknown as Prisma.InputJsonValue },
    });
  }
}
