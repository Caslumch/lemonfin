import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiFeature } from '@prisma/client';
import OpenAI from 'openai';
import { AiUsageService } from '../../ai-usage/ai-usage.service';
import { AdvisorMemoryRepository } from '../../chat/repositories/advisor-memory.repository';

const MODEL = 'gpt-4o-mini';

// Sinais de que a mensagem PODE conter um fato estável sobre a pessoa. É um
// filtro barato (sem IA) que roda em TODA mensagem: a esmagadora maioria
// ("gastei 50 no mercado") não casa com nada aqui e nunca chega à extração.
// Deliberadamente generoso — um falso positivo custa uma chamada barata, um
// falso negativo perde o fato para sempre. A decisão final é do modelo, que
// devolve `null` quando não há fato de verdade.
const FACT_SIGNALS: RegExp[] = [
  // Identidade/ocupação: "sou freelancer", "trabalho como dev", "me formei"
  /\b(sou|virei|me tornei|trabalho como|trabalho na|trabalho no|estudo|faco faculdade|me formei)\b/,
  // Situação de vida: casamento, filhos, mudança, viagem, moradia
  /\b(casar|casamento|noiv[oa]|namorad[oa]|filh[oa]s?|gravida|gestante|mudar de casa|mudanca|me mudei|morar|aluguel novo)\b/,
  // Renda/trabalho: "minha renda é variável", "fui demitido", "consegui emprego"
  /\b(minha renda|meu salario|renda variavel|fui demitid|perdi o emprego|consegui um emprego|novo emprego|promocao|aumento)\b/,
  // Objetivos/planos declarados: "quero juntar", "pretendo", "meu objetivo"
  /\b(quero|pretendo|planejo|meu objetivo|minha meta de vida|to querendo|estou querendo|sonho em)\b/,
  // Preferências/hábitos declarados: "não abro mão", "odeio", "prefiro"
  /\b(nao abro mao|odeio|detesto|prefiro|gosto muito de|sempre faco|nunca compro|evito)\b/,
  // Restrições/saúde financeira: "to endividado", "tenho dívida"
  /\b(endividad|negativad)|\b(tenho divida|to devendo|score|financiamento|emprestimo)\b/,
];

// Um fato é UMA frase curta; o repositório trunca, isto só limita o pedido.
const MAX_FACT_LEN = 240;

const SYSTEM_PROMPT = `Voce extrai FATOS ESTAVEIS sobre o usuario a partir de UMA mensagem que ele mandou para um assistente financeiro.

Um fato ESTAVEL e algo que continua verdade daqui a meses e que MELHORA conselhos financeiros futuros:
- objetivo ("quer quitar o cartao ate dezembro", "quer juntar para uma viagem ao Japao")
- contexto de vida ("e freelancer, renda variavel", "vai casar em marco de 2027", "tem dois filhos")
- preferencia declarada ("nao abre mao de delivery no fim de semana")
- restricao ("esta endividado, quer sair do vermelho")

NAO e fato estavel (NUNCA salve):
- um lancamento ou compra ("gastou 50 no mercado", "pagou a fatura") — isso ja esta no sistema
- valores, saldos, totais, metas e reservas — isso ja esta no sistema
- algo pontual e efemero ("esta cansado hoje", "vai almocar agora")
- dados sensiveis alheios as financas: saude/diagnostico, religiao, politica, orientacao sexual, origem racial
- fatos sobre OUTRAS pessoas que nao o usuario

Responda APENAS JSON valido, sem markdown:
{"fact": "<UMA frase curta, autocontida, em portugues, 3a pessoa>"}
ou, se NAO houver fato estavel na mensagem:
{"fact": null}

Na duvida, responda {"fact": null}. E melhor nao salvar do que salvar lixo.`;

@Injectable()
export class MemoryExtractionService {
  private readonly logger = new Logger(MemoryExtractionService.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly config: ConfigService,
    private readonly aiUsage: AiUsageService,
    private readonly advisorMemories: AdvisorMemoryRepository,
  ) {
    this.openai = new OpenAI({
      apiKey: this.config.getOrThrow<string>('OPENAI_API_KEY'),
    });
  }

  // Filtro barato (sem IA): a mensagem tem cara de conter um fato pessoal?
  // Público para o teste conseguir exercitar o filtro sem tocar na OpenAI.
  hasFactSignal(message: string): boolean {
    const text = message.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    // Mensagem muito curta ("oi", "sim", "50 no mercado") não carrega contexto
    // de vida — evita gastar chamada com ruído.
    if (text.length < 12) return false;
    return FACT_SIGNALS.some((re) => re.test(text));
  }

  // Extrai e SALVA um fato da mensagem, se houver. Devolve o texto do fato
  // salvo (para o bot avisar o usuário) ou null quando não há nada a guardar.
  //
  // NUNCA lança: é um enfeite do fluxo, não pode derrubar o registro de uma
  // transação. Qualquer erro vira log + null.
  async extractAndSave(
    userId: string,
    message: string,
    existingFacts: string[],
  ): Promise<string | null> {
    if (!this.hasFactSignal(message)) return null;

    try {
      const knownBlock =
        existingFacts.length > 0
          ? `\n\nO que ja se sabe deste usuario (NAO repita nada disto, responda null se a mensagem so confirma algo daqui):\n${existingFacts
              .map((f) => `- ${f}`)
              .join('\n')}`
          : '';

      const completion = await this.openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT + knownBlock },
          { role: 'user', content: message },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 120,
      });

      await this.aiUsage.record({
        userId,
        feature: AiFeature.MEMORY_EXTRACTION,
        model: MODEL,
        promptTokens: completion.usage?.prompt_tokens ?? 0,
        completionTokens: completion.usage?.completion_tokens ?? 0,
      });

      const raw = completion.choices[0]?.message?.content?.trim() ?? '';
      if (!raw) return null;

      const parsed = JSON.parse(raw) as { fact?: unknown };
      const fact = typeof parsed.fact === 'string' ? parsed.fact.trim() : null;
      if (!fact) return null;

      const saved = await this.advisorMemories.remember(
        userId,
        fact.slice(0, MAX_FACT_LEN),
      );
      // Já estava salvo → não avisa de novo (o usuário já sabe).
      if (saved.deduped) return null;

      this.logger.log(
        `Memory extracted for user ${userId}: "${saved.content}"`,
      );
      return saved.content;
    } catch (error) {
      this.logger.warn(`Memory extraction failed for user ${userId}: ${error}`);
      return null;
    }
  }
}
