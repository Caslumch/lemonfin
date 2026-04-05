# Design System — Finança

**Versão:** 1.0
**Última atualização:** Abril 2026
**Referência visual:** Lemon Finance App (heartbeat.ua)

---

## 1. Princípios de Design

O design system segue três princípios centrais:

- **Baixo atrito.** Cada tela, componente e interação deve reduzir o esforço do usuário. Se algo pode ser inferido, não deve ser perguntado.
- **Clareza financeira.** Números são protagonistas. Tipografia grande para valores, hierarquia visual clara entre entradas e saídas, feedback imediato em cada ação.
- **Personalidade contida.** O acento lima traz energia sem parecer infantil. O tom é confiável e moderno — como um amigo que entende de finanças, não um banco.

---

## 2. Cores

### 2.1 Primárias

| Token | Hex | Uso |
|---|---|---|
| `primary` | `#D4F400` | CTAs, estados ativos, destaques |
| `primary-hover` | `#BDD900` | Hover em botões primários |
| `primary-muted` | `#D4F40020` | Backgrounds sutis, badges |

### 2.2 Neutras

| Token | Hex | Uso |
|---|---|---|
| `dark` | `#0D0D0D` | Texto principal, sidebar escura |
| `dark-soft` | `#1A1A1A` | Texto secundário forte |
| `gray-900` | `#2D2D2D` | Ícones, labels |
| `gray-600` | `#6B6B6B` | Texto auxiliar |
| `gray-400` | `#9E9E9E` | Placeholders |
| `gray-200` | `#E5E5E5` | Bordas, dividers |
| `gray-100` | `#F2F2F2` | Background de cards |
| `gray-50` | `#F9F9F9` | Background principal |
| `white` | `#FFFFFF` | Cards, superfícies elevadas |

### 2.3 Semânticas

| Token | Hex | Uso |
|---|---|---|
| `success` | `#22C55E` | Entradas, valores positivos |
| `success-muted` | `#22C55E15` | Background positivo |
| `danger` | `#EF4444` | Saídas, alertas, erros |
| `danger-muted` | `#EF444415` | Background negativo |
| `warning` | `#F59E0B` | Avisos, limites próximos |
| `warning-muted` | `#F59E0B15` | Background de aviso |

### 2.4 Categorias

Cada categoria de gasto tem uma cor fixa para consistência visual em badges, gráficos e ícones.

| Categoria | Background | Texto |
|---|---|---|
| Alimentação | `#FFF3E0` | `#E65100` |
| Transporte | `#E3F2FD` | `#1565C0` |
| Moradia | `#F3E5F5` | `#7B1FA2` |
| Lazer | `#E8F5E9` | `#2E7D32` |
| Saúde | `#FBE9E7` | `#BF360C` |
| Educação | `#E0F7FA` | `#00838F` |
| Compras | `#FFF8E1` | `#F57F17` |
| Salário | `#E8F5E9` | `#2E7D32` |
| Freelance | `#EDE7F6` | `#4527A0` |
| Outros | `#F5F5F5` | `#6B6B6B` |

### 2.5 CSS Variables

```css
:root {
  --color-primary: #D4F400;
  --color-primary-hover: #BDD900;
  --color-primary-muted: #D4F40020;

  --color-dark: #0D0D0D;
  --color-dark-soft: #1A1A1A;
  --color-gray-900: #2D2D2D;
  --color-gray-600: #6B6B6B;
  --color-gray-400: #9E9E9E;
  --color-gray-200: #E5E5E5;
  --color-gray-100: #F2F2F2;
  --color-gray-50: #F9F9F9;
  --color-white: #FFFFFF;

  --color-success: #22C55E;
  --color-success-muted: #22C55E15;
  --color-danger: #EF4444;
  --color-danger-muted: #EF444415;
  --color-warning: #F59E0B;
  --color-warning-muted: #F59E0B15;
}
```

---

## 3. Tipografia

### 3.1 Fontes

| Fonte | Uso | Import |
|---|---|---|
| **Outfit** | Headings, valores financeiros grandes, brand | `fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800` |
| **DM Sans** | Corpo, UI, labels, botões | `fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700` |
| **JetBrains Mono** | Valores numéricos, código, dados tabulares | `fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500` |

### 3.2 Escala Tipográfica

| Token | Fonte | Tamanho | Peso | Line Height | Uso |
|---|---|---|---|---|---|
| `display` | Outfit | 48px | 700 | 1.1 | Saldo principal, hero numbers |
| `h1` | Outfit | 32px | 700 | 1.2 | Títulos de página |
| `h2` | Outfit | 24px | 600 | 1.3 | Títulos de seção |
| `h3` | Outfit | 18px | 600 | 1.4 | Subtítulos, card headers |
| `body` | DM Sans | 15px | 400 | 1.6 | Texto geral |
| `body-medium` | DM Sans | 15px | 500 | 1.6 | Texto com ênfase |
| `small` | DM Sans | 13px | 400 | 1.5 | Texto auxiliar, metadata |
| `caption` | DM Sans | 11px | 600 | 1.4 | Labels, overlines (uppercase, tracking 0.05em) |
| `mono` | JetBrains Mono | 14px | 500 | 1.5 | Valores monetários inline |

### 3.3 Regras de Uso

- Valores financeiros grandes (saldo, total) usam **Outfit 700** com centavos em tamanho menor e cor `gray-400`.
  Exemplo: **R$ 3.248**,64
- Valores em listas de transações usam **Outfit 600** a 15-16px.
- Labels de seção usam o token `caption`: 11px, uppercase, letter-spacing 0.05em, cor `gray-400`.
- Nunca usar mais de 2 pesos de fonte na mesma linha.

---

## 4. Espaçamento

### 4.1 Escala

| Token | Valor | Uso comum |
|---|---|---|
| `space-0` | 0px | — |
| `space-1` | 4px | Gap entre ícone e badge |
| `space-2` | 8px | Padding interno de badges |
| `space-3` | 12px | Gap entre itens de lista |
| `space-4` | 16px | Padding de inputs, gap de grid |
| `space-5` | 20px | Padding de cards |
| `space-6` | 24px | Padding de cards maiores, gap de seções |
| `space-7` | 32px | Margem entre seções |
| `space-8` | 40px | Padding do main content |
| `space-9` | 48px | Separação de blocos grandes |
| `space-10` | 64px | Margem top/bottom de página |
| `space-11` | 80px | Espaçamento hero |
| `space-12` | 96px | Espaçamento máximo |

### 4.2 Border Radius

| Token | Valor | Uso |
|---|---|---|
| `radius-sm` | 6px | Badges, small buttons, tags |
| `radius-md` | 10px | Botões, inputs, itens de nav |
| `radius-lg` | 14px | Cards, containers |
| `radius-xl` | 20px | Cards grandes, modais |
| `radius-full` | 9999px | Avatares, pills, toggles |

### 4.3 Sombras

| Token | Valor | Uso |
|---|---|---|
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.04)` | Tabs ativas, elementos sutis |
| `shadow-md` | `0 2px 8px rgba(0,0,0,0.06)` | Cards em hover, dropdowns |
| `shadow-lg` | `0 4px 16px rgba(0,0,0,0.08)` | Cards elevados, modais |
| `shadow-xl` | `0 8px 32px rgba(0,0,0,0.10)` | Chat bubble, FAB |

---

## 5. Componentes

### 5.1 Botões

| Variante | Background | Texto | Borda | Uso |
|---|---|---|---|---|
| **Primary** | `primary` | `dark` | nenhuma | Ação principal: salvar, confirmar, nova transação |
| **Secondary** | `dark` | `white` | nenhuma | Ação secundária importante |
| **Outline** | transparente | `dark` | 1.5px `gray-200` | Ações neutras: filtros, cancelar |
| **Ghost** | transparente | `gray-600` | nenhuma | Ações terciárias: "ver todas", links |
| **Danger** | `danger` | `white` | nenhuma | Ações destrutivas: excluir transação |

Tamanhos:
- **Small:** padding 8px 16px, font 12px, radius-sm
- **Default:** padding 10px 24px, font 14px, radius-md
- **Large:** padding 12px 28px, font 15px, radius-md
- **Icon:** 40x40px, radius-full (FAB de adicionar)

Estados:
- **Hover:** escurece 8% (filter brightness)
- **Active:** escurece 12%
- **Disabled:** opacity 0.5, cursor not-allowed
- **Focus:** outline 2px `primary`, offset 2px

### 5.2 Inputs

- Padding: 10px 14px
- Borda: 1.5px `gray-200`
- Radius: `radius-md`
- Font: DM Sans 14px
- Background: `white`
- Focus: borda muda para `dark`
- Erro: borda muda para `danger`, mensagem abaixo em `danger` 12px
- Prefixo monetário (R$) fixo à esquerda em `gray-400`, padding-left aumentado para 40px

### 5.3 Badges & Tags

Usadas para categorias e status financeiro.

**Categorias:** background e texto conforme tabela de cores por categoria. Padding 4px 12px, radius-full, font 12px weight 600.

**Status financeiros:**
- Entrada: background `success-muted`, texto `success`
- Saída: background `danger-muted`, texto `danger`
- Alerta: background `warning-muted`, texto `warning`

### 5.4 Tabs

Container com background `gray-100`, padding 3px, radius-md. Cada tab com padding 8px 20px, font 13px weight 500. Tab ativa com background `white`, shadow-sm, font weight 600. Transição suave de 150ms.

### 5.5 Toggle

Track: 44x24px, radius 12px. Background inativo: `gray-200`. Background ativo: `primary`. Thumb: 18x18px, branco, shadow-md. Animação de posição com transition 200ms ease.

### 5.6 Avatar

- Tamanho padrão: 32x32px
- Background: `gray-100`
- Radius: `radius-full`
- Font: 14px, peso 600, cor `dark`
- Exibe iniciais quando sem foto

---

## 6. Cards

### 6.1 Card Base

- Background: `white`
- Borda: 1px `gray-200`
- Radius: `radius-lg` (14px)
- Padding: 20px
- Sem sombra por padrão; `shadow-md` no hover (opcional)

### 6.2 Card de Transação

Layout: flex, space-between, align-center.

Lado esquerdo: ícone (40x40, radius-md, background da categoria) + nome (14px, weight 600) + metadata (12px, `gray-400`, formato "Categoria • Data").

Lado direito: valor (16px, Outfit 700, cor `danger` para saída ou `success` para entrada) + método (11px, `gray-400`).

### 6.3 Card de Saldo (Dark)

- Background: `dark`
- Cor do texto: `white`
- Radius: `radius-lg`
- Padding: 24px
- Label "Saldo atual" em `caption` com cor `gray-400`
- Valor em Outfit 36px weight 700, centavos em 20px cor `gray-400`
- Subtotais (entradas/saídas) em 14px weight 600, cores semânticas

### 6.4 Card de Alerta

- Background: `warning-muted`
- Borda: 1px `warning` com 30% opacidade
- Radius: `radius-lg`
- Padding: 20px
- Layout: ícone de alerta + título (14px, weight 600) + descrição (13px, `gray-900`, line-height 1.5)

### 6.5 Card de Confirmação WhatsApp

- Background: `#DCF8C6` (verde WhatsApp)
- Radius: 14px 14px 4px 14px (canto inferior direito achatado)
- Padding: 16px
- Shadow: `shadow-sm`
- Conteúdo: "✅ Registrado!" + valor e categoria (weight 600) + detalhes (12px) + horário alinhado à direita (10px)

### 6.6 Card de Stat

- Background: `white`
- Borda: 1px `gray-200`
- Radius: `radius-lg`
- Padding: 18px
- Label em 12px `gray-400`
- Valor em Outfit 24px weight 700
- Variação percentual ao lado em 12px weight 600, cor `success` (positivo) ou `danger` (negativo)

---

## 7. Gráficos

### 7.1 Barras (Gastos Mensais)

- Barras com cor `dark` por padrão
- Mês atual destacado em `primary`
- Radius das barras: 4px 4px 0 0 (topo arredondado)
- Labels do eixo X em 10px `gray-400`
- Gap entre barras: 12px
- Altura do container: 120px

### 7.2 Breakdown por Categoria

- Progress bars horizontais
- Altura: 6px, radius 3px
- Background da track: `gray-100`
- Cor da barra: cor da categoria (ver tabela de cores)
- Label à esquerda: nome da categoria (12px, weight 500)
- Label à direita: valor em JetBrains Mono 11px `gray-600`
- Gap entre itens: 10px

### 7.3 Cards de Stat

Grid de 2 ou 4 colunas. Cada card mostra label, valor grande e variação percentual com seta direcional (↑ ou ↓).

---

## 8. Navegação

### 8.1 Sidebar

Dois estados: expandida (220px) e compacta (64px).

**Expandida:**
- Background: `white`
- Borda direita: 1px `gray-200`
- Padding: 16px
- Logo: ícone 24x24 `primary` radius-sm + nome "finança" em Outfit 18px weight 800
- Itens: padding 10px 12px, radius-md, gap 2px
- Item ativo: background `primary`, font weight 600, cor `dark`
- Item inativo: background transparente, font weight 450, cor `gray-600`
- Footer: avatar + nome + email, separado por borda top `gray-200`

**Compacta:**
- Largura: 64px
- Apenas ícones centralizados (40x40px)
- Logo reduz para apenas o ícone
- Tooltip no hover (opcional)

**Itens de navegação MVP:**
- Home (⌂)
- Transações (↕)
- Categorias (◑)
- Cartões (▭)
- Insights (◮)
- Configurações (⚙)

### 8.2 Header do Conteúdo

- Título da página em Outfit 22px weight 700
- Ações à direita: botão de filtro (outline) + botão primário ("+ Nova transação")
- Separado por borda bottom `gray-200`
- Padding: 20px 28px

---

## 9. Dashboard Layout

### 9.1 Estrutura

```
┌──────────┬────────────────────────────────────────┐
│          │  Header (título + ações)               │
│          ├────────┬────────┬────────┬─────────────│
│ Sidebar  │ Saldo  │Entradas│ Saídas │  Economia   │
│          ├────────┴────────┴────────┴─────────────│
│          │  Transações recentes                    │
│          │  ┌──────────────────────────────────┐  │
│          │  │ 🛒 Supermercado    - R$ 182,40   │  │
│          │  │ 🚗 Uber           - R$ 24,90    │  │
│          │  │ 💰 Freelance      + R$ 1.200    │  │
│          │  └──────────────────────────────────┘  │
│          │                                        │
│          │                              💬 Chat   │
└──────────┴────────────────────────────────────────┘
```

### 9.2 Stats Row

Grid de 4 colunas, separadas por bordas verticais `gray-200`. Cada stat tem label (12px `gray-400`), valor (Outfit 24px weight 700) e sub-info opcional (12px, cor semântica).

### 9.3 Lista de Transações

Cada item é uma row flex com padding vertical 14px, separada por borda bottom `gray-100`. O último item não tem borda. Header da seção com título (16px weight 600) e link "Ver todas →" (ghost button) alinhado à direita.

### 9.4 Chat Bubble (FAB)

- Posição: fixo, bottom-right
- Tamanho: 56x56px
- Background: `dark`
- Radius: `radius-full`
- Shadow: `shadow-xl`
- Ícone: 💬 centralizado (24px)
- Indicador de notificação: 14x14px, `primary`, radius-full, borda 2px `white`, posição top-right

---

## 10. Padrões de Interação

### 10.1 Feedback Visual

- Sucesso: toast verde com ícone ✅, duração 3s, posição top-right
- Erro: toast vermelho com ícone ✕, duração 5s
- Loading: skeleton com background `gray-100` e animação shimmer

### 10.2 Transições

- Padrão: `all 150ms ease`
- Sidebar collapse: `width 200ms ease`
- Toggle: `left 200ms ease`
- Cards no load: fade-in com translateY(8px), 400ms ease-out, delay escalonado de 50ms

### 10.3 Responsividade

| Breakpoint | Comportamento |
|---|---|
| ≥ 1024px | Sidebar expandida + grid 4 colunas |
| 768-1023px | Sidebar compacta + grid 2 colunas |
| < 768px | Sidebar oculta (hamburger) + grid 1 coluna |

---

## 11. Tailwind Config

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        lima: {
          DEFAULT: '#D4F400',
          hover: '#BDD900',
          muted: '#D4F40020',
        },
        dark: {
          DEFAULT: '#0D0D0D',
          soft: '#1A1A1A',
        },
        gray: {
          50: '#F9F9F9',
          100: '#F2F2F2',
          200: '#E5E5E5',
          400: '#9E9E9E',
          600: '#6B6B6B',
          900: '#2D2D2D',
        },
        success: {
          DEFAULT: '#22C55E',
          muted: '#22C55E15',
        },
        danger: {
          DEFAULT: '#EF4444',
          muted: '#EF444415',
        },
        warning: {
          DEFAULT: '#F59E0B',
          muted: '#F59E0B15',
        },
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.04)',
        md: '0 2px 8px rgba(0,0,0,0.06)',
        lg: '0 4px 16px rgba(0,0,0,0.08)',
        xl: '0 8px 32px rgba(0,0,0,0.10)',
      },
    },
  },
};
```

---

## 12. Checklist de Implementação

- [ ] Instalar fontes (Outfit, DM Sans, JetBrains Mono)
- [ ] Configurar CSS variables ou Tailwind config
- [ ] Criar componentes base: Button, Input, Badge, Toggle, Tabs
- [ ] Criar componentes compostos: TransactionCard, StatCard, AlertCard
- [ ] Implementar Sidebar com estado colapsável
- [ ] Implementar layout do Dashboard (header + stats + lista)
- [ ] Implementar Chat Bubble (FAB)
- [ ] Configurar breakpoints responsivos
- [ ] Adicionar animações de entrada (fade-in escalonado)
- [ ] Testar acessibilidade (contraste, focus states, screen reader)
