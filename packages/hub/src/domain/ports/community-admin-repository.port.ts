import type { AccessConfig } from '../access/access-config'
import type { Audience, Channel, PostingPolicy, Space, SpaceStatus } from '../space/space'

export interface SpaceFields {
  slug: string
  name: string
  description: string | null
  iconUrl: string | null
  audience: Audience
  accessConfig: AccessConfig
  requiresApproval: boolean
  status: SpaceStatus
}

export interface ChannelFields {
  slug: string
  name: string
  topic: string | null
  /** `null` = herda o accessConfig do space. */
  accessConfig: AccessConfig | null
  postingPolicy: PostingPolicy
  /** `null` = herda o requiresApproval do space. */
  requiresApproval: boolean | null
  status: SpaceStatus
}

export interface ListSpacesAdminFilter {
  q?: string
  audience?: Audience
  status?: SpaceStatus
  limit: number
  offset: number
}

/**
 * Persistência ADMIN da estrutura da comunidade (CRUD de servidores/canais +
 * reordenação). Slug duplicado (índice único) → `DuplicateSlugError`. Concorrência
 * otimista por `version` (UPDATE ... WHERE id=? AND version=? → `false` se conflito).
 * Reordenação reescrita por índice em transação. `deleteSpace` conta com
 * `onDelete: cascade` no schema (canais/tópicos/comentários do servidor).
 */
export interface CommunityAdminRepository {
  // ── Servidores ──
  listSpacesAdmin(filter: ListSpacesAdminFilter): Promise<{ items: Space[]; total: number }>
  findSpaceById(id: string): Promise<Space | null>
  createSpace(fields: SpaceFields): Promise<Space>
  updateSpace(space: Space): Promise<boolean>
  deleteSpace(id: string): Promise<boolean>
  /** Ids dos servidores de uma audiência na ordem atual (para validar o reorder). */
  listSpaceIds(audience: Audience): Promise<string[]>
  reorderSpaces(audience: Audience, orderedIds: string[]): Promise<void>

  // ── Canais ──
  listChannelsBySpace(spaceId: string): Promise<Channel[]>
  findChannelById(id: string): Promise<Channel | null>
  createChannel(spaceId: string, fields: ChannelFields): Promise<Channel>
  updateChannel(channel: Channel): Promise<boolean>
  deleteChannel(id: string): Promise<boolean>
  listChannelIds(spaceId: string): Promise<string[]>
  reorderChannels(spaceId: string, orderedIds: string[]): Promise<void>
}
