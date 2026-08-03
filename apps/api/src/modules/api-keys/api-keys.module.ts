import { Module } from '@nestjs/common';
import { ApiKeysController } from './controllers/api-keys.controller';
import { ApiKeysService } from './services/api-keys.service';
import { ApiKeysRepository } from './repositories/api-keys.repository';
import { ApiKeyGuard } from './guards/api-key.guard';

// Fundação do gateway de IA (ver docs/plano-gateway-ia.md). Exporta o guard e o
// repositório para o futuro GatewayModule (/v1) e o servidor MCP autenticarem
// por API key reaproveitando esta camada. PrismaModule é global — não é importado.
@Module({
  controllers: [ApiKeysController],
  providers: [ApiKeysService, ApiKeysRepository, ApiKeyGuard],
  exports: [ApiKeyGuard, ApiKeysRepository],
})
export class ApiKeysModule {}
