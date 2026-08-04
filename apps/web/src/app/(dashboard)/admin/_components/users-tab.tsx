"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Search, Crown, Clock, Ban, AudioLines } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
  lastSeenAt: string | null;
  createdAt: string;
  ttsEnabled: boolean;
  ttsVoice: string;
  ttsRate: string;
  ttsPitch: string;
  ttsVolume: string;
}

// Configuração de voz enviada ao /admin/users/:id/tts (patch parcial).
interface TtsSettings {
  enabled?: boolean;
  voice?: string;
  rate?: string;
  pitch?: string;
  volume?: string;
}

// Opções das 3 vozes pt-BR e das escalas de prosódia (espelham o DTO do backend).
const VOICE_OPTIONS: { value: string; label: string }[] = [
  { value: "pt-BR-FranciscaNeural", label: "Francisca (feminina)" },
  { value: "pt-BR-AntonioNeural", label: "Antônio (masculina)" },
  { value: "pt-BR-ThalitaMultilingualNeural", label: "Thalita (feminina)" },
];
const RATE_OPTIONS = ["default", "x-slow", "slow", "medium", "fast", "x-fast"];
const PITCH_OPTIONS = ["default", "x-low", "low", "medium", "high", "x-high"];
const VOLUME_OPTIONS = [
  "default",
  "x-soft",
  "soft",
  "medium",
  "loud",
  "x-loud",
];

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

// "Último acesso" amigável: hoje / ontem / há N dias / data.
function lastSeen(iso: string | null): string {
  if (!iso) return "nunca";
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86400_000);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function UsersTab() {
  const { fetchApi, token } = useApi();
  const [data, setData] = useState<UsersResponse | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  // Card com o painel de voz (TTS) aberto.
  const [ttsOpenId, setTtsOpenId] = useState<string | null>(null);

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

  // Salva a configuração de voz (patch parcial) e recarrega para refletir.
  async function saveTts(user: AdminUser, patch: TtsSettings) {
    setActingId(user.id);
    try {
      await fetchApi(`/admin/users/${user.id}/tts`, {
        method: "POST",
        body: JSON.stringify(patch),
      });
      toast.success("Voz atualizada");
      await load(search, page);
    } catch (e) {
      logApiError("admin:action:tts", e);
      toast.error("Não foi possível salvar a voz");
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
                      Cadastro: {date(u.createdAt)} · Último acesso:{" "}
                      {lastSeen(u.lastSeenAt)} · Trial: {date(u.trialEndsAt)}
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
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actingId === u.id}
                    onClick={() =>
                      setTtsOpenId((cur) => (cur === u.id ? null : u.id))
                    }
                  >
                    <AudioLines size={13} className="mr-1.5" />
                    Voz
                    {u.ttsEnabled && (
                      <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-lima" />
                    )}
                  </Button>
                  {actingId === u.id && (
                    <Loader2 size={16} className="animate-spin text-fg-muted self-center" />
                  )}
                </div>

                {ttsOpenId === u.id && (
                  <TtsPanel
                    user={u}
                    busy={actingId === u.id}
                    onSave={(patch) => saveTts(u, patch)}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 text-sm">
            <span className="text-fg-muted">
              {data.total} usuário(s) · página {data.page}/{totalPages}
            </span>
            {/* paginação abaixo */}
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

// Painel de configuração de voz (TTS) de uma conta. Estado local inicia dos
// valores do usuário; "Salvar" envia só o patch. O toggle de habilitar salva na
// hora (é a ação mais comum); voz/velocidade/tom/volume vão juntos no Salvar.
function TtsPanel({
  user,
  busy,
  onSave,
}: {
  user: AdminUser;
  busy: boolean;
  onSave: (patch: TtsSettings) => void;
}) {
  const [voice, setVoice] = useState(user.ttsVoice);
  const [rate, setRate] = useState(user.ttsRate);
  const [pitch, setPitch] = useState(user.ttsPitch);
  const [volume, setVolume] = useState(user.ttsVolume);

  const dirty =
    voice !== user.ttsVoice ||
    rate !== user.ttsRate ||
    pitch !== user.ttsPitch ||
    volume !== user.ttsVolume;

  const opts = (values: string[]) =>
    values.map((v) => ({ value: v, label: v === "default" ? "padrão" : v }));

  return (
    <div className="mt-3 space-y-3 rounded-[12px] border border-border bg-muted/30 p-3">
      <label className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-fg">
          Resposta em áudio (assessor)
        </span>
        <input
          type="checkbox"
          checked={user.ttsEnabled}
          disabled={busy}
          onChange={(e) => onSave({ enabled: e.target.checked })}
          className="h-4 w-4 accent-lima"
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] text-fg-muted">
          Voz
          <Select
            value={voice}
            onChange={setVoice}
            disabled={busy}
            size="sm"
            options={VOICE_OPTIONS}
          />
        </label>
        <label className="text-[11px] text-fg-muted">
          Velocidade
          <Select
            value={rate}
            onChange={setRate}
            disabled={busy}
            size="sm"
            options={opts(RATE_OPTIONS)}
          />
        </label>
        <label className="text-[11px] text-fg-muted">
          Tom
          <Select
            value={pitch}
            onChange={setPitch}
            disabled={busy}
            size="sm"
            options={opts(PITCH_OPTIONS)}
          />
        </label>
        <label className="text-[11px] text-fg-muted">
          Volume
          <Select
            value={volume}
            onChange={setVolume}
            disabled={busy}
            size="sm"
            options={opts(VOLUME_OPTIONS)}
          />
        </label>
      </div>

      <div className="flex justify-end">
        <Button
          size="sm"
          disabled={busy || !dirty}
          onClick={() => onSave({ voice, rate, pitch, volume })}
        >
          Salvar voz
        </Button>
      </div>
    </div>
  );
}
