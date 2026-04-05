import { Injectable, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '../../users/repositories/users.repository';
import { SignUpInput } from '../dtos/auth.dto';

@Injectable()
export class SignUpUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(input: SignUpInput) {
    const existing = await this.usersRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictException('E-mail ja cadastrado');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await this.usersRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
      ...(input.phone && { phone: input.phone }),
    });

    const token = this.jwtService.sign({ sub: user.id, email: user.email });

    return {
      user: { id: user.id, name: user.name, email: user.email },
      token,
    };
  }
}
