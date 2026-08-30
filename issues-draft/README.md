# Issues-draft — varredura LemonFin (04/07/2026)

Cada `NN-*.md` é o **corpo** de uma issue pronta para o GitHub. `create-issues.sh` cria todas de uma vez (com labels).

## Como criar as issues

```bash
# 1. instalar e autenticar o gh (a autenticação é interativa — só você consegue)
brew install gh
gh auth login

# 2. (opcional) prévia sem criar nada
DRY_RUN=1 ./issues-draft/create-issues.sh

# 3. criar de verdade (repo alvo: Caslumch/lemonfin)
./issues-draft/create-issues.sh
```

> No prompt do Claude Code, você pode rodar o login direto com: `! gh auth login`

## Itens (por prioridade)

**P0 — bloqueadores de lançamento pago**
- 07 · Exclusão de conta e dados — LGPD (`DELETE /me`)
- 08 · Páginas de Privacidade/Termos + corrigir alegação falsa no FAQ
- 09 · Analytics + NPS (gates de go/no-go do PRD §15)
- 10 · Stripe Live + validar cancel/falha + ligar enforcement
- 11 · Definir modelo de cobrança (freemium metered vs oferta única)

**P1 — alta**
- 01 · Correção de valor ignora `lastAction` (quebra parcelamentos)
- 02 · Aporte de reserva não registra `lastAction` → `cancela` dessincroniza `savedAmount`
- 06 · Gate de confiança 60% vs 80% do PRD
- 13 · `/health` com deps + Sentry DSN em produção
- 14 · Testes de frontend + E2E happy-path + CI cobrir web

**P2/P3 — média/baixa**
- 03 · Charts órfãos + fetch descartado
- 05 · Web consumir `packages/shared`
- 12 · Idempotência do webhook: claim antes de processar
- 15 · Refatorar `whatsapp.service.ts` (épico)
- 04 · Unificar `formatCurrency`

## Notas

- **11 e 06** exigem uma **decisão de produto** antes de codar (não são bugs puros).
- **10** depende de **11** (definir o que o enforcement aplica).
- **08** envolve conteúdo jurídico real — envolver compliance.
- Pasta é descartável: depois de criar as issues, pode remover `issues-draft/`.
