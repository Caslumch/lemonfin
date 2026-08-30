## Problema (bloqueador estratégico — medição de go/no-go)

Não há analytics de produto (PostHog/Mixpanel/GA ausentes). Os gates de go/no-go do próprio PRD §15 — **Retenção D14/D30, NPS, acurácia de parsing** — **não podem ser medidos** hoje. O painel admin dá contagens brutas, mas não coorte/retenção nem NPS.

É o gap mais estratégico do projeto e é barato de resolver — deve preceder o lançamento pago.

## Proposta

- Instrumentar analytics de produto (ex.: PostHog) no web + eventos-chave no backend (registro de transação via WhatsApp vs manual, ativação, uso do chat IA).
- Retenção por coorte (D1/D14/D30) — essencial para a decisão de PMF.
- Prompt de **NPS** in-app (ex.: após N dias de uso).
- **Acurácia de parsing:** logar mensagens não reconhecidas / confirmações negadas para medir a taxa (o PRD §10 já pede "logar mensagens não reconhecidas" — hoje não há persistência disso além do accounting de tokens em `AiUsage`).

## Critério de aceite

- Dá para responder: retenção D14/D30 por coorte, NPS atual, % de transações via WhatsApp, acurácia estimada do parser.
