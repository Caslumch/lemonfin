import { ForbiddenException } from '@nestjs/common';
import { SuperAdminGuard } from './super-admin.guard';

const ctx = (user?: { id: string }) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as never;

describe('SuperAdminGuard', () => {
  let usersRepository: { findById: jest.Mock };
  let guard: SuperAdminGuard;

  beforeEach(() => {
    usersRepository = { findById: jest.fn() };
    guard = new SuperAdminGuard(usersRepository as never);
  });

  it('libera quando isSuperAdmin = true', async () => {
    usersRepository.findById.mockResolvedValue({
      id: 'u1',
      isSuperAdmin: true,
    });
    await expect(guard.canActivate(ctx({ id: 'u1' }))).resolves.toBe(true);
  });

  it('bloqueia (403) quando isSuperAdmin = false', async () => {
    usersRepository.findById.mockResolvedValue({
      id: 'u1',
      isSuperAdmin: false,
    });
    await expect(guard.canActivate(ctx({ id: 'u1' }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('bloqueia (403) quando o usuário não existe', async () => {
    usersRepository.findById.mockResolvedValue(null);
    await expect(guard.canActivate(ctx({ id: 'u1' }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('bloqueia (403) sem usuário no request', async () => {
    await expect(guard.canActivate(ctx(undefined))).rejects.toThrow(
      ForbiddenException,
    );
    expect(usersRepository.findById).not.toHaveBeenCalled();
  });
});
