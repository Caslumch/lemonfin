-- Ajuste de dia útil nas recorrentes: quando o dia da recorrência cai em fim de
-- semana ou feriado nacional, EXACT lança no dia cru (comportamento original),
-- PREVIOUS antecipa para o dia útil anterior (típico de salário) e NEXT posterga
-- para o dia útil seguinte. Default EXACT preserva o comportamento das
-- recorrências já existentes.
CREATE TYPE "BusinessDayAdjustment" AS ENUM ('EXACT', 'PREVIOUS', 'NEXT');

ALTER TABLE "recurring_transactions"
  ADD COLUMN "business_day_adjustment" "BusinessDayAdjustment" NOT NULL DEFAULT 'EXACT';
