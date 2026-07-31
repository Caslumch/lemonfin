import { Injectable, Logger } from '@nestjs/common';
import { AiFeature } from '@prisma/client';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { AiUsageService } from '../../ai-usage/ai-usage.service';
import { WmodeClientService } from './wmode-client.service';

// Voz neural pt-BR do Edge (feminina, natural). Trocar por 'pt-BR-AntonioNeural'
// (masculina) se preferir. Lista completa: MsEdgeTTS.getVoices().
const VOICE = 'pt-BR-FranciscaNeural';

// Opus dentro de contêiner WebM — é o que a lib entrega. O WhatsApp/Baileys quer
// opus em contêiner OGG para virar mensagem de voz (PTT); o remux WebM→OGG (mesmo
// codec, sem reencode) é feito no WMode com ffmpeg. Aqui só geramos o buffer.
const FORMAT = OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS;

// Não estouramos o áudio à toa: acima disso a "voz" vira um textão falado,
// cansativo de ouvir. O chamador decide o fallback (mandar só texto).
const MAX_CHARS = 1200;

// O edge-tts é a API interna de TTS do navegador Edge (Azure Speech), sem chave e
// sem custo, mas NÃO-OFICIAL: pode mudar/cair sem aviso. Por isso o recurso vive
// atrás da flag por conta (User.ttsEnabled) — uso interno/teste. Falha graciosa:
// qualquer erro retorna null e o assessor responde em texto normalmente.
@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);

  constructor(
    private readonly aiUsage: AiUsageService,
    private readonly wmodeClient: WmodeClientService,
  ) {}

  /**
   * Envia `text` como mensagem de VOZ (PTT) quando possível, senão cai para
   * TEXTO — nunca fica sem resposta. Ponto único de saída falada: usado pelo
   * assessor (sob pedido) e pelos avisos proativos (gastos/anomalias). Retorna
   * true se saiu como áudio, false se caiu para texto (para logs/telemetria).
   */
  async speakOrText(
    to: string,
    text: string,
    userId: string | null,
  ): Promise<boolean> {
    const buffer = await this.synthesize(text, userId);
    if (buffer) {
      const sent = await this.wmodeClient.sendAudio({
        to,
        audio: buffer.toString('base64'),
      });
      if (sent != null) return true;
    }
    await this.wmodeClient.sendMessage({ to, content: text });
    return false;
  }

  /**
   * Sintetiza `text` em voz (pt-BR) e devolve o buffer de áudio (webm/opus), ou
   * null se falhar/texto vazio/longo demais — o chamador cai para texto.
   */
  async synthesize(
    text: string,
    userId: string | null,
  ): Promise<Buffer | null> {
    const clean = text?.trim() ?? '';
    if (!clean) return null;
    if (clean.length > MAX_CHARS) {
      this.logger.warn(
        `TTS pulado: texto com ${clean.length} chars (> ${MAX_CHARS})`,
      );
      return null;
    }

    try {
      const tts = new MsEdgeTTS();
      await tts.setMetadata(VOICE, FORMAT);

      const buffer = await this.collect(tts, clean);
      // Fecha o WebSocket (a lib mantém a conexão aberta entre chamadas).
      tts.close();

      if (!buffer.length) {
        this.logger.warn('TTS retornou áudio vazio');
        return null;
      }

      // Edge TTS é gratuito; registramos a chamada (custo $0) só para o painel
      // ter o rastro da feature — mesmo tratamento do Whisper.
      await this.aiUsage.record({
        userId,
        feature: AiFeature.WHATSAPP_TTS,
        model: `edge-tts:${VOICE}`,
        promptTokens: 0,
        completionTokens: 0,
      });

      return buffer;
    } catch (err) {
      this.logger.error(`Erro ao sintetizar áudio (TTS): ${String(err)}`);
      return null;
    }
  }

  // Acumula o stream de áudio da lib em um único Buffer.
  private collect(tts: MsEdgeTTS, text: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const { audioStream } = tts.toStream(text);
      audioStream.on('data', (c: Buffer) => chunks.push(c));
      audioStream.on('end', () => resolve(Buffer.concat(chunks)));
      audioStream.on('error', reject);
    });
  }
}
