import { randomUUID } from 'node:crypto'
import type { Logger } from '@sistemazero/core/logging'
import { type KidsSessionClaim, sameKidsSession } from '@sistemazero/core/security'
import type {
  AuditLogListFilter,
  AuditLogRecord,
  AuditLogRepository,
  CreateAuditLogInput,
} from '../../src/domain/ports/audit-log-repository.port'
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
import type {
  ProfileAdmissionFailure,
  ProfileAdmissionJob,
  ProfileAdmissionRepository,
} from '../../src/domain/ports/profile-admission-repository.port'
import type { ProfileAllowanceGateway } from '../../src/domain/ports/profile-allowance-gateway.port'
import type { ProfileJourneyGateway } from '../../src/domain/ports/profile-journey-gateway.port'
import type {
  CreateProfileOutcome,
  ProfileCreationRequest,
  ProfileOwner,
  ProfileRepository,
  ProfileWithAccountRow,
  SearchProfilesFilter,
} from '../../src/domain/ports/profile-repository.port'
import type {
  CreateRefreshTokenInput,
  RefreshTokenRecord,
  RefreshTokenRepository,
} from '../../src/domain/ports/refresh-token-repository.port'
import type { ListUsersFilter, UserRepository } from '../../src/domain/ports/user-repository.port'
import {
  ProfileAggregate,
  type ProfileSnapshot,
  type VoiceInputConsentChange,
} from '../../src/domain/profile/profile.aggregate'
import {
  applyProfileDetails,
  type ProfileDetailsDecision,
  type ProfileDetailsState,
  profileDetailsState,
} from '../../src/domain/profile/profile-details'
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
  readonly profileIdsByAccount = new Map<string, string[]>()
  readonly deletionReceipts = new Map<string, string[]>()

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
    if (filter.source) all = all.filter((u) => u.signupSource === filter.source)
    const { createdFrom, createdTo } = filter
    if (createdFrom) all = all.filter((u) => u.createdAt >= createdFrom)
    if (createdTo) all = all.filter((u) => u.createdAt <= createdTo)
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

  async prepareDeletion(id: string): Promise<{ profileIds: string[] } | null> {
    const user = this.byId.get(id)
    if (!user) return null
    user.changeStatus('blocked')
    this.byId.set(id, UserAggregate.restore(user.toSnapshot()))
    return { profileIds: [...(this.profileIdsByAccount.get(id) ?? [])] }
  }

  async findDeletionReceipt(id: string): Promise<{ profileIds: string[] } | null> {
    const profileIds = this.deletionReceipts.get(id)
    return profileIds ? { profileIds: [...profileIds] } : null
  }

  async deleteById(id: string): Promise<void> {
    const user = this.byId.get(id)
    if (user) {
      this.deletionReceipts.set(id, [...(this.profileIdsByAccount.get(id) ?? [])])
    }
    this.byId.delete(id)
  }

  /** Helper de teste: insere um agregado diretamente (ex.: usuário suspenso). */
  seed(user: UserAggregate): void {
    this.byId.set(user.id, UserAggregate.restore(user.toSnapshot()))
  }
}

/** Repositório de refresh tokens em memória (espelha rotação + revogação). */
export class InMemoryRefreshTokenRepository implements RefreshTokenRepository {
  readonly byId = new Map<string, RefreshTokenRecord>()
  readonly modeAuditLogs: CreateAuditLogInput[] = []
  modeAuditFailure: Error | null = null
  readonly families = new Map<
    string,
    {
      userId: string
      expiresAt: Date
      revokedAt: Date | null
      impersonatorUserId: string | null
      impersonationWritable: boolean
      kidsContext: KidsSessionClaim | null
    }
  >()

  async create(input: CreateRefreshTokenInput): Promise<boolean> {
    let family = this.families.get(input.familyId)
    if (!family) {
      family = {
        userId: input.userId,
        expiresAt: input.expiresAt,
        revokedAt: null,
        impersonatorUserId: input.impersonatorUserId ?? null,
        impersonationWritable: input.impersonationWritable ?? false,
        kidsContext: input.kidsContext ?? null,
      }
      this.families.set(input.familyId, family)
    } else if (!family.impersonatorUserId && !family.kidsContext) {
      family.expiresAt = input.expiresAt
    }
    if (family.revokedAt || family.expiresAt.getTime() <= Date.now()) return false
    if (family.userId !== input.userId || !sameKidsSession(family.kidsContext, input.kidsContext))
      return false
    this.byId.set(input.id, {
      id: input.id,
      userId: input.userId,
      familyId: input.familyId,
      familyExpiresAt: family.expiresAt,
      familyRevokedAt: family.revokedAt,
      kidsContext: family.kidsContext,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      rotatedAt: null,
      revokedAt: null,
      impersonatorUserId: family.impersonatorUserId,
      impersonationWritable: family.impersonationWritable,
      activeProfileId: input.activeProfileId ?? null,
    })
    return true
  }

  async findByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    for (const record of this.byId.values()) {
      if (record.tokenHash === tokenHash) {
        const family = this.families.get(record.familyId)
        if (!family) return null
        return {
          ...record,
          familyExpiresAt: family.expiresAt,
          familyRevokedAt: family.revokedAt,
          impersonatorUserId: family.impersonatorUserId,
          impersonationWritable: family.impersonationWritable,
        }
      }
    }
    return null
  }

  async claimForRotation(id: string, rotatedAt: Date): Promise<boolean> {
    const record = this.byId.get(id)
    // Espelha o claim atômico do adapter: só consome se ainda vigente.
    const family = record ? this.families.get(record.familyId) : null
    if (
      !record ||
      !family ||
      family.revokedAt !== null ||
      family.expiresAt.getTime() <= Date.now() ||
      record.rotatedAt !== null ||
      record.revokedAt !== null
    )
      return false
    record.rotatedAt = rotatedAt
    record.revokedAt = rotatedAt
    return true
  }

  async setImpersonationMode(
    id: string,
    familyId: string,
    writable: boolean,
    audit?: CreateAuditLogInput,
  ): Promise<boolean> {
    const record = this.byId.get(id)
    const family = this.families.get(familyId)
    if (
      !record ||
      record.familyId !== familyId ||
      record.rotatedAt !== null ||
      record.revokedAt !== null ||
      !family?.impersonatorUserId ||
      family.revokedAt !== null ||
      family.expiresAt.getTime() <= Date.now()
    )
      return false
    // Espelha a transação real: falha do insert de auditoria acontece antes de
    // qualquer estado ficar observável.
    if (audit && this.modeAuditFailure) throw this.modeAuditFailure
    family.impersonationWritable = writable
    if (audit) this.modeAuditLogs.push({ ...audit })
    return true
  }

  async revokeFamily(familyId: string): Promise<void> {
    const now = new Date()
    const family = this.families.get(familyId)
    if (family && family.revokedAt === null) family.revokedAt = now
    for (const record of this.byId.values()) {
      if (record.familyId === familyId && record.revokedAt === null) record.revokedAt = now
    }
  }

  async revokeAllForUser(userId: string): Promise<void> {
    const now = new Date()
    for (const family of this.families.values()) {
      if (family.userId === userId && family.revokedAt === null) family.revokedAt = now
    }
    for (const record of this.byId.values()) {
      if (record.userId === userId && record.revokedAt === null) record.revokedAt = now
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
    for (const [familyId, family] of this.families) {
      const stillReferenced = [...this.byId.values()].some((record) => record.familyId === familyId)
      if (!stillReferenced && family.expiresAt.getTime() < before.getTime()) {
        this.families.delete(familyId)
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

  async createReplacingActive(
    input: CreatePasswordResetTokenInput,
    at: Date,
    cooldownSeconds = 0,
  ): Promise<boolean> {
    if (cooldownSeconds > 0) {
      let last: Date | null = null
      for (const record of this.byId.values()) {
        if (record.userId !== input.userId) continue
        const issuedAt = this.issuedAt.get(record.id)
        if (issuedAt && (!last || issuedAt.getTime() > last.getTime())) last = issuedAt
      }
      if (last && at.getTime() - last.getTime() < cooldownSeconds * 1000) return false
    }
    for (const record of this.byId.values()) {
      if (record.userId === input.userId && record.consumedAt === null) record.consumedAt = at
    }
    this.byId.set(input.id, {
      id: input.id,
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      consumedAt: null,
    })
    this.issuedAt.set(input.id, at)
    return true
  }

  async findByHash(tokenHash: string): Promise<PasswordResetTokenRecord | null> {
    for (const record of this.byId.values()) {
      if (record.tokenHash === tokenHash) return { ...record }
    }
    return null
  }

  async consume(id: string, at: Date): Promise<boolean> {
    const record = this.byId.get(id)
    if (!record || record.consumedAt !== null) return false
    record.consumedAt = at
    return true
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

  async createReplacingActive(
    input: CreateOtpCodeInput,
    at: Date,
    cooldownSeconds = 0,
  ): Promise<boolean> {
    if (cooldownSeconds > 0) {
      let last: Date | null = null
      for (const record of this.byId.values()) {
        if (record.userId !== input.userId || record.purpose !== input.purpose) continue
        const issuedAt = this.issuedAt.get(record.id)
        if (issuedAt && (!last || issuedAt.getTime() > last.getTime())) last = issuedAt
      }
      if (last && at.getTime() - last.getTime() < cooldownSeconds * 1000) return false
    }
    for (const record of this.byId.values()) {
      if (
        record.userId === input.userId &&
        record.purpose === input.purpose &&
        record.consumedAt === null
      ) {
        record.consumedAt = at
      }
    }
    this.byId.set(input.id, {
      id: input.id,
      userId: input.userId,
      purpose: input.purpose,
      codeHash: input.codeHash,
      expiresAt: input.expiresAt,
      consumedAt: null,
      attempts: 0,
    })
    this.issuedAt.set(input.id, at)
    return true
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

  async consume(id: string, at: Date): Promise<boolean> {
    const record = this.byId.get(id)
    if (!record || record.consumedAt !== null) return false
    record.consumedAt = at
    return true
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
    if (!record || record.consumedAt !== null) return 0
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

/** Linha da trilha do consentimento da fala, como `auth.profile_voice_input_events`. */
export interface StoredVoiceInputEvent extends VoiceInputConsentChange {
  profileId: string
  accountUserId: string
}

/** Repositório de perfis em memória (espelha o create atômico sob teto). */
interface StoredAdmission {
  profileId: string
  accountUserId: string
  requestId: string
  requestHash: string
  status: 'pending' | 'completed' | 'cancelled'
  attempts: number
  nextAttemptAt: Date
  leaseId: string | null
  leaseUntil: Date | null
  lastErrorCode: ProfileAdmissionFailure | null
}

export class InMemoryProfileRepository implements ProfileRepository, ProfileAdmissionRepository {
  readonly byId = new Map<string, ProfileSnapshot>()
  readonly admissionJobs = new Map<string, StoredAdmission>()
  /** Trilha append-only do consentimento da fala (espelha a gravação junto com o perfil). */
  readonly voiceInputEvents: StoredVoiceInputEvent[] = []

  /** `accounts` alimenta o LEFT JOIN do `searchWithAccount` (ausente → `account: null`). */
  constructor(private readonly accounts?: InMemoryUserRepository) {}

  async searchWithAccount(
    filter: SearchProfilesFilter,
  ): Promise<{ items: ProfileWithAccountRow[]; total: number }> {
    const q = filter.q?.trim().toLowerCase()
    const matched = [...this.byId.values()]
      .filter((p) => p.status === 'active' && p.admissionState === 'ready')
      .map((p): ProfileWithAccountRow => {
        const account = this.accounts?.byId.get(p.accountUserId)
        return {
          id: p.id,
          name: p.name,
          avatarUrl: p.avatarUrl,
          birthDate: p.birthDate,
          accountUserId: p.accountUserId,
          account: account
            ? {
                id: account.id,
                email: account.email,
                firstName: account.firstName,
                lastName: account.lastName,
              }
            : null,
        }
      })
      .filter((row) => {
        if (!q) return true
        // `includes` = a MESMA semântica do ILIKE escapado: substring LITERAL
        // case-insensitive (curingas do q não viram padrão).
        const accountSearch = row.account
          ? `${row.account.firstName} ${row.account.lastName} ${row.account.email}`
          : null
        return [row.name, accountSearch].some((h) => h?.toLowerCase().includes(q))
      })
      // Ordenação estável do adapter: name asc, desempate por id asc.
      .sort(
        (a, b) => a.name.localeCompare(b.name, 'en') || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
      )
    return {
      items: matched.slice(filter.offset, filter.offset + filter.limit),
      total: matched.length,
    }
  }

  async listForParent(accountUserId: string): Promise<ProfileAggregate[]> {
    return [...this.byId.values()]
      .filter((p) => p.accountUserId === accountUserId && p.status === 'active')
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => ProfileAggregate.restore({ ...p }))
  }

  async listActiveByAccount(accountUserId: string): Promise<ProfileAggregate[]> {
    return (await this.listForParent(accountUserId)).filter((profile) => profile.isSelectable)
  }

  async findById(id: string): Promise<ProfileAggregate | null> {
    const p = this.byId.get(id)
    return p ? ProfileAggregate.restore({ ...p }) : null
  }

  async findByCreationRequest(accountUserId: string, requestId: string) {
    if (!this.accountActive(accountUserId)) return null
    const request = [...this.admissionJobs.values()].find(
      (job) => job.accountUserId === accountUserId && job.requestId === requestId,
    )
    const profile = request ? this.byId.get(request.profileId) : undefined
    return profile && profile.accountUserId === accountUserId
      ? { profile: ProfileAggregate.restore({ ...profile }), requestHash: request!.requestHash }
      : null
  }

  async listByIds(ids: string[]): Promise<ProfileAggregate[]> {
    return ids
      .map((id) => this.byId.get(id))
      .filter((p): p is ProfileSnapshot => p !== undefined && p.admissionState === 'ready')
      .map((p) => ProfileAggregate.restore({ ...p }))
  }

  async listActiveByIds(ids: string[]): Promise<ProfileAggregate[]> {
    return ids
      .map((id) => this.byId.get(id))
      .filter(
        (p): p is ProfileSnapshot =>
          p !== undefined && p.status === 'active' && p.admissionState === 'ready',
      )
      .map((p) => ProfileAggregate.restore({ ...p }))
  }

  async createWithinLimit(
    profile: ProfileAggregate,
    maxProfiles: number,
    request: ProfileCreationRequest,
  ): Promise<CreateProfileOutcome> {
    const s = profile.toSnapshot()
    if (!this.accountActive(s.accountUserId)) return { outcome: 'account_inactive' }
    const existing = [...this.admissionJobs.values()].find(
      (job) => job.accountUserId === s.accountUserId && job.requestId === request.requestId,
    )
    if (existing) {
      if (existing.requestHash !== request.requestHash) return { outcome: 'request_conflict' }
      const stored = this.byId.get(existing.profileId)
      if (!stored) throw new Error('Admission job without profile')
      return { outcome: 'reused', profile: ProfileAggregate.restore({ ...stored }) }
    }
    // Single-thread no JS → a contagem + insert já são atômicas (espelha o lock).
    const active = [...this.byId.values()].filter(
      (p) => p.accountUserId === s.accountUserId && p.status === 'active',
    )
    if (active.length >= maxProfiles) return { outcome: 'limit_reached' }
    const maxOrder = active.reduce((mx, p) => Math.max(mx, p.sortOrder), -1)
    const stored: ProfileSnapshot = { ...s, sortOrder: maxOrder + 1 }
    this.byId.set(stored.id, stored)
    this.admissionJobs.set(stored.id, {
      profileId: s.id,
      accountUserId: s.accountUserId,
      requestId: request.requestId,
      requestHash: request.requestHash,
      status: 'pending',
      attempts: 0,
      nextAttemptAt: s.createdAt,
      leaseId: null,
      leaseUntil: null,
      lastErrorCode: null,
    })
    const change = profile.voiceInputChange
    if (change)
      this.voiceInputEvents.push({ ...change, profileId: s.id, accountUserId: s.accountUserId })
    profile.markVoiceInputChangeSaved()
    return { outcome: 'created', profile: ProfileAggregate.restore({ ...stored }) }
  }

  async editDetails(
    owner: ProfileOwner,
    decide: (current: ProfileDetailsState) => ProfileDetailsDecision,
  ): Promise<ProfileAggregate | null> {
    const current = this.byId.get(owner.profileId)
    if (
      !current ||
      current.accountUserId !== owner.accountUserId ||
      current.status !== 'active' ||
      !this.accountActive(owner.accountUserId)
    )
      return null
    const profile = ProfileAggregate.restore(structuredClone(current))
    const decision = structuredClone(decide(profileDetailsState(profile)))
    applyProfileDetails(profile, decision)
    const state = profile.toSnapshot()
    this.byId.set(state.id, structuredClone(state))
    const consent = profile.voiceInputChange
    if (consent)
      this.voiceInputEvents.push({
        ...consent,
        profileId: state.id,
        accountUserId: state.accountUserId,
      })
    return ProfileAggregate.restore(structuredClone(state))
  }

  async archiveOwned(owner: ProfileOwner, now: Date): Promise<boolean> {
    const current = this.byId.get(owner.profileId)
    if (
      !current ||
      current.accountUserId !== owner.accountUserId ||
      !this.accountActive(owner.accountUserId)
    )
      return false
    this.byId.set(current.id, { ...current, status: 'archived', updatedAt: new Date(now) })
    const job = this.admissionJobs.get(current.id)
    if (job?.status === 'pending') {
      job.status = 'cancelled'
      job.leaseId = null
      job.leaseUntil = null
    }
    return true
  }

  /** Helper de teste: insere um agregado diretamente. */
  seed(profile: ProfileAggregate): void {
    const s = profile.toSnapshot()
    this.byId.set(s.id, { ...s })
  }

  /** Existing profile fixture, corresponding to the expand migration's preserved ready rows. */
  seedReady(profile: ProfileAggregate): void {
    this.seed(ProfileAggregate.restore({ ...profile.toSnapshot(), admissionState: 'ready' }))
  }

  private accountActive(accountUserId: string): boolean {
    return !this.accounts || this.accounts.byId.get(accountUserId)?.status === 'active'
  }

  async claimPending(now: Date, leaseUntil: Date, limit: number): Promise<ProfileAdmissionJob[]> {
    const jobs: ProfileAdmissionJob[] = []
    const candidates = [...this.admissionJobs.values()].sort(
      (a, b) => a.nextAttemptAt.getTime() - b.nextAttemptAt.getTime(),
    )
    for (const candidate of candidates) {
      if (jobs.length >= limit) break
      const claimed = await this.claimProfile(
        candidate.profileId,
        candidate.accountUserId,
        now,
        leaseUntil,
      )
      if (claimed) jobs.push(claimed)
    }
    return jobs
  }

  async claimProfile(profileId: string, accountUserId: string, now: Date, leaseUntil: Date) {
    const job = this.admissionJobs.get(profileId)
    const profile = this.byId.get(profileId)
    if (
      !job ||
      !profile ||
      job.accountUserId !== accountUserId ||
      profile.accountUserId !== accountUserId ||
      !this.accountActive(accountUserId) ||
      profile.status !== 'active' ||
      profile.admissionState !== 'pending' ||
      job.status !== 'pending' ||
      job.nextAttemptAt > now ||
      (job.leaseUntil !== null && job.leaseUntil > now)
    )
      return null
    job.leaseId = randomUUID()
    job.leaseUntil = new Date(leaseUntil)
    job.attempts++
    return { profileId, accountUserId, leaseId: job.leaseId, attempts: job.attempts }
  }

  async complete(claim: ProfileAdmissionJob): Promise<'ready' | 'cancelled' | 'lost'> {
    const job = this.admissionJobs.get(claim.profileId)
    const profile = this.byId.get(claim.profileId)
    if (
      !job ||
      !profile ||
      job.status !== 'pending' ||
      job.leaseId !== claim.leaseId ||
      job.accountUserId !== claim.accountUserId ||
      profile.accountUserId !== claim.accountUserId ||
      profile.admissionState !== 'pending'
    )
      return 'lost'
    const ready = this.accountActive(claim.accountUserId) && profile.status === 'active'
    if (ready) this.byId.set(profile.id, { ...profile, admissionState: 'ready' })
    job.status = ready ? 'completed' : 'cancelled'
    job.leaseId = null
    job.leaseUntil = null
    return ready ? 'ready' : 'cancelled'
  }

  async retry(
    claim: ProfileAdmissionJob,
    _: Date,
    nextAttemptAt: Date,
    failure: ProfileAdmissionFailure,
  ): Promise<boolean> {
    const job = this.admissionJobs.get(claim.profileId)
    if (
      !job ||
      job.accountUserId !== claim.accountUserId ||
      job.status !== 'pending' ||
      job.leaseId !== claim.leaseId
    )
      return false
    job.leaseId = null
    job.leaseUntil = null
    job.nextAttemptAt = new Date(nextAttemptAt)
    job.lastErrorCode = failure
    return true
  }
}

export class FakeProfileJourneyGateway implements ProfileJourneyGateway {
  result: 'admitted' | 'not_ready' = 'admitted'
  readonly calls: { profileId: string; accountUserId: string }[] = []
  async initialize(owner: { profileId: string; accountUserId: string }) {
    this.calls.push({ ...owner })
    return this.result
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

/** Trilha de auditoria em memória (mais recentes primeiro, com filtros + paginação). */
export class InMemoryAuditLogRepository implements AuditLogRepository {
  readonly logs: AuditLogRecord[] = []

  async create(input: CreateAuditLogInput): Promise<void> {
    this.logs.push({
      id: input.id,
      actorId: input.actorId,
      actorEmail: input.actorEmail ?? null,
      actorRole: input.actorRole ?? null,
      impersonatorId: input.impersonatorId ?? null,
      action: input.action,
      method: input.method,
      path: input.path,
      targetId: input.targetId ?? null,
      status: input.status,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      requestId: input.requestId ?? null,
      createdAt: input.createdAt ?? new Date(),
    })
  }

  async list(filter: AuditLogListFilter): Promise<{ items: AuditLogRecord[]; total: number }> {
    let items = [...this.logs]
    if (filter.actorId) items = items.filter((l) => l.actorId === filter.actorId)
    if (filter.action) items = items.filter((l) => l.action === filter.action)
    if (filter.targetId) items = items.filter((l) => l.targetId === filter.targetId)
    const { startDate, endDate } = filter
    if (startDate) items = items.filter((l) => l.createdAt >= startDate)
    if (endDate) items = items.filter((l) => l.createdAt <= endDate)
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    return {
      items: items.slice(filter.offset, filter.offset + filter.limit),
      total: items.length,
    }
  }

  async deleteExpired(before: Date): Promise<number> {
    const kept = this.logs.filter((l) => l.createdAt >= before)
    const removed = this.logs.length - kept.length
    this.logs.splice(0, this.logs.length, ...kept)
    return removed
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
