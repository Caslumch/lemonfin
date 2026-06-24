import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiFeature } from '@prisma/client';
import OpenAI from 'openai';
import { AiUsageService } from '../../ai-usage/ai-usage.service';
import { ParsedTransaction } from './message-parser.service';

// gpt-4o-mini é multimodal: aceita a imagem na mesma chamada de chat e devolve
// JSON estruturado. É a opção mais barata da stack OpenAI já integrada (Whisper,
// parser, chat). `detail: 'low'` reduz os tokens de imagem — suficiente para
// comprovante, que não exige leitura de detalhe fino.
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
  }: ReceiptExtractionInput): Promise<ParsedTransaction | null> {
    try {
      const mediaType = mimetype?.split(';')[0]?.trim() || 'image/jpeg';
      const dataUrl = `data:${mediaType};base64,${buffer.toString('base64')}`;

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
            content: [
              {
                type: 'image_url',
                image_url: { url: dataUrl, detail: 'low' },
              },
            ],
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
    };
  }

  private buildPrompt(
    customCategories: { slug: string; name: string }[],
  ): string {
    const extra =
      customCategories.length > 0
        ? `\n\nO usuário tem estas categorias personalizadas. Use uma delas APENAS ` +
          `quando o gasto se encaixar claramente — NUNCA como chute quando não ` +
          `souber a categoria:\n` +
          customCategories.map((c) => `- ${c.slug} (${c.name})`).join('\n')
        : '';

    return `Você lê comprovantes de pagamento e notas fiscais de uma foto e extrai a transação.

Responda APENAS com JSON, sem markdown, neste formato:
{"amount": number, "type": "INCOME" | "EXPENSE", "categorySlug": string, "categoryConfidence": number, "description": string}

Regras:
- amount: valor TOTAL pago, em reais (apenas o número, ex: 47.90).
- type: quase sempre "EXPENSE" (é um comprovante de pagamento). Só use "INCOME" se for claramente um recebimento.
- categorySlug: a categoria que melhor descreve o gasto, inferida pelo nome do estabelecimento/itens. Use um slug curto em minúsculas (ex: "mercado", "transporte", "restaurante", "saude", "lazer", "outros").
- IMPORTANTE: o nome do estabelecimento muitas vezes NÃO indica o tipo de gasto (ex: nome de pessoa física, sigla, razão social genérica). Quando você NÃO conseguir inferir a categoria com segurança, use "outros" com categoryConfidence baixo (< 0.6). NUNCA escolha uma categoria aleatória só para preencher — é melhor "outros" com confiança baixa, que o app confirma com o usuário.
- categoryConfidence: 0 a 1, quão confiante você está na categoria. Seja honesto: se o estabelecimento não deixa claro o tipo de gasto, use um valor < 0.6.
- description: nome do estabelecimento, ou um resumo curto do que foi comprado.

Se a imagem NÃO for um comprovante/nota legível (foto borrada, sem valor visível, ou não é um comprovante), responda exatamente: {"notReceipt": true}${extra}`;
  }
}
