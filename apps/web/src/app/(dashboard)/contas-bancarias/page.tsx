"use client";

import { useState, useCallback, useMemo, useEffect, Suspense } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Link2,
  RefreshCw,
  Trash2,
  Landmark,
  CreditCard,
  Wallet,
  PiggyBank,
  AlertCircle,
  Loader2,
  Unplug,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Link2Off,
} from "lucide-react";
import { ContentHeader } from "@/components/layout/content-header";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { useCards } from "@/hooks/use-transactions-data";
import { queryKeys, invalidatePluggy } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import type { Card } from "@/types/card";

// ── Types ───────────────────────────────────────────────────────────────

interface PluggyItem {
  id: string;
  pluggyItemId: string;
  connectorName: string;
  connectorLogo: string | null;
  status: "CONNECTED" | "UPDATING" | "WAITING_USER" | "LOGIN_ERROR" | "ERROR";
  lastSyncAt: string | null;
  accounts: BankAccount[];
}

interface BankAccount {
  id: string;
  pluggyAccountId: string;
  name: string;
  type: string;
  subtype: string | null;
  number: string | null;
  balance: number;
  currencyCode: string;
  linkedCardId: string | null;
  linkedCard: { id: string; name: string; brand: string | null; closingDay: number } | null;
  creditLimit: number | null;
  availableCreditLimit: number | null;
  balanceDueDate: string | null;
  balanceCloseDate: string | null;
  minimumPayment: number | null;
}

interface PluggyTransaction {
  id: string;
  amount: string;
  type: "INCOME" | "EXPENSE";
  description: string | null;
  date: string;
  category: { name: string; icon: string | null; colorBg: string; colorText: string };
}

interface CreditCardBillPayment {
  amount: number;
  paymentDate: string;
}

interface CreditCardBill {
  id: string;
  dueDate: string;
  billClosingDate: string | null;
  totalAmount: number;
  minimumPaymentAmount: number | null;
  payments: CreditCardBillPayment[];
}

// ── Helpers ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  PluggyItem["status"],
  { label: string; color: string; icon: typeof AlertCircle }
> = {
  CONNECTED: { label: "Conectado", color: "text-emerald-500", icon: Landmark },
  UPDATING: { label: "Sincronizando…", color: "text-amber-500", icon: RefreshCw },
  WAITING_USER: { label: "Ação necessária", color: "text-amber-500", icon: AlertCircle },
  LOGIN_ERROR: { label: "Reconectar", color: "text-danger", icon: Unplug },
  ERROR: { label: "Erro", color: "text-danger", icon: AlertCircle },
};

function fmt(value: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(value);
}

function fmtDate(iso: string | null) {
  if (!iso) return "Nunca";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/**
 * Encontra a fatura atual: a bill com dueDate mais próxima no futuro
 * (fatura aberta/a vencer). Se todas já venceram, pega a mais recente.
 */
function findCurrentBill(bills?: CreditCardBill[]): CreditCardBill | null {
  if (!bills || bills.length === 0) return null;
  const now = Date.now();
  // Bills com dueDate no futuro, ordenadas pela mais próxima
  const future = bills
    .filter((b) => new Date(b.dueDate).getTime() > now)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  if (future.length > 0) return future[0];
  // Todas no passado — pega a mais recente
  return bills.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())[0];
}

function accountIcon(type: string, subtype: string | null) {
  if (type === "CREDIT") return CreditCard;
  if (subtype?.includes("SAVINGS")) return PiggyBank;
  return Wallet;
}

function accountLabel(subtype: string | null, type: string) {
  if (subtype === "CREDIT_CARD") return "Cartão de crédito";
  if (subtype === "CHECKING_ACCOUNT") return "Conta corrente";
  if (subtype === "SAVINGS_ACCOUNT") return "Poupança";
  return type === "CREDIT" ? "Cartão de crédito" : "Conta";
}

// ── Page ────────────────────────────────────────────────────────────────

export default function ContasBancariasPage() {
  return (
    <Suspense fallback={null}>
      <ContasBancariasInner />
    </Suspense>
  );
}

function ContasBancariasInner() {
  const { fetchApi, token } = useApi();
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState(false);
  const [linking, setLinking] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Fetch cards for manual linking
  const { data: cards } = useCards();

  // Fetch items
  const itemsQuery = useQuery<PluggyItem[]>({
    queryKey: queryKeys.pluggyItems,
    enabled: Boolean(token),
    refetchInterval: 30_000,
    queryFn: () => fetchApi<PluggyItem[]>("/pluggy/items"),
  });

  const items = itemsQuery.data ?? [];
  const loading = itemsQuery.isPending;

  // ── Fetch bills for credit card accounts ───────────────────────────

  const [billsByAccount, setBillsByAccount] = useState<Record<string, CreditCardBill[]>>({});

  const creditAccountIds = useMemo(
    () => items.flatMap((i) => i.accounts).filter((a) => a.type === "CREDIT").map((a) => a.pluggyAccountId),
    [items],
  );

  useEffect(() => {
    if (!token || creditAccountIds.length === 0) return;
    let active = true;
    for (const accId of creditAccountIds) {
      fetchApi<CreditCardBill[]>(`/pluggy/accounts/${accId}/bills`)
        .then((bills) => {
          if (active) setBillsByAccount((prev) => ({ ...prev, [accId]: bills }));
        })
        .catch(() => {});
    }
    return () => { active = false; };
  }, [token, creditAccountIds, fetchApi]);

  // ── Derived: all accounts flat + summaries ────────────────────────

  const allAccounts = useMemo(
    () => items.flatMap((i) => i.accounts),
    [items],
  );

  const checking = useMemo(
    () => allAccounts.filter((a) => a.type === "BANK"),
    [allAccounts],
  );

  const credit = useMemo(
    () => allAccounts.filter((a) => a.type === "CREDIT"),
    [allAccounts],
  );

  const totalChecking = useMemo(
    () => checking.reduce((s, a) => s + a.balance, 0),
    [checking],
  );

  const totalCredit = useMemo(
    () => credit.reduce((s, a) => s + a.balance, 0),
    [credit],
  );


  // ── Connect flow ──────────────────────────────────────────────────

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    try {
      const { accessToken } = await fetchApi<{ accessToken: string }>(
        "/pluggy/connect-token",
        { method: "POST", body: JSON.stringify({}) },
      );
      const widgetUrl = `https://connect.pluggy.ai/?connect_token=${accessToken}`;
      const popup = window.open(widgetUrl, "pluggy-connect", "width=500,height=700");
      const interval = setInterval(() => {
        if (popup?.closed) {
          clearInterval(interval);
          setConnecting(false);
          invalidatePluggy(queryClient);
          toast.success("Sincronizando contas...");
        }
      }, 500);
    } catch {
      toast.error("Erro ao iniciar conexão.");
      setConnecting(false);
    }
  }, [fetchApi, queryClient]);

  // ── Link existing Item ────────────────────────────────────────────

  const handleLink = useCallback(async () => {
    const pluggyItemId = prompt("Cole o Item ID da Pluggy (visível no dashboard):");
    if (!pluggyItemId?.trim()) return;
    setLinking(true);
    try {
      const result = await fetchApi<{ message: string }>(
        "/pluggy/items/link",
        { method: "POST", body: JSON.stringify({ pluggyItemId: pluggyItemId.trim() }) },
      );
      toast.success(result.message);
      invalidatePluggy(queryClient);
    } catch {
      toast.error("Erro ao vincular Item. Verifique o ID.");
    } finally {
      setLinking(false);
    }
  }, [fetchApi, queryClient]);

  // ── Sync ──────────────────────────────────────────────────────────

  const handleSync = useCallback(
    async (pluggyItemId: string) => {
      setSyncingId(pluggyItemId);
      const toastId = toast.loading("Sincronizando contas… isso pode levar alguns minutos.");
      try {
        const result = await fetchApi<{ accounts: number; transactions: number }>(
          `/pluggy/items/${pluggyItemId}/sync`,
          { method: "POST" },
        );
        toast.success(
          `Pronto! ${result.accounts} conta${result.accounts !== 1 ? "s" : ""}, ${result.transactions} transação${result.transactions !== 1 ? "ões" : ""}.`,
          { id: toastId },
        );
        invalidatePluggy(queryClient);
      } catch {
        toast.error("Erro ao sincronizar.", { id: toastId });
      } finally {
        setSyncingId(null);
      }
    },
    [fetchApi, queryClient],
  );

  // ── Delete ────────────────────────────────────────────────────────

  const handleDelete = useCallback(
    async (pluggyItemId: string) => {
      if (!confirm("Remover esta conexão? As transações importadas serão mantidas.")) return;
      setDeletingId(pluggyItemId);
      try {
        await fetchApi(`/pluggy/items/${pluggyItemId}`, { method: "DELETE" });
        toast.success("Conexão removida.");
        invalidatePluggy(queryClient);
      } catch {
        toast.error("Erro ao remover conexão.");
      } finally {
        setDeletingId(null);
      }
    },
    [fetchApi, queryClient],
  );

  // ── Link card ─────────────────────────────────────────────────────

  const handleLinkCard = useCallback(
    async (pluggyAccountId: string, cardId: string | null) => {
      try {
        await fetchApi(`/pluggy/accounts/${pluggyAccountId}/link-card`, {
          method: "PATCH",
          body: JSON.stringify({ cardId }),
        });
        toast.success(cardId ? "Cartão vinculado." : "Cartão desvinculado.");
        invalidatePluggy(queryClient);
      } catch {
        toast.error("Erro ao vincular cartão.");
      }
    },
    [fetchApi, queryClient],
  );

  // ── Render ────────────────────────────────────────────────────────

  return (
    <>
      <ContentHeader
        title="Contas Bancárias"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleLink} disabled={linking}>
              {linking ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : (
                <Link2 size={16} className="mr-2" />
              )}
              Vincular Item
            </Button>
            <Button onClick={handleConnect} disabled={connecting}>
              {connecting ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : (
                <Plus size={16} className="mr-2" />
              )}
              Conectar banco
            </Button>
          </div>
        }
      />

      <div className="px-5 pb-8 pt-2 md:px-8 space-y-6">
        {/* Empty state */}
        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Landmark size={28} className="text-fg-muted" />
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-fg mb-1">
              Nenhuma conta conectada
            </h2>
            <p className="text-sm text-fg-muted max-w-sm mb-6">
              Conecte suas contas bancárias via Open Finance para importar
              transações automaticamente.
            </p>
            <Button onClick={handleConnect} disabled={connecting}>
              <Plus size={16} className="mr-2" />
              Conectar banco
            </Button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-fg-muted" />
          </div>
        )}

        {/* ── Summary cards ────────────────────────────────────────── */}
        {allAccounts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Saldo em conta */}
            <div className="bg-surface border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Wallet size={16} className="text-emerald-500" />
                </div>
                <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">
                  Saldo em conta
                </span>
              </div>
              <p className={cn(
                "text-2xl font-bold tabular-nums",
                totalChecking >= 0 ? "text-fg" : "text-danger",
              )}>
                {fmt(totalChecking)}
              </p>
              <p className="text-xs text-fg-muted mt-1">
                {checking.length} conta{checking.length !== 1 && "s"} (corrente + poupança)
              </p>
            </div>

            {/* Fatura do cartão */}
            {credit.length > 0 && (
              <div className="bg-surface border border-border rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <CreditCard size={16} className="text-amber-500" />
                  </div>
                  <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">
                    Limite usado
                  </span>
                </div>
                <p className="text-2xl font-bold tabular-nums text-amber-500">
                  {fmt(totalCredit)}
                </p>
                <p className="text-xs text-fg-muted mt-1">
                  {credit.length} cartão{credit.length !== 1 ? "ões" : ""}
                </p>
              </div>
            )}

            {/* Patrimônio líquido */}
            <div className="bg-surface border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  totalChecking - totalCredit >= 0
                    ? "bg-emerald-500/10"
                    : "bg-danger/10",
                )}>
                  {totalChecking - totalCredit >= 0 ? (
                    <TrendingUp size={16} className="text-emerald-500" />
                  ) : (
                    <TrendingDown size={16} className="text-danger" />
                  )}
                </div>
                <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">
                  Saldo líquido
                </span>
              </div>
              <p className={cn(
                "text-2xl font-bold tabular-nums",
                totalChecking - totalCredit >= 0 ? "text-emerald-500" : "text-danger",
              )}>
                {fmt(totalChecking - totalCredit)}
              </p>
              <p className="text-xs text-fg-muted mt-1">
                Saldo − limite usado
              </p>
            </div>
          </div>
        )}

        {/* ── Accounts by type ─────────────────────────────────────── */}
        {allAccounts.length > 0 && (
          <div className="space-y-4">
            {/* Group: Contas */}
            {checking.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-fg-muted uppercase tracking-wide mb-2 px-1">
                  Contas
                </h3>
                <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden">
                  {checking.map((acc) => (
                    <AccountRow key={acc.id} account={acc} />
                  ))}
                </div>
              </div>
            )}

            {/* Group: Cartões de crédito */}
            {credit.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-fg-muted uppercase tracking-wide mb-2 px-1">
                  Cartões de crédito
                </h3>
                <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden">
                  {credit.map((acc) => (
                    <AccountRow
                      key={acc.id}
                      account={acc}
                      bills={billsByAccount[acc.pluggyAccountId]}
                      fetchApi={fetchApi}
                      cards={cards}
                      onLinkCard={handleLinkCard}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Connections ──────────────────────────────────────────── */}
        {items.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-fg-muted uppercase tracking-wide mb-2 px-1">
              Conexões
            </h3>
            <div className="space-y-3">
              {items.map((item) => {
                const status = STATUS_CONFIG[item.status];
                const StatusIcon = status.icon;
                const isSyncing = syncingId === item.pluggyItemId || item.status === "UPDATING";
                const isDeleting = deletingId === item.pluggyItemId;

                return (
                  <div
                    key={item.id}
                    className="bg-surface border border-border rounded-2xl px-5 py-3 flex flex-col overflow-hidden"
                  >
                    {isSyncing && (
                      <div className="-mx-5 -mt-3 mb-3 h-1 bg-muted overflow-hidden">
                        <div className="h-full w-1/3 bg-lima rounded-full animate-[indeterminate_1.5s_ease-in-out_infinite]" />
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {item.connectorLogo ? (
                        <img
                          src={item.connectorLogo}
                          alt={item.connectorName}
                          className="w-9 h-9 rounded-xl object-contain bg-muted p-1"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                          <Landmark size={18} className="text-fg-muted" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-fg">
                          {item.connectorName}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <StatusIcon
                            size={12}
                            className={cn(status.color, isSyncing && "animate-spin")}
                          />
                          <span className={cn("text-xs", status.color)}>
                            {status.label}
                          </span>
                          {item.lastSyncAt && (
                            <span className="text-xs text-fg-muted ml-1">
                              · {fmtDate(item.lastSyncAt)}
                            </span>
                          )}
                          <span className="text-xs text-fg-muted ml-1">
                            · {item.accounts.length} conta{item.accounts.length !== 1 && "s"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSync(item.pluggyItemId)}
                        disabled={isSyncing}
                        title="Sincronizar"
                      >
                        <RefreshCw size={16} className={cn(isSyncing && "animate-spin")} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.pluggyItemId)}
                        disabled={isDeleting}
                        title="Remover"
                      >
                        {isDeleting ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} className="text-danger" />
                        )}
                      </Button>
                    </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Account Row ─────────────────────────────────────────────────────────

function AccountRow({
  account: acc,
  bills,
  fetchApi,
  cards,
  onLinkCard,
}: {
  account: BankAccount;
  bills?: CreditCardBill[];
  fetchApi?: <T>(path: string, opts?: RequestInit) => Promise<T>;
  cards?: Card[];
  onLinkCard?: (pluggyAccountId: string, cardId: string | null) => Promise<void>;
}) {
  const Icon = accountIcon(acc.type, acc.subtype);
  const label = accountLabel(acc.subtype, acc.type);
  const isCredit = acc.type === "CREDIT";
  const usedPercent =
    isCredit && acc.creditLimit
      ? Math.min(100, (acc.balance / acc.creditLimit) * 100)
      : null;

  const currentBill = findCurrentBill(bills);
  const billPaid = currentBill?.payments.reduce((s, p) => s + p.amount, 0) ?? 0;
  const billRemaining = currentBill ? Math.max(0, currentBill.totalAmount - billPaid) : null;

  // Expandir transações
  const [expanded, setExpanded] = useState(false);
  const [transactions, setTransactions] = useState<PluggyTransaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  // Fatura aberta = soma das transações do ciclo (já filtradas pelo backend)
  const openInvoiceFromTx = useMemo(() => {
    if (transactions.length === 0) return null;
    return transactions.reduce((s, tx) => s + Number(tx.amount), 0);
  }, [transactions]);

  // Valor exibido: bill pendente se > 0, senão soma das transações do ciclo
  const displayInvoice = (billRemaining && billRemaining > 0)
    ? billRemaining
    : openInvoiceFromTx;

  // Auto-load transações do ciclo atual para contas de crédito
  // Usa a data de fechamento (balanceCloseDate ou billClosingDate) como início
  const cycleStartDate = currentBill?.billClosingDate ?? acc.balanceCloseDate;

  useEffect(() => {
    if (!isCredit || !fetchApi || !acc.linkedCardId || transactions.length > 0) return;
    let active = true;
    setLoadingTx(true);
    // Buscar transações do ciclo atual: desde o fechamento até hoje
    const qs = new URLSearchParams();
    if (cycleStartDate) qs.set("startDate", cycleStartDate);
    qs.set("endDate", new Date().toISOString());
    const params = qs.toString() ? `?${qs.toString()}` : "";
    fetchApi<PluggyTransaction[]>(`/pluggy/accounts/${acc.pluggyAccountId}/transactions${params}`)
      .then((txs) => { if (active) setTransactions(txs); })
      .catch(() => {})
      .finally(() => { if (active) setLoadingTx(false); });
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCredit, fetchApi, acc.linkedCardId, acc.pluggyAccountId, cycleStartDate]);

  const toggleExpand = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  return (
    <div className="px-5 py-4">
      {/* Main row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center",
            isCredit ? "bg-amber-500/10" : "bg-emerald-500/10",
          )}>
            <Icon size={16} className={isCredit ? "text-amber-500" : "text-emerald-500"} />
          </div>
          <div>
            <p className="text-sm font-medium text-fg">{acc.name}</p>
            <p className="text-xs text-fg-muted">
              {label}
              {acc.number && ` · ···${acc.number}`}
              {acc.linkedCard && ` · ${acc.linkedCard.name}`}
            </p>
          </div>
        </div>
        <div className="text-right">
          {isCredit ? (
            <>
              <p className="text-sm font-semibold tabular-nums text-amber-500">
                {displayInvoice != null ? fmt(displayInvoice) : fmt(acc.balance)}
              </p>
              <p className="text-xs text-fg-muted">
                {displayInvoice != null && billRemaining != null && billRemaining > 0
                  ? `fatura ${fmt(currentBill!.totalAmount)} · pago ${fmt(billPaid)}`
                  : displayInvoice != null
                    ? "fatura aberta · ciclo atual"
                    : `limite usado · de ${fmt(acc.creditLimit ?? 0)}`}
              </p>
            </>
          ) : (
            <p className={cn(
              "text-sm font-semibold tabular-nums",
              acc.balance >= 0 ? "text-fg" : "text-danger",
            )}>
              {fmt(acc.balance, acc.currencyCode)}
            </p>
          )}
        </div>
      </div>

      {/* Credit card details */}
      {isCredit && (
        <div className="mt-3 space-y-2">
          {/* Usage bar */}
          {usedPercent != null && (
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  usedPercent > 80 ? "bg-danger" : usedPercent > 50 ? "bg-amber-500" : "bg-emerald-500",
                )}
                style={{ width: `${usedPercent}%` }}
              />
            </div>
          )}

          {/* Info chips */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-muted">
            {acc.availableCreditLimit != null && (
              <span>Disponível: <span className="text-fg font-medium">{fmt(acc.availableCreditLimit)}</span></span>
            )}
            {(currentBill?.minimumPaymentAmount ?? (acc.minimumPayment != null && acc.minimumPayment > 0 ? acc.minimumPayment : null)) != null && (
              <span>Mínimo: <span className="text-fg font-medium">{fmt(currentBill?.minimumPaymentAmount ?? acc.minimumPayment!)}</span></span>
            )}
            {(currentBill?.dueDate ?? acc.balanceDueDate) && (
              <span>Vencimento: <span className="text-fg font-medium">
                {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(currentBill?.dueDate ?? acc.balanceDueDate!))}
              </span></span>
            )}
            {(currentBill?.billClosingDate ?? acc.balanceCloseDate) && (
              <span>Fechamento: <span className="text-fg font-medium">
                {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(currentBill?.billClosingDate ?? acc.balanceCloseDate!))}
              </span></span>
            )}
            {acc.creditLimit != null && (
              <span>Limite: <span className="text-fg font-medium">{fmt(acc.creditLimit)}</span></span>
            )}
            {usedPercent != null && <span>{usedPercent.toFixed(0)}% usado</span>}
          </div>

          {/* Link manual a cartão */}
          {onLinkCard && cards && (
            <div className="flex items-center gap-2">
              <CreditCard size={14} className="text-fg-muted shrink-0" />
              <select
                value={acc.linkedCardId ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  onLinkCard(acc.pluggyAccountId, val || null);
                }}
                className="text-xs bg-transparent border border-border rounded-lg px-2 py-1.5 text-fg cursor-pointer focus:outline-none focus:ring-1 focus:ring-lima"
              >
                <option value="">Sem cartão vinculado</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.lastFour ? ` (···${c.lastFour})` : ""}{c.brand ? ` · ${c.brand}` : ""}
                  </option>
                ))}
              </select>
              {acc.linkedCardId && (
                <button
                  onClick={() => onLinkCard(acc.pluggyAccountId, null)}
                  className="text-fg-muted hover:text-danger transition-colors cursor-pointer"
                  title="Desvincular cartão"
                >
                  <Link2Off size={14} />
                </button>
              )}
            </div>
          )}

          {/* Ver transações */}
          {acc.linkedCardId && (
            <button
              onClick={toggleExpand}
              className="inline-flex items-center gap-1 text-xs font-medium text-lima hover:underline mt-1 cursor-pointer"
            >
              {expanded ? "Ocultar transações" : "Ver transações da fatura"}
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}

          {/* Transações expandidas */}
          {expanded && (
            <div className="mt-2 max-h-80 overflow-y-auto space-y-0.5">
              {loadingTx && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 size={16} className="animate-spin text-fg-muted" />
                </div>
              )}
              {!loadingTx && transactions.length === 0 && (
                <p className="text-xs text-fg-muted py-2">Nenhuma transação importada.</p>
              )}
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 px-1">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] shrink-0"
                      style={{ backgroundColor: tx.category.colorBg, color: tx.category.colorText }}
                    >
                      {tx.category.icon ?? tx.category.name.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-fg truncate">
                        {tx.description ?? "Sem descrição"}
                      </p>
                      <p className="text-[11px] text-fg-muted">
                        {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(tx.date))}
                        {" · "}{tx.category.name}
                      </p>
                    </div>
                  </div>
                  <p className={cn(
                    "text-xs font-semibold tabular-nums shrink-0 ml-2",
                    tx.type === "INCOME" ? "text-emerald-500" : "text-fg",
                  )}>
                    {tx.type === "EXPENSE" ? "- " : "+ "}{fmt(Number(tx.amount))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
