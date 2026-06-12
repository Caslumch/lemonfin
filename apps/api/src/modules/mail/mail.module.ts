import { Module } from '@nestjs/common';
import { MailService } from './services/mail.service';
import { ResendClientService } from './services/resend-client.service';

@Module({
  providers: [MailService, ResendClientService],
  exports: [MailService],
})
export class MailModule {}
