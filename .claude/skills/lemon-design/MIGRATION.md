# Guia de migração — refatorar o LemonFin para o novo design system

Este guia serve para você (ou o Claude/Claude Code) refatorar o app inteiro do
LemonFin para a nova linguagem visual: **moldura escura + painel claro, limão
primário + uva secundário, cards pretos de destaque, cantos arredondados**.

---

## Passo 0 — Dê o contexto ao Claude

Coloque esta pasta dentro do projeto (ou em `.claude/skills/lemonfin-design/`) e
mande o Claude **ler `readme.md` e `styles.css` antes de tocar em qualquer tela**.

## Passo 1 — Trocar a base de tokens

1. Substitua o seu CSS de tokens antigo (ou o `tailwind.config.js`) pelo deste sistema.
2. Linke **só** o `styles.css`. Para migrar sem quebrar o que já existe, importe
   também `tokens/legacy-aliases.css` (mantém os nomes antigos `--color-*`
   funcionando) e remova quando terminar.

### De-para de tokens (antigo → novo)

| Antigo | Novo | Observação |
|---|---|---|
| `--color-primary` `#D4F400` | `--lemon-400` | mesma cor, novo nome |
| `--color-primary-hover` | `--lemon-hover` | |
| `--color-primary-muted` | `--lemon-100` | tint sólido |
| `--color-dark` | `--dark` / `--text-primary` | texto e sidebar |
| `--color-gray-600` | `--text-secondary` | texto auxiliar |
| `--color-gray-400` | `--text-tertiary` | placeholders/meta |
| `--color-gray-200` | `--border-strong` | bordas |
| `--color-gray-100` | `--surface-inset` | tracks, wells |
| `--color-gray-50` | `--bg-content` (`#F4F4F2`) | fundo do painel |
| `--color-white` | `--surface` | cards |
| `success/danger/warning` | `--success/--danger/--warning` | + `*-muted` |
| **novo** | `--grape-500` | **acento secundário (roxo/uva)** |
| **novo** | `--shell-bg`, `--shell-sidebar`, `--surface-dark` | moldura escura + cards pretos |

### Raios e sombras ficaram mais arredondados/suaves
| Antigo | Novo |
|---|---|
| `radius-sm 6` → | `--radius-sm 12` |
| `radius-md 10` → | `--radius-md 16` |
| `radius-lg 14` → | `--radius-lg 20` |
| `radius-xl 20` → | `--radius-xl 24` (+ `2xl 28`, `3xl 36`) |
| sombras duras | `--shadow-xs…lg` (difusas) + `--shadow-lemon/grape` |

> Se você usa Tailwind, atualize `borderRadius` e `boxShadow` no config com esses valores
> (veja a seção "Tailwind Config" no fim).

## Passo 2 — Adotar a "moldura" (a mudança visual mais forte)

- Envolva o app numa **moldura escura** (`--shell-bg`) com **sidebar preta** (`--shell-sidebar`)
  e um **painel de conteúdo claro** arredondado (`--bg-content`, `--radius-3xl`), que rola por dentro.
- Veja o layout pronto em `ui_kits/lemonfin/index.html`.

## Passo 3 — Trocar componentes ad-hoc pelos do DS

Em vez de reescrever, use os componentes deste sistema (`window.LemonFinDesignSystem_1143b6`
no browser, ou copie os `.jsx`): `Button, IconButton, Card, StatCard, Badge, Avatar,
Input, Select, Tabs, Switch, NavItem, TransactionRow, CreditCard`.

| O que você tem hoje | Use |
|---|---|
| botão "+ Nova transação" | `<Button variant="primary" pill>` |
| cards de resumo (Entradas/Saídas/Saldo) | `<StatCard>` (`tone="dark"` no card de destaque) |
| linha de transação | `<TransactionRow>` |
| filtros Todas/Despesas/Receitas | `<Tabs>` |
| select de categoria, datas | `<Select>` / `<Input type="date">` |
| toggle de tema | `<Switch>` |
| itens da sidebar | `<NavItem tone="dark">` |

## Passo 4 — Tela por tela

Faça **uma tela por vez** e confira visualmente antes de seguir. Ordem sugerida:
Transações → Home/Painel → Cartões → Metas → Categorias → Insights → Configurações.
As duas primeiras já existem prontas como referência no UI kit.

## Passo 5 — Regras de marca a respeitar

- Texto sobre limão é **sempre escuro**. Uva é só acento (nav ativa, botões "+", gráfico, gradiente do cartão).
- PT-BR, `R$` com vírgula, metadados `Data · Pessoa · via WhatsApp`.
- Emoji só em confirmação de chat. Ícones de traço (set em `ui_kits/lemonfin/icons.jsx`).

---

## Prompt pronto para colar

> Você tem acesso ao design system LemonFin nesta pasta. **Leia `readme.md` e
> `MIGRATION.md` primeiro.** Quero refatorar TODO o meu app para esta nova
> linguagem visual (moldura escura + painel claro, limão primário + uva
> secundário, cards pretos de destaque, cantos arredondados), **sem mudar
> nenhuma funcionalidade ou lógica de dados**.
>
> Faça assim:
> 1. Troque minha base de tokens pela do design system (linke `styles.css`; use
>    `tokens/legacy-aliases.css` para não quebrar nomes antigos durante a transição).
> 2. Aplique a "moldura" do `ui_kits/lemonfin/index.html` no layout raiz.
> 3. Substitua meus componentes ad-hoc pelos do DS (Button, StatCard,
>    TransactionRow, Tabs, NavItem, etc.) seguindo a tabela do MIGRATION.md.
> 4. Refatore **uma tela por vez**, começando por Transações. Depois de cada tela,
>    me mostre um preview e espere meu OK antes da próxima.
> 5. Não invente telas nem conteúdo novo. Mantenha PT-BR, R$ e o "via WhatsApp".
>
> Comece listando os arquivos do meu projeto que precisarão mudar e o plano por tela.

---

### Tailwind config (se aplicável)
```js
theme: { extend: {
  colors: {
    lemon: { DEFAULT:'#D4F400', hover:'#BDD900' },
    grape: { DEFAULT:'#6C5CE7', 600:'#5544D6' },
    shell: '#1C1C1E', dark: '#0D0D0D',
    success:'#22C55E', danger:'#EF4444', warning:'#F59E0B',
  },
  fontFamily: { display:['Outfit'], body:['DM Sans'], mono:['JetBrains Mono'] },
  borderRadius: { sm:'12px', md:'16px', lg:'20px', xl:'24px', '2xl':'28px', '3xl':'36px' },
  boxShadow: {
    xs:'0 1px 2px rgba(13,13,13,.04)', sm:'0 2px 8px rgba(13,13,13,.05)',
    md:'0 6px 20px rgba(13,13,13,.06)', lg:'0 16px 40px rgba(13,13,13,.10)',
  },
}}
```
