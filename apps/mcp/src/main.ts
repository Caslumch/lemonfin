import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { makeApiClient } from './api-client.js';
import { registerTools } from './tools.js';

// Servidor MCP REMOTO do LemonFin (transporte Streamable HTTP). É a camada 4 do
// gateway de IA (ver docs/plano-gateway-ia.md): um cliente fino do REST /v1.
//
// STATELESS por request: cada POST /mcp cria um McpServer efêmero + transporte,
// resolve a API key do usuário no header Authorization e responde. Sem sessão em
// memória → escala horizontal simples e cada request é isolado (a key de um
// usuário nunca vaza para o servidor de outro). Auth de verdade acontece no /v1
// (ApiKeyGuard) — aqui só repassamos a key.

const PORT = Number(process.env.PORT ?? 3002);

function extractApiKey(req: IncomingMessage): string | null {
  const auth = req.headers['authorization'];
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.slice('Bearer '.length).trim() || null;
  }
  const header = req.headers['x-api-key'];
  if (typeof header === 'string' && header.trim()) return header.trim();
  return null;
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(payload);
}

const server = createServer((req, res) => {
  void handle(req, res).catch((err) => {
    console.error('[mcp] erro inesperado', err);
    if (!res.headersSent) {
      sendJson(res, 500, { error: 'internal_error' });
    }
  });
});

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

  // Health check simples (para o Render/monitoramento).
  if (req.method === 'GET' && url.pathname === '/health') {
    return sendJson(res, 200, { status: 'ok' });
  }

  if (url.pathname !== '/mcp') {
    return sendJson(res, 404, { error: 'not_found' });
  }
  if (req.method !== 'POST') {
    // Modo stateless não usa o canal SSE do GET/DELETE.
    return sendJson(res, 405, { error: 'method_not_allowed' });
  }

  const apiKey = extractApiKey(req);
  if (!apiKey) {
    return sendJson(res, 401, {
      error: 'missing_api_key',
      message:
        'Envie sua chave do LemonFin no header Authorization: Bearer lmn_...',
    });
  }

  const body = await readBody(req);

  // Servidor + transporte efêmeros por request (stateless).
  const mcp = new McpServer({ name: 'lemonfin', version: '1.0.0' });
  registerTools(mcp, makeApiClient(apiKey));

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  res.on('close', () => {
    void transport.close();
    void mcp.close();
  });

  await mcp.connect(transport);
  await transport.handleRequest(req, res, body);
}

server.listen(PORT, () => {
  console.log(`[mcp] LemonFin MCP server ouvindo em :${PORT} (POST /mcp)`);
});

// Keep-alive: no plano free do Render o serviço hiberna após ~15min sem tráfego,
// e a PRIMEIRA tool call do agente pegaria o servidor dormindo (30-50s, alguns
// clientes MCP dão timeout antes). Um self-ping no próprio /health a cada 10min
// mantém o serviço acordado. Ativado só quando SELF_URL está setado (a URL
// pública do serviço no Render) — em dev fica desligado. Mesmo padrão do
// KeepAliveService da API.
const SELF_URL = process.env.SELF_URL?.replace(/\/$/, '');
if (SELF_URL) {
  const TEN_MIN = 10 * 60 * 1000;
  setInterval(() => {
    fetch(`${SELF_URL}/health`)
      .then((res) => console.log(`[mcp] keep-alive ping: ${res.status}`))
      .catch((err) => console.warn(`[mcp] keep-alive falhou: ${err}`));
  }, TEN_MIN).unref();
}
