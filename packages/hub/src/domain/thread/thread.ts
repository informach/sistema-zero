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
  /** Primeiro nome do autor (snapshot no create) — exibido na vitrine e no fórum (clicável). */
  authorDisplayName: string | null
  /** Perfil do autor é PÚBLICO (opt-in dos pais, snapshot) — o nome vira link p/ o perfil público. */
  authorPublic: boolean
  /** Capa do projeto (URL pública) — só na vitrine. */
  coverImageUrl: string | null
  /** Id público do artefato jogável (UUID) — só na vitrine do Estúdio; `null` = sem link de jogar. */
  playId: string | null
  /** Jogadas do link público (vaidade, best-effort — incrementado no resolve do /jogar). */
  playsCount: number
  /** Desafio mensal (game jam): `m:YYYY-MM` — só com posse Clube+Estúdio no mês certo. */
  challengeKey: string | null
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
  /** Primeiro nome do autor (snapshot no create) — exibido/clicável no fórum. */
  authorDisplayName: string | null
  /** Perfil do autor é PÚBLICO (opt-in dos pais, snapshot) — o nome vira link. */
  authorPublic: boolean
  createdAt: Date
  editedAt: Date | null
}
