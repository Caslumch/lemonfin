"use client";

import { useState, useCallback, useMemo, Suspense } from "react";
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
} from "lucide-react";
import { ContentHeader } from "@/components/layout/content-header";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { queryKeys, invalidatePluggy } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

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

  // Fetch items
  const itemsQuery = useQuery<PluggyItem[]>({
    queryKey: queryKeys.pluggyItems,
    enabled: Boolean(token),
    refetchInterval: 30_000,
    queryFn: () => fetchApi<PluggyItem[]>("/pluggy/items"),
  });

  const items = itemsQuery.data ?? [];
  const loading = itemsQuery.isPending;

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
      try {
        await fetchApi(`/pluggy/items/${pluggyItemId}/sync`, { method: "POST" });
        toast.success("Sincronização concluída.");
        invalidatePluggy(queryClient);
      } catch {
        toast.error("Erro ao sincronizar.");
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
                    Cartão de crédito
                  </span>
                </div>
                <p className="text-2xl font-bold tabular-nums text-fg">
                  {fmt(totalCredit)}
                </p>
                <p className="text-xs text-fg-muted mt-1">
                  {credit.length} cartão{credit.length !== 1 && "ões"} · saldo total
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
                Conta corrente − cartão de crédito
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
                    <AccountRow key={acc.id} account={acc} />
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
                    className="bg-surface border border-border rounded-2xl px-5 py-3 flex items-center justify-between"
                  >
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

function AccountRow({ account: acc }: { account: BankAccount }) {
  const Icon = accountIcon(acc.type, acc.subtype);
  const label = accountLabel(acc.subtype, acc.type);
  const isCredit = acc.type === "CREDIT";

  return (
    <div className="flex items-center justify-between px-5 py-3.5">
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
            {acc.linkedCardId && " · vinculado"}
          </p>
        </div>
      </div>
      <p className={cn(
        "text-sm font-semibold tabular-nums",
        isCredit ? "text-amber-500" : acc.balance >= 0 ? "text-fg" : "text-danger",
      )}>
        {isCredit && "- "}{fmt(Math.abs(acc.balance), acc.currencyCode)}
      </p>
    </div>
  );
}
