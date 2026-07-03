'use client'

import { AttachmentList } from '@sistemazero/member-shell/components/attachment-list'
import {
  AttachmentUploader,
  type UploadedAttachment,
} from '@sistemazero/member-shell/components/attachment-uploader'
import { RichEditor } from '@sistemazero/member-shell/components/rich-editor'
import { renderUgcMarkdown } from '@sistemazero/member-shell/lib/markdown'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Textarea } from '@sistemazero/ui/textarea'
import {
  ArrowLeft,
  Copy,
  Flag,
  Gamepad2,
  Hammer,
  Hash,
  Lock,
  MessageCircle,
  Play,
  Plus,
  QrCode,
  Send,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { memo, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { KidsAccessUnavailable } from '@/components/kids/kids-access-unavailable'
import { KidsSpaceSkeleton } from '@/components/kids/kids-space-skeleton'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import type {
  HubChannelView,
  HubCommentView,
  HubPage,
  HubReaction,
  HubSpaceView,
  HubThreadView,
} from '@/lib/types'
import { GameCardDialog } from './game-card-dialog'
import { KidsLockedSpace } from './kids-locked-space'
import { pickInitialChannel } from './space-channel'

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

/** Item com a identidade redigida do autor (do BFF) p/ o rótulo/link. */
interface AuthorItem {
  isShowcase?: boolean
  authorDisplayName?: string | null
  authorId: string | null
  /** Id do perfil p/ o link público — presente só quando o autor é PÚBLICO (opt-in dos pais). */
  authorProfileId?: string | null
}

/**
 * Rótulo do autor para EXIBIÇÃO: "Você" (próprio), o nome CLICÁVEL → perfil público
 * (`/crianca/[id]`) quando o autor é público, ou texto simples. No fórum, autor
 * não-público vira "Colega"; na vitrine (Mural) o nome aparece sempre ("por …").
 */
function displayAuthor(item: AuthorItem, viewerId: string): ReactNode {
  if (item.authorId === viewerId) return 'Você'
  const name = item.authorDisplayName
  if (item.authorProfileId && name) {
    const text = item.isShowcase ? `por ${name}` : name
    return (
      <Link
        href={`/crianca/${encodeURIComponent(item.authorProfileId)}`}
        className="font-semibold text-primary transition-colors hover:text-foreground hover:underline"
      >
        {text}
      </Link>
    )
  }
  if (item.isShowcase && name) return `por ${name}`
  return 'Colega'
}

/**
 * Versão TEXTO (sem link) para contextos que já são `<button>` (lista de tópicos,
 * card do Mural) — âncora não pode aninhar em button. Autor público mostra o nome;
 * senão "Colega". O nome vira link DENTRO do post aberto (`displayAuthor`).
 */
function authorText(item: AuthorItem, viewerId: string): string {
  if (item.authorId === viewerId) return 'Você'
  if (item.authorProfileId && item.authorDisplayName) return item.authorDisplayName
  return 'Colega'
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
  lockedView,
  unavailableTitle,
  canRemix = false,
  challenge = null,
}: {
  slug: string
  viewerId: string
  mode?: SpaceViewMode
  /**
   * A criança POSSUI o Estúdio Completo → o card do Mural ganha "Fazer a minha
   * versão" (remix: importa o snapshot público como projeto novo no /estudio).
   * Produto vendido à parte: sem posse o botão nem renderiza.
   */
  canRemix?: boolean
  /**
   * DESAFIO do mês: no Mural (wall), os posts com `challengeKey` do mês corrente
   * ganham uma PRATELEIRA no topo da grade. Visível a quem vê o Mural (ver não
   * exige posse; participar sim — o gate é no publish).
   */
  challenge?: { key: string; title: string; emoji: string } | null
  /**
   * Tela de "sem acesso" customizada (ex.: `KidsLockedClube`/`KidsLockedMural`),
   * mostrada quando o servidor vem BLOQUEADO (teaser do hub). Ausente → recado
   * genérico `KidsLockedSpace`. O ACESSO é decidido SÓ pelo "Quem vê" do hub —
   * isto é só a apresentação do bloqueio.
   */
  lockedView?: ReactNode
  /**
   * Título da tela "não consegui verificar o acesso agora" (falha transitória do
   * hub/members). A tela é montada AQUI (client) com um retry REAL — re-roda o
   * fetch — porque a decisão "indisponível" é estado deste componente e um
   * `router.refresh()` não re-dispararia a carga. Ausente → recado genérico.
   */
  unavailableTitle?: string
}) {
  const isWall = mode === 'wall'
  const [space, setSpace] = useState<HubSpaceView | null>(null)
  const [channels, setChannels] = useState<HubChannelView[]>([])
  const [channel, setChannel] = useState<HubChannelView | null>(null)
  const [threads, setThreads] = useState<HubThreadView[]>([])
  // Prateleira do Desafio do mês: busca DEDICADA (`?challenge=<key>`) → TODAS as
  // entradas do mês, independente da paginação da grade. Best-effort (falha/vazio →
  // cai no filtro client-side das threads já carregadas).
  const [challengeThreads, setChallengeThreads] = useState<HubThreadView[]>([])
  const [thread, setThread] = useState<HubThreadView | null>(null)
  const [comments, setComments] = useState<HubCommentView[]>([])
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)
  // Sem acesso (403): servidor sem teaser → o hub 403a em vez de devolver o teaser
  // `locked`. Tratamos como bloqueado (tela "ainda não liberado"), não como erro.
  const [forbidden, setForbidden] = useState(false)
  // Bump p/ re-rodar a carga do espaço (retry da tela de indisponível).
  const [reloadNonce, setReloadNonce] = useState(0)
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

  // Refs espelham o estado p/ os callbacks de reação/denúncia ficarem com
  // IDENTIDADE ESTÁVEL (deps vazias) — sem isso, um toque numa reação re-renderiza
  // TODA a thread (cada comentário re-parseia o markdown). Com `react` estável +
  // `CommentRow` memoizado, só o item tocado re-renderiza. Lidos só em handlers
  // assíncronos (nunca durante o render), então a escrita em render é segura.
  const threadRef = useRef(thread)
  const commentsRef = useRef(comments)
  const commentRequestRef = useRef(0)
  threadRef.current = thread
  commentsRef.current = comments

  const authorLabel = useCallback(
    (item: AuthorItem): ReactNode => displayAuthor(item, viewerId),
    [viewerId],
  )

  // Remix ("Fazer a minha versão"): baixa o snapshot PÚBLICO do jogo e o importa
  // como projeto NOVO no namespace do PERFIL (mesma lista do /estudio). Client-side
  // de ponta a ponta — o snapshot é imutável, o remix nunca toca o post original.
  const router = useRouter()
  const remixBusyRef = useRef(false)
  const handleRemix = useCallback(
    async (t: HubThreadView) => {
      if (!t.playId || remixBusyRef.current) return
      remixBusyRef.current = true
      try {
        const res = await fetch(`/api/studio/play/${enc(t.playId)}`)
        if (!res.ok) throw new Error('play indisponível')
        const snapshot: unknown = await res.json()
        const studio = await import('@sistemazero/studio')
        studio.setStudioStorageNamespace(viewerId)
        await studio.importProjectSnapshot(snapshot, { name: `Remix de ${t.title}` })
        toast.success('Sua versão foi criada! Abrindo o Estúdio... 🎮')
        router.push('/estudio')
      } catch {
        toast.error('Não consegui criar a sua versão agora. Tente de novo!')
      } finally {
        remixBusyRef.current = false
      }
    },
    [viewerId, router],
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: `reloadNonce` é só o gatilho do retry — bump força a re-carga sem ser lido no corpo.
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setUnavailable(false)
        setForbidden(false)
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
        setChannel(pickInitialChannel(ch.items, mode))
      } catch (err) {
        if (!alive) return
        const e = err as ApiError
        if (e.code === 'ACCESS_UNAVAILABLE' || e.status === 503) {
          setUnavailable(true)
          return
        }
        // SEM ACESSO (403): o servidor existe mas a criança não tem o produto. Mostra a
        // tela "ainda não liberado" (lockedView), NÃO um toast de erro. Acontece quando o
        // servidor está SEM teaser (o hub 403a em vez de devolver o teaser `locked`) — ex.:
        // servidor criado pelo admin (teaserWhenLocked nasce false). Os servidores kids são
        // itens FIXOS do menu, então não há existência a esconder.
        if (e.code === 'ACCESS_DENIED' || e.status === 403) {
          setForbidden(true)
          return
        }
        toast.error(e.message ?? 'Não consegui abrir este espaço.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [slug, mode, reloadNonce])

  // Retry da tela de indisponível: re-roda a carga (volta ao skeleton e refaz o
  // fetch). `router.refresh()` não serviria — preserva o estado deste client.
  const retryLoad = useCallback(() => {
    setUnavailable(false)
    setLoading(true)
    setReloadNonce((n) => n + 1)
  }, [])

  // `isCurrent` evita a corrida de troca de canal: clicar A→B deixa os dois fetches
  // em voo; sem a guarda, se A resolve por último, as threads de A renderizam sob B.
  const loadThreads = useCallback(async (channelId: string, isCurrent?: () => boolean) => {
    try {
      const page = await apiGet<HubPage<HubThreadView>>(
        `/api/hub/channels/${enc(channelId)}/threads`,
      )
      if (isCurrent && !isCurrent()) return
      setThreads(page.items)
      setThreadsCursor(page.nextCursor)
      setThreadsHasMore(page.hasMore)
      // Marca como visto só depois de uma carga bem-sucedida.
      apiSend(`/api/hub/channels/${enc(channelId)}/seen`, 'POST', {}).catch(() => {})
      setChannels((prev) => prev.map((c) => (c.id === channelId ? { ...c, hasUnread: false } : c)))
    } catch (err) {
      if (isCurrent && !isCurrent()) return
      toast.error((err as ApiError).message ?? 'Falha ao carregar.')
    }
  }, [])

  // Busca DEDICADA da prateleira do Desafio: `?challenge=<key>` faz o hub devolver SÓ
  // os posts do mês (independente da paginação da grade). Best-effort — sem toast: se
  // falhar, o render cai no filtro client-side das threads carregadas.
  const challengeKey = challenge?.key ?? null
  const loadChallengeShelf = useCallback(
    async (channelId: string, isCurrent?: () => boolean) => {
      if (!isWall || !challengeKey) return
      try {
        const page = await apiGet<HubPage<HubThreadView>>(
          `/api/hub/channels/${enc(channelId)}/threads?challenge=${enc(challengeKey)}`,
        )
        if (isCurrent && !isCurrent()) return
        setChallengeThreads(page.items)
      } catch {
        if (isCurrent && !isCurrent()) return
        setChallengeThreads([])
      }
    },
    [isWall, challengeKey],
  )

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
    setChallengeThreads([])
    let alive = true
    void loadThreads(channel.id, () => alive)
    void loadChallengeShelf(channel.id, () => alive)
    return () => {
      alive = false
    }
  }, [channel, loadThreads, loadChallengeShelf])

  const loadComments = useCallback(async (threadId: string, isCurrent?: () => boolean) => {
    try {
      const page = await apiGet<HubPage<HubCommentView>>(
        `/api/hub/threads/${enc(threadId)}/comments`,
      )
      if (isCurrent && !isCurrent()) return
      setComments(page.items)
      setCommentsCursor(page.nextCursor)
      setCommentsHasMore(page.hasMore)
    } catch (err) {
      if (isCurrent && !isCurrent()) return
      toast.error((err as ApiError).message ?? 'Falha ao carregar as respostas.')
    }
  }, [])

  async function openThread(t: HubThreadView) {
    const requestId = commentRequestRef.current + 1
    commentRequestRef.current = requestId
    setThread(t)
    setComments([])
    setCommentsCursor(null)
    setCommentsHasMore(false)
    await loadComments(t.id, () => commentRequestRef.current === requestId)
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

  const react = useCallback(
    async (target: 'threads' | 'comments', id: string, emoji: string, mine: boolean) => {
      // Otimismo local: alterna a reação na hora e SÓ desfaz se o servidor recusar. O rollback é
      // POR ITEM (id) — restaurar o array inteiro descartaria reações simultâneas de OUTROS itens
      // (toques sobrepostos num segundo comentário enquanto o primeiro ainda está no ar).
      let revert: () => void = () => {}
      if (target === 'threads') {
        const prevReactions = threadRef.current?.id === id ? threadRef.current.reactions : null
        if (!prevReactions) return
        revert = () => setThread((t) => (t && t.id === id ? { ...t, reactions: prevReactions } : t))
        setThread((t) =>
          t && t.id === id ? { ...t, reactions: toggleReaction(t.reactions, emoji, mine) } : t,
        )
      } else {
        const prevReactions = commentsRef.current.find((c) => c.id === id)?.reactions ?? null
        if (!prevReactions) return
        revert = () =>
          setComments((cs) => cs.map((c) => (c.id === id ? { ...c, reactions: prevReactions } : c)))
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
        revert()
        toast.error((err as ApiError).message ?? 'Não consegui reagir.')
      }
    },
    [],
  )

  const report = useCallback((target: 'threads' | 'comments', id: string) => {
    setReportReason('')
    setReportTarget({ target, id })
  }, [])

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

  if (loading) return <KidsSpaceSkeleton isWall={isWall} />
  if (unavailable) {
    return unavailableTitle ? (
      <KidsAccessUnavailable title={unavailableTitle} onRetry={retryLoad} />
    ) : (
      <p className="px-4 py-8 text-muted-foreground">Tente de novo.</p>
    )
  }
  // Sem acesso (403 sem teaser) OU teaser do hub (`locked`): a MESMA tela gentil "ainda
  // não liberado". `lockedView` é a tela específica do servidor (Clube/Mural); o
  // `KidsLockedSpace` (genérico) só serve quando há `space` (caso teaser). Vem ANTES do
  // "não encontrado" porque no 403 o `space` é null.
  if (forbidden || space?.locked) {
    return (
      <>
        {lockedView ??
          (space ? (
            <KidsLockedSpace space={space} />
          ) : (
            <p className="px-4 py-8 text-center text-muted-foreground">Ainda não liberado.</p>
          ))}
      </>
    )
  }
  if (!space) return <p className="px-4 py-8 text-muted-foreground">Espaço não encontrado.</p>

  return (
    <>
      <div className="w-full">
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
                onRemix={canRemix ? handleRemix : null}
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
                  (() => {
                    // Prateleira do DESAFIO do mês: usa a busca DEDICADA
                    // (`challengeThreads`, ?challenge=<key> → todas as entradas do mês);
                    // se falhou/vazia, cai no filtro das threads já carregadas. A grade
                    // normal (`others`) exclui os posts do desafio p/ não duplicar.
                    const shelf =
                      challengeThreads.length > 0
                        ? challengeThreads
                        : challenge
                          ? threads.filter((t) => t.challengeKey === challenge.key)
                          : []
                    const others = challenge
                      ? threads.filter((t) => t.challengeKey !== challenge.key)
                      : threads
                    return (
                      <div className="space-y-5">
                        {challenge && shelf.length > 0 ? (
                          <section aria-label="Desafio do mês">
                            <h3 className="mb-2 flex items-center gap-2 font-bold [font-family:var(--font-display)]">
                              <span aria-hidden="true">{challenge.emoji}</span>🏆 Desafio do mês:{' '}
                              {challenge.title}
                            </h3>
                            <div className="grid gap-4 sm:grid-cols-2">
                              {shelf.map((t) => (
                                <ShowcaseCard
                                  key={t.id}
                                  thread={t}
                                  onOpen={() => openThread(t)}
                                  onRemix={canRemix ? handleRemix : null}
                                />
                              ))}
                            </div>
                          </section>
                        ) : null}
                        <div className="grid gap-4 sm:grid-cols-2">
                          {others.map((t) => (
                            <ShowcaseCard
                              key={t.id}
                              thread={t}
                              onOpen={() => openThread(t)}
                              onRemix={canRemix ? handleRemix : null}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })()
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
                        <span>{authorText(t, viewerId)}</span>
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
}: {
  playUrl: string
  title: string
  coverImageUrl?: string | null
  /** "Fazer a minha versão" (remix) — presente SÓ com a posse do Estúdio Completo. */
  onRemix?: (() => void) | null
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
    } catch {
      // share nativo cancelado/indisponível → cai para copiar
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

  return (
    <div className="flex flex-col gap-2 border-border border-t-2 p-3">
      <div className="flex items-center gap-2">
        <a
          href={playUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 font-bold text-primary-foreground text-sm"
        >
          <Play className="size-4" /> Jogar
        </a>
        <button
          type="button"
          onClick={shareOrCopy}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border-2 border-border px-3 font-bold text-sm transition-colors hover:bg-muted/60"
        >
          <Copy className="size-4" /> Copiar link
        </button>
        <button
          type="button"
          onClick={() => setCardOpen(true)}
          aria-label={`Cartão do jogo ${title}`}
          title="Cartão do jogo (imprimir com QR)"
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border-2 border-border px-3 font-bold text-sm transition-colors hover:bg-muted/60"
        >
          <QrCode className="size-4" />
        </button>
      </div>
      {onRemix ? (
        <button
          type="button"
          onClick={onRemix}
          className="inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl border-2 border-primary px-3 font-bold text-primary text-sm transition-colors hover:bg-(--kids-cyan-tint)"
        >
          <Hammer className="size-4" /> Fazer a minha versão
        </button>
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

function ShowcaseCard({
  thread,
  onOpen,
  onRemix = null,
}: {
  thread: HubThreadView
  onOpen: () => void
  onRemix?: ((thread: HubThreadView) => void) | null
}) {
  const playUrl = playPathFor(thread)
  const plays = thread.playsCount ?? 0
  return (
    <article className="group flex w-full flex-col overflow-hidden rounded-2xl border-2 border-border bg-card transition-colors hover:border-primary">
      <button type="button" onClick={onOpen} className="flex w-full flex-col text-left">
        <div className="aspect-video w-full overflow-hidden bg-(--kids-cyan-tint)">
          {thread.coverImageUrl ? (
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
          {/* Card é um <button> (abre o post) → não aninhar âncora aqui; o nome vira
              link clicável DENTRO do post aberto (ThreadDetail) e nos comentários. */}
          {thread.authorDisplayName ? (
            <p className="text-muted-foreground text-xs">por {thread.authorDisplayName}</p>
          ) : null}
          {/* `thread.body` aqui é UGC da criança (descrição do projeto), renderizado
              como TEXTO ESCAPADO (React escapa; sem markdown = sem <img> externo nem
              link) — seguro por construção. NÃO é "members-authoritative": se um dia
              fluir markdown aqui, use `renderUgcMarkdown` (restrito), como em
              ThreadDetail/CommentRow — nunca `renderMarkdown` cru. */}
          <p className="line-clamp-2 text-muted-foreground text-sm">{thread.body}</p>
          <p className="flex items-center gap-3 pt-1 text-muted-foreground text-xs">
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="size-3" /> {thread.commentCount}
            </span>
            {plays > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Gamepad2 className="size-3" /> {plays} {plays === 1 ? 'jogada' : 'jogadas'}
              </span>
            ) : null}
          </p>
        </div>
      </button>
      {playUrl ? (
        <PlayLinkActions
          playUrl={playUrl}
          title={thread.title}
          coverImageUrl={thread.coverImageUrl ?? null}
          onRemix={onRemix ? () => onRemix(thread) : null}
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
            className={`inline-flex min-h-[36px] items-center gap-1 rounded-full border-2 px-2.5 py-1 text-sm transition-colors ${
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
    <div className="space-y-2 rounded-2xl border-2 border-border bg-card p-3">
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
  onRemix = null,
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
  authorLabel: (item: AuthorItem) => ReactNode
  onRemix?: ((thread: HubThreadView) => void) | null
}) {
  // memo: o corpo do tópico não muda quando um comentário recebe reação.
  const threadBody = useMemo(() => renderUgcMarkdown(thread.body), [thread.body])
  const plays = thread.playsCount ?? 0
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
            <img src={thread.coverImageUrl} alt={thread.title} className="size-full object-cover" />
          </div>
        ) : null}
        <h2 className="[font-family:var(--font-display)] font-bold text-lg">{thread.title}</h2>
        <p className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
          {authorLabel(thread)}
          {isWall && plays > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Gamepad2 className="size-3" /> {plays} {plays === 1 ? 'jogada' : 'jogadas'}
            </span>
          ) : null}
        </p>
        <div className="lesson-prose">{threadBody}</div>
        {isWall && thread.playId ? (
          <PlayLinkActions
            playUrl={`/jogar/${enc(thread.playId)}`}
            title={thread.title}
            coverImageUrl={thread.coverImageUrl ?? null}
            onRemix={onRemix ? () => onRemix(thread) : null}
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
