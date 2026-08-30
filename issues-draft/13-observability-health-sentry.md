## Problema (observabilidade)

- `/health` é trivial (`{ status: 'ok' }`) — não checa dependências (DB, WMode, Stripe). Não detecta banco degradado nem sessão do WhatsApp desconectada (que é o risco §13 do PRD).
- Sentry está cabeado (`instrument.ts`, configs do web) mas é **no-op sem DSN** — precisa ser provisionado/verificado em produção.
- Sem alerta de uptime/downtime.

## Proposta

- `/health` com checagem real: ping no Postgres, verificação da sessão WMode (status CONNECTED) e conectividade do Stripe; retornar status por dependência.
- Provisionar `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` em produção e confirmar que eventos chegam.
- Configurar alerta de uptime (o keep-alive do Render que pinga `/health` a cada 10 min pode ser reaproveitado, mas ver a issue de infra — free tier faz webhooks perderem a janela).

## Critério de aceite

- `/health` reflete o estado real das dependências.
- Erros de produção aparecem no Sentry; alerta dispara em indisponibilidade.
