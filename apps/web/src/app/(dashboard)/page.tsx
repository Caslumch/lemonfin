"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  TrendingDown,
  Wallet,
  PiggyBank,
  AlertTriangle,
  Target,
  Menu,
  Plus,
  CreditCard as CreditCardIcon,
} from "lucide-react";
import { useAtom } from "jotai";
import { CategoryIcon, CategoryIconWithBg } from "@/components/ui/category-icon";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { RefreshButton } from "@/components/ui/refresh-button";
import { ErrorState } from "@/components/ui/error-state";
import { MonthlyChart } from "@/components/dashboard/monthly-chart";
import { ForecastCard } from "@/components/dashboard/forecast-card";
import { BudgetCard } from "@/components/dashboard/budget-card";
import { BudgetModal } from "@/components/dashboard/budget-modal";
import { CardStack } from "@/components/dashboard/card-stack";
import { useApi } from "@/hooks/use-api";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { queryKeys } from "@/lib/query-keys";
import { logApiError } from "@/lib/log-error";
import { sidebarMobileOpenAtom } from "@/store/sidebar";
import type { MonthlyBreakdown } from "@/types/transaction";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(date: string) {
  // Datas de transação são gravadas ancoradas ao meio-dia UTC; formata em UTC
  // para não deslocar o dia no fuso do navegador (ver transaction-list.tsx).
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(date));
}

function WelcomeToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const welcomeShown = useRef(false);

  useEffect(() => {
    if (searchParams.get("welcome") === "1" && !welcomeShown.current) {
      welcomeShown.current = true;
      const firstName = session?.user?.name?.split(" ")[0] ?? "";
      toast(`Bem-vindo(a)${firstName ? `, ${firstName}` : ""}!`, {
        description: "Sua conta está pronta. Bora organizar suas finanças!",
      });
      router.replace("/");
    }
  }, [searchParams, session, router]);

  return null;
}

export default function DashboardPage() {
  const { fetchApi } = useApi();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [, setMobileOpen] = useAtom(sidebarMobileOpenAtom);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);

  const { data, isPending: loading, isFetching, error, refetch } =
    useDashboardData();

  useEffect(() => {
    if (error) logApiError("load:dashboard", error);
  }, [error]);

  const summary = data?.summary ?? null;
  const monthly = data?.monthly ?? [];
  const recent = data?.recent ?? [];
  const alerts = data?.insights?.alerts ?? [];
  const goals = data?.goals ?? [];
  const forecast = data?.forecast ?? null;
  const budget = data?.budget ?? null;
  const cards = data?.cards ?? [];

  // Calculate month-over-month variation from monthly breakdown
  const currentMonthData = monthly.length > 0 ? monthly[monthly.length - 1] : null;
  const prevMonthData = monthly.length > 1 ? monthly[monthly.length - 2] : null;

  function calcVariation(current: number, previous: number): number | null {
    if (!prevMonthData || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  }

  async function handleSaveBudget(amount: number) {
    const month =
      budget?.month ??
      `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    try {
      await fetchApi("/budgets", {
        method: "PUT",
        body: JSON.stringify({ month, amount }),
      });
      toast.success("Orçamento atualizado");
      // Revalida o painel: o React Query refaz a busca e atualiza todos os
      // cards que dependem do orçamento.
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    } catch (error) {
      logApiError("save:budget", error);
      toast.error("Erro ao salvar orçamento");
      throw new Error("save failed");
    }
  }

  const monthLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
  }).format(new Date());

  const userName = session?.user?.name ?? "Você";
  const firstName = session?.user?.name?.trim().split(" ")[0] ?? "";
  // "Economia" = sobra de caixa do mês = o próprio saldo (receita − consumo −
  // pagamento de fatura). Usar `balance` (não income − expense) evita que a
  // Economia apareça MAIOR que o "Saldo do mês" ao lado: após o #111, `expense`
  // é só consumo (sem cartão/fatura), então income − expense inflava a sobra.
  const savings = Math.max(0, summary?.balance ?? 0);

  // Receita variation (income, month over month)
  const incomeVariation = calcVariation(
    currentMonthData?.income ?? 0,
    prevMonthData?.income ?? 0,
  );

  // Erro de carregamento (sem nenhum dado): não pintar os cards como R$ 0,00 —
  // isso é indistinguível de conta nova e faz o usuário achar que perdeu dados.
  if (error && !data) {
    return (
      <div className="px-5 pb-8 pt-6 md:px-8 md:pt-8">
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-fg-secondary hover:text-fg cursor-pointer md:hidden"
            aria-label="Abrir menu"
          >
            <Menu size={24} />
          </button>
          <Avatar name={userName} size="lg" />
        </div>
        <ErrorState onRetry={() => refetch()} retrying={isFetching} />
      </div>
    );
  }

  return (
    <>
      <Suspense>
        <WelcomeToast />
      </Suspense>

      <div className="px-5 pb-8 pt-6 md:px-8 md:pt-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:gap-5">
          {/* ===== Main column ===== */}
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => setMobileOpen(true)}
                  className="mt-1 text-fg-secondary hover:text-fg cursor-pointer md:hidden"
                  aria-label="Abrir menu"
                >
                  <Menu size={24} />
                </button>
                <div>
                  <h1 className="font-[family-name:var(--font-display)] text-[28px] md:text-[38px] leading-none font-bold tracking-tight text-fg">
                    Bem-vindo de volta{firstName ? `, ${firstName}` : ""}!
                  </h1>
                  <p className="mt-1.5 text-sm text-fg-secondary">Painel</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <RefreshButton
                  onRefresh={() => refetch()}
                  refreshing={isFetching}
                />
                <Avatar name={userName} size="lg" />
              </div>
            </div>

            {/* Stat row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Saldo total — dark */}
              <div className="rounded-[20px] bg-surface-accent text-on-dark p-5 shadow-md animate-fade-in-up">
                {loading ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-8 w-8 rounded-[12px] bg-white/15" />
                    <div className="h-3 w-20 rounded-full bg-white/15" />
                    <div className="h-6 w-28 rounded-full bg-white/15" />
                  </div>
                ) : (
                  <>
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-[12px] bg-white/10">
                      <Wallet size={16} className="text-on-dark" />
                    </div>
                    <p className="text-xs text-on-dark-muted">Saldo do mês</p>
                    <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold tracking-tight">
                      {formatCurrency(summary?.balance ?? 0)}
                    </p>
                  </>
                )}
              </div>

              {/* Gastos do mês = tudo que gastei no mês civil: consumo
                  (pix/débito) + o que passei no cartão. NÃO inclui pagamento de
                  fatura (isso é quitar compra antiga, não gasto novo). Mesma
                  definição do gráfico, do orçamento e dos insights. */}
              <StatChip
                loading={loading}
                label="Gastos do mês"
                value={formatCurrency(
                  (summary?.expense ?? 0) + (summary?.cardExpense ?? 0),
                )}
                icon={TrendingDown}
                iconBg="bg-uva-muted"
                iconColor="text-uva"
              />

              {/* Economia */}
              <StatChip
                loading={loading}
                label="Economia"
                value={formatCurrency(savings)}
                icon={PiggyBank}
                iconBg="bg-lima-muted"
                iconColor="text-lima"
              />
            </div>

            {/* Receita + Transações */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Receita */}
              <div className="rounded-[20px] border border-border bg-surface p-5 shadow-xs animate-fade-in-up">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-fg">
                    Receita
                  </h3>
                  <span className="text-xs text-fg-muted">6 meses</span>
                </div>
                {loading ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-7 w-32 rounded-full bg-muted" />
                    <div className="h-20 rounded bg-muted" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2.5">
                      <span className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-fg">
                        {formatCurrency(summary?.income ?? 0)}
                      </span>
                      {incomeVariation !== null && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-0.5 text-xs font-bold",
                            // 0% é estável (neutro) — não "cresceu". Só verde/seta
                            // acima quando de fato subiu.
                            incomeVariation > 0
                              ? "text-success"
                              : incomeVariation < 0
                                ? "text-danger"
                                : "text-fg-muted",
                          )}
                        >
                          {incomeVariation > 0 ? (
                            <ArrowUpRight size={13} />
                          ) : incomeVariation < 0 ? (
                            <ArrowDownRight size={13} />
                          ) : (
                            <Minus size={13} />
                          )}
                          {incomeVariation > 0 ? "+" : ""}
                          {incomeVariation.toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <div className="mt-3">
                      <ReceitaSparkline data={monthly} />
                    </div>
                  </>
                )}
              </div>

              {/* Transações */}
              <div className="rounded-[20px] border border-border bg-surface p-5 shadow-xs animate-fade-in-up">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-fg">
                    Transações
                  </h3>
                  <Link
                    href="/transacoes"
                    className="flex items-center gap-1 text-xs text-fg-muted transition-colors hover:text-fg"
                  >
                    Ver todas <ArrowRight size={12} />
                  </Link>
                </div>
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex animate-pulse items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-muted" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 w-24 rounded bg-muted" />
                          <div className="h-2.5 w-16 rounded bg-muted" />
                        </div>
                        <div className="h-3 w-14 rounded bg-muted" />
                      </div>
                    ))}
                  </div>
                ) : recent.length === 0 ? (
                  <p className="py-6 text-center text-sm text-fg-muted">
                    Nenhuma transação ainda.
                  </p>
                ) : (
                  <div className="flex flex-col">
                    {recent.slice(0, 4).map((tx) => {
                      // Compra parcelada agrupada (mesma regra da lista de
                      // Transações): 1 linha com valor TOTAL, "Nx" e descrição
                      // sem o sufixo "(n/N)" — em vez de uma parcela solta.
                      const grouped =
                        (tx.installmentTotal ?? 0) >= 2 &&
                        tx.installmentSum != null;
                      const amount = grouped
                        ? tx.installmentSum!
                        : Number(tx.amount);
                      const desc = (tx.description || tx.category.name).replace(
                        /\s*\(\d+\/\d+\)\s*$/,
                        "",
                      );
                      return (
                        <div
                          key={tx.id}
                          className="flex items-center gap-3 py-2"
                        >
                          <CategoryIconWithBg
                            slug={tx.category.slug}
                            icon={tx.category.icon}
                            colorBg={tx.category.colorBg}
                            colorText={tx.category.colorText}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-fg">
                              {desc}
                              {grouped && ` ${tx.installmentTotal}x`}
                            </p>
                            <p className="text-xs text-fg-muted">
                              {formatDate(tx.date)} · {tx.category.name}
                            </p>
                          </div>
                          <p
                            className={cn(
                              "shrink-0 font-[family-name:var(--font-mono)] text-sm font-semibold",
                              tx.type === "INCOME"
                                ? "text-success"
                                : "text-danger",
                            )}
                          >
                            {tx.type === "INCOME" ? "+ " : "− "}
                            {formatCurrency(amount)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Despesas — full width bar chart */}
            <MonthlyChart data={monthly} loading={loading} />

            {/* Spending alerts */}
            {!loading && alerts.length > 0 && (
              <div className="rounded-[20px] border border-warning/30 bg-warning-muted p-5 animate-fade-in-up">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-warning" />
                    <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-fg">
                      Alertas de gastos
                    </h3>
                  </div>
                  <Link
                    href="/insights"
                    className="text-xs text-fg-muted hover:text-fg flex items-center gap-1 transition-colors"
                  >
                    Ver detalhes <ArrowRight size={12} />
                  </Link>
                </div>
                <div className="space-y-2">
                  {alerts.slice(0, 3).map((alert) => (
                    <div
                      key={alert.categoryId}
                      className="flex items-center gap-2 text-sm"
                    >
                      <CategoryIcon slug={alert.category?.slug} icon={alert.category?.icon} size={14} />
                      <span className="text-fg flex-1 truncate">
                        {alert.category?.name ?? "Outros"}
                      </span>
                      <span
                        className={cn(
                          "font-[family-name:var(--font-mono)] text-xs font-bold",
                          alert.percentOfPrevious >= 100
                            ? "text-danger"
                            : "text-warning",
                        )}
                      >
                        {Math.round(alert.percentOfPrevious)}% do mês anterior
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Goals progress */}
            {!loading && goals.length > 0 && (
              <div className="rounded-[20px] border border-border bg-surface p-5 shadow-xs animate-fade-in-up">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Target size={16} className="text-lima" />
                    <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-fg">
                      Metas do mês
                    </h3>
                  </div>
                  <Link
                    href="/metas"
                    className="text-xs text-fg-muted hover:text-fg flex items-center gap-1 transition-colors"
                  >
                    Ver todas <ArrowRight size={12} />
                  </Link>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {goals.slice(0, 6).map((goal) => {
                    const pct = goal.progress.percentage;
                    const barColor = goal.progress.exceeded
                      ? "bg-danger"
                      : pct >= 80
                        ? "bg-warning"
                        : "bg-lima";
                    return (
                      <div key={goal.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-fg truncate">
                            <CategoryIcon slug={goal.category?.slug} icon={goal.category?.icon} size={12} className="inline mr-1" />
                            {goal.category?.name}
                          </span>
                          <span
                            className={cn(
                              "font-medium",
                              goal.progress.exceeded
                                ? "text-danger"
                                : pct >= 80
                                  ? "text-warning"
                                  : "text-fg-muted",
                            )}
                          >
                            {pct}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-subtle rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-fg-muted">
                          {formatCurrency(goal.progress.spent)} / {formatCurrency(goal.progress.limit)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sem metas: convite compacto em vez de sumir o bloco — senão o
                recurso fica invisível para quem nunca criou uma meta. */}
            {!loading && goals.length === 0 && (
              <Link
                href="/metas"
                className="group flex items-center gap-3 rounded-[20px] border border-dashed border-border bg-surface p-4 shadow-xs transition-colors hover:border-lima animate-fade-in-up"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-lima-muted">
                  <Target size={16} className="text-lima" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-fg">
                    Defina metas de gasto
                  </p>
                  <p className="text-xs text-fg-muted">
                    Um teto por categoria pra não estourar o orçamento.
                  </p>
                </div>
                <ArrowRight
                  size={16}
                  className="shrink-0 text-fg-muted transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            )}
          </div>

          {/* ===== Right column ===== */}
          <div className="flex flex-col gap-5 lg:w-[340px] lg:shrink-0">
            {/* Meus Cartões */}
            <div className="flex flex-col gap-4 rounded-[24px] bg-surface-accent p-5 text-on-dark shadow-md animate-fade-in-up">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-[family-name:var(--font-display)] text-lg font-bold text-on-dark">
                    Meus Cartões
                  </div>
                  <div className="mt-0.5 text-xs text-on-dark-muted">
                    {loading
                      ? "Carregando..."
                      : `${cards.length} ${cards.length === 1 ? "cartão" : "cartões"}`}
                  </div>
                </div>
                <Link
                  href="/cartoes"
                  aria-label="Adicionar cartão"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-uva text-white transition-colors hover:bg-uva-hover"
                >
                  <Plus size={16} />
                </Link>
              </div>

              {loading ? (
                <div className="h-44 animate-pulse rounded-[18px] bg-white/10" />
              ) : cards.length > 0 ? (
                <CardStack cards={cards} />
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 rounded-[18px] border border-dashed border-white/15 px-4 py-8 text-center">
                  <CreditCardIcon size={28} className="text-on-dark-muted" />
                  <p className="text-sm text-on-dark-muted">Nenhum cartão</p>
                  <Link
                    href="/cartoes"
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-surface-accent transition-colors hover:bg-white/90"
                  >
                    <Plus size={14} /> Adicionar cartão
                  </Link>
                </div>
              )}

              {cards.length > 1 && (
                <Link
                  href="/cartoes"
                  className="text-center text-xs text-on-dark-muted transition-colors hover:text-on-dark"
                >
                  Ver todos os cartões
                </Link>
              )}
            </div>

            {/* Forecast card */}
            <ForecastCard forecast={forecast} loading={loading} />

            {/* Budget card */}
            <BudgetCard
              budget={budget}
              loading={loading}
              onEdit={() => setBudgetModalOpen(true)}
            />
          </div>
        </div>
      </div>

      <BudgetModal
        open={budgetModalOpen}
        onClose={() => setBudgetModalOpen(false)}
        onSubmit={handleSaveBudget}
        currentAmount={budget?.amount ?? null}
        monthLabel={monthLabel}
      />
    </>
  );
}

/* ---------- local presentational helpers ---------- */

function StatChip({
  loading,
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  loading: boolean;
  label: string;
  value: string;
  icon: typeof Wallet;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="rounded-[20px] border border-border bg-surface p-5 shadow-xs animate-fade-in-up">
      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-9 w-9 rounded-[12px] bg-muted" />
          <div className="h-3 w-20 rounded-full bg-muted" />
          <div className="h-6 w-28 rounded-full bg-muted" />
        </div>
      ) : (
        <>
          <div
            className={cn(
              "mb-3 flex h-9 w-9 items-center justify-center rounded-[12px]",
              iconBg,
            )}
          >
            <Icon size={16} className={iconColor} />
          </div>
          <p className="text-xs text-fg-muted">{label}</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-fg">
            {value}
          </p>
        </>
      )}
    </div>
  );
}

function ReceitaSparkline({ data }: { data: MonthlyBreakdown[] }) {
  const w = 380;
  const h = 96;

  if (data.length < 2) {
    return <div className="h-24" />;
  }

  const values = data.map((d) => d.income);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const stepX = w / (values.length - 1);

  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = h - 8 - ((v - min) / range) * (h - 20);
    return { x, y };
  });

  const linePath = points
    .map((p, i) => (i === 0 ? `M${p.x} ${p.y}` : `L${p.x} ${p.y}`))
    .join(" ");
  const areaPath = `${linePath} L${w} ${h} L0 ${h} Z`;
  const last = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      preserveAspectRatio="none"
      className="overflow-visible"
    >
      <defs>
        <linearGradient id="receitaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6C5CE7" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#6C5CE7" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#receitaFill)" />
      <path
        d={linePath}
        fill="none"
        stroke="#6C5CE7"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last.x} cy={last.y} r="5" fill="#fff" stroke="#6C5CE7" strokeWidth="2.5" />
    </svg>
  );
}
