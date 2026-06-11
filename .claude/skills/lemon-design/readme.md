# LemonFin — Design System

**Versão:** 2.0 · **Atualizado:** Junho 2026
**Base:** evolução do design system original do LemonFin (lima `#D4F400`, Outfit + DM Sans + JetBrains Mono).
**Direção visual:** "dark shell + painel claro emoldurado" da referência fintech — acento limão primário, **roxo/uva** secundário (novo), cards pretos de destaque, cantos bem arredondados e o cartão estilo VISA.

> O LemonFin é um app de finanças pessoais em **português (BR)**, moeda **R$**, com forte integração via **WhatsApp** (transações registradas por mensagem) e um assistente (bot). Telas principais: Home/Painel, Transações, Categorias, Cartões, Metas, Insights, Configurações.

**Fontes deste sistema**
- Doc original do usuário: `uploads/design-system.md` (tokens, componentes, layout — herdado e evoluído aqui).
- Screenshot do produto atual (tela "Transações", tema claro).
- Referência visual de destino (dashboard fintech escuro com cartão limão).
- Não há codebase nem Figma anexados — as telas do UI kit são **recriações fiéis ao produto + à referência**, não engenharia reversa de código.

---

## Como consumir

Linke **um arquivo**: [`styles.css`](./styles.css). Ele `@import`a tudo: fontes, cores, tipografia, espaçamento/raios/sombras. Depois use as CSS custom properties (`var(--lemon-400)`, `var(--text-primary)`, `var(--radius-xl)`…) e os componentes React do bundle (`window.LemonFinDesignSystem_1143b6`).

```html
<link rel="stylesheet" href="styles.css" />
<script src="_ds_bundle.js"></script>
<script>const { Button, StatCard, TransactionRow } = window.LemonFinDesignSystem_1143b6;</script>
```

---

## 1. Content fundamentals (voz & copy)

- **Idioma:** português do Brasil, 100%. Moeda sempre `R$` com vírgula decimal (`R$ 1.200,00`).
- **Tom:** confiável e moderno, "um amigo que entende de finanças, não um banco". Direto, sem juridiquês, sem jargão.
- **Pessoa:** fala-se **com** o usuário ("Bem-vindo de volta!", "Controle suas finanças sem esforço"). Tom encorajador, nunca culpabilizador sobre gastos.
- **Casing:** títulos em **Sentence case** ("Bem-vindo de volta!", "Nova transação", "Contatos recentes"). Labels de seção/overline em MAIÚSCULAS com tracking (`TRANSAÇÕES RECENTES`). Nunca Title Case em inglês.
- **Números são protagonistas.** Valores grandes e em destaque; o texto ao redor é suporte. Centavos podem aparecer menores/acinzentados no saldo principal.
- **Metadados de transação:** padrão `Data · Pessoa · canal` → `10 de jun. · Lucas · via WhatsApp`. O `via WhatsApp` é um diferencial da marca — mantenha.
- **Microcopy de ação:** verbos curtos e diretos — "Enviar", "Receber", "Nova transação", "Excluir", "Ver todas", "Filtrar".
- **Emoji:** uso **mínimo**. Aceitável apenas em confirmações de chat/WhatsApp (ex.: "✅ Registrado!"). Nunca em labels de UI, botões ou títulos.
- **Categorias** (rótulos canônicos): Alimentação, Transporte, Moradia, Lazer, Saúde, Educação, Compras, Salário, Freelance, Outros.

---

## 2. Visual foundations

**Conceito-mestre — a moldura.** O app vive numa **moldura escura** (`--shell-bg #1C1C1E`). Dentro dela: uma **sidebar preta** (`--shell-sidebar #0D0D0D`) arredondada à esquerda e um **painel de conteúdo claro** (`--bg-content #F4F4F2`) com raio bem grande (`--radius-3xl 36px`). Dentro do painel claro, cards brancos e **cards pretos de destaque** (`--surface-dark`) criam o contraste assinatura.

- **Cores.** Primária **limão `#D4F400`** (CTAs, estados ativos, ícone-chip de destaque, FAB). Secundária **uva `#6C5CE7`** (nav ativa no escuro, botões "+", linha do gráfico, gradiente atrás do cartão). Neutros quentes-neutros. Semânticos finance: verde entradas, vermelho saídas, âmbar avisos. Texto sobre limão é **sempre escuro** (`#0D0D0D`); sobre uva é branco.
- **Tipografia.** Display **Outfit** (700) para títulos e números grandes — pesada, levemente arredondada, casa com o "Welcome Back!". UI/corpo **DM Sans** (400–600). Valores monetários inline em **JetBrains Mono** 600 com `tnum` (tabular). Headings com `letter-spacing: -0.02em`.
- **Espaçamento.** Grade base 4px. Padding de card 22–24px; gap de grid 16px; respiro entre seções 20–22px.
- **Backgrounds.** Sem gradientes decorativos, sem texturas, sem imagens full-bleed. O fundo é cor sólida: escuro fora, claro dentro. O único gradiente do sistema é o **uva atrás do cartão de crédito** (e o limão radial do logo).
- **Cantos.** Tudo arredondado e generoso: botões/inputs 12px, chips/ícone-tiles 16px, cards 20–24px, cartão/modal 28px, o painel-moldura 36px, pills/avatares/FAB totalmente redondos.
- **Cards.** Branco com borda de 1px hairline (`--border`, ~7% preto) e sombra **muito** suave (`--shadow-sm`). Cards de destaque são **pretos** sem borda, com sombra um pouco maior. Hover de card interativo: leve `translateY(-2px)` + `--shadow-md`.
- **Sombras.** Sistema baixo-contraste e difuso (`xs→lg`). Dois "glows" coloridos para ênfase: `--shadow-lemon` e `--shadow-grape` (FAB, cartão, botões primários quando merecem destaque).
- **Bordas.** Hairline em luz (`rgba(13,13,13,.07)`), e `rgba(255,255,255,.08)` em superfícies escuras. Inputs usam borda 1.5px que **escurece para `--dark` no foco** + anel de foco uva translúcido.
- **Hover / press.** Botões: hover troca para a cor `*-hover` (escurece levemente); press faz `scale(0.97)`. IconButton press `scale(0.92)`. Sem mudanças de opacidade bruscas.
- **Animação.** Transições curtas e suaves — `--duration-fast 120ms` / `--duration-base 180ms` com `--ease-out` (cubic-bezier(.22,1,.36,1)). Entrada de cards: fade + `translateY(8px)`, escalonado ~50ms. Sem bounce exagerado, sem loops decorativos.
- **Transparência/blur.** Usada com parcimônia — superfícies "ghost" sobre o escuro (`rgba(255,255,255,.08)`). Sem glassmorphism pesado.
- **Imagery.** Avatares circulares (foto ou iniciais em chip uva). Logos de comerciantes como **chips circulares coloridos com inicial** (sem logos de terceiros embutidos). Sem ilustrações.
- **Layout fixo.** Sidebar fixa à esquerda; FAB do assistente fixo no canto inferior-direito; painel de conteúdo rola internamente.

---

## 3. Iconografia

- **Estilo:** ícones de **traço (line)**, peso ~1.9, cantos arredondados (`stroke-linecap/linejoin: round`), viewBox 24. Monocromáticos, herdam `currentColor`.
- **Fonte:** conjunto próprio em [`ui_kits/lemonfin/icons.jsx`](./ui_kits/lemonfin/icons.jsx) (home, swap, layers, card, target, bulb, gear, bell, plus, arrowUR/DL, wallet, trendUp/Dn, receipt, piggy, search, calendar, kebab, chevron, sun, logout, bot). Cobrem a navegação e os affordances do produto.
- **Substituição:** o estilo equivale ao **Lucide / Feather** (mesmo peso de traço). Se precisar de um ícone fora do set, use **Lucide** via CDN para manter consistência — não desenhe ícones cheios (fill) nem misture famílias.
- **Emoji como ícone:** não. Apenas no contexto de confirmação de chat/WhatsApp.
- **Logo:** símbolo limão (disco com gradiente radial) em [`assets/lemonfin-mark.svg`](./assets/lemonfin-mark.svg); variante alternativa em glifo "+" limão/uva em [`assets/lemonfin-glyph.svg`](./assets/lemonfin-glyph.svg). Wordmark "LemonFin" em Outfit 800.

---

## 4. Índice / manifesto

**Raiz**
- `styles.css` — entry de `@import` (linke só este).
- `tokens/` — `colors.css`, `typography.css`, `spacing.css` (espaço+raio+sombra+motion), `fonts.css`.
- `readme.md` — este guia. · `SKILL.md` — invólucro Agent Skill.
- `assets/` — `lemonfin-mark.svg`, `lemonfin-glyph.svg`.

**Componentes** (`window.LemonFinDesignSystem_1143b6`)
- core: `Button`, `IconButton`, `Card`, `StatCard`, `Badge`, `Avatar`
- forms: `Input`, `Select`, `Tabs`, `Switch`
- navigation: `NavItem`
- finance: `TransactionRow`, `CreditCard`

**UI kit**
- `ui_kits/lemonfin/index.html` — app interativo (Dashboard + Transações), troca de telas pela sidebar.

**Foundation cards** (aba Design System) — em `guidelines/` e nas pastas de componentes: Type, Colors, Spacing, Brand, Components.

---

## 5. Caveats
- **Fontes via CDN @import** (Google Fonts), não `@font-face` self-hosted — por isso o compilador reporta "0 fonts". Renderiza normal; para offline, hospede os `.woff2` e troque por `@font-face` em `tokens/fonts.css`.
- Logos de comerciantes são chips com inicial (não há logos de terceiros). Telas do kit são recriações a partir de screenshots + referência (sem codebase/Figma).
