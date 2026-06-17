import type { Logger } from '@sistemazero/core/logging'
import type {
  CreateImpersonationTokenInput,
  ImpersonationTokenRecord,
  ImpersonationTokenRepository,
} from '../../src/domain/ports/impersonation-token-repository.port'
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
import type { ProfileAllowanceGateway } from '../../src/domain/ports/profile-allowance-gateway.port'
import type {
  CreateProfileOutcome,
  ProfileRepository,
} from '../../src/domain/ports/profile-repository.port'
import type {
  CreateRefreshTokenInput,
  RefreshTokenRecord,
  RefreshTokenRepository,
} from '../../src/domain/ports/refresh-token-repository.port'
import type { ListUsersFilter, UserRepository } from '../../src/domain/ports/user-repository.port'
import { ProfileAggregate, type ProfileSnapshot } from '../../src/domain/profile/profile.aggregate'
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
      impersonatorUserId: input.impersonatorUserId ?? null,
      activeProfileId: input.activeProfileId ?? null,
    })
  }

  async findByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    for (const record of this.byId.values()) {
      if (record.tokenHash === tokenHash) return { ...record }
    }
    return null
  }

  async claimForRotation(id: string, rotatedAt: Date): Promise<boolean> {
    const record = this.byId.get(id)
    // Espelha o claim atômico do adapter: só consome se ainda vigente.
    if (!record || record.rotatedAt !== null || record.revokedAt !== null) return false
    record.rotatedAt = rotatedAt
    record.revokedAt = rotatedAt
    return true
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

  async deleteExpired(before: Date): Promise<number> {
    let deleted = 0
    for (const [id, record] of this.byId) {
      if (record.expiresAt.getTime() < before.getTime()) {
        this.byId.delete(id)
        deleted += 1
      }
    }
    return deleted
  }
}

/** Repositório de tokens de handoff de impersonação em memória. */
export class InMemoryImpersonationTokenRepository implements ImpersonationTokenRepository {
  readonly byId = new Map<string, ImpersonationTokenRecord>()

  async create(input: CreateImpersonationTokenInput): Promise<void> {
    this.byId.set(input.id, {
      id: input.id,
      tokenHash: input.tokenHash,
      actorId: input.actorId,
      targetUserId: input.targetUserId,
      expiresAt: input.expiresAt,
      consumedAt: null,
    })
  }

  async findByHash(tokenHash: string): Promise<ImpersonationTokenRecord | null> {
    for (const record of this.byId.values()) {
      if (record.tokenHash === tokenHash) return { ...record }
    }
    return null
  }

  async consume(id: string, at: Date): Promise<boolean> {
    const record = this.byId.get(id)
    // Espelha o consumo atômico do adapter: só consome se ainda não consumido.
    if (!record || record.consumedAt !== null) return false
    record.consumedAt = at
    return true
  }

  async deleteExpired(before: Date): Promise<number> {
    let deleted = 0
    for (const [id, record] of this.byId) {
      if (record.expiresAt.getTime() < before.getTime()) {
        this.byId.delete(id)
        deleted += 1
      }
    }
    return deleted
  }
}

/** Repositório de tokens de redefinição de senha em memória. */
export class InMemoryPasswordResetTokenRepository implements PasswordResetTokenRepository {
  readonly byId = new Map<string, PasswordResetTokenRecord>()
  /** Momento de emissão por id (espelha o `created_at` do adapter; mutável p/ testes de cooldown). */
  readonly issuedAt = new Map<string, Date>()

  async create(input: CreatePasswordResetTokenInput): Promise<void> {
    this.byId.set(input.id, {
      id: input.id,
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      consumedAt: null,
    })
    this.issuedAt.set(input.id, new Date())
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

  async lastIssuedAt(userId: string): Promise<Date | null> {
    let last: Date | null = null
    for (const record of this.byId.values()) {
      if (record.userId !== userId) continue
      const at = this.issuedAt.get(record.id)
      if (at && (!last || at.getTime() > last.getTime())) last = at
    }
    return last
  }

  async deleteExpired(before: Date): Promise<number> {
    let deleted = 0
    for (const [id, record] of this.byId) {
      if (record.expiresAt.getTime() < before.getTime()) {
        this.byId.delete(id)
        this.issuedAt.delete(id)
        deleted += 1
      }
    }
    return deleted
  }
}

/** Repositório de códigos OTP em memória (uso único + tentativas). */
export class InMemoryOtpCodeRepository implements OtpCodeRepository {
  readonly byId = new Map<string, OtpCodeRecord>()
  /** Momento de emissão por id (espelha o `created_at` do adapter; mutável p/ testes de cooldown). */
  readonly issuedAt = new Map<string, Date>()

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
    this.issuedAt.set(input.id, new Date())
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

  async lastIssuedAt(userId: string, purpose: OtpPurpose): Promise<Date | null> {
    let last: Date | null = null
    for (const record of this.byId.values()) {
      if (record.userId !== userId || record.purpose !== purpose) continue
      const at = this.issuedAt.get(record.id)
      if (at && (!last || at.getTime() > last.getTime())) last = at
    }
    return last
  }

  async deleteExpired(before: Date): Promise<number> {
    let deleted = 0
    for (const [id, record] of this.byId) {
      if (record.expiresAt.getTime() < before.getTime()) {
        this.byId.delete(id)
        this.issuedAt.delete(id)
        deleted += 1
      }
    }
    return deleted
  }
}

/** Repositório de perfis em memória (espelha o create atômico sob teto). */
export class InMemoryProfileRepository implements ProfileRepository {
  readonly byId = new Map<string, ProfileSnapshot>()

  async listActiveByAccount(accountUserId: string): Promise<ProfileAggregate[]> {
    return [...this.byId.values()]
      .filter((p) => p.accountUserId === accountUserId && p.status === 'active')
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => ProfileAggregate.restore({ ...p }))
  }

  async findById(id: string): Promise<ProfileAggregate | null> {
    const p = this.byId.get(id)
    return p ? ProfileAggregate.restore({ ...p }) : null
  }

  async createWithinLimit(
    profile: ProfileAggregate,
    maxProfiles: number,
  ): Promise<CreateProfileOutcome> {
    const s = profile.toSnapshot()
    // Single-thread no JS → a contagem + insert já são atômicas (espelha o lock).
    const active = [...this.byId.values()].filter(
      (p) => p.accountUserId === s.accountUserId && p.status === 'active',
    )
    if (active.length >= maxProfiles) return { outcome: 'limit_reached' }
    const maxOrder = active.reduce((mx, p) => Math.max(mx, p.sortOrder), -1)
    const stored: ProfileSnapshot = { ...s, sortOrder: maxOrder + 1 }
    this.byId.set(stored.id, stored)
    return { outcome: 'created', profile: ProfileAggregate.restore({ ...stored }) }
  }

  async update(profile: ProfileAggregate): Promise<boolean> {
    const s = profile.toSnapshot()
    if (!this.byId.has(s.id)) return false
    this.byId.set(s.id, { ...s })
    return true
  }

  /** Helper de teste: insere um agregado diretamente. */
  seed(profile: ProfileAggregate): void {
    const s = profile.toSnapshot()
    this.byId.set(s.id, { ...s })
  }
}

/** Gateway de allowance fake: o teste seta `maxProfiles` (teto vindo do members). */
export class FakeProfileAllowanceGateway implements ProfileAllowanceGateway {
  maxProfiles = 0
  /** Quantas vezes o teto foi consultado — a equipe interna não deve consultar (sem S2S). */
  calls = 0
  async getAllowance(): Promise<{ maxProfiles: number }> {
    this.calls++
    return { maxProfiles: this.maxProfiles }
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
