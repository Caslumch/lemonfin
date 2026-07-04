// Formatação pt-BR — idêntica em intenção às 9 cópias do web (ver issue #04).
// Aqui já centralizada; candidata a subir para @lemonfin/shared depois.

export function formatBRL(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(n) ? n : 0);
}

export function formatDateBR(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    // As datas de transação são ancoradas em meio-dia UTC no backend; formatar
    // em UTC evita o "day-shift" (mesmo cuidado do web).
    timeZone: "UTC",
  }).format(d);
}
