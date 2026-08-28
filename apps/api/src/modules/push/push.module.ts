import { Module } from '@nestjs/common';
import { DevicesController } from './controllers/devices.controller';
import { PushTokenRepository } from './repositories/push-token.repository';
import { ExpoPushService } from './services/expo-push.service';
import { PushDispatchService } from './services/push-dispatch.service';

// Push notifications (Expo Push Service). Registro de device via /devices e
// envio via PushDispatchService, consumido pelos lembretes (canal 'push').
@Module({
  controllers: [DevicesController],
  providers: [PushTokenRepository, ExpoPushService, PushDispatchService],
  // RemindersModule injeta o dispatch para entregar lembretes também por push.
  exports: [PushDispatchService, PushTokenRepository],
})
export class PushModule {}
