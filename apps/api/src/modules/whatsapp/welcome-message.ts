// Boas-vindas do WhatsApp (primeiro contato com o bot). Funções puras, sem DI:
// são usadas pelo WhatsappService (primeira mensagem recebida) e pelo
// UsersController (envio proativo ao vincular o telefone nas configurações) —
// o UsersModule importa só o WmodeModule para enviar, sem depender do
// WhatsappModule inteiro (que importa UsersModule — seria ciclo).

function firstName(name?: string | null): string | null {
  const first = name?.trim().split(/\s+/)[0];
  return first || null;
}

function greetingLine(name?: string | null): string {
  const first = firstName(name);
  return first ? `Oi, ${first}! 👋` : 'Oi! 👋';
}

// Corpo comum: exemplos do que testar + como descobrir o resto.
const WELCOME_BODY = [
  'Me testa aqui:',
  '💸 _"gastei 25 no almoço"_',
  '🎤 ou manda um áudio',
  '🧾 ou a foto do comprovante',
  '',
  'Quer saber como está o mês? É só pedir um _"resumo"_ 📊',
  'E pra ver tudo que eu sei fazer, manda *ajuda* 😉',
].join('\n');

// Enviada na hora em que o usuário vincula/troca o telefone nas configurações.
// Além de dar as boas-vindas, confirma que o número cadastrado está certo.
export function buildLinkWelcome(name?: string | null): string {
  return [
    `${greetingLine(name)} Aqui é o *LemonFin* 🍋`,
    '',
    'Seu WhatsApp foi conectado — a partir de agora é só me contar seus gastos que eu organizo tudo.',
    '',
    WELCOME_BODY,
  ].join('\n');
}

// Primeira mensagem RECEBIDA de um usuário que nunca foi recebido (vinculou o
// telefone antes do welcome proativo existir, ou o envio proativo falhou) e
// ela é só uma saudação/"ajuda" — a apresentação É a resposta.
export function buildFirstContactWelcome(name?: string | null): string {
  return [
    `${greetingLine(name)} Que bom te ver por aqui — eu sou o *LemonFin* 🍋, seu assessor financeiro no WhatsApp.`,
    '',
    WELCOME_BODY,
  ].join('\n');
}

// Linha curta antes de processar a primeira mensagem quando ela já é um pedido
// de verdade ("gastei 50 no mercado") — dá as boas-vindas sem atrapalhar o
// atendimento do que a pessoa pediu.
export function buildWelcomeIntro(name?: string | null): string {
  return `${greetingLine(name)} Eu sou o *LemonFin* 🍋 — pode deixar comigo 👇`;
}

// Saudação "seca" (sem pedido junto): "oi", "bom dia", "e aí?"... Usada só no
// primeiro contato para responder com a apresentação em vez de mandar a frase
// pro parser. Normaliza acentos/pontuação para casar variações de digitação.
export function isGreeting(content: string): boolean {
  const text = content
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[!?.,~^]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return [
    'oi',
    'oii',
    'oie',
    'ola',
    'olaa',
    'opa',
    'hey',
    'hi',
    'hello',
    'eai',
    'e ai',
    'eae',
    'salve',
    'bom dia',
    'boa tarde',
    'boa noite',
    'tudo bem',
    'tudo bom',
    'oi tudo bem',
    'ola tudo bem',
  ].includes(text);
}
