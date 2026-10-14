import { and, asc, eq, ilike, inArray, or, type SQL, sql } from 'drizzle-orm'
import type {
  CreateProfileOutcome,
  ProfileRepository,
  ProfileWithAccountRow,
  SearchProfilesFilter,
} from '../../../domain/ports/profile-repository.port'
import {
  ProfileAggregate,
  type ProfileSnapshot,
  type VoiceInputConsentChange,
} from '../../../domain/profile/profile.aggregate'
import type { Database } from './db'
import { profiles, profileVoiceInputEvents, users } from './schema'

type Row = typeof profiles.$inferSelect

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
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  })
}

/** Repositório de perfis (Drizzle/Postgres). */
export class DrizzleProfileRepository implements ProfileRepository {
  constructor(private readonly db: Database) {}

  async listActiveByAccount(accountUserId: string): Promise<ProfileAggregate[]> {
    const rows = await this.db
      .select()
      .from(profiles)
      .where(and(eq(profiles.accountUserId, accountUserId), eq(profiles.status, 'active')))
      .orderBy(asc(profiles.sortOrder))
    return rows.map(fromRow)
  }

  async findById(id: string): Promise<ProfileAggregate | null> {
    const [row] = await this.db.select().from(profiles).where(eq(profiles.id, id)).limit(1)
    return row ? fromRow(row) : null
  }

  async listByIds(ids: string[]): Promise<ProfileAggregate[]> {
    if (ids.length === 0) return []
    const rows = await this.db.select().from(profiles).where(inArray(profiles.id, ids))
    return rows.map(fromRow)
  }

  async listActiveByIds(ids: string[]): Promise<ProfileAggregate[]> {
    if (ids.length === 0) return []
    const rows = await this.db
      .select()
      .from(profiles)
      .where(and(inArray(profiles.id, ids), eq(profiles.status, 'active')))
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
  ): Promise<CreateProfileOutcome> {
    const s = profile.toSnapshot()
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
      if (account?.status !== 'active') return { outcome: 'account_inactive' as const }
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
          sortOrder: (agg?.maxOrder ?? -1) + 1,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        })
        .returning()
      // Criado já com a fala ligada: a 1ª linha da trilha entra na MESMA transação.
      const change = profile.voiceInputChange
      if (change) await tx.insert(profileVoiceInputEvents).values(voiceInputEventRow(s, change))
      // `row` sempre existe após um insert bem-sucedido (não-condicional).
      return { outcome: 'created' as const, profile: fromRow(row as Row) }
    })
    if (outcome.outcome === 'created') profile.markVoiceInputChangeSaved()
    return outcome
  }

  /**
   * ⚠️ As colunas da FALA só são escritas junto com a linha da trilha, na mesma transação:
   * toda mudança de `voice_input_enabled` no banco tem a sua prova. Sem mudança pendente, o
   * UPDATE nem toca nelas (uma edição de nome com o perfil lido antes não desfaz o "desligar"
   * que outra requisição acabou de gravar). Com mudança pendente, a linha é travada e relida:
   * se outra requisição já gravou o mesmo valor (duplo clique), não há linha nova nem data nova.
   */
  async update(profile: ProfileAggregate): Promise<boolean> {
    const s = profile.toSnapshot()
    const details = {
      name: s.name,
      avatarUrl: s.avatarUrl,
      whatsapp: s.whatsapp,
      birthDate: s.birthDate,
      publicProfileEnabled: s.publicProfileEnabled,
      status: s.status,
      updatedAt: s.updatedAt,
    }
    const change = profile.voiceInputChange
    if (!change) {
      const updated = await this.db
        .update(profiles)
        .set(details)
        .where(eq(profiles.id, s.id))
        .returning({ id: profiles.id })
      return updated.length > 0
    }
    const saved = await this.db.transaction(async (tx) => {
      const [current] = await tx
        .select({ voiceInputEnabled: profiles.voiceInputEnabled })
        .from(profiles)
        .where(eq(profiles.id, s.id))
        .for('update')
      if (!current) return false
      const flips = current.voiceInputEnabled !== change.enabled
      await tx
        .update(profiles)
        .set(
          flips
            ? {
                ...details,
                voiceInputEnabled: s.voiceInputEnabled,
                voiceInputEnabledAt: s.voiceInputEnabledAt,
              }
            : details,
        )
        .where(eq(profiles.id, s.id))
      if (flips) await tx.insert(profileVoiceInputEvents).values(voiceInputEventRow(s, change))
      return true
    })
    if (saved) profile.markVoiceInputChangeSaved()
    return saved
  }
}

/**
 * WHERE da busca unificada: SÓ perfis ativos; com `q`, OR sobre nome do perfil
 * e e-mail/nome/sobrenome da conta. `q` é busca LITERAL: escapa os curingas do
 * LIKE (\, %, _) — espelha o `buildListWhere` do user.repository (achado B5).
 */
function buildSearchWhere(qRaw: string | undefined): SQL | undefined {
  const clauses: SQL[] = [eq(profiles.status, 'active')]
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
