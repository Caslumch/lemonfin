"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Search, Crown, Clock, Ban } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApi } from "@/hooks/use-api";
import { logApiError } from "@/lib/log-error";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  subscriptionStatus: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED";
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  isSuperAdmin: boolean;
  createdAt: string;
}

interface UsersResponse {
  rows: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}

const STATUS_LABEL: Record<AdminUser["subscriptionStatus"], string> = {
  TRIALING: "Trial",
  ACTIVE: "Premium",
  PAST_DUE: "Pgto pendente",
  CANCELED: "Cancelado",
};

const STATUS_TONE: Record<AdminUser["subscriptionStatus"], string> = {
  ACTIVE: "bg-lima/15 text-lima",
  TRIALING: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  PAST_DUE: "bg-danger/15 text-danger",
  CANCELED: "bg-muted text-fg-muted",
};

function date(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function UsersTab() {
  const { fetchApi, token } = useApi();
  const [data, setData] = useState<UsersResponse | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(
    async (q: string, p: number) => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (q) qs.set("search", q);
        qs.set("page", String(p));
        const res = await fetchApi<UsersResponse>(`/admin/users?${qs}`);
        setData(res);
      } catch (e) {
        logApiError("admin:users", e);
      } finally {
        setLoading(false);
      }
    },
    [fetchApi],
  );

  useEffect(() => {
    if (token) load(search, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, page]);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load(search, 1);
  }

  async function act(
    user: AdminUser,
    action: "extend-trial" | "grant-premium" | "revoke-premium",
    body?: Record<string, number>,
  ) {
    setActingId(user.id);
    try {
      await fetchApi(`/admin/users/${user.id}/${action}`, {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
      });
      toast.success("Ação aplicada");
      await load(search, page);
    } catch (e) {
      logApiError(`admin:action:${action}`, e);
      toast.error("Não foi possível aplicar a ação");
    } finally {
      setActingId(null);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-4">
      <form onSubmit={onSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"
          />
          <Input
            id="admin-search"
            placeholder="Buscar por nome ou e-mail"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline" className="shrink-0">
          Buscar
        </Button>
      </form>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-fg-muted" />
        </div>
      ) : !data || data.rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-fg-secondary">
          Nenhum usuário encontrado.
        </p>
      ) : (
        <>
          <div className="space-y-2">
            {data.rows.map((u) => (
              <div
                key={u.id}
                className="rounded-[14px] border border-border bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-fg">
                      {u.name}
                      {u.isSuperAdmin && (
                        <Crown size={13} className="text-lima" aria-label="admin" />
                      )}
                    </p>
                    <p className="truncate text-xs text-fg-muted">{u.email}</p>
                    <p className="mt-1 text-[11px] text-fg-muted">
                      Cadastro: {date(u.createdAt)} · Trial: {date(u.trialEndsAt)}
                      {u.currentPeriodEnd && ` · Renova: ${date(u.currentPeriodEnd)}`}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[u.subscriptionStatus]}`}
                  >
                    {STATUS_LABEL[u.subscriptionStatus]}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actingId === u.id}
                    onClick={() => act(u, "extend-trial", { days: 7 })}
                  >
                    <Clock size={13} className="mr-1.5" />
                    +7d trial
                  </Button>
                  {u.subscriptionStatus === "ACTIVE" ? (
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={actingId === u.id}
                      onClick={() => act(u, "revoke-premium")}
                    >
                      <Ban size={13} className="mr-1.5" />
                      Revogar premium
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={actingId === u.id}
                      onClick={() => act(u, "grant-premium", { days: 30 })}
                    >
                      <Crown size={13} className="mr-1.5" />
                      Conceder 30d
                    </Button>
                  )}
                  {actingId === u.id && (
                    <Loader2 size={16} className="animate-spin text-fg-muted self-center" />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 text-sm">
            <span className="text-fg-muted">
              {data.total} usuário(s) · página {data.page}/{totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
