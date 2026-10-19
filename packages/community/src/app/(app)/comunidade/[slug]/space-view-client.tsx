'use client'

import { AttachmentList } from '@sistemazero/member-shell/components/attachment-list'
import {
  AttachmentUploader,
  type UploadedAttachment,
} from '@sistemazero/member-shell/components/attachment-uploader'
import { RichEditor } from '@sistemazero/member-shell/components/rich-editor'
import { renderUgcMarkdown } from '@sistemazero/member-shell/lib/markdown'
import type { StudioRemixCapability } from '@sistemazero/member-shell/lib/studio-tier'
import { Input } from '@sistemazero/ui/input'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { ArrowLeft, Flag, Lock, MessageCircle, MessagesSquare, Plus, Send } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { BackLink, PageBand, PageBody } from '@/components/community/page'
import { ShowcaseCard } from '@/components/community/showcase-card'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { cn } from '@/lib/cn'
import type {
  HubChannelView,
  HubCommentView,
  HubPage,
  HubReaction,
  HubSpaceView,
  HubThreadView,
} from '@/lib/types'

const QUICK_EMOJIS = ['👍', '❤️', '🎉', '😂', '🤔']

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `há ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h} ${h === 1 ? 'hora' : 'horas'}`
  const d = Math.floor(h / 24)
  return d === 1 ? 'ontem' : `há ${d} dias`
}

/**
 * Toggle LOCAL (otimista) de uma reação. A API de reação devolve só `{ ok }`,
 * sem a contagem fresca; refetchar a página de comentários a cada clique perderia
 * o que o aluno já trouxe via "Carregar mais".
 */
function toggleReaction(reactions: HubReaction[], emoji: string, wasMine: boolean): HubReaction[] {
  const existing = reactions.find((r) => r.emoji === emoji)
  if (wasMine) {
    if (!existing) return reactions
    const count = existing.count - 1
    return count <= 0
      ? reactions.filter((r) => r.emoji !== emoji)
      : reactions.map((r) => (r.emoji === emoji ? { ...r, count, reactedByMe: false } : r))
  }
  return existing
    ? reactions.map((r) =>
        r.emoji === emoji ? { ...r, count: r.count + 1, reactedByMe: true } : r,
      )
    : [...reactions, { emoji, count: 1, reactedByMe: true }]
}

export function SpaceViewClient({
  slug,
  viewerId,
  showcase = false,
  remixCapability = null,
  showcaseFilter,
  initialChannel = null,
}: {
  slug: string
  viewerId: string
  showcase?: boolean
  remixCapability?: StudioRemixCapability | null
  showcaseFilter?: { sort: 'recent' | 'plays'; challengeKey: string | null }
  /** Slug do canal que abre primeiro (`?canal=`, das linhas de canal da Comunidade). */
  initialChannel?: string | null
}) {
  const [space, setSpace] = useState<HubSpaceView | null>(null)
  const [channels, setChannels] = useState<HubChannelView[]>([])
  const [channel, setChannel] = useState<HubChannelView | null>(null)
  const [threads, setThreads] = useState<HubThreadView[]>([])
  const [threadsCursor, setThreadsCursor] = useState<string | null>(null)
  const [threadsHasMore, setThreadsHasMore] = useState(false)
  const [loadingMoreThreads, setLoadingMoreThreads] = useState(false)
  const [thread, setThread] = useState<HubThreadView | null>(null)
  const [comments, setComments] = useState<HubCommentView[]>([])
  // Comentários criados NESTA sessão — renderizados sempre no fim (são os mais
  // novos; a paginação cresce do mais antigo p/ o mais recente). Mantê-los
  // separados evita que um "Carregar mais" insira páginas DEPOIS do que o aluno
  // acabou de postar (quebraria a ordem cronológica).
  const [newComments, setNewComments] = useState<HubCommentView[]>([])
  const [commentsCursor, setCommentsCursor] = useState<string | null>(null)
  const [commentsHasMore, setCommentsHasMore] = useState(false)
  const [loadingMoreComments, setLoadingMoreComments] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newBody, setNewBody] = useState('')
  const [newAttachments, setNewAttachments] = useState<UploadedAttachment[]>([])
  const [commentBody, setCommentBody] = useState('')
  const [commentAttachments, setCommentAttachments] = useState<UploadedAttachment[]>([])

  const authorLabel = useCallback(
    (authorId: string | null) => (authorId === viewerId ? 'Você' : 'Colega'),
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
        setChannel(
          (showcase
            ? ch.items.find((item) => item.slug === 'parede')
            : (ch.items.find((item) => item.slug === initialChannel) ?? ch.items[0])) ?? null,
        )
      })
      .catch((err) => {
        if (alive) toast.error((err as ApiError).message ?? 'Não foi possível abrir a comunidade.')
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [slug, showcase, initialChannel])

  const threadQuery = new URLSearchParams(
    showcaseFilter
      ? {
          sort: showcaseFilter.sort,
          ...(showcaseFilter.challengeKey ? { challenge: showcaseFilter.challengeKey } : {}),
        }
      : {},
  ).toString()
  // ── Ao trocar de canal: carrega a 1ª página de tópicos + marca visto ──
  const loadThreads = useCallback(
    async (channelId: string) => {
      try {
        const page = await apiGet<HubPage<HubThreadView>>(
          `/api/hub/channels/${channelId}/threads${threadQuery ? `?${threadQuery}` : ''}`,
        )
        setThreads(page.items)
        setThreadsCursor(page.nextCursor)
        setThreadsHasMore(page.hasMore)
      } catch (err) {
        toast.error((err as ApiError).message ?? 'Falha ao carregar os tópicos.')
      }
      apiSend(`/api/hub/channels/${channelId}/seen`, 'POST', {}).catch(() => {})
    },
    [threadQuery],
  )

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

  // No celular os canais rolam de lado: o canal aberto (inclusive o que veio por `?canal=`) precisa
  // estar à vista, e não escondido depois da borda.
  const channelNav = useRef<HTMLElement>(null)
  const activeChannelId = channel?.id
  useEffect(() => {
    const nav = channelNav.current
    if (loading || !nav || !activeChannelId || nav.scrollWidth <= nav.clientWidth) return
    const active = nav.querySelector<HTMLElement>('[aria-current="true"]')
    if (active) nav.scrollLeft = Math.max(0, active.offsetLeft - 8)
  }, [loading, activeChannelId])

  async function loadMoreThreads() {
    if (!channel || !threadsCursor || loadingMoreThreads) return
    setLoadingMoreThreads(true)
    try {
      const page = await apiGet<HubPage<HubThreadView>>(
        `/api/hub/channels/${channel.id}/threads?cursor=${encodeURIComponent(threadsCursor)}${threadQuery ? `&${threadQuery}` : ''}`,
      )
      setThreads((prev) => {
        const seen = new Set(prev.map((t) => t.id))
        return [...prev, ...page.items.filter((t) => !seen.has(t.id))]
      })
      setThreadsCursor(page.nextCursor)
      setThreadsHasMore(page.hasMore)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha ao carregar mais tópicos.')
    } finally {
      setLoadingMoreThreads(false)
    }
  }

  /**
   * O botão que abriu a conversa ou o formulário. Do `xl` para baixo a lista some (CSS) quando um
   * deles abre: ao voltar, o foco precisa retornar a ele, senão cai no início da página.
   */
  const opener = useRef<HTMLElement | null>(null)
  function rememberOpener() {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
  }
  function restoreOpener() {
    requestAnimationFrame(() => {
      if (opener.current?.isConnected) opener.current.focus()
    })
  }

  // O formulário abre com o foco no título (no celular ele ocupa o lugar da lista).
  useEffect(() => {
    if (showNew) document.getElementById('novo-topico-titulo')?.focus()
  }, [showNew])

  async function openThread(t: HubThreadView) {
    rememberOpener()
    setThread(t)
    setShowNew(false)
    setComments([])
    setNewComments([])
    setCommentsCursor(null)
    setCommentsHasMore(false)
    // Rascunho do comentário é POR tópico — não vaza texto/anexos de um tópico
    // para o próximo ao trocar de tópico.
    setCommentBody('')
    setCommentAttachments([])
    try {
      const page = await apiGet<HubPage<HubCommentView>>(`/api/hub/threads/${t.id}/comments`)
      setComments(page.items)
      setCommentsCursor(page.nextCursor)
      setCommentsHasMore(page.hasMore)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha ao carregar os comentários.')
    }
  }

  async function loadMoreComments() {
    if (!thread || !commentsCursor || loadingMoreComments) return
    setLoadingMoreComments(true)
    try {
      const page = await apiGet<HubPage<HubCommentView>>(
        `/api/hub/threads/${thread.id}/comments?after=${encodeURIComponent(commentsCursor)}`,
      )
      setComments((prev) => {
        // Filtra o que já está na lista OU já foi postado nesta sessão (a última
        // página acaba devolvendo o comentário recém-criado).
        const seen = new Set([...prev, ...newComments].map((c) => c.id))
        return [...prev, ...page.items.filter((c) => !seen.has(c.id))]
      })
      setCommentsCursor(page.nextCursor)
      setCommentsHasMore(page.hasMore)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha ao carregar mais comentários.')
    } finally {
      setLoadingMoreComments(false)
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
      // Recarrega a 1ª página: o tópico novo sobe ao topo (ordenação por atividade).
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
      // Mostra o comentário no fim sem refetchar — preserva as páginas já trazidas.
      setNewComments((prev) => (prev.some((c) => c.id === created.id) ? prev : [...prev, created]))
      if (created.pending) {
        toast.success('Comentário enviado para aprovação.')
      }
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

  // Atualização OTIMISTA local da reação (preserva a paginação — ver toggleReaction).
  function applyReaction(
    target: 'threads' | 'comments',
    id: string,
    emoji: string,
    wasMine: boolean,
  ) {
    if (target === 'threads') {
      setThread((prev) =>
        prev && prev.id === id
          ? { ...prev, reactions: toggleReaction(prev.reactions, emoji, wasMine) }
          : prev,
      )
      return
    }
    const patch = (c: HubCommentView) =>
      c.id === id ? { ...c, reactions: toggleReaction(c.reactions, emoji, wasMine) } : c
    setComments((prev) => prev.map(patch))
    setNewComments((prev) => prev.map(patch))
  }

  async function react(target: 'threads' | 'comments', id: string, emoji: string, mine: boolean) {
    applyReaction(target, id, emoji, mine)
    try {
      if (mine) {
        await apiSend(`/api/hub/${target}/${id}/reactions/${encodeURIComponent(emoji)}`, 'DELETE')
      } else {
        await apiSend(`/api/hub/${target}/${id}/reactions`, 'POST', { emoji })
      }
    } catch (err) {
      applyReaction(target, id, emoji, !mine) // reverte o otimismo
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

  if (loading) return showcase ? <ShowcaseSkeleton /> : <SpaceViewSkeleton />
  if (!space) {
    if (showcase)
      return <p className="sz-card p-6 text-muted-foreground">Comunidade não encontrada.</p>
    return (
      <PageBody className="gap-6">
        <BackLink href="/comunidade" label="Comunidade" />
        <p className="sz-card p-6 text-muted-foreground">Comunidade não encontrada.</p>
      </PageBody>
    )
  }

  const detail = thread ? (
    <ThreadDetail
      key={thread.id}
      thread={thread}
      comments={comments}
      newComments={newComments}
      hasMoreComments={commentsHasMore}
      loadingMoreComments={loadingMoreComments}
      onLoadMoreComments={loadMoreComments}
      busy={busy}
      commentBody={commentBody}
      setCommentBody={setCommentBody}
      commentAttachments={commentAttachments}
      setCommentAttachments={setCommentAttachments}
      onBack={() => {
        setThread(null)
        restoreOpener()
      }}
      backLabel={showcase ? 'Voltar aos jogos' : 'Tópicos'}
      paned={!showcase}
      onSend={sendComment}
      onReact={react}
      onReport={report}
      authorLabel={authorLabel}
    />
  ) : null

  // ── A Mostra: a grade de jogos; "Comentários e reações" abre a conversa no lugar da grade ──
  if (showcase) {
    if (detail) return <div className="mx-auto w-full max-w-[46rem]">{detail}</div>
    return (
      <>
        {threads.length === 0 ? (
          <p className="sz-card p-6 text-center text-muted-foreground">
            {showcaseFilter?.challengeKey
              ? 'Nenhum jogo no desafio deste mês ainda. Publique o seu pelo Estúdio.'
              : 'Nenhum jogo na Mostra ainda. Publique o seu pelo Estúdio.'}
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {threads.map((t) =>
              t.isShowcase ? (
                <ShowcaseCard
                  key={t.id}
                  thread={t}
                  viewerId={viewerId}
                  onOpen={() => void openThread(t)}
                  capability={space.canInteract ? remixCapability : null}
                />
              ) : (
                <TopicCard
                  key={t.id}
                  thread={t}
                  selected={false}
                  author={t.authorDisplayName ?? authorLabel(t.authorId)}
                  onOpen={() => void openThread(t)}
                />
              ),
            )}
          </div>
        )}
        {threadsHasMore ? (
          <button
            type="button"
            onClick={loadMoreThreads}
            disabled={loadingMoreThreads}
            className="sz-btn-outline self-center"
          >
            {loadingMoreThreads ? 'Carregando…' : 'Carregar mais jogos'}
          </button>
        ) : null}
      </>
    )
  }

  // ── O fórum: canais, tópicos e conversa lado a lado no computador; um de cada vez no celular ──
  const paneOpen = Boolean(thread) || showNew
  return (
    <>
      <PageBand
        compact
        back={{ href: '/comunidade', label: 'Comunidade' }}
        title={space.name}
        lead={space.description ?? undefined}
      />
      <PageBody className="pt-7">
        <div className="grid items-start gap-5 lg:grid-cols-[14rem_minmax(0,1fr)] xl:grid-cols-[14rem_20rem_minmax(0,1fr)]">
          <nav
            ref={channelNav}
            aria-label="Canais"
            className="sz-card-sm scrollbar-subtle relative flex gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-visible"
          >
            <span className="hidden px-3 py-2 font-mono text-[0.85rem] text-muted-foreground lg:block">
              Canais
            </span>
            {channels.map((c) => {
              const active = channel?.id === c.id
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setChannel(c)}
                  aria-current={active ? 'true' : undefined}
                  className={cn(
                    'flex min-h-[2.6rem] flex-none items-center gap-2.5 whitespace-nowrap rounded-[0.6rem] px-3 text-left transition-colors lg:w-full lg:whitespace-normal',
                    active
                      ? 'bg-(--acao-tint) font-bold text-(--acao-texto)'
                      : 'text-foreground hover:bg-muted',
                  )}
                >
                  {c.postingPolicy === 'staff_only' ? (
                    <Lock aria-hidden className="size-[1.1rem] flex-none text-muted-foreground" />
                  ) : (
                    <span aria-hidden className="w-[1.1rem] flex-none text-center font-bold">
                      #
                    </span>
                  )}
                  <span className="min-w-0 lg:flex-1">{c.name}</span>
                  {c.hasUnread ? (
                    <span className="size-2.5 flex-none rounded-full bg-primary">
                      <span className="sr-only">com novidades</span>
                    </span>
                  ) : null}
                </button>
              )
            })}
            {channels.length === 0 ? (
              <p className="px-3 py-2 text-muted-foreground">Sem canais ainda.</p>
            ) : null}
          </nav>

          <section
            aria-label="Tópicos do canal"
            className={cn('flex min-w-0 flex-col gap-3', paneOpen && 'hidden xl:flex')}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="min-w-0 flex-1 text-[0.85rem] text-muted-foreground">
                {channel ? channel.topic || `#${channel.slug}` : 'Selecione um canal'}
              </p>
              {channel ? (
                <button
                  type="button"
                  onClick={() => {
                    rememberOpener()
                    setThread(null)
                    setShowNew((v) => !v)
                  }}
                  aria-expanded={showNew}
                  className="sz-btn sz-btn-sm"
                >
                  <Plus aria-hidden /> Novo tópico
                </button>
              ) : null}
            </div>

            {threads.length === 0 ? (
              <p className="sz-card-sm p-5 text-center text-muted-foreground">
                Nenhum tópico ainda. Seja o primeiro a postar!
              </p>
            ) : (
              <>
                {threads.map((t) =>
                  t.isShowcase ? (
                    <ShowcaseCard
                      key={t.id}
                      thread={t}
                      viewerId={viewerId}
                      onOpen={() => void openThread(t)}
                      capability={space.canInteract ? remixCapability : null}
                    />
                  ) : (
                    <TopicCard
                      key={t.id}
                      thread={t}
                      selected={thread?.id === t.id}
                      author={t.authorDisplayName ?? authorLabel(t.authorId)}
                      onOpen={() => void openThread(t)}
                    />
                  ),
                )}
                {threadsHasMore ? (
                  <button
                    type="button"
                    onClick={loadMoreThreads}
                    disabled={loadingMoreThreads}
                    className="sz-btn-outline sz-btn-sm self-center"
                  >
                    {loadingMoreThreads ? 'Carregando…' : 'Carregar mais'}
                  </button>
                ) : null}
              </>
            )}
          </section>

          {showNew ? (
            <section
              aria-labelledby="novo-topico"
              className="sz-card flex min-w-0 flex-col gap-4 p-5 md:p-7"
            >
              <h2 id="novo-topico" className="sz-h3">
                Novo tópico{channel ? ` em ${channel.name}` : ''}
              </h2>
              <Input
                id="novo-topico-titulo"
                placeholder="Título"
                aria-label="Título"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <RichEditor value={newBody} onChange={setNewBody} ariaLabel="Mensagem da conversa" />
              <AttachmentUploader
                value={newAttachments}
                onChange={setNewAttachments}
                disabled={busy}
              />
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  className="sz-btn-quiet"
                  onClick={() => {
                    setShowNew(false)
                    restoreOpener()
                  }}
                >
                  Cancelar
                </button>
                <button type="button" className="sz-btn" onClick={createThread} disabled={busy}>
                  Publicar
                </button>
              </div>
            </section>
          ) : (
            (detail ?? (
              <div className="sz-card hidden min-w-0 flex-col items-center gap-3 p-10 text-center text-muted-foreground xl:flex">
                <MessagesSquare aria-hidden className="size-[2.2rem]" />
                <p>Escolha um tópico para ler a conversa e comentar.</p>
              </div>
            ))
          )}
        </div>
      </PageBody>
    </>
  )
}

/** Um tópico na lista do canal: selos, título, autor, comentários e última atividade. */
function TopicCard({
  thread,
  selected,
  author,
  onOpen,
}: {
  thread: HubThreadView
  selected: boolean
  author: string
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'sz-card-sm flex w-full flex-col items-start gap-1.5 p-4 text-left transition-colors hover:border-(--link)',
        selected && 'border-primary shadow-[0_0_0_2px_var(--primary)]',
      )}
    >
      {thread.isPinned || thread.pending ? (
        <span className="flex flex-wrap gap-2">
          {thread.isPinned ? <span className="sz-chip">Fixado</span> : null}
          {thread.pending ? (
            <span className="sz-chip sz-chip-aviso">Aguardando aprovação</span>
          ) : null}
        </span>
      ) : null}
      <strong>{thread.title}</strong>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.85rem] text-muted-foreground">
        <span>{author}</span>
        <span className="inline-flex items-center gap-1">
          <MessageCircle aria-hidden className="size-4" />
          {thread.commentCount}
          <span className="sr-only">
            {thread.commentCount === 1 ? 'comentário' : 'comentários'}
          </span>
        </span>
        <span>{timeAgo(thread.lastActivityAt)}</span>
      </span>
    </button>
  )
}

/** A inicial de quem escreveu, na cor de ação para "Você". O Hub adulto não manda foto. */
function AuthorAvatar({ label, own }: { label: string; own: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex size-[2.2rem] flex-none select-none items-center justify-center rounded-full font-bold text-[0.85rem]',
        own ? 'bg-primary text-primary-foreground' : 'bg-(--topo) text-(--sz-community-on-action)',
      )}
    >
      {label.trim().charAt(0).toUpperCase() || 'C'}
    </span>
  )
}

// Chaves estáveis dos placeholders do esqueleto.
const SK_CHANNEL_KEYS = ['c1', 'c2', 'c3', 'c4']
const SK_THREAD_KEYS = ['t1', 't2', 't3', 't4', 't5']
const SK_GAME_KEYS = ['g1', 'g2', 'g3']

/**
 * Esqueleto da carga INICIAL da comunidade (no lugar de "Carregando…"): espelha o
 * layout — faixa, canais na lateral e lista de conversas. `aria-busy` + sr-only.
 */
function SpaceViewSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Carregando…</span>
      <section className="sz-band">
        <div className="sz-page flex flex-col gap-3 py-7">
          <Skeleton className="h-[1.2rem] w-32" />
          <Skeleton className="h-[2.2rem] w-72 max-w-full" />
        </div>
      </section>
      <div className="sz-page grid items-start gap-5 pt-7 pb-16 lg:grid-cols-[14rem_minmax(0,1fr)] xl:grid-cols-[14rem_20rem_minmax(0,1fr)]">
        <div className="flex gap-1 overflow-hidden lg:flex-col">
          {SK_CHANNEL_KEYS.map((k) => (
            <Skeleton key={k} className="h-[2.6rem] w-32 rounded-[0.6rem] lg:w-full" />
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {SK_THREAD_KEYS.map((k) => (
            <div key={k} className="sz-card-sm flex flex-col gap-2 p-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
        <Skeleton className="hidden h-[20rem] rounded-[1.2rem] xl:block" />
      </div>
    </div>
  )
}

/** Esqueleto da grade da Mostra: três cartões de jogo. */
function ShowcaseSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <span className="sr-only">Carregando…</span>
      {SK_GAME_KEYS.map((k) => (
        <div key={k} className="sz-card flex flex-col overflow-hidden">
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="flex flex-col gap-2 p-5">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="mt-3 h-[2.8rem] w-full" />
          </div>
        </div>
      ))}
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
    <div className="flex flex-wrap items-center gap-1.5">
      {QUICK_EMOJIS.map((emoji) => {
        const r = byEmoji.get(emoji)
        const mine = r?.reactedByMe ?? false
        return (
          <button
            type="button"
            key={emoji}
            aria-pressed={mine}
            onClick={() => onReact(target, id, emoji, mine)}
            className={cn(
              'inline-flex min-h-[2.4rem] min-w-[2.4rem] items-center justify-center gap-1 rounded-full border-2 px-2.5 text-[0.9rem] transition-colors',
              mine ? 'border-primary bg-(--acao-tint)' : 'border-border bg-card hover:bg-muted',
            )}
          >
            <span>{emoji}</span>
            {r && r.count > 0 ? <span>{r.count}</span> : null}
          </button>
        )
      })}
    </div>
  )
}

function ReportButton({ onClick, compact = false }: { onClick: () => void; compact?: boolean }) {
  if (compact)
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="Denunciar"
        title="Denunciar"
        className="inline-flex size-[2.4rem] flex-none items-center justify-center rounded-[0.6rem] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Flag aria-hidden className="size-[1.1rem]" />
      </button>
    )
  return (
    <button
      type="button"
      onClick={onClick}
      className="sz-btn-quiet sz-btn-sm bg-transparent px-2.5 text-muted-foreground"
    >
      <Flag aria-hidden />
      Denunciar
    </button>
  )
}

function CommentCard({
  comment,
  authorLabel,
  onReact,
  onReport,
}: {
  comment: HubCommentView
  authorLabel: (authorId: string | null) => string
  onReact: (target: 'threads' | 'comments', id: string, emoji: string, mine: boolean) => void
  onReport: (target: 'threads' | 'comments', id: string) => void
}) {
  const author = comment.authorDisplayName ?? authorLabel(comment.authorId)
  return (
    <div className="flex gap-3">
      <AuthorAvatar label={author} own={authorLabel(comment.authorId) === 'Você'} />
      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col gap-1.5 rounded-[0.8rem] px-4 py-3',
          comment.pending ? 'border-2 border-border border-dashed' : 'bg-background',
        )}
      >
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.85rem]">
          <strong>{author}</strong>
          <span className="text-muted-foreground">{timeAgo(comment.createdAt)}</span>
          {comment.pending ? (
            <span className="sz-chip sz-chip-aviso">Aguardando aprovação</span>
          ) : null}
        </p>
        <div className="lesson-prose">{renderUgcMarkdown(comment.body)}</div>
        <AttachmentList attachments={comment.attachments} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ReactionBar
            target="comments"
            id={comment.id}
            reactions={comment.reactions}
            onReact={onReact}
          />
          <ReportButton compact onClick={() => onReport('comments', comment.id)} />
        </div>
      </div>
    </div>
  )
}

function ThreadDetail({
  thread,
  comments,
  newComments,
  hasMoreComments,
  loadingMoreComments,
  onLoadMoreComments,
  busy,
  commentBody,
  setCommentBody,
  commentAttachments,
  setCommentAttachments,
  onBack,
  backLabel,
  paned,
  onSend,
  onReact,
  onReport,
  authorLabel,
}: {
  thread: HubThreadView
  comments: HubCommentView[]
  newComments: HubCommentView[]
  hasMoreComments: boolean
  loadingMoreComments: boolean
  onLoadMoreComments: () => void
  busy: boolean
  commentBody: string
  setCommentBody: (v: string) => void
  commentAttachments: UploadedAttachment[]
  setCommentAttachments: (v: UploadedAttachment[]) => void
  onBack: () => void
  backLabel: string
  /** No fórum, a conversa é a terceira coluna no computador (e fica presa ao rolar). */
  paned: boolean
  onSend: () => void
  onReact: (target: 'threads' | 'comments', id: string, emoji: string, mine: boolean) => void
  onReport: (target: 'threads' | 'comments', id: string) => void
  authorLabel: (authorId: string | null) => string
}) {
  const total = comments.length + newComments.length
  const author = thread.authorDisplayName ?? authorLabel(thread.authorId)
  const ref = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  // Uma coisa por vez (celular, ou a Mostra): a conversa abre no lugar da lista e o topo dela
  // precisa aparecer, senão a pessoa fica no meio da página onde estava a lista. O foco vem para o
  // título, porque o botão que abriu sumiu com a lista. A `key` do tópico remonta o componente a
  // cada conversa aberta.
  useEffect(() => {
    const el = ref.current
    if (!el || (paned && window.matchMedia('(min-width: 80rem)').matches)) return
    if (el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start' })
    titleRef.current?.focus({ preventScroll: true })
  }, [paned])
  return (
    <article
      ref={ref}
      aria-label="Conversa aberta"
      className={cn(
        'sz-card flex min-w-0 scroll-mt-[8rem] flex-col gap-5 p-5 md:p-7',
        paned &&
          'xl:sticky xl:top-[5rem] xl:max-h-[calc(100dvh-6rem)] xl:overflow-y-auto xl:overscroll-contain',
      )}
    >
      <button
        type="button"
        onClick={onBack}
        className={cn(
          'inline-flex min-h-[2.4rem] items-center gap-2 self-start font-bold text-foreground hover:text-(--link)',
          paned && 'xl:hidden',
        )}
      >
        <ArrowLeft aria-hidden className="size-5" /> {backLabel}
      </button>

      <header className="flex flex-col gap-2.5">
        <h2 ref={titleRef} tabIndex={-1} className="sz-h2 focus-visible:outline-none">
          {thread.title}
        </h2>
        <div className="flex items-center gap-3">
          <AuthorAvatar label={author} own={authorLabel(thread.authorId) === 'Você'} />
          <span className="flex flex-col">
            <strong>{author}</strong>
            <span className="text-[0.85rem] text-muted-foreground">
              {timeAgo(thread.createdAt)}
            </span>
          </span>
        </div>
      </header>
      <div className="lesson-prose">{renderUgcMarkdown(thread.body)}</div>
      <AttachmentList attachments={thread.attachments} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ReactionBar
          target="threads"
          id={thread.id}
          reactions={thread.reactions}
          onReact={onReact}
        />
        <ReportButton onClick={() => onReport('threads', thread.id)} />
      </div>

      <section
        aria-label="Comentários"
        className="flex flex-col gap-3.5 border-border border-t pt-5"
      >
        <h3 className="sz-h4">
          {total} comentário{total === 1 ? '' : 's'}
        </h3>
        {comments.map((c) => (
          <CommentCard
            key={c.id}
            comment={c}
            authorLabel={authorLabel}
            onReact={onReact}
            onReport={onReport}
          />
        ))}
        {hasMoreComments ? (
          <button
            type="button"
            onClick={onLoadMoreComments}
            disabled={loadingMoreComments}
            className="sz-btn-outline sz-btn-sm self-center"
          >
            {loadingMoreComments ? 'Carregando…' : 'Carregar mais comentários'}
          </button>
        ) : null}
        {newComments.map((c) => (
          <CommentCard
            key={c.id}
            comment={c}
            authorLabel={authorLabel}
            onReact={onReact}
            onReport={onReport}
          />
        ))}
      </section>

      {thread.isLocked ? (
        <p className="sz-soft p-4 text-center text-muted-foreground">
          Tópico trancado para novos comentários.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          <p className="sz-label">Escreva um comentário</p>
          <RichEditor
            value={commentBody}
            onChange={setCommentBody}
            ariaLabel="Comentário"
            compact
          />
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex-1 basis-[11rem]">
              <AttachmentUploader
                value={commentAttachments}
                onChange={setCommentAttachments}
                disabled={busy}
              />
            </div>
            <button
              type="button"
              className="sz-btn ml-auto"
              onClick={onSend}
              disabled={busy || !commentBody.trim()}
            >
              <Send aria-hidden /> Comentar
            </button>
          </div>
        </div>
      )}
    </article>
  )
}
