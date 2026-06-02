import { eq } from 'drizzle-orm'
import type { UserRepository } from '../../../domain/ports/user-repository.port'
import { UserAggregate, type UserSnapshot } from '../../../domain/user/user.aggregate'
import { EmailAlreadyInUseError } from '../../../domain/user/user.errors'
import type { Database } from './db'
import { users } from './schema'

type UserRow = typeof users.$inferSelect

/** Repositório de usuários (Drizzle/Postgres). */
export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<UserAggregate | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1)
    return row ? UserAggregate.restore(toSnapshot(row)) : null
  }

  async findByEmail(email: string): Promise<UserAggregate | null> {
    const normalized = email.trim().toLowerCase()
    const [row] = await this.db.select().from(users).where(eq(users.email, normalized)).limit(1)
    return row ? UserAggregate.restore(toSnapshot(row)) : null
  }

  async create(user: UserAggregate): Promise<void> {
    const s = user.toSnapshot()
    try {
      await this.db.insert(users).values({
        id: s.id,
        version: s.version,
        email: s.email,
        passwordHash: s.passwordHash,
        firstName: s.firstName,
        lastName: s.lastName,
        role: s.role,
        status: s.status,
        phone: s.phone,
        signupSource: s.signupSource,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })
    } catch (error) {
      // 23505 = unique_violation (índice único de e-mail) → conflito de cadastro.
      if (isUniqueViolation(error)) throw new EmailAlreadyInUseError()
      throw error
    }
  }
}

function toSnapshot(row: UserRow): UserSnapshot {
  return {
    id: row.id,
    version: row.version,
    email: row.email,
    passwordHash: row.passwordHash,
    firstName: row.firstName,
    lastName: row.lastName,
    role: row.role,
    status: row.status,
    phone: row.phone,
    signupSource: row.signupSource,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === '23505'
  )
}
