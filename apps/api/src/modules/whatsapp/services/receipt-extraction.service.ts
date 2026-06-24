import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiFeature } from '@prisma/client';
import OpenAI from 'openai';
import { AiUsageService } from '../../ai-usage/ai-usage.service';
import { ParsedTransaction, buildCategoryList } from './message-parser.service';

// gpt-4o-mini é multimodal: aceita a imagem na mesma chamada de chat e devolve
// JSON estruturado. É a opção mais barata da stack OpenAI já integrada (Whisper,
// parser, chat). A imagem vai em `detail: 'high'` (ver nota no extract) — nota
// fiscal de mercado é densa e em baixa resolução o modelo borrava os números.
const MODEL = 'gpt-4o-mini';

export interface ReceiptExtractionInput {
  // bytes da imagem (já decodificados de base64).
  buffer: Buffer;
  // mimetype vindo do WMode, ex: "image/jpeg".
  mimetype?: string;
  userId: string | null;
  // Categorias personalizadas do usuário, para o modelo classificar nelas além
  // das de sistema (mesma lista usada pelo message-parser).
  customCategories?: { slug: string; name: string }[];
  // Legenda que o usuário escreveu junto da foto (ex: "no cartão Bradesco").
  // Entra como contexto no prompt — pode informar cartão, observação, etc.
  caption?: string;
}

@Injectable()
export class ReceiptExtractionService {
  private readonly logger = new Logger(ReceiptExtractionService.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly config: ConfigService,
    private readonly aiUsage: AiUsageService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.config.getOrThrow<string>('OPENAI_API_KEY'),
    });
  }

  /**
   * Lê um comprovante/nota a partir da imagem e devolve uma transação
   * estruturada (mesmo formato que o message-parser produz para texto). Retorna
   * null quando a imagem não é um comprovante legível ou em caso de falha — o
   * chamador decide a mensagem de fallback.
   */
  async extract({
    buffer,
    mimetype,
    userId,
    customCategories = [],
    caption,
  }: ReceiptExtractionInput): Promise<ParsedTransaction | null> {
    try {
      const mediaType = mimetype?.split(';')[0]?.trim() || 'image/jpeg';
      const dataUrl = `data:${mediaType};base64,${buffer.toString('base64')}`;

      // Conteúdo da mensagem do usuário: a imagem em alta resolução +, quando
      // houver, a legenda como texto.
      // - detail 'high': nota fiscal de mercado tem texto pequeno e denso; em
      //   'low' (imagem comprimida p/ ~512px) o modelo borrava os números e
      //   chutava o valor (pegava linha de tributo em vez do total). 'high' lê
      //   em tiles na resolução cheia. Custa mais tokens, mas ler o valor certo
      //   é inegociável num app financeiro.
      const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [
        {
          type: 'image_url',
          image_url: { url: dataUrl, detail: 'high' },
        },
      ];
      const trimmedCaption = caption?.trim();
      if (trimmedCaption) {
        userContent.push({
          type: 'text',
          text: `Legenda que o usuário escreveu junto da foto: "${trimmedCaption}"`,
        });
      }

      const completion = await this.openai.chat.completions.create({
        model: MODEL,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: this.buildPrompt(customCategories),
          },
          {
            role: 'user',
            content: userContent,
          },
        ],
      });

      // Registro de uso (falha graciosa). gpt-4o-mini já está no PRICING do
      // AiUsageService, então o custo sai automático a partir dos tokens.
      const usage = completion.usage;
      await this.aiUsage.record({
        userId,
        feature: AiFeature.WHATSAPP_RECEIPT,
        model: MODEL,
        promptTokens: usage?.prompt_tokens ?? 0,
        completionTokens: usage?.completion_tokens ?? 0,
      });

      const raw = completion.choices[0]?.message?.content?.trim();
      if (!raw) {
        this.logger.warn('Modelo não retornou conteúdo para o comprovante');
        return null;
      }

      const json = JSON.parse(raw) as Record<string, unknown>;
      // O modelo sinaliza quando a imagem não é um comprovante legível.
      if (json.notReceipt === true) {
        this.logger.log('Imagem recebida não é um comprovante legível');
        return null;
      }

      return this.toTransaction(json);
    } catch (err) {
      this.logger.error(`Erro ao ler comprovante: ${String(err)}`);
      return null;
    }
  }

  // Valida/normaliza o JSON do modelo no formato ParsedTransaction. Espelha a
  // validação de transação do message-parser (campos obrigatórios: amount +
  // categorySlug). Retorna null se faltar o essencial.
  private toTransaction(
    json: Record<string, unknown>,
  ): ParsedTransaction | null {
    if (!json.amount || !json.categorySlug) return null;
    const amount = Number(json.amount);
    if (!Number.isFinite(amount) || amount <= 0) return null;

    const cardName =
      typeof json.cardName === 'string' && json.cardName.trim()
        ? json.cardName.trim()
        : undefined;

    return {
      amount,
      // Comprovante é quase sempre um gasto; só INCOME quando explícito.
      type: json.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
      categorySlug: json.categorySlug as string,
      categoryConfidence:
        typeof json.categoryConfidence === 'number'
          ? json.categoryConfidence
          : 1,
      description: (json.description as string) || 'Comprovante',
      ...(cardName ? { cardName } : {}),
    };
  }

  private buildPrompt(
    customCategories: { slug: string; name: string }[],
  ): string {
    // Mesmo mapa de categorias (com palavras-chave) que o parser de texto usa,
    // para o modelo classificar igual — ex: "padaria" → alimentacao. Sem isso o
    // modelo inventava slugs livres ("padaria") que não batem com nenhuma
    // categoria e caíam em confirmação.
    const categories = buildCategoryList(customCategories);

    return `Você lê comprovantes de pagamento e notas fiscais de uma foto e extrai a transação.

Responda APENAS com JSON, sem markdown, neste formato:
{"amount": number, "type": "INCOME" | "EXPENSE", "categorySlug": string, "categoryConfidence": number, "description": string, "cardName": string | null}

CATEGORIAS DISPONÍVEIS (escolha o categorySlug EXATAMENTE da lista abaixo, nunca invente um slug fora dela):
${categories}

Regras:
- amount: o VALOR TOTAL EFETIVAMENTE PAGO (apenas o número, ex: 45.48). Numa nota fiscal de mercado, procure por "VALOR PAGO", "Valor Total", "Total a pagar" ou "Valor Total R$". É o maior valor da fatura, normalmente em destaque no fim. NUNCA confunda com:
  • valores de ITENS individuais (cada produto da lista);
  • SUBTOTAL antes de descontos;
  • linhas de TRIBUTOS / impostos ("Tributos Totais Incidentes", "Trib aprox") — esse NÃO é o valor pago;
  • troco, desconto ou quantidade de itens.
  Se houver desconto, o valor pago é o total JÁ COM desconto aplicado.
- type: quase sempre "EXPENSE" (é um comprovante de pagamento). Só use "INCOME" se for claramente um recebimento.
- categorySlug: o slug da lista acima que melhor descreve o gasto, inferido pelo nome do estabelecimento/itens (ex: uma padaria → "alimentacao"; um posto → "transporte"). Use SEMPRE um slug que existe na lista.
- Se o estabelecimento NÃO indicar o tipo de gasto (nome de pessoa física, sigla, razão social genérica) e você não conseguir classificar com segurança, use "outros" com categoryConfidence baixo (< 0.6) — o app confirma com o usuário. NUNCA escolha uma categoria aleatória só para preencher.
- categoryConfidence: 0 a 1, quão confiante você está na categoria. Quando o estabelecimento deixa claro o ramo (padaria, posto, farmácia...), use confiança alta (>= 0.8). Só use < 0.6 quando realmente estiver em dúvida.
- description: nome do estabelecimento, ou um resumo curto do que foi comprado.
- cardName: se a LEGENDA do usuário ou o comprovante indicar o cartão usado (ex: "no cartão Bradesco", "crédito Nubank"), coloque o nome do cartão. Se mencionar só "cartão"/"crédito" sem nome, use "cartao". Se não houver indicação de cartão, use null.

Se a imagem NÃO for um comprovante/nota legível (foto borrada, sem valor visível, ou não é um comprovante), responda exatamente: {"notReceipt": true}`;
  }
}
