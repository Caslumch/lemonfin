import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '../../users/repositories/users.repository';
import { AuthTokensService } from '../services/auth-tokens.service';
import { SignInInput } from '../dtos/auth.dto';

@Injectable()
export class SignInUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly authTokens: AuthTokensService,
  ) {}

  async execute(input: SignInInput) {
    const user = await this.usersRepository.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    const passwordValid = await bcrypt.compare(
      input.password,
      user.passwordHash,
    );
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    if (user.twoFactorEnabled) {
      const tempToken = this.jwtService.sign(
        { sub: user.id, twofa: 'pending' },
        { expiresIn: '5m' },
      );
      return { status: 'TOTP_REQUIRED' as const, tempToken };
    }

    const session = await this.authTokens.issueSession(user);

    return {
      status: 'SUCCESS' as const,
      user: { id: user.id, name: user.name, email: user.email },
      ...session,
    };
  }
}
