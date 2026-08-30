## Problema (bloqueador de lançamento — legal)

1. **Não há Política de Privacidade nem Termos de Uso.** Os links do footer são placeholders (`href="#"`). Não existem rotas `/privacidade` nem `/termos`.
2. **Alegação falsa no marketing:** o FAQ afirma _"criptografia de ponta a ponta e conformidade com a LGPD"_ — nenhuma das duas é verdadeira hoje (é TLS + criptografia em repouso, não E2E; e não há artefatos de LGPD). Risco consumerista / propaganda enganosa para produto pago com dados financeiros.

## Evidência

- `apps/web/src/app/(marketing)/landing/_components/Footer.tsx:21-22` (links `#`)
- `apps/web/src/app/(marketing)/landing/_components/Faq.tsx:26` (alegação)

## Proposta

- Criar páginas `/privacidade` e `/termos` (conteúdo jurídico real — envolver alguém de compliance/jurídico) e linká-las no footer.
- Corrigir o texto do FAQ para descrever com precisão o que existe (ex.: "criptografia em trânsito e em repouso"), sem alegar E2E nem "conformidade com a LGPD" antes de ela existir de fato.

## Critério de aceite

- Rotas `/privacidade` e `/termos` publicadas e linkadas.
- FAQ sem alegações não substanciadas.
