# Checklist de Escalabilidade — LemonFin

**Criado em:** Abril 2026
**Status:** Pendente (atacar quando atingir ~50 usuarios ativos)
**Capacidade atual estimada:** ~20-30 usuarios simultaneos / ~200 cadastrados

**Legenda:** ` ` = pendente | `x` = concluido

---

## NIVEL 1 — Quick Wins (1-2 dias, suporta ~100 simultaneos)

Implementar quando tiver **~50 usuarios ativos**. Custo: zero ou minimo.

### Rate Limiting & Seguranca

- [ ] Instalar `@nestjs/throttler` na API
- [ ] Rate limit global: 100 req/min por IP
- [ ] Rate limit auth endpoints: 5 req/min (login, registro)
- [ ] Rate limit WhatsApp webhook: 30 req/min
- [ ] Rate limit chat IA: 10 req/min por usuario
- [ ] Adicionar `helmet` (headers de seguranca)
- [ ] Adicionar `compression` middleware (gzip)

### Conexoes de Banco

- [ ] Aumentar pool do Prisma para 20 conexoes (`connection_limit=20` na DATABASE_URL)
- [ ] Usar connection string com pooler do Neon (`-pooler` no hostname)
- [ ] Configurar `pool_timeout=30` no Prisma

### Cache Basico

- [ ] Cache de categorias em memoria (muda raramente) — TTL 1h
- [ ] Cache de dados do usuario em memoria — TTL 5min
- [ ] Cache do contexto financeiro do chat — TTL 2min (evita 4 queries/mensagem)

### Indices no Banco

- [ ] Index composto em Transaction: `(userId, date)` — query principal
- [ ] Index composto em Transaction: `(userId, categoryId, date)` — filtro por categoria
- [ ] Index em Transaction: `(cardId, date)` — faturas
- [ ] Index em FamilyMember: `(userId)` — lookup de familia
- [ ] Verificar plano de execucao das queries mais usadas (`EXPLAIN ANALYZE`)

---

## NIVEL 2 — Infraestrutura (3-5 dias, suporta ~300-500 simultaneos)

Implementar quando tiver **~100 usuarios ativos** ou receita justificar. Custo: ~$20-50/mes.

### Redis

- [ ] Provisionar Redis (Upstash free tier ou Render Redis)
- [ ] Instalar `@nestjs/cache-manager` + `cache-manager-redis-yet`
- [ ] Migrar caches em memoria para Redis
- [ ] Cache de sessoes JWT no Redis (evita decode a cada request)
- [ ] Cache de resumo financeiro (dashboard) — TTL 5min
- [ ] Invalidar cache ao criar/editar/deletar transacao

### Fila de Mensagens (BullMQ)

- [ ] Instalar `@nestjs/bullmq`
- [ ] Fila `whatsapp-incoming` — processar webhooks async
- [ ] Fila `whatsapp-outgoing` — enviar mensagens com retry (3x, backoff exponencial)
- [ ] Fila `alerts` — enviar alertas proativos
- [ ] Fila `ai-parsing` — parsing de transacoes
- [ ] Dashboard de filas (BullBoard) em `/admin/queues`
- [ ] Dead letter queue para mensagens que falharam 3x

### Separar Worker de Cron

- [ ] Extrair cron jobs (alertas, resumos) para worker separado
- [ ] Worker roda como servico independente no Render (ou mesmo repo, outro entrypoint)
- [ ] API principal nao executa mais cron jobs

### Render — Upgrade

- [ ] Subir para plano Starter ($7/mes) — sem cold start
- [ ] Configurar health check endpoint `/health`
- [ ] Configurar auto-deploy via GitHub
- [ ] Avaliar 2 instancias com load balancing (requer Redis para sessoes)

---

## NIVEL 3 — Escala Real (1-2 semanas, suporta ~1000+ simultaneos)

Implementar quando tiver **~500 usuarios ativos** ou pico de crescimento. Custo: ~$50-150/mes.

### Horizontal Scaling

- [ ] Configurar 2-4 instancias da API no Render
- [ ] Sessoes e cache 100% no Redis (sem estado em memoria)
- [ ] Testar que todas as features funcionam com multiplas instancias
- [ ] Cron jobs rodam em apenas 1 instancia (distributed lock via Redis)

### Banco de Dados

- [ ] Subir plano do Neon (mais conexoes, mais compute)
- [ ] Aumentar pool para 50 conexoes por instancia
- [ ] Read replicas para queries pesadas (dashboard, insights)
- [ ] Paginacao cursor-based em todas as listagens
- [ ] Particionar tabela de transacoes por mes (se > 1M registros)

### CDN & Frontend

- [ ] Configurar ISR (Incremental Static Regeneration) no Next.js
- [ ] Otimizar bundle size (analyze com `@next/bundle-analyzer`)
- [ ] Service worker para cache offline basico
- [ ] Lazy load de graficos e componentes pesados

### Monitoramento

- [ ] Sentry para error tracking (front + back)
- [ ] Logs estruturados (JSON) com correlation ID
- [ ] Metricas de latencia por endpoint (p50, p95, p99)
- [ ] Alerta quando latencia > 2s ou error rate > 1%
- [ ] Dashboard de metricas (Grafana ou Render Metrics)
- [ ] APM para identificar queries lentas

### Chat IA — Otimizacao

- [ ] Cache de contexto financeiro no Redis (evita rebuild por mensagem)
- [ ] Rate limit de function calls por conversa (max 3 por mensagem)
- [ ] Timeout de 30s para respostas do Gemini
- [ ] Fallback gracioso se Gemini estiver fora ("Estou com dificuldade agora, tente novamente")

---

## NIVEL 4 — Escala Avancada (futuro, 5000+ usuarios)

Para quando o LemonFin virar um negocio consolidado.

- [ ] Migrar para Kubernetes ou Fly.io (auto-scaling real)
- [ ] Event-driven architecture (eventos de transacao propagam para outros servicos)
- [ ] CQRS: separar leitura (dashboard) de escrita (transacoes)
- [ ] Sharding por tenant/familia
- [ ] Multi-regiao (se expandir alem do Brasil)
- [ ] WebSocket com Redis adapter (Socket.io + Redis)
- [ ] Migrar de polling para WebSocket real no frontend
- [ ] CDN para assets estaticos (CloudFront/Cloudflare)

---

## Benchmarks & Testes de Carga

- [ ] Script de load test com `k6` ou `artillery`
- [ ] Cenario 1: 50 usuarios simultaneos, operacoes CRUD basicas
- [ ] Cenario 2: 20 usuarios usando chat IA simultaneamente
- [ ] Cenario 3: 100 webhooks WhatsApp por minuto
- [ ] Cenario 4: Dashboard com 10.000 transacoes por usuario
- [ ] Documentar resultados e gargalos encontrados
- [ ] Re-executar apos cada nivel de otimizacao

---

## Custos Estimados por Nivel

| Nivel | Usuarios | Custo Infra/mes | Receita estimada (R$14,90) |
|-------|----------|-----------------|---------------------------|
| Atual | ~200 cadastrados | ~$0 (free tiers) | R$ 0 |
| 1 | ~500 cadastrados | ~$7 (Render Starter) | ~R$ 750 |
| 2 | ~1.000 cadastrados | ~$30-50 | ~R$ 2.500 |
| 3 | ~3.000 cadastrados | ~$100-150 | ~R$ 10.000 |
| 4 | ~10.000+ cadastrados | ~$300-500 | ~R$ 30.000+ |

> A infraestrutura se paga a partir do Nivel 1. Escalar conforme a receita cresce.
