import { MemoryExtractionService } from './memory-extraction.service';

// Memória PASSIVA: o filtro heurístico (sem IA) decide quem chega à extração, e
// a extração salva + devolve o fato para o bot avisar o usuário. O filtro é a
// peça que segura o custo — se ele deixar tudo passar, toda mensagem vira
// chamada de IA.
function buildService(
  overrides: {
    factJson?: string;
    remember?: { id: string; content: string; deduped: boolean };
    throws?: boolean;
  } = {},
) {
  const create = jest.fn().mockImplementation(() => {
    if (overrides.throws) return Promise.reject(new Error('openai down'));
    return Promise.resolve({
      choices: [
        { message: { content: overrides.factJson ?? '{"fact": null}' } },
      ],
      usage: { prompt_tokens: 100, completion_tokens: 10 },
    });
  });
  const advisorMemories = {
    remember: jest.fn().mockResolvedValue(
      overrides.remember ?? {
        id: 'm1',
        content: 'É freelancer, renda variável',
        deduped: false,
      },
    ),
  };
  const aiUsage = { record: jest.fn().mockResolvedValue(undefined) };
  const config = { getOrThrow: jest.fn().mockReturnValue('sk-test') };

  const service = new MemoryExtractionService(
    config as never,
    aiUsage as never,
    advisorMemories as never,
  );
  // Substitui o client instanciado no construtor.
  (service as unknown as { openai: unknown }).openai = {
    chat: { completions: { create } },
  };

  return { service, create, advisorMemories, aiUsage };
}

describe('MemoryExtractionService.hasFactSignal — filtro barato', () => {
  const { service } = buildService();

  // O caso que motivou a fase: a pessoa conta algo enquanto registra um gasto.
  it.each([
    'comprei fralda, minha filha nasceu semana passada',
    'sou freelancer e minha renda é variável',
    'gastei 200 no buffet, vou casar em março',
    'quero juntar dinheiro pra sair do vermelho',
    'não abro mão do delivery no fim de semana',
    'to endividado, preciso organizar isso',
  ])('deixa passar mensagem com fato pessoal: "%s"', (msg) => {
    expect(service.hasFactSignal(msg)).toBe(true);
  });

  // A esmagadora maioria do tráfego: registro puro. Não pode custar IA.
  it.each([
    'gastei 50 no mercado',
    'recebi 3000 de salário',
    'quanto gastei hoje?',
    'resumo',
    'cancela',
    'oi',
    'sim',
    'paguei a fatura do nubank',
    'comprei tênis de 300 em 3x',
  ])('barra mensagem sem fato pessoal: "%s"', (msg) => {
    expect(service.hasFactSignal(msg)).toBe(false);
  });

  it('ignora acentuação (mensagem real vem acentuada)', () => {
    expect(service.hasFactSignal('sou freelancer há dois anos')).toBe(true);
    expect(service.hasFactSignal('minha renda é variável')).toBe(true);
  });

  it('barra mensagem curta demais para carregar contexto', () => {
    expect(service.hasFactSignal('quero')).toBe(false);
  });
});

describe('MemoryExtractionService.extractAndSave', () => {
  it('não chama a IA quando o filtro não vê sinal (economia)', async () => {
    const { service, create } = buildService();

    const fact = await service.extractAndSave('u1', 'gastei 50 no mercado', []);

    expect(create).not.toHaveBeenCalled();
    expect(fact).toBeNull();
  });

  it('salva o fato e devolve o texto para o bot avisar', async () => {
    const { service, advisorMemories } = buildService({
      factJson: '{"fact": "É freelancer, renda variável"}',
    });

    const fact = await service.extractAndSave(
      'u1',
      'sou freelancer, minha renda é variável',
      [],
    );

    expect(advisorMemories.remember).toHaveBeenCalledWith(
      'u1',
      'É freelancer, renda variável',
    );
    expect(fact).toBe('É freelancer, renda variável');
  });

  it('fact null → não salva nada', async () => {
    const { service, advisorMemories } = buildService({
      factJson: '{"fact": null}',
    });

    const fact = await service.extractAndSave(
      'u1',
      'quero muito um café agora',
      [],
    );

    expect(advisorMemories.remember).not.toHaveBeenCalled();
    expect(fact).toBeNull();
  });

  // Fato repetido não pode gerar aviso de novo — o usuário já foi avisado.
  it('fato já conhecido (deduped) não vira aviso', async () => {
    const { service } = buildService({
      factJson: '{"fact": "É freelancer"}',
      remember: { id: 'm1', content: 'É freelancer', deduped: true },
    });

    const fact = await service.extractAndSave('u1', 'sou freelancer', []);

    expect(fact).toBeNull();
  });

  it('manda os fatos já conhecidos no prompt (evita re-salvar)', async () => {
    const { service, create } = buildService({
      factJson: '{"fact": null}',
    });

    await service.extractAndSave('u1', 'sou freelancer mesmo', [
      'É freelancer, renda variável',
    ]);

    const call = create.mock.calls[0][0] as {
      messages: { role: string; content: string }[];
    };
    expect(call.messages[0].content).toContain('É freelancer, renda variável');
  });

  it('registra o consumo de IA na feature própria', async () => {
    const { service, aiUsage } = buildService({
      factJson: '{"fact": "É freelancer"}',
    });

    await service.extractAndSave('u1', 'sou freelancer', []);

    expect(aiUsage.record).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        feature: 'MEMORY_EXTRACTION',
        model: 'gpt-4o-mini',
      }),
    );
  });

  // Memória é enfeite: não pode derrubar o registro de uma transação.
  it('erro da IA vira null, nunca exceção', async () => {
    const { service, advisorMemories } = buildService({ throws: true });

    const fact = await service.extractAndSave('u1', 'sou freelancer', []);

    expect(fact).toBeNull();
    expect(advisorMemories.remember).not.toHaveBeenCalled();
  });

  it('JSON inválido da IA vira null, nunca exceção', async () => {
    const { service } = buildService({ factJson: 'isso não é json' });

    const fact = await service.extractAndSave('u1', 'sou freelancer', []);

    expect(fact).toBeNull();
  });
});
