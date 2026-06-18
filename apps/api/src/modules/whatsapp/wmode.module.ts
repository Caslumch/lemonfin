import { Module } from '@nestjs/common';
import { WmodeClientService } from './services/wmode-client.service';

/**
 * Módulo enxuto só com o cliente da WMode (envio de mensagens no WhatsApp).
 * Extraído do WhatsappModule para que outros módulos (auth, alerts, families)
 * possam enviar mensagens sem importar o WhatsappModule inteiro — o que evita
 * dependência circular, já que o WhatsappModule importa FamiliesModule.
 */
@Module({
  providers: [WmodeClientService],
  exports: [WmodeClientService],
})
export class WmodeModule {}
