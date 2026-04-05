export class UserEntity {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: Date;

  constructor(partial: Partial<UserEntity & { passwordHash?: string }>) {
    const { passwordHash: _, ...rest } = partial as Record<string, unknown>;
    Object.assign(this, rest);
  }
}
