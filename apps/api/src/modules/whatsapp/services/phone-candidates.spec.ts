import { phoneCandidates } from './phone-candidates';

describe('phoneCandidates', () => {
  it('casa a forma sem-9 recebida com o cadastro com-9 (caso real)', () => {
    // Cliente cadastrado como 5586998674004 (com 9); responde como 558698674004 (sem 9).
    const recebido = phoneCandidates('558698674004');
    expect(recebido).toContain('5586998674004'); // forma do cadastro
    expect(recebido).toContain('558698674004'); // forma recebida
  });

  it('casa a forma com-9 recebida com o cadastro sem-9', () => {
    const recebido = phoneCandidates('5586998674004');
    expect(recebido).toContain('558698674004');
    expect(recebido).toContain('5586998674004');
  });

  it('gera variações com e sem o prefixo 55', () => {
    const c = phoneCandidates('5586998674004');
    expect(c).toContain('86998674004'); // sem 55, com 9
    expect(c).toContain('8698674004'); // sem 55, sem 9
  });

  it('limpa caracteres não numéricos', () => {
    const c = phoneCandidates('+55 (86) 99867-4004');
    expect(c).toContain('5586998674004');
    expect(c).toContain('558698674004');
  });

  it('não duplica e sempre inclui a entrada original', () => {
    const c = phoneCandidates('558698674004');
    expect(new Set(c).size).toBe(c.length);
    expect(c).toContain('558698674004');
  });

  it('retorna vazio para entrada vazia', () => {
    expect(phoneCandidates('')).toEqual([]);
  });

  it('para números fora do padrão BR, cobre só a variação do 55', () => {
    const c = phoneCandidates('551234'); // curto demais p/ celular
    expect(c).toContain('551234');
    expect(c).toContain('1234');
  });
});
