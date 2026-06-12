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
    service = new MessageParserService(config);
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
      });

      mockResponse({ intent: 'correction', newAmount: 30 });
      expect(await service.parse('era 30 não 50')).toEqual({
        intent: 'correction',
        newAmount: 30,
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

  describe('metas de poupança', () => {
    it('parseia criação de meta com prazo futuro', async () => {
      const future = new Date(new Date().getFullYear() + 1, 11, 31)
        .toISOString()
        .slice(0, 10);
      mockResponse({
        intent: 'savings_goal_create',
        name: 'viagem',
        targetAmount: 5000,
        deadline: future,
      });

      const result = await service.parse('quero juntar 5000 pra viagem');

      expect(result.intent).toBe('savings_goal_create');
      if (result.intent === 'savings_goal_create') {
        expect(result.data.name).toBe('viagem');
        expect(result.data.targetAmount).toBe(5000);
        expect(new Date(result.data.deadline).getTime()).toBeGreaterThan(
          Date.now(),
        );
      }
    });

    it('vira unknown quando a meta não tem valor-alvo', async () => {
      mockResponse({
        intent: 'savings_goal_create',
        name: 'viagem',
        deadline: null,
      });

      const result = await service.parse('quero juntar pra viagem');

      expect(result.intent).toBe('unknown');
    });

    it('usa default futuro quando deadline é null', async () => {
      mockResponse({
        intent: 'savings_goal_create',
        name: 'carro',
        targetAmount: 10000,
        deadline: null,
      });

      const result = await service.parse('meta de 10 mil pro carro');

      expect(result.intent).toBe('savings_goal_create');
      if (result.intent === 'savings_goal_create') {
        expect(new Date(result.data.deadline).getTime()).toBeGreaterThan(
          Date.now(),
        );
      }
    });

    it('cai no default futuro quando deadline está no passado', async () => {
      mockResponse({
        intent: 'savings_goal_create',
        name: 'reserva',
        targetAmount: 3000,
        deadline: '2020-01-31',
      });

      const result = await service.parse('quero juntar 3000 de reserva');

      expect(result.intent).toBe('savings_goal_create');
      if (result.intent === 'savings_goal_create') {
        expect(new Date(result.data.deadline).getTime()).toBeGreaterThan(
          Date.now(),
        );
      }
    });

    it('parseia um aporte com valor', async () => {
      mockResponse({ intent: 'savings_contribution', amount: 200 });

      const result = await service.parse('guardei 200 na viagem');

      expect(result).toEqual({ intent: 'savings_contribution', amount: 200 });
    });

    it('vira unknown quando o aporte não tem valor', async () => {
      mockResponse({ intent: 'savings_contribution' });

      const result = await service.parse('guardei na viagem');

      expect(result.intent).toBe('unknown');
    });

    it('repassa query savings', async () => {
      mockResponse({ intent: 'query', queryType: 'savings' });

      expect(await service.parse('minhas metas')).toEqual({
        intent: 'query',
        queryType: 'savings',
      });
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

      // Exatamente um bloco de contexto, marcado e separado da mensagem atual.
      const contextBlocks = sentMessages.filter((m) =>
        m.content.includes('CONTEXTO'),
      );
      expect(contextBlocks).toHaveLength(1);
      expect(contextBlocks[0].content).toContain('NÃO registre');
      expect(contextBlocks[0].content).toContain('inglês da dani');

      // A mensagem atual vai isolada e claramente rotulada.
      const current = sentMessages[sentMessages.length - 1];
      expect(current.role).toBe('user');
      expect(current.content).toBe('MENSAGEM ATUAL: cancela');
    });

    it('não injeta bloco de contexto quando não há histórico', async () => {
      mockResponse({ intent: 'cancel' });

      await service.parse('cancela');

      const sentMessages = createMock.mock.calls[0][0].messages as {
        content: string;
      }[];
      expect(sentMessages.some((m) => m.content.includes('CONTEXTO'))).toBe(
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
});
