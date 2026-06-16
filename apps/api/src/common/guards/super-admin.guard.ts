import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UsersRepository } from '../../modules/users/repositories/users.repository';

/**
 * Protege os endpoints /admin/* — área do super-admin da PLATAFORMA (dono),
 * não o papel ADMIN de família. Lê isSuperAdmin do banco a partir do req.user
 * (populado pelo JwtAuthGuard, que deve vir ANTES deste no @UseGuards).
 *
 * 403 para qualquer usuário sem a flag.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly usersRepository: UsersRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ user?: { id: string } }>();
    const userId = req.user?.id;
    if (!userId) throw new ForbiddenException('Acesso restrito.');

    const user = await this.usersRepository.findById(userId);
    if (!user?.isSuperAdmin) {
      throw new ForbiddenException('Acesso restrito ao administrador.');
    }
    return true;
  }
}
