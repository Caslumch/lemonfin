"use client";

import { useState, useCallback, Suspense } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Link2,
  RefreshCw,
  Trash2,
  Landmark,
  AlertCircle,
  Loader2,
  Unplug,
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
}

// ── Status helpers ──────────────────────────────────────────────────────

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

function formatBalance(value: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(value);
}

function formatDate(iso: string | null) {
  if (!iso) return "Nunca";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
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

  // ── Connect flow (Pluggy Connect Widget via popup) ────────────────

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    try {
      const { accessToken } = await fetchApi<{ accessToken: string }>(
        "/pluggy/connect-token",
        { method: "POST", body: JSON.stringify({}) },
      );

      // Abre o Pluggy Connect Widget como popup. O SDK react-pluggy-connect
      // é uma opção, mas para simplicidade e evitar dependência extra no
      // frontend, usamos o widget via URL direta (CDN embed).
      const widgetUrl = `https://connect.pluggy.ai/?connect_token=${accessToken}`;
      const popup = window.open(widgetUrl, "pluggy-connect", "width=500,height=700");

      // Poll para detectar quando o popup fecha (o widget fecha sozinho
      // após sucesso ou cancelamento).
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

  // ── Link existing Item (from Demo App / MeuPluggy) ─────────────

  const handleLink = useCallback(async () => {
    const pluggyItemId = prompt(
      "Cole o Item ID da Pluggy (visível no dashboard):",
    );
    if (!pluggyItemId?.trim()) return;
    setLinking(true);
    try {
      const result = await fetchApi<{ message: string; accounts: number; transactions: number }>(
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
        toast.success("Sincronização iniciada.");
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

      <div className="px-5 pb-8 pt-2 md:px-8 space-y-5">
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

        {/* Items list */}
        {items.map((item) => {
          const status = STATUS_CONFIG[item.status];
          const StatusIcon = status.icon;
          const isSyncing = syncingId === item.pluggyItemId || item.status === "UPDATING";
          const isDeleting = deletingId === item.pluggyItemId;

          return (
            <div
              key={item.id}
              className="bg-surface border border-border rounded-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  {item.connectorLogo ? (
                    <img
                      src={item.connectorLogo}
                      alt={item.connectorName}
                      className="w-10 h-10 rounded-xl object-contain bg-muted p-1"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                      <Landmark size={20} className="text-fg-muted" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-fg text-sm">
                      {item.connectorName}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <StatusIcon
                        size={12}
                        className={cn(
                          status.color,
                          isSyncing && "animate-spin",
                        )}
                      />
                      <span className={cn("text-xs", status.color)}>
                        {status.label}
                      </span>
                      {item.lastSyncAt && (
                        <span className="text-xs text-fg-muted ml-1">
                          · {formatDate(item.lastSyncAt)}
                        </span>
                      )}
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
                    <RefreshCw
                      size={16}
                      className={cn(isSyncing && "animate-spin")}
                    />
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

              {/* Accounts */}
              {item.accounts.length > 0 && (
                <div className="border-t border-border divide-y divide-border">
                  {item.accounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="flex items-center justify-between px-5 py-3"
                    >
                      <div>
                        <p className="text-sm text-fg font-medium">
                          {acc.name}
                        </p>
                        <p className="text-xs text-fg-muted">
                          {acc.subtype?.replace(/_/g, " ") ?? acc.type}
                          {acc.number && ` · ···${acc.number}`}
                        </p>
                      </div>
                      <p
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          acc.balance >= 0 ? "text-fg" : "text-danger",
                        )}
                      >
                        {formatBalance(acc.balance, acc.currencyCode)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
