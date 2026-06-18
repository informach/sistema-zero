import type { Audience } from '../../domain/space/space'
import {
  type Channel,
  effectiveRequiresApproval,
  type PostingPolicy,
  type Space,
} from '../../domain/space/space'

/** Servidor visto pelo aluno (sem accessConfig/version — detalhe interno). */
export interface SpacePublicView {
  id: string
  slug: string
  name: string
  description: string | null
  iconUrl: string | null
  audience: Audience
  /**
   * O aluno NÃO tem acesso mas o servidor aparece como "bloqueado" (teaser). A UI
   * mostra um recado gentil; o CONTEÚDO (canais) não é carregado quando `locked`.
   */
  locked: boolean
}

/** Canal visto pelo aluno. `requiresApproval` é o efetivo (canal ?? space). */
export interface ChannelPublicView {
  id: string
  spaceId: string
  slug: string
  name: string
  topic: string | null
  postingPolicy: PostingPolicy
  requiresApproval: boolean
  /** Há tópicos com atividade depois da última visita do aluno (badge de novidade). */
  hasUnread: boolean
}

export function toSpacePublicView(s: Space, locked = false): SpacePublicView {
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    description: s.description,
    iconUrl: s.iconUrl,
    audience: s.audience,
    locked,
  }
}

export function toChannelPublicView(
  space: Space,
  c: Channel,
  hasUnread = false,
): ChannelPublicView {
  return {
    id: c.id,
    spaceId: c.spaceId,
    slug: c.slug,
    name: c.name,
    topic: c.topic,
    postingPolicy: c.postingPolicy,
    requiresApproval: effectiveRequiresApproval(space, c),
    hasUnread,
  }
}
