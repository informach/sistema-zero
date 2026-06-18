export type ContentStatus = 'pending' | 'visible' | 'hidden' | 'deleted' | 'rejected'

/** Tópico (postagem) de um canal. `body` é Markdown. */
export interface Thread {
  id: string
  version: number
  channelId: string
  authorId: string
  title: string
  slug: string
  body: string
  isPinned: boolean
  isLocked: boolean
  status: ContentStatus
  commentCount: number
  /** Post de PROJETO da vitrine (Mural dos Criadores) — auto-publicado pela criança. */
  isShowcase: boolean
  /** Nome de exibição do autor (snapshot) — só na vitrine; o fórum redige terceiros. */
  authorDisplayName: string | null
  /** Capa do projeto (URL pública) — só na vitrine. */
  coverImageUrl: string | null
  lastActivityAt: Date
  createdAt: Date
  editedAt: Date | null
}

/** Comentário (resposta) de um tópico. */
export interface Comment {
  id: string
  version: number
  threadId: string
  authorId: string
  body: string
  status: ContentStatus
  replyToId: string | null
  createdAt: Date
  editedAt: Date | null
}
