import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { verify as verifyOtp } from 'otplib';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '../../users/repositories/users.repository';
import { decryptSecret } from '../../../common/crypto/totp-crypto';

interface VerifyTwoFactorInput {
  tempToken: string;
  code: string;
}

interface TempTokenPayload {
  sub: string;
  twofa?: string;
}

@Injectable()
export class VerifyTwoFactorUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(input: VerifyTwoFactorInput) {
    let payload: TempTokenPayload;
    try {
      payload = this.jwtService.verify<TempTokenPayload>(input.tempToken);
    } catch {
      throw new UnauthorizedException('Sessão de verificação expirada');
    }

    if (!payload?.sub || payload.twofa !== 'pending') {
      throw new UnauthorizedException('Sessão de verificação expirada');
    }

    const user = await this.usersRepository.findById(payload.sub);
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new UnauthorizedException('Sessão de verificação expirada');
    }

    const secret = decryptSecret(user.twoFactorSecret);

    // 1) Tenta TOTP.
    const totpResult = await verifyOtp({
      token: input.code,
      secret,
      epochTolerance: 30,
    });
    let verified = totpResult.valid;

    // 2) Caso falhe, tenta os backup codes (com e sem hífen).
    if (!verified) {
      const candidates = this.backupCandidates(input.code);

      for (const hash of user.backupCodes) {
        const match = await this.anyMatches(candidates, hash);
        if (match) {
          const remaining = user.backupCodes.filter((c) => c !== hash);
          await this.usersRepository.updateTwoFactor(user.id, {
            backupCodes: remaining,
          });
          verified = true;
          break;
        }
      }
    }

    if (!verified) {
      throw new UnauthorizedException('Código inválido');
    }

    const token = this.jwtService.sign({ sub: user.id, email: user.email });

    return {
      status: 'SUCCESS' as const,
      user: { id: user.id, name: user.name, email: user.email },
      token,
    };
  }

  /**
   * Aceita o backup code tanto com hífen (A1B2-C3D4) quanto sem (A1B2C3D4),
   * normalizando para maiúsculas. Os codes são armazenados com hífen.
   */
  private backupCandidates(code: string): string[] {
    const normalized = code.trim().toUpperCase();
    const candidates = new Set<string>([normalized]);

    const stripped = normalized.replace(/-/g, '');
    if (stripped.length === 8) {
      candidates.add(`${stripped.slice(0, 4)}-${stripped.slice(4, 8)}`);
    }

    return [...candidates];
  }

  private async anyMatches(candidates: string[], hash: string) {
    for (const candidate of candidates) {
      if (await bcrypt.compare(candidate, hash)) {
        return true;
      }
    }
    return false;
  }
}
