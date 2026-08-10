# Design System — Finança Mobile

**Versão:** 1.0
**Última atualização:** Julho 2026
**Plataformas:** iOS + Android (React Native)
**Base:** herda 100% dos tokens do Design System web v1.0, adicionando camada dark, navegação por abas, gestos e safe areas.

---

## 1. Princípios (mobile-first)

- **Toque em um gesto.** Registrar um gasto, ver o saldo ou falar com a IA nunca deve custar mais que um toque. Alvos mínimos de **48×48px**, ações principais no terço inferior da tela (zona do polegar).
- **Números protagonistas.** O saldo domina a Home. Outfit grande, entradas/saídas com cor semântica imediata.
- **Confiança calma.** Acento lima sem excesso, superfícies limpas, feedback suave. Padrão de mercado (Nubank, Inter) sem copiar ninguém.

---

## 2. Cores

A paleta é **idêntica ao web**. A novidade mobile é a camada **dark** (obrigatória para OLED e uso noturno). O lima `#D4F400` é constante nos dois temas.

### 2.1 Acentos e semânticas (iguais nos dois temas)

| Token | Hex | Uso |
|---|---|---|
| `primary` | `#D4F400` | CTA, ativo, FAB, acento IA |
| `primary-hover` | `#BDD900` | Pressed |
| `success` | `#22C55E` | Entradas, positivo |
| `danger` | `#EF4444` | Saídas, excluir, erro |
| `warning` | `#F59E0B` | Avisos, limites |

### 2.2 Superfícies — Tema Claro

| Token | Hex | Uso |
|---|---|---|
| `bg` | `#F9F9F9` | Fundo de tela |
| `surface` | `#FFFFFF` | Cards, sheets, tab bar |
| `border` | `#E5E5E5` | Bordas, dividers |
| `text` | `#0D0D0D` | Texto primário |
| `text-secondary` | `#6B6B6B` | Texto auxiliar |
| `text-tertiary` | `#9E9E9E` | Placeholders, metadata |

### 2.3 Superfícies — Tema Escuro (novo)

| Token | Hex | Uso |
|---|---|---|
| `bg` | `#0D0D0D` | Fundo de tela |
| `surface` | `#161616` | Cards, sheets |
| `surface-elevated` | `#242424` | Ícones, inputs, superfície sobre card |
| `border` | `#2A2A2A` | Bordas, dividers |
| `text` | `#F5F5F5` | Texto primário |
| `text-secondary` | `#9E9E9E` | Texto auxiliar |
| `text-tertiary` | `#7A7A7A` | Placeholders, metadata |

### 2.4 Categorias (iguais ao web)

| Categoria | Background | Texto |
|---|---|---|
| Alimentação | `#FFF3E0` | `#E65100` |
| Transporte | `#E3F2FD` | `#1565C0` |
| Moradia | `#F3E5F5` | `#7B1FA2` |
| Lazer | `#E8F5E9` | `#2E7D32` |
| Saúde | `#FBE9E7` | `#BF360C` |
| Educação | `#E0F7FA` | `#00838F` |
| Compras | `#FFF8E1` | `#F57F17` |
| Freelance | `#EDE7F6` | `#4527A0` |

> No tema escuro, as categorias usam o **texto** da cor como acento e um fundo `surface-elevated` (`#242424`) para manter contraste.

---

## 3. Tipografia

Fontes idênticas ao web: **Outfit** (valores/títulos), **DM Sans** (UI), **JetBrains Mono** (números tabulares).

**Regra mobile:** a escala base sobe para **16px** — evita o zoom automático do iOS ao focar inputs e melhora a legibilidade na mão.

| Token | Fonte | Tamanho | Peso | Uso |
|---|---|---|---|---|
| `balance` | Outfit | 40px | 700 | Saldo na Home (centavos em 24px `text-tertiary`) |
| `title` | Outfit | 24px | 700 | Título de tela |
| `section` | Outfit | 18px | 600 | Cabeçalho de seção |
| `body` | DM Sans | 16px | 400 | Texto geral |
| `body-medium` | DM Sans | 16px | 500 | Ênfase |
| `small` | DM Sans | 14px | 400 | Auxiliar |
| `caption` | DM Sans | 11px | 600 | Overline (uppercase, tracking 0.06em) |
| `mono` | JetBrains Mono | 14px | 500 | Valores em listas/detalhe |

---

## 4. Espaçamento, raio e elevação

### 4.1 Espaço
Escala base 4px herdada do web: `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40`.
**Padding padrão de tela:** 20px horizontal.

### 4.2 Raio (mais generoso que o web)

| Token | Valor | Uso |
|---|---|---|
| `sm` | 8px | Chips pequenos, ícones |
| `md` | 12px | Inputs, list rows, botões pequenos |
| `lg` | 16px | Cards, botões |
| `xl` | 24px | Card de saldo, cards destaque |
| `sheet` | 28px | Cantos superiores de bottom sheet |
| `full` | 9999px | Pills, avatares, FAB de envio |

### 4.3 Elevação

| Token | Valor | Uso |
|---|---|---|
| `sm` | `0 1px 2px rgba(0,0,0,.04)` | Cards em repouso |
| `md` | `0 2px 8px rgba(0,0,0,.06)` | Sheets, dropdowns |
| `lg` | `0 8px 24px rgba(0,0,0,.12)` | FAB, modais, card flutuante |

No tema escuro, elevação = mudança de superfície (`bg` → `surface` → `surface-elevated`), não sombra.

---

## 5. Navegação

### 5.1 Tab bar (recomendada: **Opção B**)

Barra fixa, sempre visível, na área segura inferior. Fundo `surface` com blur, borda superior `border`.

**Opção A — 5 abas planas:** Início · Extrato · Limão (chat) · Cartões · Perfil.
Simples e familiar; o chat vira aba dedicada. Contra: esconde "nova transação" dentro das telas.

**Opção B — 4 abas + FAB central (recomendada):** Início · Extrato · **[ + ]** · Cartões · Perfil.
O FAB lima central abre **nova transação** (ação mais frequente). O chat vive como input na Home (ver §7), preservando o gesto do web sem gastar uma aba.

- Altura do conteúdo: 56px + safe area inferior.
- Item ativo: ícone + label em `text`. Inativo: `text-tertiary`.
- FAB central: 54px, `primary`, raio 17px, sobe -26px acima da barra, sombra lima.

### 5.2 Header de tela
Título em Outfit 24/700 à esquerda. Ações (sino, filtro) como ícones 40px à direita. Sem borda em telas com scroll (aparece uma sombra sutil ao rolar).

---

## 6. Componentes

Todo controle interativo tem **altura mínima 48px**. Botão primário no fim de tela ocupa **largura total**, altura 52px, raio `lg`.

- **Botões:** Primário (`primary`/`text`), Secundário (`text`/branco), Outline (borda `border`), Danger (`danger`/branco). Full-width para ação principal de tela.
- **Segmented control:** trilho `#F2F2F2` (dark: `surface-elevated`), item ativo `surface` + sombra sm. Usado em filtros Geral/Entradas/Saídas.
- **Toggle:** trilho 52×30, thumb 24px. Ativo `primary`.
- **Chips/pills:** filtros de período, sugestões da IA. Ativo `primary`, inativo `surface-elevated`.
- **List item de transação:** ícone 42–44px com fundo da categoria + nome (16/600) + metadata (12 `text-tertiary`) + valor (Outfit 700). **Swipe para a esquerda** revela Editar e Excluir (`danger`).
- **Notificação push:** cartão translúcido com blur, ícone do app 36px, título + corpo, timestamp.
- **Toast:** pill escura full-width com ícone de status; some em 3s. Alerta inline usa `warning-muted` + borda.
- **Bottom sheet:** sobe de baixo, cantos `sheet` (28px), grabber 40×5px no topo, backdrop `rgba(13,13,13,.4)`. Usado para nova transação, filtros, seleção de categoria.

---

## 7. Fluxo do Chat com IA (assistente "Limão")

> No web existe a **bubble flutuante**. No mobile ela vira um **input fixo na Home**.

1. **Entrada — input na Home.** Barra com borda `primary`, ícone de brilho (✦) e placeholder "Pergunte ao Limão…". Fica logo abaixo do card de saldo. Toque abre o chat.
2. **Tela cheia.** A tela de chat entra com transição de push (desliza da direita no iOS). Header: seta ← (voltar), avatar do assistente (quadrado lima com ✦), nome e status "● Online".
3. **Saída óbvia.** Seta ← no topo esquerdo + swipe-back de borda (iOS) / botão back do sistema (Android). Nunca prende o usuário.
4. **Mensagens.** Balões do usuário em `primary` alinhados à direita (raio 18/18/5/18); balões da IA em `surface` com borda, alinhados à esquerda (18/18/18/5).
5. **Respostas ricas.** A IA pode embutir **mini-cards** (barras de categoria, valores, chips de ação rápida como "Ver por dia" / "Definir limite") reaproveitando os componentes de gráfico do sistema.
6. **Input do chat.** Campo pill `surface-elevated` + botão de envio circular `primary` (48px).

**Regra:** o chat é uma tela empilhada sobre a Home, não uma aba — assim o gesto de voltar sempre retorna ao ponto de origem.

---

## 8. Telas-chave

- **Onboarding/Login:** fundo `bg` dark, logo lima, headline Outfit, dois botões full-width (Criar conta / Já tenho conta). Suporta biometria após 1º login.
- **Home:** saudação + avatar, card de saldo (dark) com olho de ocultar, input do Limão, lista de recentes, tab bar.
- **Extrato:** segmented Geral/Entradas/Saídas, busca, lista agrupada por dia, swipe actions.
- **Nova transação:** bottom sheet — toggle Saída/Entrada, teclado numérico grande, categoria (abre sub-sheet), data, botão Salvar.
- **Insights:** gráfico de barras (mês atual em lima), stat cards, breakdown por categoria.
- **Cartões:** cartão visual, fatura atual com progresso, controles (bloquear, virtual).
- **Perfil:** dados, temas, notificações, segurança.

---

## 9. Gestos e padrões nativos

- **Pull-to-refresh** na Home e no Extrato (spinner lima).
- **Swipe** em transações → editar/excluir.
- **Swipe-back** de borda (iOS) em telas empilhadas.
- **Bottom sheets** deslizantes para ações contextuais.
- **Haptics:** leve no toggle e no sucesso de transação.
- **Skeleton shimmer** (`surface`/`surface-elevated`) no carregamento.

---

## 10. Plataforma & lojas

- **Safe areas:** respeitar notch/Dynamic Island (topo) e home indicator (base 34px). Tab bar e sheets sempre acima da área segura.
- **iOS:** swipe-back, sheets 28px, SF haptics. **Android:** back de sistema fecha telas empilhadas, ripple no toque, FAB Material, edge-to-edge.
- **Ícone do app:** `$` lima sobre preto (padrão) e invertido para variações. **Splash:** fundo preto + logo centralizado.
- **Dark mode:** seguir preferência do sistema por padrão, com override manual em Perfil.
- **Acessibilidade:** contraste AA (lima sobre preto passa; lima sobre branco só para blocos grandes/ícones, nunca texto pequeno), Dynamic Type, labels de VoiceOver/TalkBack em ícones.

---

## 11. Checklist de implementação

- [ ] Tokens compartilhados (claro + dark) em `theme.ts`
- [ ] Fontes Outfit / DM Sans / JetBrains Mono empacotadas no app
- [ ] Componentes base: Button, Input, SegmentedControl, Toggle, Chip, Toast
- [ ] TransactionRow com swipe actions
- [ ] BottomSheet e navegação por abas (Opção B)
- [ ] Fluxo de Chat: input na Home → tela cheia → voltar
- [ ] Dark mode via preferência do sistema + override
- [ ] Safe areas, haptics, pull-to-refresh
- [ ] Ícone, splash e assets para App Store / Play Store
