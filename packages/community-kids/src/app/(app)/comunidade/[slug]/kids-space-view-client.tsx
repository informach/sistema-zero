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
import Link from 'next/link'
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

// Emojis da allowlist kids (o hub recusa fora dela).
const QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '⭐']

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

export function KidsSpaceViewClient({ slug, viewerId }: { slug: string; viewerId: string }) {
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

  // Paginação por cursor — a Turma pode acumular conversas/respostas além da 1ª página.
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
    (id: string | null) => (id === viewerId ? 'Você' : 'Colega'),
    [viewerId],
  )

  useEffect(() => {
    let alive = true
    Promise.all([
      apiGet<HubSpaceView>(`/api/hub/spaces/${slug}`),
      apiGet<{ items: HubChannelView[] }>(`/api/hub/spaces/${slug}/channels`),
    ])
      .then(([sp, ch]) => {
        if (!alive) return
        setSpace(sp)
        setChannels(ch.items)
        setChannel(ch.items[0] ?? null)
      })
      .catch((err) => {
        if (alive) toast.error((err as ApiError).message ?? 'Não consegui abrir a turma.')
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [slug])

  const loadThreads = useCallback(async (channelId: string) => {
    try {
      const page = await apiGet<HubPage<HubThreadView>>(`/api/hub/channels/${channelId}/threads`)
      setThreads(page.items)
      setThreadsCursor(page.nextCursor)
      setThreadsHasMore(page.hasMore)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha ao carregar as conversas.')
    }
    apiSend(`/api/hub/channels/${channelId}/seen`, 'POST', {}).catch(() => {})
  }, [])

  async function loadMoreThreads() {
    if (!channel || !threadsCursor || loadingMoreThreads) return
    setLoadingMoreThreads(true)
    try {
      const page = await apiGet<HubPage<HubThreadView>>(
        `/api/hub/channels/${channel.id}/threads?cursor=${encodeURIComponent(threadsCursor)}`,
      )
      setThreads((prev) => [...prev, ...page.items])
      setThreadsCursor(page.nextCursor)
      setThreadsHasMore(page.hasMore)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha ao carregar mais conversas.')
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
      const page = await apiGet<HubPage<HubCommentView>>(`/api/hub/threads/${threadId}/comments`)
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
        `/api/hub/threads/${thread.id}/comments?after=${encodeURIComponent(commentsCursor)}`,
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
        `/api/hub/channels/${channel.id}/threads`,
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
        `/api/hub/threads/${thread.id}/comments`,
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
    // (Não recarrega a lista de comentários — preserva o "carregar mais".)
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
        await apiSend(`/api/hub/${target}/${id}/reactions/${encodeURIComponent(emoji)}`, 'DELETE')
      } else {
        await apiSend(`/api/hub/${target}/${id}/reactions`, 'POST', { emoji })
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
      await apiSend(`/api/hub/${reportTarget.target}/${reportTarget.id}/report`, 'POST', { reason })
      toast.success('Avisamos um professor. Obrigado! 💙')
      setReportTarget(null)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Não consegui avisar.')
    } finally {
      setReportBusy(false)
    }
  }

  if (loading) return <p className="px-4 py-8 text-muted-foreground">Carregando…</p>
  if (!space) return <p className="px-4 py-8 text-muted-foreground">Turma não encontrada.</p>

  return (
    <>
      <div className="mx-auto w-full max-w-4xl px-4 py-6">
        <Link
          href="/comunidade"
          className="mb-3 inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Turma
        </Link>
        <h1 className="mb-4 [font-family:var(--font-display)] font-bold text-2xl">{space.name}</h1>

        <div className="grid gap-4 md:grid-cols-[200px_1fr]">
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

          <main className="min-w-0">
            {thread ? (
              <ThreadDetail
                thread={thread}
                comments={comments}
                busy={busy}
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

                {showNew ? (
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
                    Nenhuma conversa ainda. Comece a primeira! ✨
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
                        <span>{authorLabel(t.authorId)}</span>
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
                    {loadingMoreThreads ? 'Carregando…' : 'Carregar mais conversas'}
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
  authorLabel: (id: string | null) => string
}) {
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Conversas
      </button>

      <div className="space-y-3 rounded-2xl border-2 border-border bg-card p-4">
        <h2 className="[font-family:var(--font-display)] font-bold text-lg">{thread.title}</h2>
        <p className="text-muted-foreground text-xs">{authorLabel(thread.authorId)}</p>
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
              {authorLabel(c.authorId)}
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
              disabled={busy || (!replyBody.trim() && replyAttachments.length === 0)}
            >
              <Send className="size-4" /> Responder
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
