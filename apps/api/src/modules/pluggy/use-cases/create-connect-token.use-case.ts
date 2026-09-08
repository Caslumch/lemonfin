import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PluggyClientService } from '../services/pluggy-client.service';

@Injectable()
export class CreateConnectTokenUseCase {
  constructor(
    private readonly pluggy: PluggyClientService,
    private readonly config: ConfigService,
  ) {}

  async execute(
    userId: string,
    itemId?: string,
  ): Promise<{ accessToken: string }> {
    // webhookUrl: a Pluggy notifica nesta URL quando o Item muda de estado.
    // Em dev, usar ngrok ou similar (Pluggy exige HTTPS, sem localhost).
    // API_URL é a variável já usada em produção (Render). API_BASE_URL é
    // fallback (compat com .env.example).
    const apiBaseUrl =
      this.config.get<string>('API_URL', '') ||
      this.config.get<string>('API_BASE_URL', '');
    const webhookUrl = apiBaseUrl ? `${apiBaseUrl}/pluggy/webhook` : undefined;

    const accessToken = await this.pluggy.createConnectToken({
      clientUserId: userId,
      webhookUrl,
    });

    return { accessToken };
  }
}
