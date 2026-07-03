import type { CursorPos } from '../../application/cursor'
import type { Comment, ContentStatus, Thread } from '../thread/thread'

export interface CreateThreadInput {
  id: string
  channelId: string
  authorId: string
  /** Primeiro nome do autor (snapshot exibido/clicável) ou `null`. */
  authorDisplayName: string | null
  /** Perfil do autor é público (opt-in dos pais) — snapshot p/ decidir o link do nome. */
  authorPublic: boolean
  title: string
  slug: string
  body: string
  status: ContentStatus
  /** Anexos `pending_upload` a vincular NA MESMA transação (atomicidade). */
  attachmentIds: string[]
  now: Date
}

/** Criação de um post de VITRINE (Mural) — auto-publicado pela criança (idempotente). */
export interface CreateShowcaseThreadInput {
  id: string
  channelId: string
  /** Perfil da criança (identidade de DADOS — o `authorId` do thread). */
  authorId: string
  /** Primeiro nome da criança (snapshot exibido na vitrine). */
  authorDisplayName: string
  /** Perfil do autor é público (opt-in dos pais) — snapshot p/ o link do nome. */
  authorPublic: boolean
  title: string
  slug: string
  /** Resumo do projeto (Markdown). */
  body: string
  /** Capa do projeto (URL pública) ou `null` (a UI cai num placeholder). */
  coverImageUrl: string | null
  /** Id público do artefato jogável (UUID) ou `null` — alimenta o "Acessar" do card. */
  playId: string | null
  /** Desafio mensal (`m:YYYY-MM`), já VALIDADO pelo service — `null`/ausente = post normal. */
  challengeKey?: string | null
  /** Chave de idempotência (hash perfil:curso:cadeia[:clientKey]) — UNIQUE; conflito devolve o existente. */
  idempotencyKey: string
  now: Date
}

export interface CreateCommentInput {
  id: string
  threadId: string
  authorId: string
  /** Primeiro nome do autor (snapshot exibido/clicável) ou `null`. */
  authorDisplayName: string | null
  /** Perfil do autor é público (opt-in dos pais) — snapshot p/ o link do nome. */
  authorPublic: boolean
  body: string
  status: ContentStatus
  replyToId: string | null
  /** Anexos `pending_upload` a vincular NA MESMA transação (atomicidade). */
  attachmentIds: string[]
  now: Date
}

export interface ListThreadsOpts {
  /** Vê os pendentes DESTE autor além dos visíveis (o autor vê o próprio aguardando). */
  viewerId: string
  /** Vê TODOS os pendentes (staff). */
  includeAllPending: boolean
  cursor: CursorPos | null
  limit: number
  /** Só posts do desafio (`m:YYYY-MM`) — prateleira do Mural; ausente = todos. */
  challengeKey?: string | null
}

export interface ListCommentsOpts {
  viewerId: string
  includeAllPending: boolean
  after: CursorPos | null
  limit: number
}

export interface ThreadRepository {
  createThread(input: CreateThreadInput): Promise<Thread>
  /**
   * Cria (ou recupera) um post de vitrine de forma IDEMPOTENTE pela `idempotencyKey`.
   * `deduped: true` = já existia (re-conclusão/duplo-clique) → devolve o original.
   * Nasce sempre `visible` (decisão: aparece na hora) e `isShowcase: true`.
   */
  createShowcaseThread(
    input: CreateShowcaseThreadInput,
  ): Promise<{ thread: Thread; deduped: boolean }>
  /**
   * `true` quando o playId pertence a um post de vitrine ainda visível.
   * `countHit` FUNDE o incremento de `playsCount` na mesma ida (sem bump de version).
   */
  hasVisibleShowcasePlayId(playId: string, countHit?: boolean): Promise<boolean>
  /** Agregado da carreira: posts de vitrine visíveis do autor + soma das jogadas. */
  showcaseStatsByAuthor(authorId: string): Promise<{ published: number; plays: number }>
  /**
   * Posts de vitrine VISÍVEIS dos autores dados criados em `[from, to)` — report
   * dos pais (members→hub S2S; a rota NUNCA é exposta no gateway: vazaria playIds
   * entre famílias). Só campos não-sensíveis.
   */
  listShowcaseByAuthors(
    authorIds: string[],
    from: Date,
    to: Date,
  ): Promise<Array<{ authorId: string; title: string; playId: string | null; createdAt: Date }>>
  findThreadById(id: string): Promise<Thread | null>
  /** Página de tópicos (pinned primeiro, depois lastActivityAt desc). `hasMore` se veio `limit+1`. */
  listThreads(
    channelId: string,
    opts: ListThreadsOpts,
  ): Promise<{ items: Thread[]; hasMore: boolean }>
  /** Maior `lastActivityAt` (tópicos visíveis) por canal — alimenta o badge de novidades. */
  latestActivityByChannel(channelIds: string[]): Promise<Map<string, Date>>
  /** Edição do tópico (concorrência otimista por `version`). `false` se conflito. */
  updateThread(thread: Thread): Promise<boolean>

  // ── Moderação (status/flags) ──
  /** Muda o status do tópico. `bumpActivity` (aprovação) atualiza `lastActivityAt`. */
  setThreadStatus(
    id: string,
    status: ContentStatus,
    now: Date,
    bumpActivity?: boolean,
  ): Promise<boolean>
  /** Fixar/desafixar tópico. */
  setThreadPinned(id: string, pinned: boolean): Promise<boolean>
  /** Trancar/destrancar comentários do tópico. */
  setThreadLocked(id: string, locked: boolean): Promise<boolean>
  /**
   * Muda o status do comentário. Ao APROVAR (→ visible) incrementa commentCount +
   * lastActivityAt do tópico-pai na MESMA transação (espelha o createComment).
   */
  setCommentStatus(id: string, status: ContentStatus, now: Date): Promise<boolean>

  /** Cria o comentário E (mesma transação) incrementa commentCount + lastActivityAt do tópico. */
  createComment(input: CreateCommentInput): Promise<Comment>
  findCommentById(id: string): Promise<Comment | null>
  listComments(
    threadId: string,
    opts: ListCommentsOpts,
  ): Promise<{ items: Comment[]; hasMore: boolean }>
  updateComment(comment: Comment): Promise<boolean>
}
