'use client'

import { AttachmentList } from '@sistemazero/member-shell/components/attachment-list'
import {
  AttachmentUploader,
  type UploadedAttachment,
} from '@sistemazero/member-shell/components/attachment-uploader'
import { RichEditor } from '@sistemazero/member-shell/components/rich-editor'
import { renderUgcMarkdown } from '@sistemazero/member-shell/lib/markdown'
import { Copy, Flag, Gamepad2, Hammer, Lock, MessageCircle, Play, QrCode, Send } from 'lucide-react'
import { memo, type ReactNode, useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/cn'
import type { HubCommentView, HubMyThreadView, HubThreadView } from '@/lib/types'
import { KidsBackButton } from './back-button'
import { GameCardDialog } from './game-card-dialog'
import { AuthorBadge, type AuthorItem } from './space-author'

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '🔥', '⭐', '🤩', '👏']
const enc = encodeURIComponent

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 font-bold text-[10px] text-muted-foreground uppercase">
      {children}
    </span>
  )
}

/**
 * "Mostrar meu jogo no Clube": anexa um jogo publicado no Mural (da própria criança) à
 * conversa. Carrega os jogos sob demanda (`onOpen`); escolher um seta o `playId` (o card
 * "Jogar" aparece na conversa). Sem jogos → recado gentil. Fronteira de segurança é o hub.
 */
export function GamePicker({
  games,
  selectedId,
  onOpen,
  onSelect,
}: {
  games: HubMyThreadView[] | null
  selectedId: string | null
  onOpen: () => void
  onSelect: (playId: string | null) => void
}) {
  const selected = games?.find((g) => g.playId === selectedId) ?? null
  if (selectedId && selected) {
    return (
      <div className="flex items-center justify-between rounded-xl border-2 border-primary bg-(--kids-cyan-tint) px-3 py-2 text-sm">
        <span className="inline-flex min-w-0 items-center gap-1.5 font-bold text-primary">
          <Gamepad2 className="size-4 shrink-0" />
          <span className="truncate">{selected.title}</span>
        </span>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="shrink-0 font-bold text-muted-foreground text-xs hover:text-foreground"
        >
          tirar ✕
        </button>
      </div>
    )
  }
  if (games === null) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex items-center gap-1.5 rounded-xl border-2 border-border px-3 py-2 font-bold text-muted-foreground text-sm transition-colors hover:border-primary hover:text-primary"
      >
        <Gamepad2 className="size-4" /> Mostrar meu jogo
      </button>
    )
  }
  if (games.length === 0) {
    return (
      <p className="rounded-xl border-2 border-border border-dashed p-2.5 text-center text-muted-foreground text-xs">
        Você ainda não publicou nenhum jogo no Mural. Crie um no Estúdio! 🎮
      </p>
    )
  }
  return (
    <div className="space-y-1.5 rounded-xl border-2 border-border p-2">
      <p className="font-bold text-muted-foreground text-xs">Escolha um jogo seu:</p>
      <div className="flex flex-wrap gap-1.5">
        {games.map((g) => (
          <button
            type="button"
            key={g.id}
            onClick={() => g.playId && onSelect(g.playId)}
            className="inline-flex items-center gap-1 rounded-full border-2 border-border px-2.5 py-1 font-bold text-foreground text-xs transition-colors hover:border-primary hover:text-primary"
          >
            <Gamepad2 className="size-3" />{' '}
            <span className="max-w-[10rem] truncate">{g.title}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/** Card de projeto no Mural: capa + título + resumo + autor (1º nome da criança). */
/** Caminho da página PÚBLICA de jogar (sem login) a partir do `playId` do post. */
function playPathFor(thread: HubThreadView): string | null {
  return thread.playId ? `/jogar/${enc(thread.playId)}` : null
}

/**
 * "Jogar" (abre a página pública em nova aba) + "Copiar link" (Web Share API com
 * fallback p/ a área de transferência) + "Cartão" (cartão imprimível com QR do
 * jogo — mostrar pra família, 07/2026). A criança manda esse link para a família
 * e os amigos jogarem — sem login, só o jogo.
 */
function PlayLinkActions({
  playUrl,
  title,
  coverImageUrl = null,
  onRemix = null,
  remixLock = null,
  className,
}: {
  playUrl: string
  title: string
  coverImageUrl?: string | null
  /** "Fazer a minha versão" (remix) — presente SÓ com posse do Estúdio + rank com Estúdio livre. */
  onRemix?: (() => void) | null
  /**
   * Jogo usa ferramentas ALÉM do degrau do viewer → o botão vira o selo "no nível X"
   * (cadeado; `levelLabel` null = nível irresoluto, selo genérico). O clique continua
   * vivo — mostra o recado gentil (o handler checa antes de importar).
   */
  remixLock?: { levelLabel: string | null } | null
  className?: string
}) {
  const [cardOpen, setCardOpen] = useState(false)
  const shareOrCopy = useCallback(async () => {
    const abs =
      typeof window !== 'undefined' ? new URL(playUrl, window.location.origin).href : playUrl
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title, url: abs })
        return
      }
    } catch (err) {
      // Cancelar a folha de compartilhar (AbortError) NÃO é falha: a criança
      // desistiu de propósito — não copiar às escondidas nem dizer "copiado".
      if (err instanceof Error && err.name === 'AbortError') return
      // share nativo indisponível/falhou de verdade → cai para copiar
    }
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        throw new Error('clipboard unavailable')
      }
      await navigator.clipboard.writeText(abs)
      toast.success('Link copiado! 🔗')
    } catch {
      toast.error('Não consegui copiar o link.')
    }
  }, [playUrl, title])

  // As pílulas do cartão do Mural nas telas-modelo (11/09/2026): "Jogar" azul de largura
  // cheia; "Copiar link" de contorno com o QR num círculo ao lado; "Fazer a minha versão"
  // na pílula creme. Todas com 44px (alvo de toque).
  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      <a
        href={playUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="sz-btn-gradient h-11 w-full gap-2"
      >
        <Play className="size-4" aria-hidden /> Jogar
      </a>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={shareOrCopy}
          className="sz-btn-gradient sz-btn-contorno h-11 min-w-0 flex-1 gap-2"
        >
          <Copy className="size-4" aria-hidden /> Copiar link
        </button>
        <button
          type="button"
          onClick={() => setCardOpen(true)}
          aria-label={`Cartão do jogo ${title}`}
          title="Cartão do jogo (imprimir com QR)"
          className="sz-btn-gradient sz-btn-contorno size-11 shrink-0 px-0"
        >
          <QrCode className="size-4" aria-hidden />
        </button>
      </div>
      {onRemix ? (
        remixLock ? (
          <button
            type="button"
            onClick={onRemix}
            title="Continue a sua jornada de criador para remixar este jogo"
            className="sz-btn-gradient sz-btn-suave h-auto min-h-11 w-full gap-2 py-2 text-muted-foreground"
          >
            <Lock className="size-4 shrink-0" aria-hidden /> Fazer a minha versão
            {remixLock.levelLabel ? ` · no nível ${remixLock.levelLabel}` : ''}
          </button>
        ) : (
          <button
            type="button"
            onClick={onRemix}
            className="sz-btn-gradient sz-btn-suave h-11 w-full gap-2"
          >
            <Hammer className="size-4" aria-hidden /> Fazer a minha versão
          </button>
        )
      ) : null}
      {cardOpen ? (
        <GameCardDialog
          title={title}
          coverImageUrl={coverImageUrl}
          playUrl={playUrl}
          onClose={() => setCardOpen(false)}
        />
      ) : null}
    </div>
  )
}

export function ShowcaseCard({
  thread,
  viewerId,
  onOpen,
  onRemix = null,
  remixLock = null,
}: {
  thread: HubThreadView
  viewerId: string
  onOpen: () => void
  onRemix?: ((thread: HubThreadView) => void) | null
  /** Selo "no nível X" do remix (jogo além do degrau do viewer) — ver `PlayLinkActions`. */
  remixLock?: { levelLabel: string | null } | null
}) {
  const playUrl = playPathFor(thread)
  const plays = thread.playsCount ?? 0
  // O cartão do Mural das telas-modelo (11/09/2026): branco liso, capa em cima (2:1),
  // título em Baloo, autor com a bolinha, a descrição em até 4 linhas, os contadores e
  // as pílulas de jogar embaixo.
  return (
    <article className="kids-carta group flex w-full flex-col overflow-hidden">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-1 flex-col text-left focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2"
      >
        <div className="aspect-[2/1] w-full overflow-hidden bg-(--band-ceu)">
          {thread.coverImageUrl ? (
            <img
              src={thread.coverImageUrl}
              alt={thread.title}
              width={16}
              height={9}
              className="size-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="grid size-full place-items-center text-3xl">🎮</div>
          )}
        </div>
        <div className="flex flex-1 flex-col p-5">
          <p className="sz-display line-clamp-2 text-xl">{thread.title}</p>
          {/* Card é um <button> (abre o post) → não aninhar âncora aqui; o nome vira
              link clicável DENTRO do post aberto (ThreadDetail) e nos comentários. */}
          {thread.authorDisplayName ? (
            <p className="mt-2 flex items-center text-muted-foreground text-sm">
              <AuthorBadge
                item={thread}
                viewerId={viewerId}
                nameNode={`por ${thread.authorDisplayName}`}
              />
            </p>
          ) : null}
          {/* `thread.body` aqui é UGC da criança (descrição do projeto), renderizado
              como TEXTO ESCAPADO (React escapa; sem markdown = sem <img> externo nem
              link) — seguro por construção. NÃO é "members-authoritative": se um dia
              fluir markdown aqui, use `renderUgcMarkdown` (restrito), como em
              ThreadDetail/CommentRow — nunca `renderMarkdown` cru. */}
          <p className="mt-3 line-clamp-4 text-muted-foreground text-sm">{thread.body}</p>
          <p className="mt-auto flex items-center gap-4 pt-3 text-[0.8125rem] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle className="size-4" aria-hidden />
              <span className="sr-only">Comentários:</span> {thread.commentCount}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Gamepad2 className="size-4" aria-hidden /> {plays}{' '}
              {plays === 1 ? 'jogada' : 'jogadas'}
            </span>
          </p>
        </div>
      </button>
      {playUrl ? (
        <PlayLinkActions
          className="px-5 pb-5"
          playUrl={playUrl}
          title={thread.title}
          coverImageUrl={thread.coverImageUrl ?? null}
          onRemix={onRemix ? () => onRemix(thread) : null}
          remixLock={remixLock}
        />
      ) : null}
    </article>
  )
}

// memo: numa reação só o item tocado muda de referência; com `onReact` estável os
// demais ReactionBar/CommentRow pulam o re-render (e o re-parse do markdown).
const ReactionBar = memo(function ReactionBar({
  target,
  id,
  reactions,
  onReact,
}: {
  target: 'threads' | 'comments'
  id: string
  reactions: HubThreadView['reactions']
  onReact: (target: 'threads' | 'comments', id: string, emoji: string, mine: boolean) => void
}) {
  const byEmoji = useMemo(() => new Map(reactions.map((r) => [r.emoji, r])), [reactions])
  return (
    <div className="flex flex-wrap items-center gap-1">
      {QUICK_EMOJIS.map((emoji) => {
        const r = byEmoji.get(emoji)
        const mine = r?.reactedByMe ?? false
        return (
          <button
            type="button"
            key={emoji}
            onClick={() => onReact(target, id, emoji, mine)}
            className={`inline-flex min-h-[36px] items-center gap-1 rounded-full border-2 px-2.5 py-1 text-sm transition-[transform,background-color,border-color] hover:scale-110 active:scale-95 ${
              mine ? 'border-primary bg-(--kids-cyan-tint)' : 'border-border hover:bg-muted/60'
            }`}
          >
            <span>{emoji}</span>
            {r && r.count > 0 ? <span className="text-xs">{r.count}</span> : null}
          </button>
        )
      })}
    </div>
  )
})

/**
 * Botão "Avisar professor" — o controle de segurança MAIS importante do fórum kids.
 * Alvo de toque ≥44px + ícone (a11y): não pode ser o link minúsculo que era, perdido
 * entre as reações coloridas, para uma criança aflita que precisa denunciar algo.
 */
function ReportButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-muted-foreground text-sm transition-colors hover:bg-muted/60 hover:text-foreground"
    >
      <Flag className="size-4" /> Avisar professor
    </button>
  )
}

// memo: isola o re-parse de markdown + AttachmentList ao comentário que mudou.
const CommentRow = memo(function CommentRow({
  comment,
  label,
  onReact,
  onReport,
}: {
  comment: HubCommentView
  label: ReactNode
  onReact: (target: 'threads' | 'comments', id: string, emoji: string, mine: boolean) => void
  onReport: (target: 'threads' | 'comments', id: string) => void
}) {
  const body = useMemo(() => renderUgcMarkdown(comment.body), [comment.body])
  return (
    <div className="kids-carta space-y-2 p-4">
      <p className="text-muted-foreground text-xs">
        {label}
        {comment.pending ? ' · aguardando ✅' : ''}
      </p>
      <div className="lesson-prose">{body}</div>
      <AttachmentList attachments={comment.attachments} />
      <div className="flex items-center justify-between">
        <ReactionBar
          target="comments"
          id={comment.id}
          reactions={comment.reactions}
          onReact={onReact}
        />
        <ReportButton onClick={() => onReport('comments', comment.id)} />
      </div>
    </div>
  )
})

export function ThreadDetail({
  thread,
  comments,
  busy,
  isWall,
  replyBody,
  setReplyBody,
  replyAttachments,
  setReplyAttachments,
  commentsHasMore,
  loadingMoreComments,
  onLoadMoreComments,
  onBack,
  onSend,
  onReact,
  onReport,
  authorLabel,
  onRemix = null,
  remixLock = null,
  canReply,
}: {
  thread: HubThreadView
  comments: HubCommentView[]
  busy: boolean
  isWall: boolean
  /** Viewer pode responder aqui? `false` = canal `staff_only` sem ser equipe (só lê e reage). */
  canReply: boolean
  replyBody: string
  setReplyBody: (v: string) => void
  replyAttachments: UploadedAttachment[]
  setReplyAttachments: (v: UploadedAttachment[]) => void
  commentsHasMore: boolean
  loadingMoreComments: boolean
  onLoadMoreComments: () => void
  onBack: () => void
  onSend: () => void
  onReact: (target: 'threads' | 'comments', id: string, emoji: string, mine: boolean) => void
  onReport: (target: 'threads' | 'comments', id: string) => void
  authorLabel: (item: AuthorItem) => ReactNode
  onRemix?: ((thread: HubThreadView) => void) | null
  /** Selo "no nível X" do remix (jogo além do degrau do viewer) — ver `PlayLinkActions`. */
  remixLock?: { levelLabel: string | null } | null
}) {
  // memo: o corpo do tópico não muda quando um comentário recebe reação.
  const threadBody = useMemo(() => renderUgcMarkdown(thread.body), [thread.body])
  const plays = thread.playsCount ?? 0
  return (
    <div className="space-y-4">
      <KidsBackButton
        onClick={onBack}
        label={isWall ? 'Voltar aos projetos' : 'Voltar às conversas'}
        showLabel
      />

      <div className="kids-carta space-y-4 p-5 md:p-6">
        {isWall && thread.coverImageUrl ? (
          <div className="aspect-[2/1] w-full overflow-hidden rounded-[1rem] bg-(--band-ceu)">
            <img
              src={thread.coverImageUrl}
              alt={thread.title}
              width={16}
              height={9}
              className="size-full object-cover"
            />
          </div>
        ) : null}
        <h2 className="sz-display text-2xl">{thread.title}</h2>
        <p className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
          {authorLabel(thread)}
          {isWall && plays > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Gamepad2 className="size-3" /> {plays} {plays === 1 ? 'jogada' : 'jogadas'}
            </span>
          ) : null}
        </p>
        <div className="lesson-prose">{threadBody}</div>
        {/* Card "Jogar": no Mural (vitrine) OU numa conversa do Clube que referencia um
            jogo ("Mostrar meu jogo no Clube") — o hub garante que o playId é visível. */}
        {thread.playId ? (
          <PlayLinkActions
            playUrl={`/jogar/${enc(thread.playId)}`}
            title={thread.title}
            coverImageUrl={thread.coverImageUrl ?? null}
            onRemix={onRemix ? () => onRemix(thread) : null}
            remixLock={remixLock}
          />
        ) : null}
        <AttachmentList attachments={thread.attachments} />
        <div className="flex items-center justify-between">
          <ReactionBar
            target="threads"
            id={thread.id}
            reactions={thread.reactions}
            onReact={onReact}
          />
          <ReportButton onClick={() => onReport('threads', thread.id)} />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-bold text-muted-foreground text-sm">
          {comments.length} resposta{comments.length === 1 ? '' : 's'}
        </h3>
        {comments.map((c) => (
          <CommentRow
            key={c.id}
            comment={c}
            label={authorLabel(c)}
            onReact={onReact}
            onReport={onReport}
          />
        ))}
        {commentsHasMore ? (
          <button
            type="button"
            onClick={onLoadMoreComments}
            disabled={loadingMoreComments}
            className="sz-btn-gradient sz-btn-contorno mx-auto flex h-11 w-fit px-6 disabled:opacity-60"
          >
            {loadingMoreComments ? 'Carregando…' : 'Carregar mais respostas'}
          </button>
        ) : null}
      </div>

      {thread.isLocked ? (
        <div className="kids-carta p-4 text-center font-semibold text-muted-foreground text-sm">
          Esta conversa está fechada para novas respostas.
        </div>
      ) : !canReply ? (
        // Canal "somente avisos" (ex.: Recados da equipe) p/ quem não é equipe: sem
        // caixa de resposta — a criança só lê e reage.
        <div className="kids-carta p-4 text-center font-semibold text-muted-foreground text-sm">
          Aqui só a equipe escreve. Você pode reagir! 🙂
        </div>
      ) : (
        <div className="kids-carta space-y-2 p-4">
          <RichEditor value={replyBody} onChange={setReplyBody} ariaLabel="Resposta" compact />
          <AttachmentUploader
            value={replyAttachments}
            onChange={setReplyAttachments}
            disabled={busy}
          />
          <div className="flex justify-end">
            <button
              type="button"
              className="sz-btn-gradient h-11 gap-2 px-6 disabled:opacity-60"
              onClick={onSend}
              disabled={busy || !replyBody.trim()}
            >
              <Send className="size-4" /> {isWall ? 'Comentar' : 'Responder'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
