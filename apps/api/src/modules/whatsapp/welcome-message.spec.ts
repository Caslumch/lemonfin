import {
  buildFirstContactWelcome,
  buildLinkWelcome,
  buildWelcomeIntro,
  isGreeting,
} from './welcome-message';

describe('welcome-message', () => {
  describe('isGreeting', () => {
    it.each([
      'oi',
      'Oi!',
      'olá',
      'OLÁ',
      'bom dia',
      'Boa noite!!',
      'e aí?',
      'oi, tudo bem?',
      'opa',
    ])('reconhece saudação seca: %s', (text) => {
      expect(isGreeting(text)).toBe(true);
    });

    it.each([
      'gastei 50 no mercado',
      'oi, gastei 50 no mercado',
      'bom dia, quanto gastei esse mês?',
      'resumo',
      '',
    ])('não confunde pedido de verdade com saudação: %s', (text) => {
      expect(isGreeting(text)).toBe(false);
    });
  });

  describe('builders', () => {
    it('usa só o primeiro nome na saudação', () => {
      expect(buildLinkWelcome('Maria Clara Souza')).toContain('Oi, Maria! 👋');
      expect(buildFirstContactWelcome('João Pedro')).toContain('Oi, João! 👋');
      expect(buildWelcomeIntro('Ana Lima')).toContain('Oi, Ana! 👋');
    });

    it('funciona sem nome (saudação genérica)', () => {
      expect(buildLinkWelcome(null)).toContain('Oi! 👋');
      expect(buildFirstContactWelcome(undefined)).toContain('Oi! 👋');
      expect(buildWelcomeIntro('')).toContain('Oi! 👋');
    });

    it('apresenta os exemplos e o comando ajuda', () => {
      for (const msg of [
        buildLinkWelcome('Ana'),
        buildFirstContactWelcome('Ana'),
      ]) {
        expect(msg).toContain('gastei 25 no almoço');
        expect(msg).toContain('*ajuda*');
        expect(msg).toContain('LemonFin');
      }
    });
  });
});
