export type ContentStatus = 'pending' | 'visible' | 'hidden' | 'deleted' | 'rejected'

/**
 * Metadado do PROJETO de um post de vitrine do Estúdio (snapshot no publish):
 * `pro` = projeto do modo Código; `extensions` = ids das extensões instaladas.
 * É COSMÉTICO (alimenta o selo "remix a partir do nível X" no card do Mural) —
 * o gate REAL do remix é a checagem no clique sobre o snapshot jogável + a trava
 * de abertura do próprio Estúdio. Vem do BFF (corpo da rota interna, alcançável
 * na borda) — por isso NUNCA vira fronteira de segurança.
 */
export interface ThreadStudioMeta {
  pro: boolean
  extensions: string[]
}

/** Tópico (postagem) de um canal. `body` é Markdown. */
export interface Thread {
  id: string
  version: number
  channelId: string
  authorId: string
  /** Conta do responsável (snapshot) — chave de coorte p/ a recompensa dada na aprovação. */
  authorAccountId: string | null
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
  /** Metadado do projeto (vitrine do Estúdio) — selo de nível do remix. `null` = post antigo/sem projeto. */
  studioMeta: ThreadStudioMeta | null
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
  /** Conta do responsável (snapshot) — chave de coorte p/ a recompensa dada na aprovação. */
  authorAccountId: string | null
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
