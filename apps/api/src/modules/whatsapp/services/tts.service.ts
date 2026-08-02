import { Injectable, Logger } from '@nestjs/common';
import { AiFeature } from '@prisma/client';
import { MsEdgeTTS, OUTPUT_FORMAT, ProsodyOptions } from 'msedge-tts';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiUsageService } from '../../ai-usage/ai-usage.service';
import { WmodeClientService } from './wmode-client.service';

// As 3 vozes neurais pt-BR do edge-tts (MsEdgeTTS.getVoices()). O default cobre
// contas sem preferência salva e valores inválidos.
export const TTS_VOICES = [
  'pt-BR-FranciscaNeural', // feminina (default)
  'pt-BR-AntonioNeural', // masculina
  'pt-BR-ThalitaMultilingualNeural', // feminina (multilíngue)
] as const;
export type TtsVoice = (typeof TTS_VOICES)[number];
const DEFAULT_VOICE: TtsVoice = 'pt-BR-FranciscaNeural';

// MP3 (não webm/opus). O WMode reconverte para OGG/Opus com ffmpeg antes de
// enviar como voz (PTT), aceitando qualquer formato que o ffmpeg leia — e o MP3 é
// o mais universalmente demuxável. O webm/opus da lib fazia o ffmpeg do WMode
// estourar (500 na conversão); o MP3 evita esse caso de borda do contêiner.
const FORMAT = OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3;

// Não estouramos o áudio à toa: acima disso a "voz" vira um textão falado,
// cansativo de ouvir. O chamador decide o fallback (mandar só texto).
const MAX_CHARS = 1200;

// Preferências de voz de uma conta, resolvidas do User. "default" em
// rate/pitch/volume = sem alteração (não entra no SSML).
interface VoicePrefs {
  voice: string;
  rate: string;
  pitch: string;
  volume: string;
}

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
    private readonly prisma: PrismaService,
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
   * Sintetiza `text` em voz (pt-BR) e devolve o buffer de áudio (MP3), ou
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
      const prefs = await this.loadPrefs(userId);
      const tts = new MsEdgeTTS();
      await tts.setMetadata(prefs.voice, FORMAT);

      const buffer = await this.collect(tts, clean, this.prosody(prefs));
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
        model: `edge-tts:${prefs.voice}`,
        promptTokens: 0,
        completionTokens: 0,
      });

      return buffer;
    } catch (err) {
      this.logger.error(`Erro ao sintetizar áudio (TTS): ${String(err)}`);
      return null;
    }
  }

  // Prefs de voz da conta. Sem userId ou conta sem valores → default. Voz
  // desconhecida (ex.: removida do edge-tts) cai no default para não quebrar.
  private async loadPrefs(userId: string | null): Promise<VoicePrefs> {
    const fallback: VoicePrefs = {
      voice: DEFAULT_VOICE,
      rate: 'default',
      pitch: 'default',
      volume: 'default',
    };
    if (!userId) return fallback;
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ttsVoice: true,
        ttsRate: true,
        ttsPitch: true,
        ttsVolume: true,
      },
    });
    if (!u) return fallback;
    return {
      voice: (TTS_VOICES as readonly string[]).includes(u.ttsVoice)
        ? u.ttsVoice
        : DEFAULT_VOICE,
      rate: u.ttsRate || 'default',
      pitch: u.ttsPitch || 'default',
      volume: u.ttsVolume || 'default',
    };
  }

  // Monta as ProsodyOptions do edge-tts. "default" é omitido (a lib usa o padrão
  // da voz); só entra o que a conta customizou.
  private prosody(prefs: VoicePrefs): ProsodyOptions {
    const opts: ProsodyOptions = {};
    if (prefs.rate && prefs.rate !== 'default') opts.rate = prefs.rate;
    if (prefs.pitch && prefs.pitch !== 'default') opts.pitch = prefs.pitch;
    if (prefs.volume && prefs.volume !== 'default') opts.volume = prefs.volume;
    return opts;
  }

  // Acumula o stream de áudio da lib em um único Buffer.
  private collect(
    tts: MsEdgeTTS,
    text: string,
    prosody: ProsodyOptions,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const { audioStream } = tts.toStream(text, prosody);
      audioStream.on('data', (c: Buffer) => chunks.push(c));
      audioStream.on('end', () => resolve(Buffer.concat(chunks)));
      audioStream.on('error', reject);
    });
  }
}
