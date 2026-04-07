# Roadmap — LemonFin (Assistente Financeiro via WhatsApp)

**Baseado em:** PRD v2.1 + Design System v1.0
**Data de criacao:** Abril 2026
**Duracao total estimada:** 20 semanas (~5 meses)

---

## Visao Geral das Fases

```
FASE 1 — MVP                    Semanas 1-6    ████████████████████
FASE 2 — Dashboard + WA Adv.    Semanas 7-10   ████████████
FASE 3 — Inteligencia           Semanas 11-14  ████████████
FASE 4 — Monetizacao            Semanas 15-20  ████████████████████
```

---

## FASE 1 — MVP (Semanas 1-6)

**Objetivo:** Validar a hipotese central — pessoas registram gastos com mais consistencia via WhatsApp.

**Criterio de saida:** >= 50 usuarios beta ativos, >= 85% de acuracia no parsing, feedback qualitativo positivo.

---

### Sprint 1 (Semanas 1-2): Fundacao

**Foco:** Setup do projeto, infraestrutura e autenticacao.

| # | Tarefa | Stack/Detalhe | Entregavel |
|---|--------|---------------|------------|
| 1.1 | Setup do repositorio (monorepo ou separado) | Git, CI basico | Repo(s) configurado(s) |
| 1.2 | Setup Frontend — Next.js 14+ (App Router) | Next.js, TailwindCSS, Jotai, Zod | Projeto rodando localmente |
| 1.3 | Configurar Design System no Tailwind | Cores, fontes (Outfit, DM Sans, JetBrains Mono), espacamento, radius, shadows conforme design-system.md | `tailwind.config.js` completo |
| 1.4 | Instalar e configurar fontes | Google Fonts: Outfit, DM Sans, JetBrains Mono | Fontes carregando corretamente |
| 1.5 | Setup Backend — NestJS + Prisma + PostgreSQL | NestJS, Prisma ORM, PostgreSQL | API rodando com banco conectado |
| 1.6 | Modelagem do banco de dados | Users, Transactions, Categories (pre-definidas) | Schema Prisma + migrations |
| 1.7 | Autenticacao — NextAuth (email/senha) | NextAuth, JWT | Login/registro funcionando |
| 1.7a | Telefone internacional no registro | react-international-phone (seletor de pais) | Campo com bandeira e codigo |
| 1.7b | Toggle de visibilidade da senha | Icone olho (Eye/EyeOff) nos campos de senha | UX de senha melhorada |
| 1.7c | Validacao de telefone duplicado | Mensagem amigavel ao tentar cadastrar telefone ja usado | Conflito tratado |
| 1.7d | Mensagem de boas-vindas via WhatsApp | Envio automatico ao registrar com telefone (via WMode API) | Onboarding no WhatsApp |
| 1.8 | Componentes base do Design System | Button (5 variantes), Input, Badge, Toggle, Tabs | Componentes reutilizaveis prontos |
| 1.9 | Layout base — Sidebar + Header | Sidebar colapsavel (220px/64px), header com titulo e acoes | Layout navegavel |

**Definicao de pronto:** Projeto full-stack rodando, usuario consegue se cadastrar e fazer login, layout base com design system aplicado.

---

### Sprint 2 (Semanas 3-4): WhatsApp + Registro de Transacoes

**Foco:** Integracao com WMode Connect e parsing de mensagens com IA.

| # | Tarefa | Stack/Detalhe | Entregavel |
|---|--------|---------------|------------|
| 2.1 | Configurar instancia WMode Connect para o LemonFin | WMode API (plataforma propria, NestJS + Baileys) | WMode rodando e acessivel |
| 2.2 | Criar sessao WhatsApp e parear via QR code | WMode: `POST /api/v1/sessions` + `GET /sessions/:id/qr` | Numero conectado (status CONNECTED) |
| 2.3 | Gerar API Key na WMode para o backend LemonFin | WMode: `POST /api/v1/api-keys` | Chave `wmc_*` para autenticacao |
| 2.4 | Registrar webhook na WMode → backend LemonFin | WMode: `POST /api/v1/webhooks` (evento `message.received`, com HMAC secret) | Webhook ativo com signature |
| 2.5 | Endpoint de webhook no backend LemonFin | `POST /whatsapp/webhook` — controller + verificacao HMAC + use case | Recebe e processa mensagens |
| 2.6 | Servico de envio de mensagens via WMode | Chamar WMode `POST /api/v1/messages/send` com header `X-Api-Key` | Backend consegue responder no WhatsApp |
| 2.7 | Parsing de mensagens com LLM | OpenAI/Anthropic API → JSON: `{ valor, categoria, tipo }` | Parsing funcionando com > 85% acuracia |
| 2.8 | Logica de confianca e confirmacao | Se confianca < 80%, pedir confirmacao ao usuario | Fluxo de confirmacao via WhatsApp |
| 2.9 | Fallback para mensagens nao reconhecidas | Log + resposta: "Nao entendi. Ex: 'Gastei 50 no mercado'" | Mensagens logadas para melhoria |
| 2.10 | Categorias pre-definidas (seed) | Alimentacao, Transporte, Moradia, Saude, Lazer, Educacao, Compras, Salario, Freelance, Outros | 10 categorias no banco |
| 2.11 | CRUD de transacoes no backend | Controllers, Use Cases, DTOs, Repositories (DDD) | Endpoints REST funcionais |

**Mensagens suportadas:**
- "Gastei 50 no mercado" → Saida, R$ 50, Alimentacao
- "Almocei 32 reais" → Saida, R$ 32, Alimentacao
- "Uber 18,50" → Saida, R$ 18,50, Transporte
- "Recebi 5500 de salario" → Entrada, R$ 5.500, Salario
- "Paguei 120 de luz" → Saida, R$ 120, Moradia

**Tempo de resposta alvo:** < 5 segundos.

**Definicao de pronto:** Usuario envia mensagem no WhatsApp e transacao e criada automaticamente com confirmacao.

---

### Sprint 3 (Semanas 5-6): Painel Web de Transacoes

**Foco:** Interface web para visualizacao e gestao de transacoes.

| # | Tarefa | Stack/Detalhe | Entregavel |
|---|--------|---------------|------------|
| 3.1 | Pagina de transacoes — lista | TransactionCard conforme design system (icone + nome + metadata + valor) | Lista funcional |
| 3.2 | Filtros combinados | Por periodo, categoria, tipo (entrada/saida) | Filtros funcionando combinados |
| 3.3 | Totalizadores | Entradas, saidas, saldo do mes | Cards de stat no topo |
| 3.4 | Edicao de transacao | Modal ou inline edit | Editar valor, categoria, data |
| 3.5 | Exclusao de transacao | Confirmacao antes de deletar (botao Danger) | Deletar com feedback |
| 3.6 | Formulario manual de registro | Formulario simples como fallback | Nova transacao via web |
| 3.7 | Atualizacao em tempo real | Polling 30s ou WebSocket | Lista atualiza apos registro via WhatsApp |
| 3.8 | Responsividade | Breakpoints: >= 1024px, 768-1023px, < 768px | Funciona em mobile e desktop |
| 3.9 | Feedback visual | Toasts (sucesso/erro), skeletons, animacoes de entrada | UX polida |
| 3.10 | Testes basicos | E2E no fluxo critico (registro → lista) | Cobertura minima do fluxo principal |

**Definicao de pronto:** Painel web completo mostrando transacoes com filtros, edicao e responsividade. Pronto para beta.

---

## FASE 2 — Dashboard + WhatsApp Avancado (Semanas 7-10)

**Objetivo:** Dar visibilidade financeira ao usuario e expandir capacidades do WhatsApp.

**Criterio de saida:** Retencao D14 >= 30%, >= 200 transacoes/semana na base.

---

### Sprint 4 (Semanas 7-8): Dashboard Financeiro

| # | Tarefa | Stack/Detalhe | Entregavel |
|---|--------|---------------|------------|
| 4.1 | Card de saldo principal (dark) | Outfit 36px, centavos menores, entradas/saidas abaixo | Card de saldo no topo |
| 4.2 | Stats Row (grid 4 colunas) | Saldo, Entradas, Saidas, Economia | 4 stat cards |
| 4.3 | Grafico de gastos mensais (barras) | Barras `dark`, mes atual em `primary` (#D4F400), 120px altura | Grafico de barras |
| 4.4 | Breakdown por categoria | Progress bars horizontais com cores das categorias | Ranking de categorias |
| 4.5 | Top 3 categorias de gasto | Destaque visual | Insight rapido |
| 4.6 | Evolucao mensal (grafico de linha) | Comparativo mes a mes | Tendencia de gastos |
| 4.7 | Transacoes recentes no dashboard | Ultimas 5-10 transacoes com link "Ver todas" | Lista resumida |
| 4.8 | Layout completo do dashboard | Header + Stats + Graficos + Lista conforme design system | Pagina principal |

**Definicao de pronto:** Dashboard funcional com saldo, graficos e ranking de categorias.

---

### Sprint 5 (Semanas 9-10): WhatsApp Avancado + Cartoes

| # | Tarefa | Stack/Detalhe | Entregavel |
|---|--------|---------------|------------|
| 5.1 | Consultas via WhatsApp | "Quanto gastei esse mes?", "Quanto gastei com delivery?" | Respostas a consultas |
| 5.2 | Correcoes via WhatsApp | "Cancela o ultimo gasto", "O ultimo era 45, nao 50" | Edicao/exclusao por mensagem |
| 5.3 | Parcelamento | "Comprei tenis de 300 em 3x" → gera 3 transacoes de R$100 com datas futuras | Parcelamento automatico |
| 5.4 | Cadastro de cartoes | Nome, bandeira, limite, dia de fechamento | CRUD de cartoes |
| 5.5 | Visualizacao de fatura por cartao | Lista de transacoes filtradas por cartao | Pagina de faturas |
| 5.6 | Associacao de transacoes a cartoes | Via WhatsApp: "300 em 3x no Nubank" | Transacao vinculada ao cartao |
| 5.7 | Modelagem de banco (cards, invoices) | Entidades Card e Invoice no Prisma | Migrations atualizadas |
| 5.8 | Edicao de perfil do usuario | GET/PATCH /users/me, secao em Configuracoes (nome, telefone) | Perfil editavel |

**Definicao de pronto:** WhatsApp suporta consultas, correcoes e parcelamentos. Cartoes cadastrados com faturas visiveis.

---

## FASE 3 — Inteligencia (Semanas 11-14)

**Objetivo:** Transformar dados em insights acionaveis e trazer IA proativa ao usuario.

**Criterio de saida:** Retencao D30 >= 25%, NPS >= 40, demanda qualitativa por features premium.

---

### Sprint 6 (Semanas 11-12): Agente de IA no App

| # | Tarefa | Stack/Detalhe | Entregavel |
|---|--------|---------------|------------|
| 6.1 | Chat Bubble (FAB) | 56x56px, background `dark`, shadow-xl, radius-full, posicao bottom-right | Botao flutuante |
| 6.2 | Interface de chat embutida | Painel de conversa com historico | Tela de chat |
| 6.3 | Integracao AI SDK (Vercel) | Streaming de respostas, contexto financeiro do usuario | Chat funcional |
| 6.4 | Contexto financeiro para a IA | Transacoes, saldo, categorias, historico mensal | IA com acesso aos dados |
| 6.5 | Analise comparativa | "Estou gastando muito?" → compara com meses anteriores | Resposta inteligente |
| 6.6 | Sugestoes de economia | "Onde posso economizar?" → padroes identificados | Insights acionaveis |
| 6.7 | Projecoes | "Consigo guardar 500 esse mes?" → projecao baseada em gastos | Resposta com projecao |

**Definicao de pronto:** Chat no app funcionando com respostas contextualizadas sobre a vida financeira do usuario.

---

### Sprint 7 (Semanas 13-14): Insights e Alertas Proativos

| # | Tarefa | Stack/Detalhe | Entregavel |
|---|--------|---------------|------------|
| 7.1 | Alertas proativos via WhatsApp | "Voce ja gastou 80% do delivery do mes passado e faltam 12 dias" | Alertas automaticos |
| 7.2 | Resumo semanal automatico | Enviado domingo a noite via WhatsApp | Mensagem recorrente |
| 7.3 | Comparativo mensal | Mes atual vs anterior, categorias que mais cresceram | Insight comparativo |
| 7.4 | Card de alerta no dashboard | Background warning-muted, icone + titulo + descricao | Alertas visuais |
| 7.5 | Pagina de insights | Consolidacao de analises e tendencias | Pagina dedicada |
| 7.6 | Indicador de notificacao no chat bubble | Badge 14x14px, primary, radius-full no FAB | Notificacao visual |
| 7.7 | Scheduler para alertas/resumos | Cron job ou queue | Envio automatizado |

**Definicao de pronto:** Usuario recebe insights proativos no WhatsApp e no app, sem precisar pedir.

---

## FASE 4 — Refinamento e Monetizacao (Semanas 15-20)

**Objetivo:** Polir a experiencia, implementar modelo de receita e preparar para lancamento.

---

### Sprint 8 (Semanas 15-16): Features Premium

| # | Tarefa | Stack/Detalhe | Entregavel |
|---|--------|---------------|------------|
| 8.1 | Importacao de fatura via PDF | Upload + parsing de PDF de cartao de credito | Importacao automatica |
| 8.2 | Metas financeiras | "Quero gastar no maximo 800 com alimentacao" | Definicao e acompanhamento de metas |
| 8.3 | Score de disciplina financeira | Algoritmo baseado em consistencia de registro, gastos vs metas | Score visivel no dashboard |
| 8.4 | Limites e controle de uso (plano gratuito) | 30 transacoes/mes WhatsApp, 5 msgs/mes chat IA | Enforcement de limites |

---

### Sprint 9 (Semanas 17-18): Monetizacao e Onboarding

| # | Tarefa | Stack/Detalhe | Entregavel |
|---|--------|---------------|------------|
| 9.1 | Plano Premium (R$ 14,90/mes) | Gateway de pagamento (Stripe/Asaas) | Checkout e assinatura |
| 9.2 | Trial de 90 dias (primeiros 500 usuarios) | Controle de trial por data de cadastro | Trial automatico |
| 9.3 | Tela de planos e upgrade | Comparativo Gratuito vs Premium | Pagina de pricing |
| 9.4 | Onboarding guiado | Wizard: conectar WhatsApp → registrar 1a transacao → ver dashboard | Fluxo de primeira experiencia |
| 9.5 | E-mails transacionais | Boas-vindas, fim do trial, confirmacao de pagamento | Comunicacao por email |

**Modelo Freemium:**

| | Gratuito | Premium (R$ 14,90/mes) |
|---|---|---|
| Transacoes WhatsApp | 30/mes | Ilimitadas |
| Dashboard basico | Sim | Sim |
| Graficos e insights | Limitado | Completo |
| Chat IA | 5 msgs/mes | Ilimitado |
| Alertas proativos | Nao | Sim |
| Import PDF | Nao | Sim |
| Resumo semanal | Nao | Sim |

---

### Sprint 10 (Semanas 19-20): Polimento e Lancamento

| # | Tarefa | Stack/Detalhe | Entregavel |
|---|--------|---------------|------------|
| 10.1 | Polimento de UX | Animacoes (fade-in, transicoes), estados de loading, empty states | Experiencia fluida |
| 10.2 | Performance | Otimizacao de queries, caching, lazy loading | Tempo de resposta otimizado |
| 10.3 | Seguranca | Criptografia em transito/repouso, isolamento por tenant, audit | Compliance basica |
| 10.4 | Testes e QA | Testes E2E, testes de integracao, testes de parsing | Cobertura de testes |
| 10.5 | Acessibilidade | Contraste, focus states, screen reader | Acessibilidade basica |
| 10.6 | Deploy e infraestrutura | Vercel (front), Railway/Fly.io (back), Supabase/Neon (DB) | Producao |
| 10.7 | Monitoramento | Logs, error tracking (Sentry), metricas | Observabilidade |
| 10.8 | Landing page + lancamento | Pagina de conversao + lancamento para primeiros usuarios | Go to market |

**Definicao de pronto:** Produto em producao, aceitando usuarios reais, com monetizacao ativa.

---

## Metricas de Sucesso (3 meses pos-lancamento)

| Metrica | Meta |
|---------|------|
| Transacoes via WhatsApp / total | > 60% |
| Retencao D30 | > 40% |
| Cobertura de gastos registrados | > 70% |
| NPS | > 50 |
| Conversao para pagante | > 5% da base |

---

## Backlog Futuro (pos-Fase 4)

- Open Finance (integracao bancaria direta)
- Multi-contas e multi-cartoes avancado
- Gamificacao (streaks de registro, conquistas)
- Planejamento de orcamento mensal
- ~~Compartilhamento de controle (casais/familias)~~ ✅ Implementado
- App mobile (React Native) — Apple Store + Play Store com mesmo codigo
- Telegram como canal alternativo

---

## Stack Tecnica Completa

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14+ (App Router), TailwindCSS, Jotai, Zod |
| Auth | NextAuth (email/senha, JWT) |
| Backend | NestJS (DDD), Prisma ORM |
| Banco | PostgreSQL |
| WhatsApp | WMode Connect (plataforma propria, NestJS + Baileys + BullMQ + Redis) |
| IA (parsing) | OpenAI / Anthropic API (modelos menores para custo) |
| IA (chat) | AI SDK (Vercel) |
| Pagamento | Stripe ou Asaas |
| Deploy | Vercel + Railway/Fly.io + Neon/Supabase |

---

## Riscos Criticos

| Risco | Mitigacao |
|-------|----------|
| Parsing incorreto de mensagens | Confirmacao quando confianca < 80%, log de erros, fallback manual |
| Ban do numero WhatsApp (API nao oficial) | Anti-ban da WMode (delay 5-15s, typing simulation, presence modes). Numero reserva pronto. Telegram no backlog |
| Instabilidade da conexao WMode | Health check a cada 30s com reconexao automatica. Monitoramento via metricas e BullBoard |
| Custo de IA por usuario | Modelos menores (Haiku/GPT-4o-mini), cache de padroes, limites no plano free |
| Seguranca de dados financeiros | Criptografia, isolamento por tenant, nao armazenar dados bancarios no MVP |
| Baixa retencao apos 30 dias | Alertas proativos, resumo semanal, iterar agressivamente |
