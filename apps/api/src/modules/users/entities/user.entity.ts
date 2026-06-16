export class UserEntity {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: Date;

  constructor(partial: Partial<UserEntity & { passwordHash?: string }>) {
    // Remove passwordHash antes de copiar — nunca expor o hash na entidade.
    const rest = { ...(partial as Record<string, unknown>) };
    delete rest.passwordHash;
    Object.assign(this, rest);
  }
}
