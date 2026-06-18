'use client'

import { AttachmentList } from '@sistemazero/member-shell/components/attachment-list'
import {
  AttachmentUploader,
  type UploadedAttachment,
} from '@sistemazero/member-shell/components/attachment-uploader'
import { RichEditor } from '@sistemazero/member-shell/components/rich-editor'
import { renderMarkdown } from '@sistemazero/member-shell/lib/markdown'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Textarea } from '@sistemazero/ui/textarea'
import { ArrowLeft, Hash, Lock, MessageCircle, Plus, Send } from 'lucide-react'
import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import type {
  HubChannelView,
  HubCommentView,
  HubPage,
  HubReaction,
  HubSpaceView,
  HubThreadView,
} from '@/lib/types'
import { KidsLockedSpace } from './kids-locked-space'

/** Modo de apresentação: fórum (Clube — conversa) ou vitrine (Mural — cards de projeto). */
export type SpaceViewMode = 'forum' | 'wall'

// Emojis da allowlist kids (o hub recusa fora dela).
const QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '⭐']

// Slugs/ids vêm do servidor (slug/UUID), mas codificamos por consistência/segurança.
const enc = encodeURIComponent

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} h`
  return `${Math.floor(h / 24)} d`
}

function postingError(e: ApiError): string {
  if (e.code === 'POSTING_NOT_ALLOWED') return 'Aqui só a equipe pode escrever. 🙂'
  if (e.code === 'USER_MUTED') return 'Você está de pausa pra escrever aqui.'
  if (e.code === 'USER_BANNED') return 'Você não pode participar deste espaço.'
  return e.message ?? 'Não consegui enviar. Tente de novo!'
}

/** Nome do autor para EXIBIÇÃO: na vitrine mostra o 1º nome; no fórum, Você/Colega. */
function displayAuthor(
  item: { isShowcase?: boolean; authorDisplayName?: string | null; authorId: string | null },
  viewerId: string,
): string {
  if (item.isShowcase && item.authorDisplayName) return `por ${item.authorDisplayName}`
  return item.authorId === viewerId ? 'Você' : 'Colega'
}

/** Alterna otimisticamente a reação do viewer no agregado por emoji (sem refetch). */
function toggleReaction(reactions: HubReaction[], emoji: string, mine: boolean): HubReaction[] {
  const idx = reactions.findIndex((r) => r.emoji === emoji)
  const current = idx < 0 ? undefined : reactions[idx]
  if (mine) {
    if (!current) return reactions
    const next = current.count - 1
    if (next <= 0) return reactions.filter((_, i) => i !== idx)
    return reactions.map((r, i) => (i === idx ? { ...r, count: next, reactedByMe: false } : r))
  }
  if (!current) return [...reactions, { emoji, count: 1, reactedByMe: true }]
  return reactions.map((r, i) => (i === idx ? { ...r, count: r.count + 1, reactedByMe: true } : r))
}

export function KidsSpaceViewClient({
  slug,
  viewerId,
  mode = 'forum',
}: {
  slug: string
  viewerId: string
  mode?: SpaceViewMode
}) {
  const isWall = mode === 'wall'
  const [space, setSpace] = useState<HubSpaceView | null>(null)
  const [channels, setChannels] = useState<HubChannelView[]>([])
  const [channel, setChannel] = useState<HubChannelView | null>(null)
  const [threads, setThreads] = useState<HubThreadView[]>([])
  const [thread, setThread] = useState<HubThreadView | null>(null)
  const [comments, setComments] = useState<HubCommentView[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newBody, setNewBody] = useState('')
  const [newAttachments, setNewAttachments] = useState<UploadedAttachment[]>([])
  const [replyBody, setReplyBody] = useState('')
  const [replyAttachments, setReplyAttachments] = useState<UploadedAttachment[]>([])

  // Paginação por cursor — espaços acumulam conversas/respostas além da 1ª página.
  const [threadsCursor, setThreadsCursor] = useState<string | null>(null)
  const [threadsHasMore, setThreadsHasMore] = useState(false)
  const [loadingMoreThreads, setLoadingMoreThreads] = useState(false)
  const [commentsCursor, setCommentsCursor] = useState<string | null>(null)
  const [commentsHasMore, setCommentsHasMore] = useState(false)
  const [loadingMoreComments, setLoadingMoreComments] = useState(false)

  // Denúncia ("Avisar professor") por modal no app — sem window.prompt nativo.
  const [reportTarget, setReportTarget] = useState<{
    target: 'threads' | 'comments'
    id: string
  } | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [reportBusy, setReportBusy] = useState(false)

  const authorLabel = useCallback(
    (item: { isShowcase?: boolean; authorDisplayName?: string | null; authorId: string | null }) =>
      displayAuthor(item, viewerId),
    [viewerId],
  )

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const sp = await apiGet<HubSpaceView>(`/api/hub/spaces/${enc(slug)}`)
        if (!alive) return
        setSpace(sp)
        // Bloqueado (sem acesso): mostra o recado e NÃO carrega os canais (o backend
        // recusa /channels em 403 — backstop à prova de vazamento).
        if (sp.locked) return
        const ch = await apiGet<{ items: HubChannelView[] }>(
          `/api/hub/spaces/${enc(slug)}/channels`,
        )
        if (!alive) return
        setChannels(ch.items)
        setChannel(ch.items[0] ?? null)
      } catch (err) {
        if (alive) toast.error((err as ApiError).message ?? 'Não consegui abrir este espaço.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [slug])

  const loadThreads = useCallback(async (channelId: string) => {
    try {
      const page = await apiGet<HubPage<HubThreadView>>(
        `/api/hub/channels/${enc(channelId)}/threads`,
      )
      setThreads(page.items)
      setThreadsCursor(page.nextCursor)
      setThreadsHasMore(page.hasMore)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha ao carregar.')
    }
    // Marca como visto e apaga o ponto de não-lido localmente (sem refetch dos canais).
    apiSend(`/api/hub/channels/${enc(channelId)}/seen`, 'POST', {}).catch(() => {})
    setChannels((prev) => prev.map((c) => (c.id === channelId ? { ...c, hasUnread: false } : c)))
  }, [])

  async function loadMoreThreads() {
    if (!channel || !threadsCursor || loadingMoreThreads) return
    setLoadingMoreThreads(true)
    try {
      const page = await apiGet<HubPage<HubThreadView>>(
        `/api/hub/channels/${enc(channel.id)}/threads?cursor=${enc(threadsCursor)}`,
      )
      setThreads((prev) => [...prev, ...page.items])
      setThreadsCursor(page.nextCursor)
      setThreadsHasMore(page.hasMore)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha ao carregar mais.')
    } finally {
      setLoadingMoreThreads(false)
    }
  }

  useEffect(() => {
    if (!channel) return
    setThread(null)
    setShowNew(false)
    void loadThreads(channel.id)
  }, [channel, loadThreads])

  const loadComments = useCallback(async (threadId: string) => {
    try {
      const page = await apiGet<HubPage<HubCommentView>>(
        `/api/hub/threads/${enc(threadId)}/comments`,
      )
      setComments(page.items)
      setCommentsCursor(page.nextCursor)
      setCommentsHasMore(page.hasMore)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha ao carregar as respostas.')
    }
  }, [])

  async function openThread(t: HubThreadView) {
    setThread(t)
    setComments([])
    setCommentsCursor(null)
    setCommentsHasMore(false)
    await loadComments(t.id)
  }

  async function loadMoreComments() {
    if (!thread || !commentsCursor || loadingMoreComments) return
    setLoadingMoreComments(true)
    try {
      const page = await apiGet<HubPage<HubCommentView>>(
        `/api/hub/threads/${enc(thread.id)}/comments?after=${enc(commentsCursor)}`,
      )
      setComments((prev) => [...prev, ...page.items])
      setCommentsCursor(page.nextCursor)
      setCommentsHasMore(page.hasMore)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha ao carregar mais respostas.')
    } finally {
      setLoadingMoreComments(false)
    }
  }

  async function createThread() {
    if (!channel || !newTitle.trim() || !newBody.trim()) {
      toast.error('Escreva um título e uma mensagem. ✏️')
      return
    }
    setBusy(true)
    try {
      const created = await apiSend<HubThreadView>(
        `/api/hub/channels/${enc(channel.id)}/threads`,
        'POST',
        {
          title: newTitle.trim(),
          body: newBody.trim(),
          attachmentIds: newAttachments.map((a) => a.id),
        },
      )
      toast.success(
        created.pending
          ? 'Enviado! Um professor vai revisar antes de aparecer. ✅'
          : 'Conversa criada! 🎉',
      )
      setNewTitle('')
      setNewBody('')
      setNewAttachments([])
      setShowNew(false)
      await loadThreads(channel.id)
    } catch (err) {
      toast.error(postingError(err as ApiError))
    } finally {
      setBusy(false)
    }
  }

  async function sendReply() {
    if (!thread || !replyBody.trim()) return
    setBusy(true)
    try {
      const created = await apiSend<HubCommentView>(
        `/api/hub/threads/${enc(thread.id)}/comments`,
        'POST',
        { body: replyBody.trim(), attachmentIds: replyAttachments.map((a) => a.id) },
      )
      setReplyBody('')
      setReplyAttachments([])
      if (created.pending) toast.success('Enviado! Um professor vai revisar. ✅')
      await loadComments(thread.id)
    } catch (err) {
      toast.error(postingError(err as ApiError))
    } finally {
      setBusy(false)
    }
  }

  async function react(target: 'threads' | 'comments', id: string, emoji: string, mine: boolean) {
    // Otimismo local: alterna a reação na hora e SÓ desfaz se o servidor recusar.
    const prevThread = thread
    const prevComments = comments
    if (target === 'threads') {
      setThread((t) =>
        t && t.id === id ? { ...t, reactions: toggleReaction(t.reactions, emoji, mine) } : t,
      )
    } else {
      setComments((cs) =>
        cs.map((c) =>
          c.id === id ? { ...c, reactions: toggleReaction(c.reactions, emoji, mine) } : c,
        ),
      )
    }
    try {
      if (mine) {
        await apiSend(`/api/hub/${target}/${enc(id)}/reactions/${enc(emoji)}`, 'DELETE')
      } else {
        await apiSend(`/api/hub/${target}/${enc(id)}/reactions`, 'POST', { emoji })
      }
    } catch (err) {
      setThread(prevThread)
      setComments(prevComments)
      toast.error((err as ApiError).message ?? 'Não consegui reagir.')
    }
  }

  function report(target: 'threads' | 'comments', id: string) {
    setReportReason('')
    setReportTarget({ target, id })
  }

  async function submitReport() {
    if (!reportTarget) return
    const reason = reportReason.trim()
    if (!reason) {
      toast.error('Conta pra gente o que aconteceu. ✏️')
      return
    }
    setReportBusy(true)
    try {
      await apiSend(`/api/hub/${reportTarget.target}/${enc(reportTarget.id)}/report`, 'POST', {
        reason,
      })
      toast.success('Avisamos um professor. Obrigado! 💙')
      setReportTarget(null)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Não consegui avisar.')
    } finally {
      setReportBusy(false)
    }
  }

  if (loading) return <p className="px-4 py-8 text-muted-foreground">Carregando…</p>
  if (!space) return <p className="px-4 py-8 text-muted-foreground">Espaço não encontrado.</p>
  // Sem acesso (teaser): recado gentil, sem nenhum conteúdo.
  if (space.locked) return <KidsLockedSpace space={space} />

  return (
    <>
      <div className="mx-auto w-full max-w-4xl px-4 py-6">
        <h1 className="mb-1 [font-family:var(--font-display)] font-bold text-2xl">{space.name}</h1>
        {space.description ? (
          <p className="mb-4 text-muted-foreground text-sm">{space.description}</p>
        ) : (
          <div className="mb-4" />
        )}

        <div className={`grid gap-4 ${isWall ? '' : 'md:grid-cols-[200px_1fr]'}`}>
          {!isWall ? (
            <aside className="flex gap-2 overflow-x-auto md:flex-col md:gap-1.5">
              {channels.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setChannel(c)}
                  className={`flex shrink-0 items-center gap-2 rounded-2xl border-2 px-3 py-2 text-left text-sm transition-colors ${
                    channel?.id === c.id
                      ? 'border-primary bg-(--kids-cyan-tint) font-bold text-primary'
                      : 'border-transparent text-muted-foreground hover:bg-muted/60'
                  }`}
                >
                  {c.postingPolicy === 'staff_only' ? (
                    <Lock className="size-4 shrink-0" />
                  ) : (
                    <Hash className="size-4 shrink-0" />
                  )}
                  <span className="truncate">{c.name}</span>
                  {c.hasUnread ? <span className="ml-auto size-2 rounded-full bg-primary" /> : null}
                </button>
              ))}
            </aside>
          ) : null}

          <main className="min-w-0">
            {thread ? (
              <ThreadDetail
                thread={thread}
                comments={comments}
                busy={busy}
                isWall={isWall}
                replyBody={replyBody}
                setReplyBody={setReplyBody}
                replyAttachments={replyAttachments}
                setReplyAttachments={setReplyAttachments}
                commentsHasMore={commentsHasMore}
                loadingMoreComments={loadingMoreComments}
                onLoadMoreComments={loadMoreComments}
                onBack={() => setThread(null)}
                onSend={sendReply}
                onReact={react}
                onReport={report}
                authorLabel={authorLabel}
              />
            ) : (
              <div className="space-y-3">
                {/* O Mural é só leitura+reação+comentário: sem composer de tópico. */}
                {!isWall ? (
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground text-sm">
                      {channel ? channel.topic || `#${channel.slug}` : 'Escolha um canal'}
                    </p>
                    {channel ? (
                      <button
                        type="button"
                        onClick={() => setShowNew((v) => !v)}
                        className="inline-flex items-center gap-1 rounded-2xl bg-primary px-4 py-2 font-bold text-primary-foreground text-sm"
                      >
                        <Plus className="size-4" /> Começar conversa
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {!isWall && showNew ? (
                  <div className="space-y-2 rounded-2xl border-2 border-border bg-card p-3">
                    <input
                      className="w-full rounded-xl border-2 border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                      placeholder="Sobre o que você quer falar?"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                    />
                    <RichEditor value={newBody} onChange={setNewBody} />
                    <AttachmentUploader
                      value={newAttachments}
                      onChange={setNewAttachments}
                      disabled={busy}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="rounded-2xl border-2 border-border px-4 py-2 text-sm"
                        onClick={() => setShowNew(false)}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="rounded-2xl bg-primary px-4 py-2 font-bold text-primary-foreground text-sm disabled:opacity-60"
                        onClick={createThread}
                        disabled={busy}
                      >
                        Publicar
                      </button>
                    </div>
                  </div>
                ) : null}

                {threads.length === 0 ? (
                  <div className="rounded-2xl border-2 border-border border-dashed p-6 text-center text-muted-foreground text-sm">
                    {isWall
                      ? 'Os projetos dos criadores vão aparecer aqui! 🎨'
                      : 'Nenhuma conversa ainda. Comece a primeira! ✨'}
                  </div>
                ) : isWall ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {threads.map((t) => (
                      <ShowcaseCard key={t.id} thread={t} onOpen={() => openThread(t)} />
                    ))}
                  </div>
                ) : (
                  threads.map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => openThread(t)}
                      className="w-full rounded-2xl border-2 border-border bg-card p-3 text-left transition-colors hover:border-primary"
                    >
                      <div className="flex items-center gap-2">
                        {t.isPinned ? <Tag>Fixado</Tag> : null}
                        {t.pending ? <Tag>Aguardando ✅</Tag> : null}
                        <span className="truncate font-bold">{t.title}</span>
                      </div>
                      <p className="flex items-center gap-3 text-muted-foreground text-xs">
                        <span>{authorLabel(t)}</span>
                        <span className="inline-flex items-center gap-1">
                          <MessageCircle className="size-3" /> {t.commentCount}
                        </span>
                        <span>{timeAgo(t.lastActivityAt)}</span>
                      </p>
                    </button>
                  ))
                )}
                {threadsHasMore ? (
                  <button
                    type="button"
                    onClick={loadMoreThreads}
                    disabled={loadingMoreThreads}
                    className="w-full rounded-2xl border-2 border-border border-dashed p-2.5 text-center font-bold text-muted-foreground text-sm transition-colors hover:border-primary hover:text-primary disabled:opacity-60"
                  >
                    {loadingMoreThreads
                      ? 'Carregando…'
                      : isWall
                        ? 'Carregar mais projetos'
                        : 'Carregar mais conversas'}
                  </button>
                ) : null}
              </div>
            )}
          </main>
        </div>
      </div>

      <Dialog
        open={reportTarget !== null}
        onClose={() => {
          if (!reportBusy) setReportTarget(null)
        }}
        title="Avisar um professor"
        description="Conta o que aconteceu. Um professor vai dar uma olhada. 💙"
        footer={
          <>
            <Button variant="outline" onClick={() => setReportTarget(null)} disabled={reportBusy}>
              Cancelar
            </Button>
            <Button onClick={submitReport} disabled={reportBusy}>
              Enviar aviso
            </Button>
          </>
        }
      >
        <Textarea
          value={reportReason}
          onChange={(e) => setReportReason(e.target.value)}
          placeholder="O que aconteceu de errado?"
          rows={4}
          maxLength={1000}
        />
      </Dialog>
    </>
  )
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 font-bold text-[10px] text-muted-foreground uppercase">
      {children}
    </span>
  )
}

/** Card de projeto no Mural: capa + título + resumo + autor (1º nome da criança). */
function ShowcaseCard({ thread, onOpen }: { thread: HubThreadView; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full flex-col overflow-hidden rounded-2xl border-2 border-border bg-card text-left transition-colors hover:border-primary"
    >
      <div className="aspect-video w-full overflow-hidden bg-(--kids-cyan-tint)">
        {thread.coverImageUrl ? (
          // biome-ignore lint/performance/noImgElement: capa é URL externa (R2/admin); o Next/Image exigiria allowlist de domínios.
          <img
            src={thread.coverImageUrl}
            alt={thread.title}
            className="size-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="grid size-full place-items-center text-3xl">🎮</div>
        )}
      </div>
      <div className="space-y-1 p-3">
        <p className="truncate font-bold">{thread.title}</p>
        {thread.authorDisplayName ? (
          <p className="text-muted-foreground text-xs">por {thread.authorDisplayName}</p>
        ) : null}
        <p className="line-clamp-2 text-muted-foreground text-sm">{thread.body}</p>
        <p className="flex items-center gap-1 pt-1 text-muted-foreground text-xs">
          <MessageCircle className="size-3" /> {thread.commentCount}
        </p>
      </div>
    </button>
  )
}

function ReactionBar({
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
  const byEmoji = new Map(reactions.map((r) => [r.emoji, r]))
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
            className={`inline-flex items-center gap-1 rounded-full border-2 px-2 py-0.5 text-sm transition-colors ${
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
}

function ThreadDetail({
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
}: {
  thread: HubThreadView
  comments: HubCommentView[]
  busy: boolean
  isWall: boolean
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
  authorLabel: (item: {
    isShowcase?: boolean
    authorDisplayName?: string | null
    authorId: string | null
  }) => string
}) {
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {isWall ? 'Projetos' : 'Conversas'}
      </button>

      <div className="space-y-3 rounded-2xl border-2 border-border bg-card p-4">
        {isWall && thread.coverImageUrl ? (
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-(--kids-cyan-tint)">
            {/* biome-ignore lint/performance/noImgElement: capa é URL externa (R2/admin). */}
            <img src={thread.coverImageUrl} alt={thread.title} className="size-full object-cover" />
          </div>
        ) : null}
        <h2 className="[font-family:var(--font-display)] font-bold text-lg">{thread.title}</h2>
        <p className="text-muted-foreground text-xs">{authorLabel(thread)}</p>
        <div className="lesson-prose">{renderMarkdown(thread.body)}</div>
        <AttachmentList attachments={thread.attachments} />
        <div className="flex items-center justify-between">
          <ReactionBar
            target="threads"
            id={thread.id}
            reactions={thread.reactions}
            onReact={onReact}
          />
          <button
            type="button"
            onClick={() => onReport('threads', thread.id)}
            className="text-muted-foreground text-xs hover:text-foreground"
          >
            Avisar professor
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-bold text-muted-foreground text-sm">
          {comments.length} resposta{comments.length === 1 ? '' : 's'}
        </h3>
        {comments.map((c) => (
          <div key={c.id} className="space-y-2 rounded-2xl border-2 border-border bg-card p-3">
            <p className="text-muted-foreground text-xs">
              {authorLabel(c)}
              {c.pending ? ' · aguardando ✅' : ''}
            </p>
            <div className="lesson-prose">{renderMarkdown(c.body)}</div>
            <AttachmentList attachments={c.attachments} />
            <div className="flex items-center justify-between">
              <ReactionBar target="comments" id={c.id} reactions={c.reactions} onReact={onReact} />
              <button
                type="button"
                onClick={() => onReport('comments', c.id)}
                className="text-muted-foreground text-xs hover:text-foreground"
              >
                Avisar professor
              </button>
            </div>
          </div>
        ))}
        {commentsHasMore ? (
          <button
            type="button"
            onClick={onLoadMoreComments}
            disabled={loadingMoreComments}
            className="w-full rounded-2xl border-2 border-border border-dashed p-2.5 text-center font-bold text-muted-foreground text-sm transition-colors hover:border-primary hover:text-primary disabled:opacity-60"
          >
            {loadingMoreComments ? 'Carregando…' : 'Carregar mais respostas'}
          </button>
        ) : null}
      </div>

      {thread.isLocked ? (
        <div className="rounded-2xl border-2 border-border border-dashed p-3 text-center text-muted-foreground text-sm">
          Esta conversa está fechada para novas respostas.
        </div>
      ) : (
        <div className="space-y-2 rounded-2xl border-2 border-border bg-card p-3">
          <RichEditor value={replyBody} onChange={setReplyBody} compact />
          <AttachmentUploader
            value={replyAttachments}
            onChange={setReplyAttachments}
            disabled={busy}
          />
          <div className="flex justify-end">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-2xl bg-primary px-4 py-2 font-bold text-primary-foreground text-sm disabled:opacity-60"
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
