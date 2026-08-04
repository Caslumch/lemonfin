import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// Publica o contrato OpenAPI do gateway (/v1). O JSON em /v1/openapi.json é o
// que um LLM/agente lê para saber usar a API sem glue code; a UI interativa em
// /v1/docs é para humanos explorarem/testarem.
//
// Só o namespace /v1 entra no doc: as rotas internas (browser/JWT) não são
// contrato público. O filtro por path faz esse recorte.
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('LemonFin API')
    .setDescription(
      'Gateway REST do LemonFin para agentes de IA e integrações. ' +
        'Autentique com uma chave de API (crie em Configurações → API) no ' +
        'header `Authorization: Bearer lmn_...` ou `X-API-Key`. ' +
        'Dica: gasto no cartão não entra em `expense` — veja o `_meta` de /v1/summary.',
    )
    .setVersion('1.0')
    // Esquema de segurança referenciado por @ApiSecurity('apiKey') no controller.
    // http/bearer aceita o valor cru da chave no header Authorization: Bearer.
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'lmn_live_*' },
      'apiKey',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Recorta o doc para expor SOMENTE as rotas do gateway (/v1).
  document.paths = Object.fromEntries(
    Object.entries(document.paths).filter(([path]) => path.startsWith('/v1')),
  );

  SwaggerModule.setup('v1/docs', app, document, {
    jsonDocumentUrl: 'v1/openapi.json',
    swaggerOptions: { persistAuthorization: true },
  });
}
