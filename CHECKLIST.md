# Checklist — LemonFin

**Ultima atualizacao:** Abril 2026
**Legenda:** ` ` = pendente | `x` = concluido | `-` = cancelado/adiado

---

## FASE 1 — MVP (Semanas 1-6)

### Sprint 1: Fundacao (Semanas 1-2)

**Setup & Infraestrutura**

- [x] Criar repositorio(s) Git
- [ ] Configurar CI basico (lint, build)
- [x] Setup Next.js 14+ com App Router
- [x] Instalar e configurar TailwindCSS
- [x] Instalar e configurar Jotai (estado)
- [x] Instalar e configurar Zod (validacao)
- [x] Setup NestJS
- [x] Configurar Prisma ORM
- [x] Configurar PostgreSQL (local + cloud)
- [x] Criar schema Prisma inicial (Users, Transactions, Categories)
- [x] Rodar migrations iniciais

**Design System**

- [x] Instalar fontes: Outfit, DM Sans, JetBrains Mono
- [x] Configurar `tailwind.config.js` com cores do design system
- [x] Configurar tokens de espacamento e border-radius
- [x] Configurar shadows customizadas
- [x] Configurar CSS variables (`:root`)
- [x] Criar componente: Button (Primary, Secondary, Outline, Ghost, Danger)
- [x] Criar componente: Input (com prefixo monetario R$)
- [x] Criar componente: Badge/Tag (categorias + status financeiro)
- [x] Criar componente: Tabs
- [x] Criar componente: Toggle
- [x] Criar componente: Avatar

**Autenticacao**

- [x] Instalar e configurar NextAuth
- [x] Implementar login com email/senha
- [x] Configurar sessao com JWT
- [x] Criar pagina de login
- [x] Criar pagina de registro
- [x] Proteger rotas autenticadas
- [x] UX do registro: spinner animado no botao, toast de sucesso, toast de boas-vindas no dashboard
- [x] Campo de telefone opcional no registro (mascara brasileira, validacao 10-11 digitos)
- [x] Telefone internacional no registro (react-international-phone com seletor de pais)
- [x] Toggle de visibilidade da senha no registro (icone olho)
- [x] Validacao de telefone duplicado no registro (mensagem amigavel)
- [x] Mensagem de boas-vindas via WhatsApp ao registrar com telefone

**Layout Base**

- [x] Implementar Sidebar expandida (220px)
- [x] Implementar Sidebar compacta (64px)
- [x] Implementar toggle de colapso da Sidebar
- [x] Adicionar itens de navegacao (Home, Transacoes, Categorias, Cartoes, Insights, Config)
- [x] Implementar Header do conteudo (titulo + acoes)
- [x] Implementar responsividade da Sidebar (oculta em < 768px)
- [x] Adicionar footer da Sidebar (avatar + nome + email)

---

### Sprint 2: WhatsApp + Registro de Transacoes (Semanas 3-4)

**Integracao WMode Connect**

- [x] Subir instancia WMode Connect (ou garantir que esta rodando)
- [x] Criar sessao WhatsApp: `POST /api/v1/sessions`
- [x] Parear numero via QR code: `GET /api/v1/sessions/:id/qr`
- [x] Confirmar status CONNECTED: `GET /api/v1/sessions/:id`
- [x] Gerar API Key para o backend LemonFin: `POST /api/v1/api-keys`
- [x] Registrar webhook na WMode: `POST /api/v1/webhooks` (evento `message.received`, com HMAC secret)
- [x] Testar recebimento de mensagens no backend LemonFin via webhook

**Backend — Modulo WhatsApp**

- [x] Criar modulo `whatsapp/` no NestJS
- [x] Criar controller: `POST /whatsapp/webhook` (recebe eventos da WMode)
- [x] Implementar verificacao de HMAC signature (`X-Webhook-Signature: sha256=...`)
- [x] Criar use case: processar mensagem recebida
- [x] Criar servico de envio: chamar WMode `POST /api/v1/messages/send` com header `X-Api-Key`
- [x] Criar DTOs de entrada e saida
- [x] Implementar deduplicacao de mensagens (TTL 5min)

**Parsing com IA**

- [x] Escolher provedor de IA (Google Gemini 2.0 Flash)
- [x] Criar servico de parsing de mensagens
- [x] Implementar prompt para extrair: valor, categoria, tipo (entrada/saida)
- [x] Retornar JSON estruturado: `{ valor, categoria, tipo, confianca }`
- [ ] Testar com mensagens basicas ("Gastei 50 no mercado", "Uber 18,50", etc.)
- [ ] Validar acuracia >= 85% em mensagens simples
- [ ] Implementar logica de confianca (< 80% → pedir confirmacao)
- [x] Implementar resposta de confirmacao: "Entendi: R$ 50 em Alimentacao. Confirma?"
- [x] Implementar fallback: "Nao entendi. Ex: 'Gastei 50 no mercado'"
- [ ] Logar mensagens nao reconhecidas para analise

**Backend — Modulo Transacoes**

- [x] Criar modulo `transactions/` no NestJS
- [x] Criar entidade Transaction
- [x] Criar repository (Prisma)
- [x] Criar use case: criar transacao
- [x] Criar use case: listar transacoes (com filtros)
- [x] Criar use case: editar transacao
- [x] Criar use case: deletar transacao
- [x] Criar DTOs com validacao
- [x] Criar controller com endpoints REST
- [x] Criar use case: summary (totais de entrada/saida/saldo)

**Backend — Categorias**

- [x] Criar modulo `categories/`
- [x] Seed com 10 categorias: Alimentacao, Transporte, Moradia, Saude, Lazer, Educacao, Compras, Salario, Freelance, Outros
- [x] Endpoint para listar categorias

**Resposta WhatsApp**

- [x] Enviar confirmacao via WMode API: "Registrado: R$ 50,00 em Alimentacao"
- [ ] Validar tempo de resposta < 5 segundos (ponta a ponta)
- [ ] Confirmar que anti-ban da WMode esta ativo (delay + typing simulation)

---

### Sprint 3: Painel Web de Transacoes (Semanas 5-6)

**Lista de Transacoes**

- [x] Criar pagina `/transacoes`
- [x] Criar componente TransactionCard (icone + nome + metadata + valor)
- [x] Aplicar cores semanticas (danger para saida, success para entrada)
- [x] Implementar lista com separadores (borda bottom gray-100)
- [x] Implementar skeleton loading (shimmer)
- [x] Implementar empty state (sem transacoes)

**Filtros**

- [x] Filtro por periodo (date range picker)
- [x] Filtro por categoria (select/dropdown)
- [x] Filtro por tipo (entrada/saida — tabs)
- [x] Filtros funcionando combinados

**Totalizadores**

- [x] Card de stat: total de entradas
- [x] Card de stat: total de saidas
- [x] Card de stat: saldo do mes
- [x] Layout grid de stats (2-4 colunas responsivo)

**CRUD via Web**

- [x] Modal/formulario de edicao de transacao
- [x] Confirmacao antes de excluir (botao Danger)
- [x] Formulario de registro manual (fallback)
- [x] Validacao com Zod nos formularios

**Tempo Real**

- [x] Implementar polling (30s) ou WebSocket
- [x] Lista atualiza apos registro via WhatsApp

**UX e Responsividade**

- [x] Toast de sucesso (verde, 3s, top-right)
- [x] Toast de erro (vermelho, 5s)
- [x] Animacoes de entrada (fade-in + translateY, 400ms, delay escalonado)
- [x] Layout responsivo: >= 1024px (grid 4 col)
- [x] Layout responsivo: 768-1023px (grid 2 col)
- [x] Layout responsivo: < 768px (grid 1 col, sidebar hamburger)

**Testes**

- [ ] Teste E2E: registro via WhatsApp → aparece na lista
- [ ] Teste E2E: filtrar transacoes
- [ ] Teste E2E: editar e excluir transacao

---

## FASE 2 — Dashboard + WhatsApp Avancado (Semanas 7-10)

> **Go/No-Go:** >= 50 usuarios beta ativos, >= 85% acuracia, feedback positivo

### Sprint 4: Dashboard Financeiro (Semanas 7-8)

**Cards de Saldo**

- [x] Card de saldo principal (dark): Outfit 36px, centavos menores em gray-400
- [x] Subtotais (entradas/saidas) com cores semanticas
- [x] Stats Row: grid 4 colunas (Saldo, Entradas, Saidas, Economia)
- [x] Variacao percentual com seta direcional (up/down)

**Graficos**

- [x] Grafico de barras: gastos mensais (barras dark, mes atual primary)
- [x] Radius das barras: 4px topo arredondado
- [x] Labels eixo X: 10px gray-400
- [x] Breakdown por categoria: progress bars horizontais (6px, cores das categorias)
- [x] Top 3 categorias de gasto em destaque
- [x] Grafico de linha: evolucao mensal

**Layout Dashboard**

- [x] Montar pagina `/dashboard` com Header + Stats + Graficos + Lista recente
- [x] Transacoes recentes (ultimas 5-10) com link "Ver todas"
- [x] Responsividade do dashboard

---

### Sprint 5: WhatsApp Avancado + Cartoes (Semanas 9-10)

> Todas as respostas WhatsApp sao enviadas via WMode API (`POST /api/v1/messages/send`)

**WhatsApp — Consultas**

- [x] "Quanto gastei esse mes?" → retorna total de saidas
- [x] "Quanto gastei com delivery?" → retorna total filtrado por categoria
- [x] "Quanto gastei essa semana?" → retorna total do periodo

**WhatsApp — Correcoes**

- [x] "Cancela o ultimo gasto" → deleta ultima transacao
- [x] "O ultimo era 45, nao 50" → edita valor da ultima transacao
- [x] Confirmacao antes de cancelar/editar

**WhatsApp — Parcelamento**

- [x] "Comprei tenis de 300 em 3x" → gera 3 transacoes de R$100
- [x] "Comprei tenis de 300 em 3x no Nubank" → vincula ao cartao
- [x] Datas futuras corretas para cada parcela

**Cartoes**

- [x] Schema Prisma: Card (nome, bandeira, limite, dia de fechamento)
- [x] Schema Prisma: Invoice
- [x] Migration e seed
- [x] CRUD de cartoes no backend
- [x] Pagina de cartoes no frontend
- [x] Formulario de cadastro de cartao
- [x] Visualizacao de fatura por cartao
- [x] Associacao de transacoes a cartoes
- [x] Totalizador de fatura aberta

---

## FASE 3 — Inteligencia (Semanas 11-14)

> **Go/No-Go:** Retencao D14 >= 30%, >= 200 transacoes/semana na base

### Sprint 6: Agente de IA no App (Semanas 11-12)

**Chat Bubble (FAB)**

- [x] Botao flutuante: 56x56px, dark, shadow-xl, radius-full, bottom-right
- [x] Icone centralizado (24px)
- [x] Indicador de notificacao: 14x14px, primary, radius-full
- [x] Abrir/fechar painel de chat

**Interface de Chat**

- [x] Painel de conversa (slide-up ou lateral)
- [x] Historico de mensagens
- [x] Input de mensagem
- [x] Indicador de "digitando..."
- [x] Scroll automatico

**Integracao IA**

- [x] Instalar AI SDK (Vercel)
- [x] Configurar endpoint de streaming
- [x] Injetar contexto financeiro do usuario (transacoes, saldo, categorias, historico)
- [x] "Estou gastando muito?" → analise comparativa com meses anteriores
- [x] "Onde posso economizar?" → sugestoes baseadas em padroes
- [x] "Consigo guardar 500 esse mes?" → projecao com base nos gastos atuais
- [x] Tratar respostas que fogem do escopo financeiro
- [x] Detectar filtros temporais na mensagem ("hoje", "ontem", "semana passada")
- [x] Injetar transacoes do periodo especifico no contexto da AI
- [x] Function calling: permitir que o Gemini consulte transacoes por data sob demanda

---

### Sprint 7: Insights e Alertas Proativos (Semanas 13-14)

**Alertas via WhatsApp (enviados via WMode API)**

- [x] Alerta: "Voce ja gastou X% do que gastou com [categoria] no mes passado"
- [x] Definir thresholds de alerta (ex: 80% do gasto anterior)
- [x] Scheduler/cron para verificar e enviar alertas via WMode `POST /api/v1/messages/send`

**Resumo Semanal (enviado via WMode API)**

- [x] Template do resumo: total gasto, top categorias, comparativo
- [x] Envio automatico domingo a noite via WMode API
- [x] Cron job configurado

**Comparativo Mensal**

- [x] Mes atual vs anterior
- [x] Categorias que mais cresceram/diminuiram
- [x] Envio no inicio de cada mes via WMode API

**Dashboard — Insights**

- [x] Card de alerta no dashboard (warning-muted)
- [x] Pagina dedicada de insights `/insights`
- [x] Consolidacao de analises e tendencias

---

## FASE 4 — Refinamento e Monetizacao (Semanas 15-20)

> **Go/No-Go:** Retencao D30 >= 25%, NPS >= 40, demanda por features premium

### Sprint 8: Features Premium (Semanas 15-16)

**Importacao de Fatura PDF**

- [ ] Servico de parsing PDF (pdf-parse + AI para extrair transacoes)
- [ ] Adicionar `PDF` ao enum `TransactionSource` no schema
- [ ] Endpoint de importacao em lote (`POST /transactions/import`)
- [ ] Receber PDF via WhatsApp (detectar midia no webhook WMode)
- [ ] Baixar PDF da URL do WMode e processar
- [ ] Resumo e confirmacao pelo usuario no WhatsApp
- [ ] Upload de PDF pela web (tela de importacao)
- [ ] Tela de revisao/edicao antes de confirmar (web)
- [ ] Mapeamento automatico de categorias via AI
- [ ] Salvar transacoes importadas em lote

**Metas Financeiras**

- [x] CRUD de metas ("Maximo 800 com alimentacao")
- [x] Acompanhamento de progresso (progress bar)
- [x] Alerta ao se aproximar do limite
- [x] Exibicao no dashboard

**Score de Disciplina**

- [ ] Algoritmo: consistencia de registro + gastos vs metas + tendencias
- [ ] Exibicao no dashboard (score numerico ou visual)
- [ ] Historico de evolucao do score

**Limites do Plano Gratuito**

- [ ] Contador de transacoes WhatsApp (limite: 30/mes)
- [ ] Contador de mensagens do chat IA (limite: 5/mes)
- [ ] Bloquear graficos/insights avancados
- [ ] Bloquear alertas proativos
- [ ] Bloquear importacao PDF
- [ ] Bloquear resumo semanal
- [ ] Tela de upgrade quando atingir limite

---

### Sprint 9: Monetizacao e Onboarding (Semanas 17-18)

**Pagamento**

- [ ] Escolher gateway (Stripe / Asaas)
- [ ] Integrar checkout de assinatura
- [ ] Plano Premium: R$ 14,90/mes
- [ ] Webhook de confirmacao de pagamento
- [ ] Webhook de cancelamento
- [ ] Gestao de status da assinatura no banco

**Trial**

- [ ] Trial de 90 dias para primeiros 500 usuarios
- [ ] Controle por data de cadastro
- [ ] Notificacao de fim do trial (7 dias antes, 1 dia antes, no dia)
- [ ] Transicao automatica para plano gratuito apos trial

**Paginas**

- [ ] Pagina de planos e pricing (comparativo Free vs Premium)
- [ ] Pagina de configuracoes da conta
- [ ] Historico de pagamentos

**Onboarding**

- [ ] Wizard step 1: boas-vindas e explicacao do produto
- [ ] Wizard step 2: conectar WhatsApp (instrucoes)
- [ ] Wizard step 3: registrar primeira transacao
- [ ] Wizard step 4: ver dashboard
- [ ] Marcar onboarding como concluido

**E-mails**

- [ ] E-mail de boas-vindas
- [ ] E-mail de fim do trial
- [ ] E-mail de confirmacao de pagamento
- [ ] E-mail de cancelamento

---

### Sprint 10: Polimento e Lancamento (Semanas 19-20)

**UX / UI**

- [ ] Revisar todas as animacoes (fade-in, transicoes 150ms)
- [ ] Revisar todos os estados de loading (skeletons)
- [ ] Revisar todos os empty states
- [ ] Revisar todos os estados de erro
- [ ] Consistencia visual com design system em todas as paginas

**Performance**

- [ ] Otimizar queries do banco (indices, paginacao)
- [ ] Implementar caching onde necessario
- [ ] Lazy loading de componentes pesados
- [ ] Otimizar bundle size (code splitting)
- [ ] Tempo de resposta WhatsApp < 5s consistente

**Seguranca**

- [ ] HTTPS em todos os endpoints
- [ ] Criptografia em transito e em repouso
- [ ] Isolamento por tenant (usuario so acessa seus dados)
- [ ] Rate limiting nos endpoints publicos
- [ ] Sanitizacao de inputs
- [ ] Audit log de acoes sensíveis
- [ ] Revisao OWASP Top 10

**Testes**

- [ ] Testes E2E: fluxo completo (registro → WhatsApp → dashboard → insights)
- [ ] Testes de integracao: WhatsApp → Backend → Banco
- [ ] Testes de parsing: bateria de mensagens variadas
- [ ] Testes de pagamento: checkout, webhook, cancelamento
- [ ] Teste de carga basico

**Acessibilidade**

- [ ] Verificar contrastes de cor (WCAG AA)
- [ ] Focus states em todos os elementos interativos
- [ ] Labels e aria-attributes nos formularios
- [ ] Navegacao por teclado funcional
- [ ] Teste com screen reader basico

**Deploy e Infra**

- [ ] Deploy frontend (Vercel)
- [ ] Deploy backend LemonFin (Railway / Fly.io)
- [ ] Deploy WMode Connect (garantir que esta acessivel pelo backend LemonFin)
- [ ] Deploy banco (Neon / Supabase)
- [ ] Deploy Redis (para filas da WMode)
- [ ] Configurar dominios e DNS
- [ ] Configurar SSL
- [ ] Configurar variaveis de ambiente de producao (incluindo WMode API Key e Webhook Secret)

**Monitoramento**

- [ ] Error tracking (Sentry)
- [ ] Logs estruturados
- [ ] Metricas de uso (analytics)
- [ ] Alertas de downtime
- [ ] Dashboard de metricas do produto

**Lancamento**

- [ ] Landing page
- [ ] Textos e copy finais
- [ ] Fluxo de sign-up publico
- [ ] Comunicacao para primeiros usuarios (beta → publico)
- [ ] Acompanhar metricas pos-lancamento

---

## CONTA FAMILIAR — Compartilhamento entre membros

### Modelo de dados

- [x] Modelo `Family` no Prisma (id, name, code unico 8 chars, ownerId)
- [x] Modelo `FamilyMember` no Prisma (id, role OWNER/ADMIN/MEMBER, userId, familyId)
- [x] Relacoes no User: ownedFamilies, familyMembers
- [x] Migration aplicada

### Backend — Modulo Family

- [x] Repository: create, findByCode, findByUserId, addMember, removeMember, isMember, getMemberRole
- [x] DTOs + Zod schemas (createFamilySchema, joinFamilySchema)
- [x] Use case: criar familia (gera codigo, owner vira membro OWNER)
- [x] Use case: buscar minha familia (com membros)
- [x] Use case: entrar na familia por codigo
- [x] Use case: sair da familia (owner nao pode sair)
- [x] Controller: POST /families, GET /families/me, POST /families/join, DELETE /families/leave
- [x] Module registrado no app.module

### Frontend — Pagina de Configuracoes

- [x] Pagina `/configuracoes` com UI de familia
- [x] Sem familia: form criar (nome) + form entrar com codigo
- [x] Com familia: nome, codigo com botao copiar, lista de membros com roles, botao sair

### Compartilhamento de dados

- [x] FamilyContextService: resolve userId → userIds[] (todos os membros)
- [x] TransactionsRepository: todas as queries de leitura usam userIds[]
- [x] CardsRepository: todas as queries de leitura usam userIds[]
- [x] Use-cases adaptados: transactions (list, summary, monthly, category, insights, update, delete)
- [x] Use-cases adaptados: cards (list, update, delete, invoice)
- [x] Alerts service adaptado (cron jobs refletem dados da familia)
- [x] Chat IA adaptado (contexto financeiro da familia)
- [x] WhatsApp service adaptado (queries, card resolution, installments)
- [x] Modules atualizados: Transactions, Cards, Alerts, Chat, WhatsApp importam FamiliesModule

### Autoria nas transacoes

- [x] Backend: include user (id, name) em todas as queries de transacao
- [x] Frontend: tipo TransactionUser no tipo Transaction
- [x] UI: nome de quem registrou aparece na lista de transacoes
- [x] UI: nome de quem registrou aparece nas transacoes recentes do dashboard

### Pendente (futuro)

- [ ] Permissoes por role (OWNER/ADMIN/MEMBER) — restringir quem pode editar/deletar
- [ ] Transferencia de ownership da familia
- [ ] Remover membro da familia (pelo owner/admin)
- [x] Tela de perfil do usuario (editar nome, telefone) — em Configuracoes
- [ ] Editar avatar do usuario

---

## Metricas Pos-Lancamento (acompanhar por 3 meses)

- [ ] Transacoes via WhatsApp / total > 60%
- [ ] Retencao D30 > 40%
- [ ] Cobertura de gastos registrados > 70%
- [ ] NPS > 50
- [ ] Conversao para pagante > 5%

---

## Backlog Futuro

- [ ] Open Finance (integracao bancaria direta)
- [ ] Multi-contas e multi-cartoes avancado
- [ ] Gamificacao (streaks, conquistas)
- [ ] Planejamento de orcamento mensal
- [x] Compartilhamento familiar (casais/familias) — ver secao dedicada abaixo
- [ ] App mobile (React Native) — Apple Store + Play Store com mesmo codigo
- [ ] Canal Telegram como alternativa
- [ ] Categorias customizaveis
