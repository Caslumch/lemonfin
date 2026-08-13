"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Loader2, Search, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CategoryIconWithBg } from "@/components/ui/category-icon";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useApi } from "@/hooks/use-api";
import { ErrorState } from "@/components/ui/error-state";
import { RefreshButton } from "@/components/ui/refresh-button";
import { useCategories } from "@/hooks/use-transactions-data";
import { useCardInvoice } from "@/hooks/use-resource-queries";
import {
  invalidateInvoice,
  invalidateTransactionData,
} from "@/lib/query-keys";
import { logApiError } from "@/lib/log-error";

interface InvoiceViewProps {
  cardId: string;
  cardName: string;
  onBack: () => void;
}

// Ordenação agora é resolvida no servidor (a fatura é paginada). Cada opção
// mapeia para os params orderBy/order do endpoint. "installment" ordena pela
// presença de parcela: desc = parceladas primeiro, asc = à vista primeiro.
type SortKey =
  | "date"
  | "amount-desc"
  | "amount-asc"
  | "installment-first"
  | "cash-first";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "date", label: "Mais recentes" },
  { value: "amount-desc", label: "Maior valor" },
  { value: "amount-asc", label: "Menor valor" },
  { value: "installment-first", label: "Parceladas primeiro" },
  { value: "cash-first", label: "À vista primeiro" },
];

const SORT_PARAMS: Record<SortKey, { orderBy: string; order: string }> = {
  date: { orderBy: "date", order: "desc" },
  "amount-desc": { orderBy: "amount", order: "desc" },
  "amount-asc": { orderBy: "amount", order: "asc" },
  "installment-first": { orderBy: "installment", order: "desc" },
  "cash-first": { orderBy: "installment", order: "asc" },
};

type InstallmentFilter = "all" | "yes" | "no";

const INSTALLMENT_OPTIONS: { value: InstallmentFilter; label: string }[] = [
  { value: "all", label: "Todas as compras" },
  { value: "yes", label: "Só parceladas" },
  { value: "no", label: "Só à vista" },
];

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDay(iso: string) {
  // timeZone UTC: as datas vêm ancoradas ao meio-dia UTC; exibir em UTC evita o
  // deslocamento de 1 dia no fuso do Brasil (mesma convenção do resto do app).
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

// Badge pelo ESTADO DE CICLO (não só por paid/total): distingue uma fatura
// futura (parcelas lançadas, ciclo nem começou) de uma aberta, de uma já
// fechada e a vencer. "Em aberto" vermelho era usado para os três casos, o que
// enganava (parecia cobrança pendente onde não havia nada a pagar).
function CycleBadge({
  state,
  paid,
  total,
  dueDate,
  lastPaidAt,
}: {
  state: "future" | "open" | "closed" | "partial" | "paid";
  paid: number;
  total: number;
  dueDate: string | null;
  lastPaidAt?: string;
}) {
  if (state === "paid" && total > 0) {
    const date = lastPaidAt ? formatDay(lastPaidAt) : null;
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-success-muted text-success">
        {date ? `Paga em ${date}` : "Paga"}
      </span>
    );
  }
  if (state === "partial") {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-warning-muted text-warning">
        Parcial ({formatBRL(paid)} de {formatBRL(total)})
      </span>
    );
  }
  if (state === "future") {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-subtle text-fg-muted">
        Futura
      </span>
    );
  }
  if (state === "open") {
    // Neutro (não há token de "info"/azul no design system). Distinto do cinza
    // mais apagado de "Futura" (text-fg-muted) por usar text-fg-secondary.
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-subtle text-fg-secondary">
        Aberta
      </span>
    );
  }
  // closed: fechada e não paga — destaca o vencimento quando há dueDate.
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-warning-muted text-warning">
      {dueDate ? `Fechada — vence ${formatDay(dueDate)}` : "Fechada"}
    </span>
  );
}

/**
 * Skeleton da lista de lançamentos.
 *
 * Espelha a estrutura real (card único com divide-y, itens px-4 py-3 e a linha
 * de Total no rodapé) em vez de usar o ListSkeleton genérico, que é feito de
 * cards soltos e mais altos — encaixá-lo aqui trocaria um pulo de layout por
 * outro.
 */
function InvoiceListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-[20px] border border-border bg-surface shadow-xs divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse items-center justify-between px-4 py-3"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-8 w-8 shrink-0 rounded-[12px] bg-muted" />
            <div className="space-y-2">
              <div className="h-4 w-40 rounded bg-muted" />
              <div className="h-3 w-24 rounded bg-muted" />
            </div>
          </div>
          <div className="h-4 w-20 shrink-0 rounded bg-muted" />
        </div>
      ))}
      <div className="flex animate-pulse items-center justify-between bg-subtle px-4 py-3">
        <div className="h-4 w-12 rounded bg-muted" />
        <div className="h-4 w-24 rounded bg-muted" />
      </div>
    </div>
  );
}

export function InvoiceView({ cardId, cardName, onBack }: InvoiceViewProps) {
  const { fetchApi } = useApi();
  const queryClient = useQueryClient();
  const { data: categories } = useCategories();
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);
  // Id do pagamento sendo desfeito — dá feedback no botão certo quando há
  // vários pagamentos listados.
  const [undoingId, setUndoingId] = useState<string | null>(null);
  // Conferência da fatura: campo do total informado + resultado da comparação.
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [reconcileTotal, setReconcileTotal] = useState("");
  const [reconcileSubmitting, setReconcileSubmitting] = useState(false);
  const [month, setMonth] = useState(() => {
    // Mês em UTC (não local): o backend deriva o ciclo em UTC e as transações
    // são gravadas ao meio-dia UTC. Usar o mês LOCAL abriria o mês anterior nas
    // primeiras horas do dia 1 no fuso do Brasil (UTC-3).
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  });
  const [sort, setSort] = useState<SortKey>("date");
  const [categoryId, setCategoryId] = useState("");
  const [installment, setInstallment] = useState<InstallmentFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  // Debounce da busca (mesmo padrão da tela de Transações: 350ms).
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Qualquer mudança de filtro/mês/ordenação volta para a página 1 — senão você
  // pode ficar "preso" numa página que não existe mais no conjunto filtrado.
  useEffect(() => {
    setPage(1);
  }, [month, sort, categoryId, installment, debouncedSearch]);

  const invoiceQuery = useCardInvoice(cardId, {
    month,
    page,
    ...SORT_PARAMS[sort],
    installment,
    categoryId,
    search: debouncedSearch,
  });

  const invoice = invoiceQuery.data ?? null;
  // Distingue "falha ao carregar" de "fatura vazia" — sem isto o erro mostrava
  // "Nenhuma transação neste período", como se o cartão não tivesse compras.
  const errored = Boolean(invoiceQuery.error);
  // Primeiro load: não há nada em cache para mostrar, então vai skeleton.
  // Revalidação (trocar mês/filtro/página) mantém a fatura anterior na tela.
  const loading = invoiceQuery.isPending;
  const refreshing = invoiceQuery.isFetching;

  useEffect(() => {
    if (invoiceQuery.error) logApiError("load:invoice", invoiceQuery.error);
  }, [invoiceQuery.error]);

  // `refetch` é estável no React Query, então serve direto como handler de
  // retry/recarregar — sem useCallback envolvendo a query inteira.
  const fetchInvoice = invoiceQuery.refetch;

  function navigateMonth(delta: number) {
    const [y, m] = month.split("-").map(Number);
    // UTC para casar com o mês inicial (evita deslocamento de fuso na virada).
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonth(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
    );
  }

  // Restante a pagar do ciclo (default do campo de pagamento).
  const remaining = Math.max(0, (invoice?.total ?? 0) - (invoice?.paid ?? 0));

  function openPay() {
    setPayAmount(remaining > 0 ? String(remaining.toFixed(2)) : "");
    setPayOpen(true);
  }

  async function handlePay() {
    const amount = Number(payAmount.replace(",", "."));
    if (!amount || amount <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    setPaySubmitting(true);
    try {
      await fetchApi(`/cards/${cardId}/invoice/pay`, {
        method: "POST",
        body: JSON.stringify({ cycle: month, amount }),
      });
      toast.success("Pagamento registrado");
      setPayOpen(false);
      // Invalida em vez de refetch manual: a fatura atual continua na tela e é
      // substituída quando a nova chega, sem piscar um "Carregando..." por cima
      // do toast de sucesso.
      invalidateInvoice(queryClient);
      // A despesa de pagamento afeta saldo/gastos/transações.
      invalidateTransactionData(queryClient);
    } catch (error) {
      logApiError("pay:invoice", error);
      toast.error("Erro ao registrar pagamento");
    } finally {
      setPaySubmitting(false);
    }
  }

  async function handleUndoPayment(paymentId: string) {
    // Guarda o id em estado: sem isto o botão não tinha feedback nenhum e dois
    // cliques rápidos disparavam dois DELETE.
    if (undoingId) return;
    setUndoingId(paymentId);
    try {
      await fetchApi(`/cards/invoice-payments/${paymentId}`, {
        method: "DELETE",
      });
      toast.success("Pagamento desfeito");
      invalidateInvoice(queryClient);
      invalidateTransactionData(queryClient);
    } catch (error) {
      logApiError("undo:invoice-payment", error);
      toast.error("Erro ao desfazer pagamento");
    } finally {
      setUndoingId(null);
    }
  }

  // Confere a fatura contra o total real que o usuário digitou. O backend cria
  // o ajuste se faltar, avisa se sobra, ou só marca conferida se bater — e
  // devolve o status para a gente dar o feedback certo.
  async function handleReconcile() {
    const informedTotal = Number(reconcileTotal.replace(/\./g, "").replace(",", "."));
    if (!informedTotal || informedTotal < 0) {
      toast.error("Informe o total da fatura");
      return;
    }
    setReconcileSubmitting(true);
    try {
      const res = await fetchApi<{
        status: "matched" | "adjusted" | "over";
        difference?: number;
      }>(`/cards/${cardId}/invoice/reconcile`, {
        method: "POST",
        body: JSON.stringify({ cycle: month, informedTotal }),
      });
      if (res.status === "adjusted") {
        toast.success(
          `Faltavam ${formatBRL(res.difference ?? 0)} — lancei um ajuste. Fatura conferida ✅`,
        );
      } else if (res.status === "over") {
        toast.warning(
          `Você tem ${formatBRL(res.difference ?? 0)} a mais que a fatura. Confira se registrou algo duplicado.`,
        );
      } else {
        toast.success("Tudo certo! Fatura conferida ✅");
      }
      setReconcileOpen(false);
      setReconcileTotal("");
      invalidateInvoice(queryClient);
      invalidateTransactionData(queryClient);
    } catch (error) {
      logApiError("reconcile:invoice", error);
      toast.error("Erro ao conferir a fatura");
    } finally {
      setReconcileSubmitting(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setCategoryId("");
    setInstallment("all");
  }

  const monthLabel = (() => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  })();

  const transactions = invoice?.transactions ?? [];
  const meta = invoice?.meta;
  // "tem algo a filtrar" = há filtros ativos OU resultados. Mantém a barra de
  // filtros visível mesmo quando um filtro zera o resultado (senão o usuário
  // não consegue limpar o filtro que esvaziou a lista).
  const hasActiveFilters =
    Boolean(debouncedSearch) || Boolean(categoryId) || installment !== "all";
  // Mantém a barra visível durante o primeiro load: escondê-la e trazê-la de
  // volta quando os dados chegam empurra todo o conteúdo abaixo.
  const showControls = transactions.length > 0 || hasActiveFilters || loading;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft size={18} />
        </Button>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-fg">
          Fatura — {cardName}
        </h2>
        {/* A fatura era a única tela do dashboard sem recarregar — o header da
            página some ao entrar aqui, então o botão mora no header interno. */}
        <div className="ml-auto">
          <RefreshButton onRefresh={fetchInvoice} refreshing={refreshing} />
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between rounded-[20px] border border-border bg-surface shadow-xs px-4 py-3">
        {/* disabled durante o fetch: sem isto, cliques repetidos disparavam
            requests concorrentes cujas respostas podiam chegar fora de ordem. */}
        <button
          onClick={() => navigateMonth(-1)}
          disabled={refreshing}
          className="text-fg-muted hover:text-fg cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-medium text-fg capitalize">
          {monthLabel}
        </span>
        <button
          onClick={() => navigateMonth(1)}
          disabled={refreshing}
          className="text-fg-muted hover:text-fg cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Status badge + filtros + ordenação */}
      {showControls && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            {/* O badge reflete o estado da fatura INTEIRA. Com filtro ativo, o
                total/cycleState vêm do subconjunto filtrado — uma categoria sem
                compras no ciclo daria total=0 → "Paga" falso. Só mostra sem
                filtro (a seção "Pagamento da fatura" abaixo já faz o mesmo). */}
            {invoice && !hasActiveFilters ? (
              <CycleBadge
                state={invoice.cycleState}
                paid={invoice.paid}
                total={invoice.total}
                dueDate={invoice.dueDate}
                lastPaidAt={invoice.payments[0]?.paidAt}
              />
            ) : (
              <span />
            )}
            <div className="relative w-56">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar lançamento..."
                className="w-full rounded-md border-[1.5px] border-border bg-surface py-1.5 pl-9 pr-3 text-xs text-fg placeholder:text-fg-muted transition-colors focus:border-fg focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={categoryId}
              onChange={setCategoryId}
              size="sm"
              className="w-auto"
              menuWidth="auto"
              options={[
                { value: "", label: "Todas categorias" },
                ...(categories?.map((cat) => ({
                  value: cat.id,
                  label: cat.name,
                })) ?? []),
              ]}
            />

            <Select
              value={installment}
              onChange={(v) => setInstallment(v as InstallmentFilter)}
              size="sm"
              className="w-auto"
              menuWidth="auto"
              options={INSTALLMENT_OPTIONS.map((opt) => ({
                value: opt.value,
                label: opt.label,
              }))}
            />

            <label className="ml-auto flex items-center gap-2 text-xs text-fg-muted">
              Ordenar
              <Select
                value={sort}
                onChange={(v) => setSort(v as SortKey)}
                size="sm"
                className="w-auto"
                menuWidth="auto"
                options={SORT_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
              />
            </label>
          </div>
        </div>
      )}

      {/* Transactions */}
      {errored ? (
        <ErrorState
          onRetry={fetchInvoice}
          retrying={refreshing}
          description="Não foi possível carregar esta fatura. Verifique sua conexão e tente de novo."
        />
      ) : loading ? (
        <InvoiceListSkeleton />
      ) : transactions.length === 0 ? (
        <div className="rounded-[20px] border border-border bg-surface shadow-xs p-8 text-center">
          <p className="text-fg-muted text-sm">
            {hasActiveFilters
              ? "Nenhum lançamento corresponde aos filtros."
              : "Nenhuma transação neste período."}
          </p>
          {/* Sem esta saída o usuário fica olhando uma lista vazia sem saber
              que um filtro a esvaziou. */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={clearFilters}
            >
              Limpar filtros
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-[20px] border border-border bg-surface shadow-xs divide-y divide-border">
          {transactions.map((tx) => {
            // Compra parcelada: total = valor da parcela × nº de parcelas.
            // Mostrado como subtexto discreto (o destaque continua sendo o
            // valor da parcela, que é o que entra nesta fatura).
            const isInstallment =
              (tx.installmentTotal ?? 0) >= 2 &&
              (tx.installmentNumber ?? 0) >= 1;
            const purchaseTotal = isInstallment
              ? Math.round(Number(tx.amount) * tx.installmentTotal! * 100) / 100
              : 0;

            return (
              <div
                key={tx.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CategoryIconWithBg
                    slug={tx.category.slug}
                    icon={tx.category.icon}
                    colorBg={tx.category.colorBg}
                    colorText={tx.category.colorText}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-fg truncate">
                      {tx.description || tx.category.name}
                    </p>
                    <p className="text-xs text-fg-muted">
                      {new Date(tx.date).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        timeZone: "UTC",
                      })}
                      {isInstallment && (
                        <>
                          {" · "}
                          {tx.installmentNumber}/{tx.installmentTotal} · total{" "}
                          {formatBRL(purchaseTotal)}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-fg shrink-0">
                  {formatBRL(Number(tx.amount))}
                </span>
              </div>
            );
          })}

          {/* Total — soma do ciclo filtrado inteiro, não só desta página */}
          <div className="flex items-center justify-between px-4 py-3 bg-subtle">
            <span className="text-sm font-bold text-fg">Total</span>
            <span className="text-sm font-bold text-fg">
              {formatBRL(invoice?.total ?? 0)}
            </span>
          </div>
        </div>
      )}

      {/* Pagamento da fatura — sem filtros ativos e com fatura carregada */}
      {invoice && !hasActiveFilters && invoice.total > 0 && (
        <div className="rounded-[20px] border border-border bg-surface shadow-xs p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-fg">
                Pagamento da fatura
              </p>
              <p className="text-xs text-fg-muted">
                {invoice.paid > 0
                  ? `${formatBRL(invoice.paid)} pago de ${formatBRL(invoice.total)}`
                  : invoice.isClosed
                    ? "Nenhum pagamento registrado"
                    : "A fatura ainda não fechou — pagamento disponível após o fechamento."}
              </p>
            </div>
            {/* Só faz sentido pagar uma fatura FECHADA: pagar uma aberta/futura
                registra pagamento de algo que ainda vai mudar. */}
            {invoice.isClosed && remaining > 0 && !payOpen && (
              <Button size="sm" onClick={openPay}>
                Pagar fatura
              </Button>
            )}
          </div>

          {payOpen && (
            <div className="flex items-end gap-2">
              <label className="flex-1 text-xs text-fg-muted">
                Valor
                <div className="mt-1 flex items-center rounded-md border-[1.5px] border-border bg-surface px-3 py-1.5 focus-within:border-fg">
                  <span className="text-sm text-fg-muted mr-1">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full bg-transparent text-sm text-fg focus:outline-none"
                    autoFocus
                  />
                </div>
              </label>
              <Button
                size="sm"
                onClick={handlePay}
                disabled={paySubmitting}
                className="gap-1.5"
              >
                {paySubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Salvando
                  </>
                ) : (
                  "Confirmar"
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPayOpen(false)}
                disabled={paySubmitting}
              >
                Cancelar
              </Button>
            </div>
          )}

          {invoice.payments.length > 0 && (
            <div className="divide-y divide-border border-t border-border pt-1">
              {invoice.payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-2"
                >
                  <span className="text-xs text-fg-muted">
                    {formatBRL(p.amount)} em{" "}
                    {new Date(p.paidAt).toLocaleDateString("pt-BR", {
                      timeZone: "UTC",
                    })}
                  </span>
                  <button
                    onClick={() => handleUndoPayment(p.id)}
                    disabled={undoingId !== null}
                    className="flex items-center gap-1 text-xs text-fg-muted hover:text-danger cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-fg-muted"
                    title="Desfazer pagamento"
                  >
                    {undoingId === p.id ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Desfazendo
                      </>
                    ) : (
                      <>
                        <X size={14} /> Desfazer
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conferir com o banco — só em fatura FECHADA, sem filtros. O app não
          conecta ao banco, então o usuário digita o total da fatura e a gente
          compara / lança o ajuste do que faltou. */}
      {invoice && !hasActiveFilters && invoice.isClosed && (
        <div className="rounded-[20px] border border-border bg-surface shadow-xs p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-fg">
                {invoice.reconciliation
                  ? "Fatura conferida ✅"
                  : "Confira com o banco"}
              </p>
              <p className="text-xs text-fg-muted">
                {invoice.reconciliation
                  ? `Bateu com ${formatBRL(invoice.reconciliation.informedTotal)} em ${new Date(
                      invoice.reconciliation.reconciledAt,
                    ).toLocaleDateString("pt-BR", { timeZone: "UTC" })}${
                      invoice.reconciliation.hasAdjustment
                        ? " (com ajuste)"
                        : ""
                    }`
                  : "O total no app bateu com sua fatura do banco? Confira e eu lanço o que faltou."}
              </p>
            </div>
            {!reconcileOpen && (
              <Button
                size="sm"
                variant={invoice.reconciliation ? "outline" : "primary"}
                onClick={() => {
                  setReconcileOpen(true);
                  setReconcileTotal("");
                }}
              >
                {invoice.reconciliation ? "Conferir de novo" : "Conferir fatura"}
              </Button>
            )}
          </div>

          {reconcileOpen && (
            <div className="space-y-2">
              <p className="text-xs text-fg-muted">
                No app somei{" "}
                <span className="font-semibold text-fg">
                  {formatBRL(invoice.total)}
                </span>
                . Qual o total da fatura no banco?
              </p>
              <div className="flex items-end gap-2">
                <label className="flex-1 text-xs text-fg-muted">
                  Total da fatura
                  <div className="mt-1 flex items-center rounded-md border-[1.5px] border-border bg-surface px-3 py-1.5 focus-within:border-fg">
                    <span className="text-sm text-fg-muted mr-1">R$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={reconcileTotal}
                      onChange={(e) => setReconcileTotal(e.target.value)}
                      placeholder="0,00"
                      className="w-full bg-transparent text-sm text-fg focus:outline-none"
                      autoFocus
                    />
                  </div>
                </label>
                <Button
                  size="sm"
                  onClick={handleReconcile}
                  disabled={reconcileSubmitting}
                  className="gap-1.5"
                >
                  {reconcileSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Conferindo
                    </>
                  ) : (
                    "Conferir"
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReconcileOpen(false)}
                  disabled={reconcileSubmitting}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Paginação */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-fg-muted">
            {meta.total} {meta.total === 1 ? "lançamento" : "lançamentos"}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <span className="flex items-center text-sm text-fg-secondary px-2">
              {page} / {meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
