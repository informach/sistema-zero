import { and, asc, eq, sql } from 'drizzle-orm'
import type {
  CreateProfileOutcome,
  ProfileRepository,
} from '../../../domain/ports/profile-repository.port'
import { ProfileAggregate } from '../../../domain/profile/profile.aggregate'
import type { Database } from './db'
import { profiles } from './schema'

type Row = typeof profiles.$inferSelect

function fromRow(row: Row): ProfileAggregate {
  return ProfileAggregate.restore({
    id: row.id,
    accountUserId: row.accountUserId,
    name: row.name,
    avatarUrl: row.avatarUrl,
    whatsapp: row.whatsapp,
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

  async createWithinLimit(
    profile: ProfileAggregate,
    maxProfiles: number,
  ): Promise<CreateProfileOutcome> {
    const s = profile.toSnapshot()
    return await this.db.transaction(async (tx) => {
      // Serializa os creates DESTA conta (o xact-lock solta no commit/rollback) →
      // contagem + insert viram atômicos: dois creates simultâneos não furam o teto.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`profile:${s.accountUserId}`}, 0))`,
      )
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
          status: s.status,
          sortOrder: (agg?.maxOrder ?? -1) + 1,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        })
        .returning()
      // `row` sempre existe após um insert bem-sucedido (não-condicional).
      return { outcome: 'created' as const, profile: fromRow(row as Row) }
    })
  }

  async update(profile: ProfileAggregate): Promise<boolean> {
    const s = profile.toSnapshot()
    const updated = await this.db
      .update(profiles)
      .set({
        name: s.name,
        avatarUrl: s.avatarUrl,
        whatsapp: s.whatsapp,
        status: s.status,
        updatedAt: s.updatedAt,
      })
      .where(eq(profiles.id, s.id))
      .returning({ id: profiles.id })
    return updated.length > 0
  }
}
