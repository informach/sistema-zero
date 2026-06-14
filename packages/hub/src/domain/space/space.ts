import type { AccessConfig } from '../access/access-config'

export type Audience = 'adult' | 'kids'
export type SpaceStatus = 'active' | 'archived'
export type PostingPolicy = 'members' | 'staff_only'

/** Servidor da comunidade (agrupa canais). */
export interface Space {
  id: string
  version: number
  slug: string
  name: string
  description: string | null
  iconUrl: string | null
  audience: Audience
  accessConfig: AccessConfig
  requiresApproval: boolean
  sortOrder: number
  status: SpaceStatus
  createdAt: Date
  updatedAt: Date
}

/** Canal (fórum) dentro de um servidor. */
export interface Channel {
  id: string
  version: number
  spaceId: string
  slug: string
  name: string
  topic: string | null
  /** `null` = HERDA o accessConfig do space (e faz AND quando definido). */
  accessConfig: AccessConfig | null
  postingPolicy: PostingPolicy
  /** `null` = HERDA o requiresApproval do space. */
  requiresApproval: boolean | null
  sortOrder: number
  status: SpaceStatus
  createdAt: Date
  updatedAt: Date
}

/** Pré-moderação efetiva do canal (cai no do space quando o canal não define). */
export function effectiveRequiresApproval(space: Space, channel: Channel): boolean {
  return channel.requiresApproval ?? space.requiresApproval
}
