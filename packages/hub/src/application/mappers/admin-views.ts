import type { AccessConfig } from '../../domain/access/access-config'
import type { Audience, Channel, PostingPolicy, Space, SpaceStatus } from '../../domain/space/space'

export interface SpaceView {
  id: string
  version: number
  slug: string
  name: string
  description: string | null
  iconUrl: string | null
  audience: Audience
  accessConfig: AccessConfig
  requiresApproval: boolean
  teaserWhenLocked: boolean
  sortOrder: number
  status: SpaceStatus
  createdAt: string
  updatedAt: string
}

export interface ChannelView {
  id: string
  version: number
  spaceId: string
  slug: string
  name: string
  topic: string | null
  accessConfig: AccessConfig | null
  postingPolicy: PostingPolicy
  requiresApproval: boolean | null
  sortOrder: number
  status: SpaceStatus
  createdAt: string
  updatedAt: string
}

/** Servidor + seus canais (página de edição do painel). */
export interface SpaceTreeView extends SpaceView {
  channels: ChannelView[]
}

export function toSpaceView(s: Space): SpaceView {
  return {
    id: s.id,
    version: s.version,
    slug: s.slug,
    name: s.name,
    description: s.description,
    iconUrl: s.iconUrl,
    audience: s.audience,
    accessConfig: s.accessConfig,
    requiresApproval: s.requiresApproval,
    teaserWhenLocked: s.teaserWhenLocked,
    sortOrder: s.sortOrder,
    status: s.status,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }
}

export function toChannelView(c: Channel): ChannelView {
  return {
    id: c.id,
    version: c.version,
    spaceId: c.spaceId,
    slug: c.slug,
    name: c.name,
    topic: c.topic,
    accessConfig: c.accessConfig,
    postingPolicy: c.postingPolicy,
    requiresApproval: c.requiresApproval,
    sortOrder: c.sortOrder,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }
}

export function toSpaceTreeView(space: Space, channels: Channel[]): SpaceTreeView {
  return { ...toSpaceView(space), channels: channels.map(toChannelView) }
}
