import { randomUUID } from 'node:crypto'
import { and, asc, count, eq, type SQL, sql } from 'drizzle-orm'
import { DuplicateSlugError, InvalidReorderError } from '../../../domain/hub-errors'
import type {
  ChannelFields,
  CommunityAdminRepository,
  ListSpacesAdminFilter,
  SpaceFields,
} from '../../../domain/ports/community-admin-repository.port'
import type { Audience, Channel, Space } from '../../../domain/space/space'
import type { Database } from './db'
import { isUniqueViolation } from './pg-errors'
import { type ChannelRow, channels, type SpaceRow, spaces } from './schema'

/**
 * Reordenação só vale se os ids forem EXATAMENTE os filhos atuais. Re-checado DENTRO
 * da transação (sobre o snapshot `FOR UPDATE`) para fechar a janela TOCTOU: um
 * create/delete concorrente entre a validação do service e o reorder aflora aqui.
 */
function assertExactSet(current: string[], provided: string[]): void {
  if (current.length !== provided.length) {
    throw new InvalidReorderError('A reordenação precisa conter exatamente os itens atuais')
  }
  const set = new Set(current)
  for (const id of provided) {
    if (!set.has(id)) throw new InvalidReorderError('Id desconhecido na reordenação')
  }
}

const toSpace = (r: SpaceRow): Space => ({
  id: r.id,
  version: r.version,
  slug: r.slug,
  name: r.name,
  description: r.description,
  iconUrl: r.iconUrl,
  audience: r.audience,
  accessConfig: r.accessConfig,
  requiresApproval: r.requiresApproval,
  teaserWhenLocked: r.teaserWhenLocked,
  sortOrder: r.sortOrder,
  status: r.status,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
})

const toChannel = (r: ChannelRow): Channel => ({
  id: r.id,
  version: r.version,
  spaceId: r.spaceId,
  slug: r.slug,
  name: r.name,
  topic: r.topic,
  accessConfig: r.accessConfig ?? null,
  postingPolicy: r.postingPolicy,
  requiresApproval: r.requiresApproval,
  sortOrder: r.sortOrder,
  status: r.status,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
})

export class DrizzleCommunityAdminRepository implements CommunityAdminRepository {
  constructor(private readonly db: Database) {}

  // ── Servidores ──────────────────────────────────────────────────────────
  async listSpacesAdmin(filter: ListSpacesAdminFilter): Promise<{ items: Space[]; total: number }> {
    const clauses: SQL[] = []
    const q = filter.q?.trim()
    if (q) {
      const like = `%${q.replace(/[\\%_]/g, '\\$&')}%`
      clauses.push(sql`(${spaces.name} ilike ${like} or ${spaces.slug} ilike ${like})`)
    }
    if (filter.audience) clauses.push(eq(spaces.audience, filter.audience))
    if (filter.status) clauses.push(eq(spaces.status, filter.status))
    const where = clauses.length > 0 ? and(...clauses) : undefined

    const [rows, [counted]] = await Promise.all([
      this.db
        .select()
        .from(spaces)
        .where(where)
        .orderBy(asc(spaces.audience), asc(spaces.sortOrder), asc(spaces.name))
        .limit(filter.limit)
        .offset(filter.offset),
      this.db.select({ c: count() }).from(spaces).where(where),
    ])
    return { items: rows.map(toSpace), total: counted?.c ?? 0 }
  }

  async findSpaceById(id: string): Promise<Space | null> {
    const [row] = await this.db.select().from(spaces).where(eq(spaces.id, id)).limit(1)
    return row ? toSpace(row) : null
  }

  async createSpace(fields: SpaceFields): Promise<Space> {
    const now = new Date()
    try {
      const [row] = await this.db
        .insert(spaces)
        .values({
          id: randomUUID(),
          version: 0,
          slug: fields.slug,
          name: fields.name,
          description: fields.description,
          iconUrl: fields.iconUrl,
          audience: fields.audience,
          accessConfig: fields.accessConfig,
          requiresApproval: fields.requiresApproval,
          teaserWhenLocked: fields.teaserWhenLocked,
          // `max+1` dentro do INSERT (1 statement) — ordena por audiência.
          sortOrder: sql`coalesce((select max(${spaces.sortOrder}) + 1 from ${spaces} where ${spaces.audience} = ${fields.audience}), 0)`,
          status: fields.status,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
      return toSpace(row as SpaceRow)
    } catch (error) {
      if (isUniqueViolation(error)) throw new DuplicateSlugError()
      throw error
    }
  }

  async updateSpace(space: Space): Promise<boolean> {
    try {
      const rows = await this.db
        .update(spaces)
        .set({
          slug: space.slug,
          name: space.name,
          description: space.description,
          iconUrl: space.iconUrl,
          audience: space.audience,
          accessConfig: space.accessConfig,
          requiresApproval: space.requiresApproval,
          teaserWhenLocked: space.teaserWhenLocked,
          status: space.status,
          version: space.version + 1,
          updatedAt: new Date(),
        })
        .where(and(eq(spaces.id, space.id), eq(spaces.version, space.version)))
        .returning({ id: spaces.id })
      return rows.length > 0
    } catch (error) {
      if (isUniqueViolation(error)) throw new DuplicateSlugError()
      throw error
    }
  }

  async deleteSpace(id: string): Promise<boolean> {
    const rows = await this.db.delete(spaces).where(eq(spaces.id, id)).returning({ id: spaces.id })
    return rows.length > 0
  }

  async listSpaceIds(audience: Audience): Promise<string[]> {
    const rows = await this.db
      .select({ id: spaces.id })
      .from(spaces)
      .where(eq(spaces.audience, audience))
      .orderBy(asc(spaces.sortOrder))
    return rows.map((r) => r.id)
  }

  async reorderSpaces(audience: Audience, orderedIds: string[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      const current = await tx
        .select({ id: spaces.id })
        .from(spaces)
        .where(eq(spaces.audience, audience))
        .for('update')
      assertExactSet(
        current.map((r) => r.id),
        orderedIds,
      )
      for (let i = 0; i < orderedIds.length; i++) {
        await tx
          .update(spaces)
          .set({ sortOrder: i, updatedAt: new Date() })
          .where(and(eq(spaces.id, orderedIds[i] as string), eq(spaces.audience, audience)))
      }
    })
  }

  // ── Canais ────────────────────────────────────────────────────────────────
  async listChannelsBySpace(spaceId: string): Promise<Channel[]> {
    const rows = await this.db
      .select()
      .from(channels)
      .where(eq(channels.spaceId, spaceId))
      .orderBy(asc(channels.sortOrder))
    return rows.map(toChannel)
  }

  async findChannelById(id: string): Promise<Channel | null> {
    const [row] = await this.db.select().from(channels).where(eq(channels.id, id)).limit(1)
    return row ? toChannel(row) : null
  }

  async createChannel(spaceId: string, fields: ChannelFields): Promise<Channel> {
    const now = new Date()
    try {
      const [row] = await this.db
        .insert(channels)
        .values({
          id: randomUUID(),
          version: 0,
          spaceId,
          slug: fields.slug,
          name: fields.name,
          topic: fields.topic,
          accessConfig: fields.accessConfig,
          postingPolicy: fields.postingPolicy,
          requiresApproval: fields.requiresApproval,
          sortOrder: sql`coalesce((select max(${channels.sortOrder}) + 1 from ${channels} where ${channels.spaceId} = ${spaceId}), 0)`,
          status: fields.status,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
      return toChannel(row as ChannelRow)
    } catch (error) {
      if (isUniqueViolation(error)) throw new DuplicateSlugError()
      throw error
    }
  }

  async updateChannel(channel: Channel): Promise<boolean> {
    try {
      const rows = await this.db
        .update(channels)
        .set({
          slug: channel.slug,
          name: channel.name,
          topic: channel.topic,
          accessConfig: channel.accessConfig,
          postingPolicy: channel.postingPolicy,
          requiresApproval: channel.requiresApproval,
          status: channel.status,
          version: channel.version + 1,
          updatedAt: new Date(),
        })
        .where(and(eq(channels.id, channel.id), eq(channels.version, channel.version)))
        .returning({ id: channels.id })
      return rows.length > 0
    } catch (error) {
      if (isUniqueViolation(error)) throw new DuplicateSlugError()
      throw error
    }
  }

  async deleteChannel(id: string): Promise<boolean> {
    const rows = await this.db
      .delete(channels)
      .where(eq(channels.id, id))
      .returning({ id: channels.id })
    return rows.length > 0
  }

  async listChannelIds(spaceId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: channels.id })
      .from(channels)
      .where(eq(channels.spaceId, spaceId))
      .orderBy(asc(channels.sortOrder))
    return rows.map((r) => r.id)
  }

  async reorderChannels(spaceId: string, orderedIds: string[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      const current = await tx
        .select({ id: channels.id })
        .from(channels)
        .where(eq(channels.spaceId, spaceId))
        .for('update')
      assertExactSet(
        current.map((r) => r.id),
        orderedIds,
      )
      for (let i = 0; i < orderedIds.length; i++) {
        await tx
          .update(channels)
          .set({ sortOrder: i, updatedAt: new Date() })
          .where(and(eq(channels.id, orderedIds[i] as string), eq(channels.spaceId, spaceId)))
      }
    })
  }
}
