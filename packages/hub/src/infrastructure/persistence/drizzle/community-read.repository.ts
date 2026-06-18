import { and, asc, eq } from 'drizzle-orm'
import type { CommunityReadRepository } from '../../../domain/ports/community-read-repository.port'
import type { Audience, Channel, Space } from '../../../domain/space/space'
import type { Database } from './db'
import { type ChannelRow, channels, type SpaceRow, spaces } from './schema'

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

export class DrizzleCommunityReadRepository implements CommunityReadRepository {
  constructor(private readonly db: Database) {}

  async listActiveSpaces(audience: Audience): Promise<Space[]> {
    const rows = await this.db
      .select()
      .from(spaces)
      .where(and(eq(spaces.audience, audience), eq(spaces.status, 'active')))
      .orderBy(asc(spaces.sortOrder), asc(spaces.name))
    return rows.map(toSpace)
  }

  async findActiveSpaceById(id: string): Promise<Space | null> {
    const [row] = await this.db
      .select()
      .from(spaces)
      .where(and(eq(spaces.id, id), eq(spaces.status, 'active')))
      .limit(1)
    return row ? toSpace(row) : null
  }

  async findActiveSpaceBySlug(slug: string): Promise<Space | null> {
    const [row] = await this.db
      .select()
      .from(spaces)
      .where(and(eq(spaces.slug, slug), eq(spaces.status, 'active')))
      .limit(1)
    return row ? toSpace(row) : null
  }

  async listActiveChannels(spaceId: string): Promise<Channel[]> {
    const rows = await this.db
      .select()
      .from(channels)
      .where(and(eq(channels.spaceId, spaceId), eq(channels.status, 'active')))
      .orderBy(asc(channels.sortOrder))
    return rows.map(toChannel)
  }

  async findActiveChannelById(id: string): Promise<Channel | null> {
    const [row] = await this.db
      .select()
      .from(channels)
      .where(and(eq(channels.id, id), eq(channels.status, 'active')))
      .limit(1)
    return row ? toChannel(row) : null
  }
}
