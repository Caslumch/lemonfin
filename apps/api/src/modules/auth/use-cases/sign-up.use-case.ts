import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '../../users/repositories/users.repository';
import { WmodeClientService } from '../../whatsapp/services/wmode-client.service';
import { SignUpInput } from '../dtos/auth.dto';

@Injectable()
export class SignUpUseCase {
  private readonly logger = new Logger(SignUpUseCase.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly wmodeClient: WmodeClientService,
  ) {}

  async execute(input: SignUpInput) {
    const existing = await this.usersRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictException('E-mail ja cadastrado');
    }

    // O telefone já vem com código do país (ex: 5511999999999)
    const normalizedPhone = input.phone || undefined;

    if (normalizedPhone) {
      const phoneExists = await this.usersRepository.findByPhone(normalizedPhone);
      if (phoneExists) {
        throw new ConflictException('Telefone ja vinculado a outra conta');
      }
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await this.usersRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
      ...(normalizedPhone && { phone: normalizedPhone }),
    });

    const token = this.jwtService.sign({ sub: user.id, email: user.email });

    if (normalizedPhone) {
      this.sendWelcomeWhatsApp(normalizedPhone, input.name).catch((err) =>
        this.logger.error(`Failed to send welcome WhatsApp: ${err}`),
      );
    }

    return {
      user: { id: user.id, name: user.name, email: user.email },
      token,
    };
  }

  private async sendWelcomeWhatsApp(phone: string, name: string) {
    const to = phone;
    const firstName = name.split(' ')[0];

    const result = await this.wmodeClient.sendMessage({
      to,
      content:
        `Ola, ${firstName}! Bem-vindo ao *LemonFin* 🍋\n\n` +
        `Aqui voce controla suas financas de um jeito simples, direto pelo WhatsApp.\n\n` +
        `Para registrar um gasto, basta me mandar algo como:\n` +
        `- "Gastei 50 no mercado"\n` +
        `- "Uber 18,50"\n` +
        `- "Almoco 32 no cartao Nubank"\n\n` +
        `Tambem posso responder perguntas como "Quanto gastei esse mes?" ou "Cancela o ultimo gasto".\n\n` +
        `Bora comecar?`,
    });

    if (result) {
      this.logger.log(`Welcome WhatsApp sent to ${to}`);
    }
  }
}
