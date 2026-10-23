import { and, asc, eq, ilike, inArray, or, type SQL, sql } from 'drizzle-orm'
import { z } from 'zod'
import type {
  CreateProfileOutcome,
  ProfileCreationRequest,
  ProfileOwner,
  ProfileRepository,
  ProfileWithAccountRow,
  SearchProfilesFilter,
} from '../../../domain/ports/profile-repository.port'
import {
  ProfileAggregate,
  type ProfileSnapshot,
  type VoiceInputConsentChange,
} from '../../../domain/profile/profile.aggregate'
import {
  applyProfileDetails,
  type ProfileDetailsDecision,
  type ProfileDetailsState,
  profileDetailsState,
} from '../../../domain/profile/profile-details'
import type { Database } from './db'
import { profileAdmissions, profiles, profileVoiceInputEvents, users } from './schema'

type Row = typeof profiles.$inferSelect
const OwnerSchema = z.strictObject({ profileId: z.uuid(), accountUserId: z.uuid() })
const CreationRequestSchema = z.strictObject({
  requestId: z.uuid(),
  requestHash: z.string().regex(/^[0-9a-f]{64}$/),
})

/** A linha da trilha append-only do consentimento da fala (sempre junto do perfil). */
function voiceInputEventRow(
  s: ProfileSnapshot,
  change: VoiceInputConsentChange,
): typeof profileVoiceInputEvents.$inferInsert {
  return {
    profileId: s.id,
    accountUserId: s.accountUserId,
    enabled: change.enabled,
    actor: change.actor,
    impersonatorId: change.impersonatorId,
    // A MESMA hora do `voice_input_enabled_at` (quando liga): as duas se cruzam na consulta.
    createdAt: change.at,
  }
}

function fromRow(row: Row): ProfileAggregate {
  return ProfileAggregate.restore({
    id: row.id,
    accountUserId: row.accountUserId,
    name: row.name,
    avatarUrl: row.avatarUrl,
    whatsapp: row.whatsapp,
    birthDate: row.birthDate,
    publicProfileEnabled: row.publicProfileEnabled,
    voiceInputEnabled: row.voiceInputEnabled,
    voiceInputEnabledAt: row.voiceInputEnabledAt,
    status: row.status,
    admissionState: row.admissionState,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  })
}

/** Repositório de perfis (Drizzle/Postgres). */
export class DrizzleProfileRepository implements ProfileRepository {
  constructor(private readonly db: Database) {}

  async listForParent(accountUserId: string): Promise<ProfileAggregate[]> {
    const rows = await this.db
      .select()
      .from(profiles)
      .where(and(eq(profiles.accountUserId, accountUserId), eq(profiles.status, 'active')))
      .orderBy(asc(profiles.sortOrder))
    return rows.map(fromRow)
  }

  async listActiveByAccount(accountUserId: string): Promise<ProfileAggregate[]> {
    const rows = await this.db
      .select()
      .from(profiles)
      .where(
        and(
          eq(profiles.accountUserId, accountUserId),
          eq(profiles.status, 'active'),
          eq(profiles.admissionState, 'ready'),
        ),
      )
      .orderBy(asc(profiles.sortOrder))
    return rows.map(fromRow)
  }

  async findById(id: string): Promise<ProfileAggregate | null> {
    const [row] = await this.db.select().from(profiles).where(eq(profiles.id, id)).limit(1)
    return row ? fromRow(row) : null
  }

  async findByCreationRequest(accountUserId: string, requestId: string) {
    const [row] = await this.db
      .select({ profile: profiles, requestHash: profileAdmissions.requestHash })
      .from(profileAdmissions)
      .innerJoin(profiles, eq(profiles.id, profileAdmissions.profileId))
      .innerJoin(users, eq(users.id, profiles.accountUserId))
      .where(
        and(
          eq(profileAdmissions.accountUserId, accountUserId),
          eq(profiles.accountUserId, accountUserId),
          eq(profileAdmissions.requestId, requestId),
          eq(users.status, 'active'),
        ),
      )
      .limit(1)
    return row ? { profile: fromRow(row.profile), requestHash: row.requestHash } : null
  }

  async listByIds(ids: string[]): Promise<ProfileAggregate[]> {
    if (ids.length === 0) return []
    const rows = await this.db
      .select()
      .from(profiles)
      .where(and(inArray(profiles.id, ids), eq(profiles.admissionState, 'ready')))
    return rows.map(fromRow)
  }

  async listActiveByIds(ids: string[]): Promise<ProfileAggregate[]> {
    if (ids.length === 0) return []
    const rows = await this.db
      .select()
      .from(profiles)
      .where(
        and(
          inArray(profiles.id, ids),
          eq(profiles.status, 'active'),
          eq(profiles.admissionState, 'ready'),
        ),
      )
    return rows.map(fromRow)
  }

  async searchWithAccount(
    filter: SearchProfilesFilter,
  ): Promise<{ items: ProfileWithAccountRow[]; total: number }> {
    const where = buildSearchWhere(filter.q)
    // Página + total com o MESMO where (molde do list do user.repository).
    const [rows, [counted]] = await Promise.all([
      this.db
        .select({
          id: profiles.id,
          name: profiles.name,
          avatarUrl: profiles.avatarUrl,
          birthDate: profiles.birthDate,
          accountUserId: profiles.accountUserId,
          accountId: users.id,
          accountEmail: users.email,
          accountFirstName: users.firstName,
          accountLastName: users.lastName,
        })
        .from(profiles)
        .leftJoin(users, eq(users.id, profiles.accountUserId))
        .where(where)
        .orderBy(asc(profiles.name), asc(profiles.id))
        .limit(filter.limit)
        .offset(filter.offset),
      this.db
        .select({ count: sql<number>`cast(count(${profiles.id}) as integer)` })
        .from(profiles)
        .leftJoin(users, eq(users.id, profiles.accountUserId))
        .where(where),
    ])
    return {
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        avatarUrl: row.avatarUrl,
        birthDate: row.birthDate,
        accountUserId: row.accountUserId,
        // LEFT JOIN sem linha → todas as colunas da conta vêm null (conta apagada).
        account:
          row.accountId !== null &&
          row.accountEmail !== null &&
          row.accountFirstName !== null &&
          row.accountLastName !== null
            ? {
                id: row.accountId,
                email: row.accountEmail,
                firstName: row.accountFirstName,
                lastName: row.accountLastName,
              }
            : null,
      })),
      total: counted?.count ?? 0,
    }
  }

  async createWithinLimit(
    profile: ProfileAggregate,
    maxProfiles: number,
    requestInput: ProfileCreationRequest,
  ): Promise<CreateProfileOutcome> {
    const s = structuredClone(profile.toSnapshot())
    const request = CreationRequestSchema.parse(requestInput)
    const change = structuredClone(profile.voiceInputChange)
    if (s.admissionState !== 'pending') throw new Error('New profiles must require admission')
    const outcome = await this.db.transaction(async (tx): Promise<CreateProfileOutcome> => {
      // Serializa os creates DESTA conta (o xact-lock solta no commit/rollback) →
      // contagem + insert viram atômicos: dois creates simultâneos não furam o teto.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`profile:${s.accountUserId}`}, 0))`,
      )
      const [account] = await tx
        .select({ status: users.status })
        .from(users)
        .where(eq(users.id, s.accountUserId))
        .limit(1)
        .for('update')
      if (account?.status !== 'active') return { outcome: 'account_inactive' as const }
      const [existing] = await tx
        .select({ profile: profiles, requestHash: profileAdmissions.requestHash })
        .from(profileAdmissions)
        .innerJoin(profiles, eq(profiles.id, profileAdmissions.profileId))
        .where(
          and(
            eq(profileAdmissions.accountUserId, s.accountUserId),
            eq(profiles.accountUserId, s.accountUserId),
            eq(profileAdmissions.requestId, request.requestId),
          ),
        )
        .limit(1)
      if (existing)
        return existing.requestHash === request.requestHash
          ? { outcome: 'reused', profile: fromRow(existing.profile) }
          : { outcome: 'request_conflict' }
      const [agg] = await tx
        .select({
          count: sql<number>`count(*)::int`,
          maxOrder: sql<number>`coalesce(max(${profiles.sortOrder}), -1)::int`,
        })
        .from(profiles)
        .where(and(eq(profiles.accountUserId, s.accountUserId), eq(profiles.status, 'active')))
      if ((agg?.count ?? 0) >= maxProfiles) return { outcome: 'limit_reached' as const }
      const [row] = await tx
        .insert(profiles)
        .values({
          id: s.id,
          accountUserId: s.accountUserId,
          name: s.name,
          avatarUrl: s.avatarUrl,
          whatsapp: s.whatsapp,
          birthDate: s.birthDate,
          publicProfileEnabled: s.publicProfileEnabled,
          voiceInputEnabled: s.voiceInputEnabled,
          voiceInputEnabledAt: s.voiceInputEnabledAt,
          status: s.status,
          admissionState: 'pending',
          sortOrder: (agg?.maxOrder ?? -1) + 1,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        })
        .returning()
      // Criado já com a fala ligada: a 1ª linha da trilha entra na MESMA transação.
      if (change) await tx.insert(profileVoiceInputEvents).values(voiceInputEventRow(s, change))
      await tx.insert(profileAdmissions).values({
        profileId: s.id,
        accountUserId: s.accountUserId,
        requestId: request.requestId,
        requestHash: request.requestHash,
        nextAttemptAt: s.createdAt,
        createdAt: s.createdAt,
        updatedAt: s.createdAt,
      })
      // `row` sempre existe após um insert bem-sucedido (não-condicional).
      return { outcome: 'created' as const, profile: fromRow(row as Row) }
    })
    if (outcome.outcome === 'created') profile.markVoiceInputChangeSaved()
    return outcome
  }

  async editDetails(
    ownerInput: ProfileOwner,
    decide: (current: ProfileDetailsState) => ProfileDetailsDecision,
  ): Promise<ProfileAggregate | null> {
    const owner = OwnerSchema.parse(ownerInput)
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`profile:${owner.accountUserId}`}, 0))`,
      )
      const [account] = await tx
        .select({ status: users.status })
        .from(users)
        .where(eq(users.id, owner.accountUserId))
        .for('update')
      if (account?.status !== 'active') return null
      const [row] = await tx
        .select()
        .from(profiles)
        .where(
          and(eq(profiles.id, owner.profileId), eq(profiles.accountUserId, owner.accountUserId)),
        )
        .for('update')
      if (row?.status !== 'active') return null
      const profile = fromRow(row)
      const decision = structuredClone(decide(profileDetailsState(profile)))
      applyProfileDetails(profile, decision)
      const state = profile.toSnapshot()
      const changes = decision.changes
      const patch: Partial<typeof profiles.$inferInsert> = { updatedAt: state.updatedAt }
      if (changes.name !== undefined) patch.name = state.name
      if (changes.avatarUrl !== undefined) patch.avatarUrl = state.avatarUrl
      if (changes.whatsapp !== undefined) patch.whatsapp = state.whatsapp
      if (changes.birthDate !== undefined) patch.birthDate = state.birthDate
      if (changes.publicProfileEnabled !== undefined)
        patch.publicProfileEnabled = state.publicProfileEnabled
      const consent = profile.voiceInputChange
      if (consent) {
        patch.voiceInputEnabled = state.voiceInputEnabled
        patch.voiceInputEnabledAt = state.voiceInputEnabledAt
      }
      const [saved] = await tx
        .update(profiles)
        .set(patch)
        .where(eq(profiles.id, owner.profileId))
        .returning()
      if (consent)
        await tx.insert(profileVoiceInputEvents).values(voiceInputEventRow(state, consent))
      return saved ? fromRow(saved) : null
    })
  }

  async archiveOwned(ownerInput: ProfileOwner, nowInput: Date): Promise<boolean> {
    const owner = OwnerSchema.parse(ownerInput)
    const now = new Date(z.date().parse(nowInput).getTime())
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`profile:${owner.accountUserId}`}, 0))`,
      )
      const [account] = await tx
        .select({ status: users.status })
        .from(users)
        .where(eq(users.id, owner.accountUserId))
        .for('update')
      if (account?.status !== 'active') return false
      const [profile] = await tx
        .select()
        .from(profiles)
        .where(
          and(eq(profiles.id, owner.profileId), eq(profiles.accountUserId, owner.accountUserId)),
        )
        .for('update')
      if (!profile) return false
      if (profile.status === 'archived') return true
      await tx
        .update(profiles)
        .set({ status: 'archived', updatedAt: now })
        .where(eq(profiles.id, owner.profileId))
      await tx
        .update(profileAdmissions)
        .set({
          status: 'cancelled',
          completedAt: now,
          leaseId: null,
          leaseUntil: null,
          updatedAt: now,
        })
        .where(
          and(
            eq(profileAdmissions.profileId, owner.profileId),
            eq(profileAdmissions.status, 'pending'),
          ),
        )
      return true
    })
  }
}

/**
 * WHERE da busca unificada: SÓ perfis ativos; com `q`, OR sobre nome do perfil
 * e e-mail/nome/sobrenome da conta. `q` é busca LITERAL: escapa os curingas do
 * LIKE (\, %, _) — espelha o `buildListWhere` do user.repository (achado B5).
 */
function buildSearchWhere(qRaw: string | undefined): SQL | undefined {
  const clauses: SQL[] = [eq(profiles.status, 'active'), eq(profiles.admissionState, 'ready')]
  const q = qRaw?.trim()
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, '\\$&')}%`
    const accountSearch = sql<string>`${users.firstName} || ' ' || ${users.lastName} || ' ' || ${users.email}`
    const match = or(
      ilike(profiles.name, like),
      // Um único documento pesquisável cobre e-mail, partes isoladas E o nome
      // completo atravessando first_name e last_name. A expressão é idêntica à
      // do índice trigram declarado no schema.
      ilike(accountSearch, like),
    )
    if (match) clauses.push(match)
  }
  return and(...clauses)
}
