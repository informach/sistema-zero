import type { CursorPos } from '../../application/cursor'
import type { Comment, ContentStatus, Thread, ThreadStudioMeta } from '../thread/thread'

export type ContentTransitionOutcome = 'updated' | 'not_found' | 'invalid_state'

export interface CreateThreadInput {
  id: string
  channelId: string
  authorId: string
  /** Conta do responsável (snapshot) — chave de coorte p/ a recompensa dada na aprovação. */
  authorAccountId: string | null
  /** Primeiro nome do autor (snapshot exibido/clicável) ou `null`. */
  authorDisplayName: string | null
  /** Perfil do autor é público (opt-in dos pais) — snapshot p/ decidir o link do nome. */
  authorPublic: boolean
  title: string
  slug: string
  body: string
  status: ContentStatus
  /**
   * Referência opcional a um jogo do Mural (`play_id`), já VALIDADA pelo service
   * (`hasVisibleShowcasePlayId`) — o card de "Jogar" aparece dentro da conversa do Clube.
   */
  playId?: string | null
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
  /** Metadado do projeto ({pro, extensions[]}, já saneado pelo service) — selo de nível do remix. */
  studioMeta?: ThreadStudioMeta | null
  /** Chave de idempotência (hash perfil:curso:cadeia[:clientKey]) — UNIQUE; conflito devolve o existente. */
  idempotencyKey: string
  now: Date
}

export interface CreateCommentInput {
  id: string
  threadId: string
  authorId: string
  /** Conta do responsável (snapshot) — chave de coorte p/ a recompensa dada na aprovação. */
  authorAccountId: string | null
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

/**
 * Agregado de participação de UM autor (perfil) no Clube (fórum) × Mural (vitrine)
 * — alimenta o "uso por ferramenta" do admin (rota S2S `activity-by-authors`).
 * Clube = conteúdo APROVADO (`visible`, mesma régua do XP): tópicos não-vitrine +
 * comentários cujo TÓPICO-PAI não é vitrine. Mural = vitrines visíveis.
 */
export interface AuthorActivity {
  authorId: string
  /** Tópicos `visible` com `isShowcase=false` do autor. */
  clubThreads: number
  /** Comentários `visible` do autor cujo tópico-pai tem `isShowcase=false`. */
  clubComments: number
  /** max(`createdAt`) entre os tópicos e comentários do Clube acima — `null` sem atividade. */
  lastClubActivityAt: Date | null
  /** Posts de vitrine `visible` do autor. */
  showcasePublished: number
  /** Soma de `playsCount` dessas vitrines (0 se nenhuma). */
  showcasePlays: number
  /** max(`createdAt`) dessas vitrines — `null` sem vitrine. */
  lastShowcaseAt: Date | null
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
   * `visible: true` quando o playId pertence a um post de vitrine ainda visível,
   * com o `authorDisplayName` (1º nome snapshot) para a página pública de jogar.
   * `countHit` FUNDE o incremento de `playsCount` na mesma ida (sem bump de version);
   * o `playsCount` devolvido é o valor APÓS o hit — o UPDATE é atômico, cada hit vê
   * um valor distinto, então o crossing exato de 10/100 (marco de plays) é detectável
   * pelo chamador. `authorId`/`authorAccountId` (snapshots) alimentam o marco.
   */
  hasVisibleShowcasePlayId(
    playId: string,
    countHit?: boolean,
  ): Promise<{
    visible: boolean
    authorDisplayName: string | null
    authorId: string | null
    authorAccountId: string | null
    playsCount: number
  }>
  /** Agregado da carreira: posts de vitrine visíveis do autor + soma das jogadas. */
  showcaseStatsByAuthor(authorId: string): Promise<{ published: number; plays: number }>
  /**
   * Participação Clube × Mural por autor, agregada EM LOTE no banco (GROUP BY —
   * nunca N+1). Devolve UM item por `authorId` dado, NA ORDEM dada, com zeros/nulls
   * quando não há atividade (régua das rotas em lote: todo id pedido volta).
   * ⚠️ O chamador passa ids já DEDUPADOS (duplicata geraria item duplicado).
   */
  activityByAuthors(authorIds: string[]): Promise<AuthorActivity[]>
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
  /**
   * TODOS os posts de vitrine VISÍVEIS de UM autor (perfil), mais recentes primeiro,
   * até `limit`. Alimenta a seção "Jogos publicados" do perfil público kids — inclui
   * a CAPA (`coverImageUrl`, que a `listShowcaseByAuthors` do report dos pais omite) e
   * NÃO tem janela (o perfil mostra a vitrine inteira, não só a semana).
   */
  listShowcaseByAuthor(
    authorId: string,
    limit: number,
  ): Promise<
    Array<{
      title: string
      playId: string | null
      coverImageUrl: string | null
      createdAt: Date
    }>
  >
  findThreadById(id: string): Promise<Thread | null>
  /**
   * Tópicos VISÍVEIS do autor (mais recentes por `lastActivityAt`) — alimenta o sino
   * "novas respostas nas suas conversas" (o app compara `commentCount` com um baseline
   * local). Só os próprios do autor → nunca vaza `authorId` de terceiros.
   */
  listByAuthor(authorId: string, limit: number): Promise<Thread[]>
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
  /** Muda o status do tópico somente a partir de `fromStatuses` (guard atômico). */
  setThreadStatus(
    id: string,
    status: ContentStatus,
    fromStatuses: readonly ContentStatus[],
    now: Date,
    bumpActivity?: boolean,
  ): Promise<ContentTransitionOutcome>
  /** Fixar/desafixar tópico. */
  setThreadPinned(id: string, pinned: boolean): Promise<boolean>
  /** Trancar/destrancar comentários do tópico. */
  setThreadLocked(id: string, locked: boolean): Promise<boolean>
  /**
   * Muda o status do comentário. Ao APROVAR (→ visible) incrementa commentCount +
   * lastActivityAt do tópico-pai na MESMA transação (espelha o createComment).
   */
  setCommentStatus(
    id: string,
    status: ContentStatus,
    fromStatuses: readonly ContentStatus[],
    now: Date,
  ): Promise<ContentTransitionOutcome>

  /** Cria o comentário E (mesma transação) incrementa commentCount + lastActivityAt do tópico. */
  createComment(input: CreateCommentInput): Promise<Comment>
  findCommentById(id: string): Promise<Comment | null>
  listComments(
    threadId: string,
    opts: ListCommentsOpts,
  ): Promise<{ items: Comment[]; hasMore: boolean }>
  updateComment(comment: Comment): Promise<boolean>
}
