import { and, desc, eq, gte, ilike, inArray, lte, or, type SQL, sql } from 'drizzle-orm'
import type { ListUsersFilter, UserRepository } from '../../../domain/ports/user-repository.port'
import { UserAggregate, type UserSnapshot } from '../../../domain/user/user.aggregate'
import { EmailAlreadyInUseError } from '../../../domain/user/user.errors'
import type { Database } from './db'
import {
  impersonationTokens,
  otpCodes,
  passwordResetTokens,
  profiles,
  refreshTokens,
  userDeletionReceipts,
  users,
} from './schema'

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

  async list(filter: ListUsersFilter): Promise<{ users: UserAggregate[]; total: number }> {
    const where = buildListWhere(filter)
    const [rows, [counted]] = await Promise.all([
      this.db
        .select()
        .from(users)
        .where(where)
        .orderBy(desc(users.createdAt))
        .limit(filter.limit)
        .offset(filter.offset),
      this.db
        .select({ count: sql<number>`cast(count(${users.id}) as integer)` })
        .from(users)
        .where(where),
    ])
    return {
      users: rows.map((row) => UserAggregate.restore(toSnapshot(row))),
      total: counted?.count ?? 0,
    }
  }

  async listByIds(ids: string[]): Promise<UserAggregate[]> {
    if (ids.length === 0) return []
    const rows = await this.db.select().from(users).where(inArray(users.id, ids))
    return rows.map((row) => UserAggregate.restore(toSnapshot(row)))
  }

  async update(user: UserAggregate, expectedVersion: number): Promise<boolean> {
    const s = user.toSnapshot()
    const updated = await this.db
      .update(users)
      .set({
        version: s.version,
        // passwordHash PRECISA estar aqui: reset/troca de senha persistem por este
        // update (sem ele a troca "passa" mas a senha antiga continua valendo).
        passwordHash: s.passwordHash,
        firstName: s.firstName,
        lastName: s.lastName,
        role: s.role,
        status: s.status,
        phone: s.phone,
        avatarUrl: s.avatarUrl,
        // Persiste o marco de senha definida (reset/troca/set-password do admin o
        // carimbam via changePassword) — sem ele o login por código seguiria travado.
        passwordSetAt: s.passwordSetAt,
        updatedAt: s.updatedAt,
      })
      .where(and(eq(users.id, s.id), eq(users.version, expectedVersion)))
      .returning({ id: users.id })
    return updated.length === 1
  }

  async prepareDeletion(id: string): Promise<{ profileIds: string[] } | null> {
    return this.db.transaction(async (tx) => {
      // O create de perfil usa a mesma chave: depois deste lock nenhum perfil
      // pode aparecer entre a enumeração e o bloqueio da conta.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`profile:${id}`}, 0))`)
      const [user] = await tx
        .select({ id: users.id, status: users.status })
        .from(users)
        .where(eq(users.id, id))
        .limit(1)
        .for('update')
      if (!user) return null
      if (user.status !== 'blocked') {
        await tx
          .update(users)
          .set({ status: 'blocked', version: sql`${users.version} + 1`, updatedAt: new Date() })
          .where(eq(users.id, id))
      }
      const ownedProfiles = await tx
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.accountUserId, id))
      return { profileIds: ownedProfiles.map((profile) => profile.id) }
    })
  }

  async findDeletionReceipt(id: string): Promise<{ profileIds: string[] } | null> {
    const [receipt] = await this.db
      .select({ profileIds: userDeletionReceipts.profileIds })
      .from(userDeletionReceipts)
      .where(eq(userDeletionReceipts.userId, id))
      .limit(1)
    return receipt ?? null
  }

  async deleteById(id: string): Promise<void> {
    // Tudo numa transação: ou some o usuário + todos os dependentes auth-owned, ou
    // nada. `audit_logs` NÃO é tocada de propósito (trilha de compliance; `actor_id`
    // é snapshot sem FK). `impersonation_tokens` cobre os dois lados (alvo OU ator).
    await this.db.transaction(async (tx) => {
      const ownedProfiles = await tx
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.accountUserId, id))
      const [deleted] = await tx.delete(users).where(eq(users.id, id)).returning({ id: users.id })
      // Resultado explícito distingue o no-op concorrente sem criar recibo falso.
      if (!deleted) return false
      await tx
        .insert(userDeletionReceipts)
        .values({
          userId: id,
          profileIds: ownedProfiles.map((profile) => profile.id),
        })
        .onConflictDoNothing({ target: userDeletionReceipts.userId })
      await tx.delete(refreshTokens).where(eq(refreshTokens.userId, id))
      await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, id))
      await tx.delete(otpCodes).where(eq(otpCodes.userId, id))
      await tx
        .delete(impersonationTokens)
        .where(or(eq(impersonationTokens.targetUserId, id), eq(impersonationTokens.actorId, id)))
      await tx.delete(profiles).where(eq(profiles.accountUserId, id))
      return true
    })
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
        avatarUrl: s.avatarUrl,
        passwordSetAt: s.passwordSetAt,
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

/** Monta o WHERE da listagem: `q` (ilike em e-mail/nome) + filtros de role/status. */
function buildListWhere(filter: ListUsersFilter): SQL | undefined {
  const clauses: SQL[] = []
  const q = filter.q?.trim()
  if (q) {
    // `q` é busca LITERAL: escapa os curingas do LIKE (\, %, _) para que
    // "100%" não vire padrão (wildcard injection no ILIKE).
    const like = `%${q.replace(/[\\%_]/g, '\\$&')}%`
    const match = or(
      ilike(users.email, like),
      ilike(users.firstName, like),
      ilike(users.lastName, like),
    )
    if (match) clauses.push(match)
  }
  if (filter.role) clauses.push(eq(users.role, filter.role))
  if (filter.status) clauses.push(eq(users.status, filter.status))
  if (filter.source) clauses.push(eq(users.signupSource, filter.source))
  if (filter.createdFrom) clauses.push(gte(users.createdAt, filter.createdFrom))
  if (filter.createdTo) clauses.push(lte(users.createdAt, filter.createdTo))
  return clauses.length > 0 ? and(...clauses) : undefined
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
    avatarUrl: row.avatarUrl,
    passwordSetAt: row.passwordSetAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/**
 * 23505 = unique_violation. O drizzle-orm (≥ 0.44) ENVELOPA o erro do driver em
 * `DrizzleQueryError`, com o `PostgresError` original em `cause` — checar só o
 * topo deixava a corrida de cadastro virar 500 em vez de 409 (pego pelo teste
 * contra Postgres real em `tests/db`). Caminha a cadeia de `cause` (com teto).
 */
function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error
  for (let depth = 0; depth < 5 && typeof current === 'object' && current !== null; depth++) {
    if ((current as { code?: unknown }).code === '23505') return true
    current = (current as { cause?: unknown }).cause
  }
  return false
}
