#!/usr/bin/env bash
#
# Cria todas as issues do relatório de varredura no GitHub via gh CLI.
#
# Pré-requisitos:
#   1) gh instalado:            brew install gh
#   2) autenticado:             gh auth login   (rode você mesmo — é interativo)
#   3) rode a partir da raiz do repo (ou de qualquer lugar dentro dele).
#
# Uso:
#   ./issues-draft/create-issues.sh            # cria de verdade
#   DRY_RUN=1 ./issues-draft/create-issues.sh  # só mostra o que faria
#
set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="Caslumch/lemonfin"

if [ "${DRY_RUN:-0}" != "1" ] && ! command -v gh >/dev/null 2>&1; then
  echo "erro: gh não encontrado. Instale com 'brew install gh' e rode 'gh auth login'." >&2
  exit 1
fi

# --- Labels (idempotente: --force cria ou atualiza) ---------------------------
create_label() { gh label create "$1" --color "$2" --description "$3" --force --repo "$REPO" >/dev/null 2>&1 || true; }
if [ "${DRY_RUN:-0}" != "1" ]; then
  echo "Garantindo labels..."
  create_label "P0"            "b60205" "Bloqueador de lançamento"
  create_label "P1"            "d93f0b" "Alta prioridade"
  create_label "P2"            "fbca04" "Média prioridade"
  create_label "P3"            "0e8a16" "Baixa prioridade"
  create_label "bug"           "d73a4a" "Defeito / incoerência"
  create_label "cleanup"       "c5def5" "Limpeza de código"
  create_label "tech-debt"     "5319e7" "Dívida técnica"
  create_label "compliance"    "b60205" "LGPD / legal"
  create_label "product"       "0052cc" "Decisão / instrumentação de produto"
  create_label "billing"       "1d76db" "Pagamentos / assinatura"
  create_label "reliability"   "e99695" "Confiabilidade"
  create_label "observability" "bfd4f2" "Observabilidade"
  create_label "testing"       "0e8a16" "Testes / QA"
  create_label "frontend"      "fef2c0" "apps/web"
  create_label "backend"       "d4c5f9" "apps/api"
  create_label "whatsapp"      "25d366" "Fluxo WhatsApp"
fi

# --- Issues: "arquivo|título|labels" -----------------------------------------
ISSUES=(
"01-fix-correction-ignores-lastaction.md|fix(whatsapp): correção de valor ignora lastAction e quebra parcelamentos|bug,backend,whatsapp,P1"
"02-fix-reserve-contribution-lastaction.md|fix(reservas): aporte não registra lastAction — 'cancela' dessincroniza savedAmount|bug,backend,whatsapp,P1"
"03-cleanup-orphan-charts-wasted-fetch.md|cleanup(dashboard): charts órfãos + fetch /transactions/by-category descartado|cleanup,frontend,P2"
"04-cleanup-dry-formatcurrency.md|cleanup(web): unificar formatCurrency (9 cópias) em util única|cleanup,frontend,P3"
"05-techdebt-web-consume-shared.md|tech-debt(web): consumir packages/shared para evitar divergência de tipos|tech-debt,frontend,P2"
"06-confidence-gate-60-vs-80.md|fix(whatsapp): gate de confiança 60% vs 80% do PRD|bug,backend,product,P1"
"07-lgpd-account-data-deletion.md|feat(lgpd): exclusão de conta e dados (DELETE /me)|compliance,backend,P0"
"08-legal-privacy-terms-faq-claim.md|feat(legal): páginas de Privacidade/Termos + corrigir alegação do FAQ|compliance,frontend,P0"
"09-analytics-nps-instrumentation.md|feat(analytics): instrumentar analytics + NPS (go/no-go PRD §15)|product,P0"
"10-stripe-live-and-enforcement.md|chore(billing): ativar Stripe Live, validar cancel/falha, ligar enforcement|billing,P0"
"11-billing-model-decision-metering.md|product(billing): definir modelo de cobrança (metering vs oferta única)|product,billing,P0"
"12-webhook-idempotency-claim-before-process.md|reliability(whatsapp): claim de idempotência antes do processamento (risco de perda)|reliability,backend,whatsapp,P2"
"13-observability-health-sentry.md|observability: /health com checagem de dependências + Sentry DSN em prod|observability,backend,P1"
"14-testing-web-and-e2e.md|testing: testes de frontend + E2E happy-path + CI cobrir web|testing,P1"
"15-techdebt-refactor-whatsapp-service.md|tech-debt(whatsapp): refatorar whatsapp.service.ts (2.661 linhas) para use-cases|tech-debt,backend,whatsapp,P2"
)

for entry in "${ISSUES[@]}"; do
  IFS='|' read -r file title labels <<< "$entry"
  path="$DIR/$file"
  if [ ! -f "$path" ]; then echo "pulando (não encontrado): $file" >&2; continue; fi
  if [ "${DRY_RUN:-0}" = "1" ]; then
    echo "[dry-run] $title   [$labels]"
    continue
  fi
  echo "Criando: $title"
  gh issue create --repo "$REPO" --title "$title" --label "$labels" --body-file "$path" \
    || echo "  falhou: $title" >&2
done

echo "Concluído."
