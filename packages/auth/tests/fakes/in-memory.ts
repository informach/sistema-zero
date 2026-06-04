import type { Logger } from '@sistemazero/core/logging'
import type { MessagingClient, SendEmailInput } from '../../src/domain/ports/messaging-client.port'
import type {
  CreateOtpCodeInput,
  OtpCodeRecord,
  OtpCodeRepository,
  OtpPurpose,
} from '../../src/domain/ports/otp-code-repository.port'
import type { PasswordHasher } from '../../src/domain/ports/password-hasher.port'
import type {
  CreatePasswordResetTokenInput,
  PasswordResetTokenRecord,
  PasswordResetTokenRepository,
} from '../../src/domain/ports/password-reset-token-repository.port'
import type {
  CreateRefreshTokenInput,
  RefreshTokenRecord,
  RefreshTokenRepository,
} from '../../src/domain/ports/refresh-token-repository.port'
import type { ListUsersFilter, UserRepository } from '../../src/domain/ports/user-repository.port'
import { UserAggregate } from '../../src/domain/user/user.aggregate'
import { EmailAlreadyInUseError } from '../../src/domain/user/user.errors'

/** Logger silencioso para os testes. */
export const silentLogger: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
}

/**
 * Hasher de teste (rápido e determinístico): `hash(p) = "hashed:" + p`. Evita o
 * custo do argon2id real (e o timing) nos testes; mantém a semântica de verify.
 */
export const fakeHasher: PasswordHasher = {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`
  },
  async verify(plain: string, hash: string): Promise<boolean> {
    return hash === `hashed:${plain}`
  },
}

/** Repositório de usuários em memória (reidrata snapshots, como o adapter real). */
export class InMemoryUserRepository implements UserRepository {
  readonly byId = new Map<string, UserAggregate>()

  async findById(id: string): Promise<UserAggregate | null> {
    const user = this.byId.get(id)
    return user ? UserAggregate.restore(user.toSnapshot()) : null
  }

  async findByEmail(email: string): Promise<UserAggregate | null> {
    const normalized = email.trim().toLowerCase()
    for (const user of this.byId.values()) {
      if (user.email === normalized) return UserAggregate.restore(user.toSnapshot())
    }
    return null
  }

  async create(user: UserAggregate): Promise<void> {
    for (const existing of this.byId.values()) {
      if (existing.email === user.email) throw new EmailAlreadyInUseError()
    }
    this.byId.set(user.id, UserAggregate.restore(user.toSnapshot()))
  }

  async list(filter: ListUsersFilter): Promise<{ users: UserAggregate[]; total: number }> {
    let all = [...this.byId.values()]
    const q = filter.q?.trim().toLowerCase()
    if (q) {
      all = all.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          u.firstName.toLowerCase().includes(q) ||
          u.lastName.toLowerCase().includes(q),
      )
    }
    if (filter.role) all = all.filter((u) => u.role === filter.role)
    if (filter.status) all = all.filter((u) => u.status === filter.status)
    all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    const page = all.slice(filter.offset, filter.offset + filter.limit)
    return { users: page.map((u) => UserAggregate.restore(u.toSnapshot())), total: all.length }
  }

  async listByIds(ids: string[]): Promise<UserAggregate[]> {
    const want = new Set(ids)
    return [...this.byId.values()]
      .filter((u) => want.has(u.id))
      .map((u) => UserAggregate.restore(u.toSnapshot()))
  }

  async update(user: UserAggregate, expectedVersion: number): Promise<boolean> {
    const existing = this.byId.get(user.id)
    if (!existing || existing.version !== expectedVersion) return false
    this.byId.set(user.id, UserAggregate.restore(user.toSnapshot()))
    return true
  }

  /** Helper de teste: insere um agregado diretamente (ex.: usuário suspenso). */
  seed(user: UserAggregate): void {
    this.byId.set(user.id, UserAggregate.restore(user.toSnapshot()))
  }
}

/** Repositório de refresh tokens em memória (espelha rotação + revogação). */
export class InMemoryRefreshTokenRepository implements RefreshTokenRepository {
  readonly byId = new Map<string, RefreshTokenRecord>()

  async create(input: CreateRefreshTokenInput): Promise<void> {
    this.byId.set(input.id, {
      id: input.id,
      userId: input.userId,
      familyId: input.familyId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      rotatedAt: null,
      revokedAt: null,
    })
  }

  async findByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    for (const record of this.byId.values()) {
      if (record.tokenHash === tokenHash) return { ...record }
    }
    return null
  }

  async markRotated(id: string, rotatedAt: Date): Promise<void> {
    const record = this.byId.get(id)
    if (record) {
      record.rotatedAt = rotatedAt
      record.revokedAt = rotatedAt
    }
  }

  async revoke(id: string): Promise<void> {
    const record = this.byId.get(id)
    if (record) record.revokedAt = new Date()
  }

  async revokeFamily(familyId: string): Promise<void> {
    for (const record of this.byId.values()) {
      if (record.familyId === familyId) record.revokedAt = new Date()
    }
  }

  async revokeAllForUser(userId: string): Promise<void> {
    for (const record of this.byId.values()) {
      if (record.userId === userId && record.revokedAt === null) record.revokedAt = new Date()
    }
  }
}

/** Repositório de tokens de redefinição de senha em memória. */
export class InMemoryPasswordResetTokenRepository implements PasswordResetTokenRepository {
  readonly byId = new Map<string, PasswordResetTokenRecord>()

  async create(input: CreatePasswordResetTokenInput): Promise<void> {
    this.byId.set(input.id, {
      id: input.id,
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      consumedAt: null,
    })
  }

  async findByHash(tokenHash: string): Promise<PasswordResetTokenRecord | null> {
    for (const record of this.byId.values()) {
      if (record.tokenHash === tokenHash) return { ...record }
    }
    return null
  }

  async consume(id: string, at: Date): Promise<void> {
    const record = this.byId.get(id)
    if (record && record.consumedAt === null) record.consumedAt = at
  }

  async consumeAllForUser(userId: string, at: Date): Promise<void> {
    for (const record of this.byId.values()) {
      if (record.userId === userId && record.consumedAt === null) record.consumedAt = at
    }
  }
}

/** Repositório de códigos OTP em memória (uso único + tentativas). */
export class InMemoryOtpCodeRepository implements OtpCodeRepository {
  readonly byId = new Map<string, OtpCodeRecord>()

  async create(input: CreateOtpCodeInput): Promise<void> {
    this.byId.set(input.id, {
      id: input.id,
      userId: input.userId,
      purpose: input.purpose,
      codeHash: input.codeHash,
      expiresAt: input.expiresAt,
      consumedAt: null,
      attempts: 0,
    })
  }

  async findActive(userId: string, purpose: OtpPurpose, now: Date): Promise<OtpCodeRecord | null> {
    const active = [...this.byId.values()].filter(
      (r) =>
        r.userId === userId &&
        r.purpose === purpose &&
        r.consumedAt === null &&
        r.expiresAt.getTime() > now.getTime(),
    )
    // O mais recente (espelha `orderBy createdAt desc` do adapter).
    return active.length > 0 ? { ...active[active.length - 1]! } : null
  }

  async consume(id: string, at: Date): Promise<void> {
    const record = this.byId.get(id)
    if (record && record.consumedAt === null) record.consumedAt = at
  }

  async consumeAllForUser(userId: string, purpose: OtpPurpose, at: Date): Promise<void> {
    for (const record of this.byId.values()) {
      if (record.userId === userId && record.purpose === purpose && record.consumedAt === null) {
        record.consumedAt = at
      }
    }
  }

  async incrementAttempts(id: string): Promise<number> {
    const record = this.byId.get(id)
    if (!record) return 0
    record.attempts += 1
    return record.attempts
  }
}

/** Cliente de mensageria fake: coleta os envios (assert no teste) e pode falhar sob demanda. */
export class FakeMessagingClient implements MessagingClient {
  readonly sent: SendEmailInput[] = []
  failNext = false

  async sendEmail(input: SendEmailInput): Promise<void> {
    if (this.failNext) {
      this.failNext = false
      throw new Error('messaging indisponível (fake)')
    }
    this.sent.push(input)
  }
}
