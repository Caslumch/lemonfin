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
// `savedAt` é carimbado pelo repositório ao salvar (base do TTL — uma pendência
// respondida dias depois não deve mais valer).
export type PendingConfirmation = (
  | {
      type: 'category';
      // Dados da transação a confirmar (já parseados).
      amount: number;
      txType: 'INCOME' | 'EXPENSE';
      description: string;
      cardName?: string;
      // Data mencionada ("ontem"/"dia 5"), ISO. Preservada para a transação não
      // perder a data ao ser recriada após a confirmação de categoria.
      purchaseDate?: string;
      // Opções de categoria oferecidas (slug + label), na ordem dos números.
      options: { slug: string; label: string }[];
    }
  | {
      // Transação em voo aguardando o usuário dizer QUAL cartão vincular
      // (nome ambíguo ou não encontrado). Guarda a transação inteira para a
      // resposta não perder valor/descrição num re-parse frio.
      type: 'card';
      amount: number;
      txType: 'INCOME' | 'EXPENSE';
      description: string;
      categorySlug: string;
      purchaseDate?: string;
      // Cartões oferecidos (id + nome), na ordem dos números. Vazio quando o
      // usuário não tem cartão cadastrado (só cabe "sem cartão"/cancelar).
      options: { id: string; name: string }[];
    }
  | {
      // "cancela <alvo>" que não bateu com a última ação — aguardando o
      // usuário confirmar se é para apagar a última ação mesmo.
      type: 'cancel-confirm';
      action: LastAction;
    }
  | {
      // Aporte aguardando o usuário escolher EM QUAL reserva lançar.
      type: 'reserve-contribution';
      amount: number;
      // Reservas ativas oferecidas (id + nome), na ordem dos números.
      options: { id: string; name: string }[];
    }
) & { savedAt?: string };

// Última ação de registro na conversa. Guarda os ids criados (para excluir a
// ação INTEIRA depois — "cancela"/"refaz") e dados de origem mínimos para
// mensagens/refazer. União discriminada por `kind`; o repositório trata como
// JSON opaco (só o WhatsappService interpreta). `savedAt` é carimbado pelo
// repositório ao salvar (base do TTL — um "cancela" dias depois não pode
// apagar uma ação velha).
export type LastAction = (
  | {
      kind: 'transaction';
      transactionIds: string[];
      // Rótulo curto para a mensagem de cancelamento ("R$ 50 em Alimentação").
      label: string;
      // Descrição do lançamento ("mercado") — o rótulo só tem valor+categoria,
      // e um "cancela o mercado" precisa casar com o que o usuário escreveu.
      description?: string;
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
    }
  | {
      // Aporte em reserva: a despesa "Guardado" (transactionIds) + os dados
      // pra reverter o savedAmount da reserva num "cancela".
      kind: 'reserve-contribution';
      transactionIds: string[];
      reserveId: string;
      amount: number;
      label: string;
    }
) & { savedAt?: string };

const MAX_HISTORY = 4; // últimas 4 trocas
const MAX_TEXT = 160; // trunca cada texto

// Validade dos estados de conversa. Pendência é papo em andamento (minutos);
// lastAction dura mais (um "cancela" meia hora depois ainda é legítimo), mas
// não indefinidamente — sem TTL, um "cancela" dias depois apagava uma ação
// antiga que o usuário nem lembrava. Registros sem savedAt (anteriores ao
// carimbo) são tratados como vencidos.
const PENDING_TTL_MS = 15 * 60 * 1000;
const LAST_ACTION_TTL_MS = 60 * 60 * 1000;

function isFresh(savedAt: string | undefined, ttlMs: number): boolean {
  if (!savedAt) return false;
  const t = Date.parse(savedAt);
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= ttlMs;
}

@Injectable()
export class ConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async get(phone: string) {
    return this.prisma.conversationState.findUnique({ where: { phone } });
  }

  async getPending(phone: string): Promise<PendingConfirmation | null> {
    const state = await this.get(phone);
    const pending = (state?.pending as PendingConfirmation | null) ?? null;
    if (!pending) return null;
    return isFresh(pending.savedAt, PENDING_TTL_MS) ? pending : null;
  }

  async getHistory(phone: string): Promise<HistoryEntry[]> {
    const state = await this.get(phone);
    return (state?.history as HistoryEntry[] | undefined) ?? [];
  }

  async getLastAction(phone: string): Promise<LastAction | null> {
    const state = await this.get(phone);
    const action = (state?.lastAction as LastAction | null) ?? null;
    if (!action) return null;
    return isFresh(action.savedAt, LAST_ACTION_TTL_MS) ? action : null;
  }

  // Salva (ou limpa) a última ação, preservando histórico/pending.
  async setLastAction(phone: string, action: LastAction | null) {
    const value: Prisma.InputJsonValue | Prisma.NullTypes.JsonNull = action
      ? ({
          ...action,
          savedAt: new Date().toISOString(),
        } as unknown as Prisma.InputJsonValue)
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
      ? ({
          ...pending,
          savedAt: new Date().toISOString(),
        } as unknown as Prisma.InputJsonValue)
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
