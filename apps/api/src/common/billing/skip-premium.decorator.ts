import { SetMetadata } from '@nestjs/common';

export const SKIP_PREMIUM_KEY = 'skipPremium';

/**
 * Marca uma rota (ou controller inteiro) como isenta do PremiumGuard, mesmo com
 * o enforcement ligado. Usar nos fluxos que PRECISAM continuar acessíveis para
 * um usuário sem acesso poder voltar a ter (billing, auth, perfil/leitura).
 */
export const SkipPremium = () => SetMetadata(SKIP_PREMIUM_KEY, true);
