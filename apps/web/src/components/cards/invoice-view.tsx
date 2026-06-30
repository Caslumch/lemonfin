"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CategoryIconWithBg } from "@/components/ui/category-icon";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useApi } from "@/hooks/use-api";
import { useCategories } from "@/hooks/use-transactions-data";
import { invalidateTransactionData } from "@/lib/query-keys";
import { logApiError } from "@/lib/log-error";
import type { CardInvoice } from "@/types/card";

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

export function InvoiceView({ cardId, cardName, onBack }: InvoiceViewProps) {
  const { fetchApi } = useApi();
  const queryClient = useQueryClient();
  const { data: categories } = useCategories();
  const [invoice, setInvoice] = useState<CardInvoice | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
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

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    try {
      const { orderBy, order } = SORT_PARAMS[sort];
      const params = new URLSearchParams();
      params.set("month", month);
      params.set("page", String(page));
      params.set("perPage", "20");
      params.set("orderBy", orderBy);
      params.set("order", order);
      if (installment !== "all") params.set("installment", installment);
      if (categoryId) params.set("categoryId", categoryId);
      if (debouncedSearch) params.set("search", debouncedSearch);

      const data = await fetchApi<CardInvoice>(
        `/cards/${cardId}/invoice?${params.toString()}`,
      );
      setInvoice(data);
    } catch (error) {
      logApiError("load:invoice", error);
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  }, [
    fetchApi,
    cardId,
    month,
    page,
    sort,
    categoryId,
    installment,
    debouncedSearch,
  ]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  function navigateMonth(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
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
      await fetchInvoice();
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
    try {
      await fetchApi(`/cards/invoice-payments/${paymentId}`, {
        method: "DELETE",
      });
      toast.success("Pagamento desfeito");
      await fetchInvoice();
      invalidateTransactionData(queryClient);
    } catch (error) {
      logApiError("undo:invoice-payment", error);
      toast.error("Erro ao desfazer pagamento");
    }
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
  const showControls = transactions.length > 0 || hasActiveFilters;

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
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between rounded-[20px] border border-border bg-surface shadow-xs px-4 py-3">
        <button
          onClick={() => navigateMonth(-1)}
          className="text-fg-muted hover:text-fg cursor-pointer"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-medium text-fg capitalize">
          {monthLabel}
        </span>
        <button
          onClick={() => navigateMonth(1)}
          className="text-fg-muted hover:text-fg cursor-pointer"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Status badge + filtros + ordenação */}
      {showControls && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            {invoice && (
              <CycleBadge
                state={invoice.cycleState}
                paid={invoice.paid}
                total={invoice.total}
                dueDate={invoice.dueDate}
                lastPaidAt={invoice.payments[0]?.paidAt}
              />
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
      {loading ? (
        <div className="rounded-[20px] border border-border bg-surface shadow-xs p-8 text-center">
          <p className="text-fg-muted text-sm">Carregando...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-[20px] border border-border bg-surface shadow-xs p-8 text-center">
          <p className="text-fg-muted text-sm">
            {hasActiveFilters
              ? "Nenhum lançamento corresponde aos filtros."
              : "Nenhuma transação neste período."}
          </p>
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
              <Button size="sm" onClick={handlePay} disabled={paySubmitting}>
                {paySubmitting ? "Salvando..." : "Confirmar"}
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
                    className="flex items-center gap-1 text-xs text-fg-muted hover:text-danger cursor-pointer"
                    title="Desfazer pagamento"
                  >
                    <X size={14} /> Desfazer
                  </button>
                </div>
              ))}
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
