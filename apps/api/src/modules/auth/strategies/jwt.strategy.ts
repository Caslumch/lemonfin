import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface JwtPayload {
  sub: string;
  email?: string;
  // Marcador do tipo de token. Tokens de acesso completos são assinados com
  // `type: 'access'`. O token TEMPORÁRIO emitido entre senha e 2FA NÃO tem essa
  // marca (carrega `twofa: 'pending'`), então é rejeitado aqui.
  type?: string;
  twofa?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // getOrThrow: sem JWT_SECRET a app NÃO sobe. Nunca cair num fallback
      // hardcoded — isso permitiria forjar tokens com um segredo público.
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload) {
    // Defesa contra bypass de 2FA: o tempToken pré-2FA é assinado com o MESMO
    // segredo deste verificador, então sem esta checagem ele autenticaria
    // qualquer rota protegida. Só tokens de acesso completos (`type: 'access'`)
    // valem como sessão; o token parcial (twofa: 'pending') é recusado.
    if (payload.type !== 'access' || payload.twofa) {
      throw new UnauthorizedException('Token inválido');
    }
    return { id: payload.sub, email: payload.email };
  }
}
