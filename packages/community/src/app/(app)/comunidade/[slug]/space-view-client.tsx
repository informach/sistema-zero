'use client'

import { AttachmentList } from '@sistemazero/member-shell/components/attachment-list'
import {
  AttachmentUploader,
  type UploadedAttachment,
} from '@sistemazero/member-shell/components/attachment-uploader'
import { RichEditor } from '@sistemazero/member-shell/components/rich-editor'
import { renderMarkdown } from '@sistemazero/member-shell/lib/markdown'
import { Badge } from '@sistemazero/ui/badge'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Input } from '@sistemazero/ui/input'
import { ArrowLeft, Hash, Lock, MessageCircle, Plus, Send } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import type {
  HubChannelView,
  HubCommentView,
  HubPage,
  HubSpaceView,
  HubThreadView,
} from '@/lib/types'

const QUICK_EMOJIS = ['👍', '❤️', '🎉', '😂', '🤔']

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} h`
  return `${Math.floor(h / 24)} d`
}

export function SpaceViewClient({ slug, viewerId }: { slug: string; viewerId: string }) {
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
  const [commentBody, setCommentBody] = useState('')
  const [commentAttachments, setCommentAttachments] = useState<UploadedAttachment[]>([])

  const authorLabel = useCallback(
    (authorId: string | null) => (authorId === viewerId ? 'Você' : 'Membro'),
    [viewerId],
  )

  // ── Carga inicial: servidor + canais ──
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
        if (alive) toast.error((err as ApiError).message ?? 'Não foi possível abrir a comunidade.')
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [slug])

  // ── Ao trocar de canal: carrega tópicos + marca visto ──
  const loadThreads = useCallback(async (channelId: string) => {
    try {
      const page = await apiGet<HubPage<HubThreadView>>(`/api/hub/channels/${channelId}/threads`)
      setThreads(page.items)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha ao carregar os tópicos.')
    }
    apiSend(`/api/hub/channels/${channelId}/seen`, 'POST', {}).catch(() => {})
  }, [])

  useEffect(() => {
    if (!channel) return
    setThread(null)
    setShowNew(false)
    // Visitar o canal zera o badge de novidade localmente (o /seen é persistido
    // dentro de loadThreads); sem isso o ponto azul só sumiria com um reload.
    setChannels((prev) =>
      prev.map((c) => (c.id === channel.id && c.hasUnread ? { ...c, hasUnread: false } : c)),
    )
    void loadThreads(channel.id)
  }, [channel, loadThreads])

  async function openThread(t: HubThreadView) {
    setThread(t)
    setComments([])
    // Rascunho do comentário é POR tópico — não vaza texto/anexos de um tópico
    // para o próximo ao trocar de tópico.
    setCommentBody('')
    setCommentAttachments([])
    try {
      const page = await apiGet<HubPage<HubCommentView>>(`/api/hub/threads/${t.id}/comments`)
      setComments(page.items)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha ao carregar os comentários.')
    }
  }

  async function createThread() {
    if (!channel || !newTitle.trim() || !newBody.trim()) {
      toast.error('Preencha título e mensagem.')
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
        created.pending ? 'Enviado para aprovação de um moderador.' : 'Tópico publicado.',
      )
      setNewTitle('')
      setNewBody('')
      setNewAttachments([])
      setShowNew(false)
      await loadThreads(channel.id)
    } catch (err) {
      const e = err as ApiError
      toast.error(
        e.code === 'POSTING_NOT_ALLOWED'
          ? 'Você não pode publicar neste canal.'
          : e.code === 'USER_MUTED'
            ? 'Você está silenciado neste servidor.'
            : e.code === 'USER_BANNED'
              ? 'Você está banido deste servidor.'
              : (e.message ?? 'Não foi possível publicar.'),
      )
    } finally {
      setBusy(false)
    }
  }

  async function sendComment() {
    if (!thread || !commentBody.trim()) return
    setBusy(true)
    try {
      const created = await apiSend<HubCommentView>(
        `/api/hub/threads/${thread.id}/comments`,
        'POST',
        { body: commentBody.trim(), attachmentIds: commentAttachments.map((a) => a.id) },
      )
      setCommentBody('')
      setCommentAttachments([])
      if (created.pending) {
        toast.success('Comentário enviado para aprovação.')
      }
      const page = await apiGet<HubPage<HubCommentView>>(`/api/hub/threads/${thread.id}/comments`)
      setComments(page.items)
    } catch (err) {
      const e = err as ApiError
      toast.error(
        e.code === 'USER_MUTED'
          ? 'Você está silenciado neste servidor.'
          : e.code === 'USER_BANNED'
            ? 'Você está banido deste servidor.'
            : (e.message ?? 'Não foi possível comentar.'),
      )
    } finally {
      setBusy(false)
    }
  }

  async function react(target: 'threads' | 'comments', id: string, emoji: string, mine: boolean) {
    try {
      if (mine) {
        await apiSend(`/api/hub/${target}/${id}/reactions/${encodeURIComponent(emoji)}`, 'DELETE')
      } else {
        await apiSend(`/api/hub/${target}/${id}/reactions`, 'POST', { emoji })
      }
      if (thread) {
        const [t, page] = await Promise.all([
          apiGet<HubThreadView>(`/api/hub/threads/${thread.id}`),
          apiGet<HubPage<HubCommentView>>(`/api/hub/threads/${thread.id}/comments`),
        ])
        setThread(t)
        setComments(page.items)
      }
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Não foi possível reagir.')
    }
  }

  async function report(target: 'threads' | 'comments', id: string) {
    const reason = window.prompt('Por que está denunciando?')?.trim()
    if (!reason) return
    try {
      await apiSend(`/api/hub/${target}/${id}/report`, 'POST', { reason })
      toast.success('Denúncia enviada. Obrigado!')
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Não foi possível denunciar.')
    }
  }

  if (loading) {
    return <p className="px-4 py-8 text-sm text-muted-foreground">Carregando…</p>
  }
  if (!space) {
    return <p className="px-4 py-8 text-sm text-muted-foreground">Comunidade não encontrada.</p>
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <Link
        href="/comunidade"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Comunidade
      </Link>
      <h1 className="mb-4 text-xl font-bold tracking-tight">{space.name}</h1>

      <div className="grid gap-4 md:grid-cols-[200px_1fr]">
        {/* Canais */}
        <aside className="space-y-1">
          {channels.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => setChannel(c)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                channel?.id === c.id
                  ? 'bg-muted font-semibold text-foreground'
                  : 'text-muted-foreground hover:bg-muted/60'
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
          {channels.length === 0 ? (
            <p className="px-3 text-sm text-muted-foreground">Sem canais ainda.</p>
          ) : null}
        </aside>

        {/* Conteúdo */}
        <main className="min-w-0">
          {thread ? (
            <ThreadDetail
              thread={thread}
              comments={comments}
              busy={busy}
              commentBody={commentBody}
              setCommentBody={setCommentBody}
              commentAttachments={commentAttachments}
              setCommentAttachments={setCommentAttachments}
              onBack={() => setThread(null)}
              onSend={sendComment}
              onReact={react}
              onReport={report}
              authorLabel={authorLabel}
            />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {channel ? channel.topic || `#${channel.slug}` : 'Selecione um canal'}
                </p>
                {channel ? (
                  <Button size="sm" onClick={() => setShowNew((v) => !v)}>
                    <Plus className="size-4" /> Novo tópico
                  </Button>
                ) : null}
              </div>

              {showNew ? (
                <Card className="space-y-2 p-3">
                  <Input
                    placeholder="Título"
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
                    <Button variant="outline" size="sm" onClick={() => setShowNew(false)}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={createThread} disabled={busy}>
                      Publicar
                    </Button>
                  </div>
                </Card>
              ) : null}

              {threads.length === 0 ? (
                <Card className="p-6 text-center text-sm text-muted-foreground">
                  Nenhum tópico ainda. Seja o primeiro a postar!
                </Card>
              ) : (
                threads.map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => openThread(t)}
                    className="w-full text-left"
                  >
                    <Card className="space-y-1 p-3 transition-colors hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                        {t.isPinned ? <Badge variant="muted">Fixado</Badge> : null}
                        {t.pending ? <Badge variant="muted">Aguardando aprovação</Badge> : null}
                        <span className="truncate font-medium">{t.title}</span>
                      </div>
                      <p className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{authorLabel(t.authorId)}</span>
                        <span className="inline-flex items-center gap-1">
                          <MessageCircle className="size-3" /> {t.commentCount}
                        </span>
                        <span>{timeAgo(t.lastActivityAt)}</span>
                      </p>
                    </Card>
                  </button>
                ))
              )}
            </div>
          )}
        </main>
      </div>
    </div>
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
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
              mine ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/60'
            }`}
          >
            <span>{emoji}</span>
            {r && r.count > 0 ? <span>{r.count}</span> : null}
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
  commentBody,
  setCommentBody,
  commentAttachments,
  setCommentAttachments,
  onBack,
  onSend,
  onReact,
  onReport,
  authorLabel,
}: {
  thread: HubThreadView
  comments: HubCommentView[]
  busy: boolean
  commentBody: string
  setCommentBody: (v: string) => void
  commentAttachments: UploadedAttachment[]
  setCommentAttachments: (v: UploadedAttachment[]) => void
  onBack: () => void
  onSend: () => void
  onReact: (target: 'threads' | 'comments', id: string, emoji: string, mine: boolean) => void
  onReport: (target: 'threads' | 'comments', id: string) => void
  authorLabel: (authorId: string | null) => string
}) {
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Tópicos
      </button>

      <Card className="space-y-3 p-4">
        <h2 className="text-lg font-bold">{thread.title}</h2>
        <p className="text-xs text-muted-foreground">{authorLabel(thread.authorId)}</p>
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
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Denunciar
          </button>
        </div>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">
          {comments.length} comentário{comments.length === 1 ? '' : 's'}
        </h3>
        {comments.map((c) => (
          <Card key={c.id} className="space-y-2 p-3">
            <p className="text-xs text-muted-foreground">
              {authorLabel(c.authorId)}
              {c.pending ? ' · aguardando aprovação' : ''}
            </p>
            <div className="lesson-prose">{renderMarkdown(c.body)}</div>
            <AttachmentList attachments={c.attachments} />
            <div className="flex items-center justify-between">
              <ReactionBar target="comments" id={c.id} reactions={c.reactions} onReact={onReact} />
              <button
                type="button"
                onClick={() => onReport('comments', c.id)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Denunciar
              </button>
            </div>
          </Card>
        ))}
      </div>

      {thread.isLocked ? (
        <Card className="p-3 text-center text-sm text-muted-foreground">
          Tópico trancado para novos comentários.
        </Card>
      ) : (
        <Card className="space-y-2 p-3">
          <RichEditor value={commentBody} onChange={setCommentBody} compact />
          <AttachmentUploader
            value={commentAttachments}
            onChange={setCommentAttachments}
            disabled={busy}
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={onSend} disabled={busy || !commentBody.trim()}>
              <Send className="size-4" /> Comentar
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
