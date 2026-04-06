import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class KeepAliveService {
  private readonly logger = new Logger(KeepAliveService.name);
  private readonly apiUrl: string;

  constructor(private readonly config: ConfigService) {
    this.apiUrl = this.config.get<string>('API_URL', '');
  }

  @Cron('*/10 * * * *')
  async ping() {
    if (!this.apiUrl) return;

    try {
      const res = await fetch(`${this.apiUrl}/health`);
      this.logger.debug(`Keep-alive ping: ${res.status}`);
    } catch (err) {
      this.logger.warn(`Keep-alive ping failed: ${err}`);
    }
  }
}
