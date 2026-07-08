import { ConfigService } from '@nestjs/config';
import { MessageParserService } from './message-parser.service';

// Mock do SDK da OpenAI: a fábrica `create` é controlada por teste e também
// captura os argumentos enviados (para validar como o histórico é montado).
const createMock = jest.fn();

jest.mock('openai', () => {
  return {
    __esModule: true,
    default: class {
      chat = { completions: { create: createMock } };
    },
  };
});

// Faz o próximo `create` resolver com o JSON dado (como a OpenAI devolveria).
function mockResponse(payload: unknown) {
  createMock.mockResolvedValueOnce({
    choices: [{ message: { content: JSON.stringify(payload) } }],
  });
}

describe('MessageParserService', () => {
  let service: MessageParserService;

  beforeEach(() => {
    createMock.mockReset();
    const config = {
      getOrThrow: jest.fn().mockReturnValue('test-key'),
    } as unknown as ConfigService;
    const aiUsage = { record: jest.fn().mockResolvedValue(undefined) };
    service = new MessageParserService(config, aiUsage as never);
  });

  describe('intenções de item único', () => {
    it('parseia uma transação válida', async () => {
      mockResponse({
        intent: 'transaction',
        amount: 50,
        type: 'EXPENSE',
        categorySlug: 'alimentacao',
        categoryConfidence: 0.95,
        description: 'mercado',
      });

      const result = await service.parse('gastei 50 no mercado');

      expect(result).toEqual({
        intent: 'transaction',
        data: {
          amount: 50,
          type: 'EXPENSE',
          categorySlug: 'alimentacao',
          categoryConfidence: 0.95,
          description: 'mercado',
          cardName: undefined,
        },
      });
    });

    it('confidence AUSENTE vira 0 (força confirmação, não chuta)', async () => {
      mockResponse({
        intent: 'transaction',
        amount: 30,
        type: 'EXPENSE',
        categorySlug: 'outros',
        description: 'gastei 30 ali',
        // sem categoryConfidence — o modelo esqueceu
      });

      const result = await service.parse('gastei 30 ali');

      expect(result.intent).toBe('transaction');
      if (result.intent === 'transaction') {
        expect(result.data.categoryConfidence).toBe(0);
      }
    });

    it('usa a própria mensagem como descrição quando o modelo não fornece', async () => {
      mockResponse({
        intent: 'transaction',
        amount: 50,
        type: 'EXPENSE',
        categorySlug: 'outros',
        categoryConfidence: 0.9,
      });

      const result = await service.parse('paguei 50');

      expect(result.intent).toBe('transaction');
      if (result.intent === 'transaction') {
        expect(result.data.description).toBe('paguei 50');
      }
    });

    it('vira unknown quando faltam campos obrigatórios da transação', async () => {
      mockResponse({ intent: 'transaction', amount: 50 });

      const result = await service.parse('gastei 50');

      expect(result.intent).toBe('unknown');
    });

    it('parseia uma recorrência válida', async () => {
      mockResponse({
        intent: 'recurring',
        amount: 1500,
        type: 'EXPENSE',
        dayOfMonth: 5,
        categorySlug: 'moradia',
        description: 'aluguel',
      });

      const result = await service.parse('todo dia 5 pago 1500 de aluguel');

      expect(result).toMatchObject({
        intent: 'recurring',
        data: { amount: 1500, dayOfMonth: 5, categorySlug: 'moradia' },
      });
    });

    it('rejeita recorrência com dia fora de 1-31', async () => {
      mockResponse({
        intent: 'recurring',
        amount: 100,
        type: 'EXPENSE',
        dayOfMonth: 45,
        categorySlug: 'moradia',
      });

      const result = await service.parse('todo dia 45 pago 100');

      expect(result.intent).toBe('unknown');
    });

    it('parseia query, cancel e correction', async () => {
      mockResponse({ intent: 'query', queryType: 'balance' });
      expect(await service.parse('qual meu saldo?')).toEqual({
        intent: 'query',
        queryType: 'balance',
      });

      mockResponse({ intent: 'cancel' });
      expect(await service.parse('cancela o último')).toEqual({
        intent: 'cancel',
        target: null,
      });

      mockResponse({ intent: 'cancel', target: 'netflix' });
      expect(await service.parse('cancela a netflix')).toEqual({
        intent: 'cancel',
        target: 'netflix',
      });

      mockResponse({ intent: 'correction', newAmount: 30 });
      expect(await service.parse('era 30 não 50')).toEqual({
        intent: 'correction',
        newAmount: 30,
      });
    });

    it('parseia query de cartão com cardName', async () => {
      mockResponse({
        intent: 'query',
        queryType: 'card',
        cardName: 'Bradesco',
      });

      const result = await service.parse('como está meu cartão Bradesco?');

      expect(result).toEqual({
        intent: 'query',
        queryType: 'card',
        cardName: 'Bradesco',
      });
    });

    it('parseia query de cartão genérico sem nome', async () => {
      mockResponse({ intent: 'query', queryType: 'card', cardName: 'cartao' });

      const result = await service.parse('como está meu cartão?');

      expect(result).toEqual({
        intent: 'query',
        queryType: 'card',
        cardName: 'cartao',
      });
    });

    it('vira unknown quando o JSON da OpenAI é inválido', async () => {
      createMock.mockResolvedValueOnce({
        choices: [{ message: { content: 'isto não é json' } }],
      });

      const result = await service.parse('qualquer coisa');

      expect(result.intent).toBe('unknown');
    });
  });

  describe('correção de cartão', () => {
    it('troca o cartão da última transação', async () => {
      mockResponse({ intent: 'correction_card', cardName: 'Nubank' });

      const result = await service.parse('na verdade foi no Nubank');

      expect(result).toEqual({
        intent: 'correction_card',
        cardName: 'Nubank',
      });
    });

    it('remove o cartão quando cardName é null', async () => {
      mockResponse({ intent: 'correction_card', cardName: null });

      const result = await service.parse('não foi no Bradesco');

      expect(result).toEqual({ intent: 'correction_card', cardName: null });
    });

    it('remove o cartão quando cardName vem ausente', async () => {
      mockResponse({ intent: 'correction_card' });

      const result = await service.parse('tira o cartão');

      expect(result).toEqual({ intent: 'correction_card', cardName: null });
    });

    it('trata "cartao" genérico como remoção', async () => {
      mockResponse({ intent: 'correction_card', cardName: 'cartao' });

      const result = await service.parse('não foi no cartão');

      expect(result).toEqual({ intent: 'correction_card', cardName: null });
    });
  });

  describe('pagamento de fatura', () => {
    it('parseia pagamento com mês específico (invoiceMonth)', async () => {
      mockResponse({
        intent: 'pay_invoice',
        cardName: 'Nubank',
        amount: null,
        invoiceMonth: '2026-05',
      });

      expect(await service.parse('paguei a fatura de maio do nubank')).toEqual({
        intent: 'pay_invoice',
        cardName: 'Nubank',
        amount: null,
        invoiceMonth: '2026-05',
      });
    });

    it('invoiceMonth fora do formato YYYY-MM vira null', async () => {
      mockResponse({
        intent: 'pay_invoice',
        cardName: null,
        amount: 300,
        invoiceMonth: 'maio',
      });

      expect(await service.parse('paguei 300 da fatura')).toEqual({
        intent: 'pay_invoice',
        cardName: null,
        amount: 300,
        invoiceMonth: null,
      });
    });
  });

  describe('reservas', () => {
    it('parseia criação de reserva com prazo futuro', async () => {
      const future = new Date(new Date().getFullYear() + 1, 11, 31)
        .toISOString()
        .slice(0, 10);
      mockResponse({
        intent: 'reserve_create',
        name: 'viagem',
        targetAmount: 5000,
        deadline: future,
      });

      const result = await service.parse('quero juntar 5000 pra viagem');

      expect(result.intent).toBe('reserve_create');
      if (result.intent === 'reserve_create') {
        expect(result.data.name).toBe('viagem');
        expect(result.data.targetAmount).toBe(5000);
        expect(new Date(result.data.deadline).getTime()).toBeGreaterThan(
          Date.now(),
        );
      }
    });

    it('vira unknown quando a reserva não tem valor-alvo', async () => {
      mockResponse({
        intent: 'reserve_create',
        name: 'viagem',
        deadline: null,
      });

      const result = await service.parse('quero juntar pra viagem');

      expect(result.intent).toBe('unknown');
    });

    it('usa default futuro quando deadline é null', async () => {
      mockResponse({
        intent: 'reserve_create',
        name: 'carro',
        targetAmount: 10000,
        deadline: null,
      });

      const result = await service.parse('reserva de 10 mil pro carro');

      expect(result.intent).toBe('reserve_create');
      if (result.intent === 'reserve_create') {
        expect(new Date(result.data.deadline).getTime()).toBeGreaterThan(
          Date.now(),
        );
      }
    });

    it('cai no default futuro quando deadline está no passado', async () => {
      mockResponse({
        intent: 'reserve_create',
        name: 'reserva de emergência',
        targetAmount: 3000,
        deadline: '2020-01-31',
      });

      const result = await service.parse('quero juntar 3000 de reserva');

      expect(result.intent).toBe('reserve_create');
      if (result.intent === 'reserve_create') {
        expect(new Date(result.data.deadline).getTime()).toBeGreaterThan(
          Date.now(),
        );
      }
    });

    it('parseia um aporte com valor', async () => {
      mockResponse({ intent: 'reserve_contribution', amount: 200 });

      const result = await service.parse('guardei 200 na viagem');

      expect(result).toEqual({ intent: 'reserve_contribution', amount: 200 });
    });

    it('vira unknown quando o aporte não tem valor', async () => {
      mockResponse({ intent: 'reserve_contribution' });

      const result = await service.parse('guardei na viagem');

      expect(result.intent).toBe('unknown');
    });

    it('roteia pergunta aberta/conselho para advice (sem texto pronto)', async () => {
      mockResponse({ intent: 'advice' });

      const result = await service.parse('me ajuda a organizar meus gastos');

      expect(result).toEqual({ intent: 'advice' });
    });

    it('repassa query reserves', async () => {
      mockResponse({ intent: 'query', queryType: 'reserves' });

      expect(await service.parse('minhas reservas')).toEqual({
        intent: 'query',
        queryType: 'reserves',
      });
    });

    it('roteia "quais são minhas metas" para budget (Metas = teto de gasto)', async () => {
      mockResponse({ intent: 'query', queryType: 'budget' });

      expect(await service.parse('quais são minhas metas')).toEqual({
        intent: 'query',
        queryType: 'budget',
      });
    });

    it('repassa query recurring (recorrências / contas fixas)', async () => {
      mockResponse({ intent: 'query', queryType: 'recurring' });

      expect(await service.parse('minhas recorrências')).toEqual({
        intent: 'query',
        queryType: 'recurring',
      });
    });

    it('repassa query category com o categorySlug', async () => {
      mockResponse({
        intent: 'query',
        queryType: 'category',
        categorySlug: 'alimentacao',
      });

      expect(await service.parse('quanto gastei com comida esse mês?')).toEqual(
        {
          intent: 'query',
          queryType: 'category',
          categorySlug: 'alimentacao',
        },
      );
    });

    it('query category sem slug vira unknown (não inventa categoria)', async () => {
      mockResponse({ intent: 'query', queryType: 'category' });

      const result = await service.parse('quanto gastei com aquilo?');

      expect(result.intent).toBe('unknown');
    });
  });

  describe('goal_create (meta = teto de gasto por categoria)', () => {
    it('parseia uma meta válida com período mensal', async () => {
      mockResponse({
        intent: 'goal_create',
        categorySlug: 'alimentacao',
        amount: 800,
        period: 'MONTHLY',
      });

      expect(
        await service.parse('limite de 800 em alimentação por mês'),
      ).toEqual({
        intent: 'goal_create',
        data: { categorySlug: 'alimentacao', amount: 800, period: 'MONTHLY' },
      });
    });

    it('usa MONTHLY como default quando o período não é semanal', async () => {
      mockResponse({
        intent: 'goal_create',
        categorySlug: 'lazer',
        amount: 500,
        period: 'INVALIDO',
      });

      const result = await service.parse('meta de 500 em lazer');

      expect(result).toMatchObject({
        intent: 'goal_create',
        data: { period: 'MONTHLY' },
      });
    });

    it('meta sem categoria ou sem valor vira unknown', async () => {
      mockResponse({ intent: 'goal_create', amount: 800 });

      expect((await service.parse('quero um limite de 800')).intent).toBe(
        'unknown',
      );
    });
  });

  // Bug 2: o histórico não pode entrar como turns reais (o modelo passava a
  // imitar a resposta anterior). Deve ir como UM bloco de contexto marcado.
  describe('isolamento do histórico (regressão do bug de contexto)', () => {
    it('não envia o histórico como turns assistant; usa bloco de contexto único', async () => {
      mockResponse({ intent: 'cancel' });

      await service.parse('cancela', [
        { role: 'user', text: 'todo dia 5 pago inglês da dani 400 reais' },
        { role: 'bot', text: 'Conta fixa cadastrada! R$400 Educacao' },
      ]);

      const sentMessages = createMock.mock.calls[0][0].messages as {
        role: string;
        content: string;
      }[];

      // Nenhum turn assistant (era isso que contaminava a classificação).
      expect(sentMessages.some((m) => m.role === 'assistant')).toBe(false);

      // Exatamente um bloco de contexto (o que carrega o transcript do
      // histórico), marcado e separado da mensagem atual. Identificado pelo
      // transcript — não por uma palavra solta que pode aparecer no prompt.
      const contextBlocks = sentMessages.filter((m) =>
        m.content.includes('inglês da dani'),
      );
      expect(contextBlocks).toHaveLength(1);
      expect(contextBlocks[0].content).toContain('NÃO registre');

      // A mensagem atual vai isolada e claramente rotulada.
      const current = sentMessages[sentMessages.length - 1];
      expect(current.role).toBe('user');
      expect(current.content).toBe('MENSAGEM ATUAL: cancela');
    });

    it('instrui a NÃO re-registrar nem agrupar itens antigos do histórico', async () => {
      // Regressão do bug: ao mandar só "Consulta da Tchuca 130 no Bradesco", o
      // bot montava um batch incluindo blusas que já estavam no histórico.
      mockResponse({
        intent: 'transaction',
        amount: 130,
        type: 'EXPENSE',
        categorySlug: 'saude',
        categoryConfidence: 0.9,
        description: 'Consulta da Tchuca',
      });

      await service.parse('Consulta da Tchuca hoje 130 no Bradesco', [
        { role: 'user', text: 'comprei duas blusas de 139 em 4x no Bradesco' },
        { role: 'bot', text: '[registrei 2 lançamentos]' },
      ]);

      const sentMessages = createMock.mock.calls[0][0].messages as {
        content: string;
      }[];
      const contextBlock = sentMessages.find((m) =>
        m.content.includes('blusas'),
      );
      // O bloco de contexto deixa explícito que itens do histórico já foram
      // registrados e não devem entrar num batch.
      expect(contextBlock?.content).toContain('JÁ FORAM registrados');
      expect(contextBlock?.content).toContain('batch');
    });

    it('não injeta bloco de contexto quando não há histórico', async () => {
      mockResponse({ intent: 'cancel' });

      await service.parse('cancela');

      const sentMessages = createMock.mock.calls[0][0].messages as {
        content: string;
      }[];
      // Sem histórico → só system + a mensagem atual (nenhum bloco de contexto).
      expect(sentMessages).toHaveLength(2);
      expect(sentMessages.some((m) => m.content.startsWith('CONTEXTO'))).toBe(
        false,
      );
    });
  });

  // Bug 1: várias contas numa mensagem não podem produzir um registro errado
  // silencioso. Devem virar um batch, com itens inválidos em "skipped".
  describe('batch — múltiplos itens', () => {
    it('separa itens válidos e mantém os não-estruturáveis em skipped', async () => {
      mockResponse({
        intent: 'batch',
        items: [
          {
            intent: 'recurring',
            amount: 227,
            type: 'EXPENSE',
            dayOfMonth: 5,
            categorySlug: 'transporte',
            description: 'seguro da moto',
          },
          {
            intent: 'recurring',
            amount: 157,
            type: 'EXPENSE',
            dayOfMonth: 5,
            categorySlug: 'moradia',
            description: 'internet',
          },
        ],
        skipped: [
          { description: 'água e luz', reason: 'valor varia entre 80 e 90' },
        ],
      });

      const result = await service.parse(
        'todo dia 5 pago 227 seguro da moto, internet 157, água e luz varia entre 80/90',
      );

      expect(result.intent).toBe('batch');
      if (result.intent === 'batch') {
        expect(result.items).toHaveLength(2);
        expect(result.items[0]).toMatchObject({
          intent: 'recurring',
          data: { amount: 227, description: 'seguro da moto' },
        });
        expect(result.skipped).toHaveLength(1);
        expect(result.skipped[0].description).toBe('água e luz');
      }
    });

    it('move item de batch sem campos válidos para skipped (não registra lixo)', async () => {
      mockResponse({
        intent: 'batch',
        items: [
          {
            intent: 'transaction',
            amount: 50,
            type: 'EXPENSE',
            categorySlug: 'alimentacao',
            description: 'mercado',
          },
          // Item sem amount → deve cair em skipped, não ser registrado.
          { intent: 'transaction', categorySlug: 'lazer', description: 'algo' },
        ],
        skipped: [],
      });

      const result = await service.parse(
        'gastei 50 no mercado e sei lá no lazer',
      );

      expect(result.intent).toBe('batch');
      if (result.intent === 'batch') {
        expect(result.items).toHaveLength(1);
        expect(result.skipped).toHaveLength(1);
      }
    });

    it('degrada para intenção direta quando o batch tem só 1 item válido', async () => {
      mockResponse({
        intent: 'batch',
        items: [
          {
            intent: 'transaction',
            amount: 50,
            type: 'EXPENSE',
            categorySlug: 'alimentacao',
            description: 'mercado',
          },
        ],
        skipped: [],
      });

      const result = await service.parse('gastei 50 no mercado');

      expect(result.intent).toBe('transaction');
    });

    it('vira unknown pedindo um de cada vez quando nada pôde ser registrado', async () => {
      mockResponse({
        intent: 'batch',
        items: [],
        skipped: [
          { description: 'água', reason: 'valor varia' },
          { description: 'luz', reason: 'valor varia' },
        ],
      });

      const result = await service.parse('água e luz variam todo mês');

      expect(result.intent).toBe('unknown');
      if (result.intent === 'unknown') {
        expect(result.message).toContain('uma');
      }
    });
  });

  describe('redo — refazer a última ação', () => {
    it('parseia redo com (re)parcelamento', async () => {
      mockResponse({ intent: 'redo', adjust: { installments: 4 } });

      const result = await service.parse('na verdade era em 4x');

      expect(result).toEqual({ intent: 'redo', adjust: { installments: 4 } });
    });

    it('parseia redo com itens explícitos (separar com valores)', async () => {
      mockResponse({
        intent: 'redo',
        adjust: {
          items: [
            {
              intent: 'transaction',
              amount: 139,
              type: 'EXPENSE',
              categorySlug: 'compras',
              description: 'blusa para mim',
            },
            {
              intent: 'transaction',
              amount: 139,
              type: 'EXPENSE',
              categorySlug: 'compras',
              description: 'blusa para esposa',
            },
          ],
        },
      });

      const result = await service.parse(
        'faz separado, uma de 139 e outra de 139',
      );

      expect(result.intent).toBe('redo');
      if (result.intent === 'redo') {
        expect(result.adjust.items).toHaveLength(2);
        expect(result.adjust.items?.[0]).toMatchObject({
          intent: 'transaction',
          data: { amount: 139, description: 'blusa para mim' },
        });
      }
    });

    it('parseia redo de troca de cartão', async () => {
      mockResponse({ intent: 'redo', adjust: { cardName: 'Nubank' } });

      const result = await service.parse('refaz no Nubank');

      expect(result).toEqual({
        intent: 'redo',
        adjust: { cardName: 'Nubank' },
      });
    });

    it('vira unknown quando o redo não traz nenhum ajuste', async () => {
      mockResponse({ intent: 'redo', adjust: {} });

      const result = await service.parse('faz separado');

      // Sem valores/parcelas/cartão não há o que refazer — pede os dados.
      expect(result.intent).toBe('unknown');
    });

    it('ignora installments fora de faixa (2..48)', async () => {
      mockResponse({ intent: 'redo', adjust: { installments: 1 } });

      const result = await service.parse('refaz em 1x');

      // 1x não é parcelamento válido e não há outro ajuste → unknown.
      expect(result.intent).toBe('unknown');
    });
  });

  describe('prompt dinâmico de categorias', () => {
    it('injeta as categorias personalizadas no system prompt', async () => {
      mockResponse({
        intent: 'transaction',
        amount: 80,
        type: 'EXPENSE',
        categorySlug: 'petshop',
        categoryConfidence: 0.95,
        description: 'ração',
      });

      const result = await service.parse(
        'gastei 80 no petshop',
        [],
        [{ slug: 'petshop', name: 'Petshop' }],
      );

      const systemPrompt = createMock.mock.calls[0][0].messages[0].content;
      // A categoria custom aparece na lista, marcada como personalizada.
      expect(systemPrompt).toContain('petshop: Petshop');
      expect(systemPrompt).toContain('categoria personalizada');
      // As de sistema continuam presentes.
      expect(systemPrompt).toContain('alimentacao:');
      // Custom vem ANTES de "outros" (catch-all por último).
      expect(systemPrompt.indexOf('petshop:')).toBeLessThan(
        systemPrompt.indexOf('- outros:'),
      );
      // O slug custom é resolvido normalmente.
      expect(result.intent).toBe('transaction');
      if (result.intent === 'transaction') {
        expect(result.data.categorySlug).toBe('petshop');
      }
    });

    it('sem categorias custom, o prompt traz só as de sistema', async () => {
      mockResponse({
        intent: 'transaction',
        amount: 50,
        type: 'EXPENSE',
        categorySlug: 'alimentacao',
        categoryConfidence: 0.95,
        description: 'mercado',
      });

      await service.parse('gastei 50 no mercado');

      const systemPrompt = createMock.mock.calls[0][0].messages[0].content;
      expect(systemPrompt).not.toContain('categoria personalizada');
    });
  });
});
