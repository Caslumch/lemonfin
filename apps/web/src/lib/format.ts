// Helpers de formatação únicos para o app (evita redefinir Intl.* espalhado).

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Formata um valor em R$ (pt-BR). Aceita number ou string numérica. */
export function formatBRL(value: number | string): string {
  return brl.format(Number(value));
}

const brlCompact = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
});

/** R$ sem centavos — para rótulos de eixo/tooltip de gráfico. */
export function formatBRLCompact(value: number | string): string {
  return brlCompact.format(Number(value));
}

const transactionDate = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  // Datas de transação são gravadas ancoradas ao meio-dia UTC; formatar em UTC
  // (e não no fuso do navegador) evita deslocar o dia — datas próximas da
  // meia-noite cairiam no dia anterior no Brasil (UTC-3) e divergiriam do dia
  // que o modal de edição mostra (slice(0,10) da string, sem fuso).
  timeZone: "UTC",
});

/** Formata a DATA de uma transação (dd/mês curto) ancorada em UTC. */
export function formatDateBR(date: string): string {
  return transactionDate.format(new Date(date));
}
