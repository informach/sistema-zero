'use client'

import {
  AttachmentUploader,
  type UploadedAttachment,
} from '@sistemazero/member-shell/components/attachment-uploader'
import { RichEditor } from '@sistemazero/member-shell/components/rich-editor'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Textarea } from '@sistemazero/ui/textarea'
import { Lock, MessageCircle, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { KidsAccessUnavailable } from '@/components/kids/kids-access-unavailable'
import { KidsSpaceSkeleton } from '@/components/kids/kids-space-skeleton'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import type {
  HubChannelView,
  HubCommentView,
  HubMyThreadView,
  HubPage,
  HubSpaceView,
  HubThreadView,
} from '@/lib/types'
import { channelPresentation } from './channel-presentation'
import { ClubeActivityBell } from './clube-activity-bell'
import { ClubeCombinados } from './clube-combinados'
import { KidsLockedSpace } from './kids-locked-space'
import { GamePicker, ShowcaseCard, Tag, ThreadDetail } from './kids-space-detail'
import { KidsMascot } from './mascot'
import {
  AuthorBadge,
  type AuthorItem,
  authorText,
  displayAuthor,
  toggleReaction,
} from './space-author'
import { pickInitialChannel } from './space-channel'

/** Modo de apresentação: fórum (Clube — conversa) ou vitrine (Mural — cards de projeto). */
export type SpaceViewMode = 'forum' | 'wall'

// Emojis rápidos (subconjunto da allowlist kids do hub — 07/2026: ampliado de 5 p/ 8
// p/ dar mais expressão às crianças; o hub aceita estes 12: 👍❤️😂😮😢👏🎉🔥⭐🤩🙌✅).
const _QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '🔥', '⭐', '🤩', '👏']

// Slugs/ids vêm do servidor (slug/UUID), mas codificamos por consistência/segurança.
const enc = encodeURIComponent

/**
 * Sugestões de conversa (chips) que pré-preenchem o composer — a criança em tela branca
 * trava; um empurrãozinho gentil convida a começar. Só título (o corpo fica pra ela).
 */
const SUGGESTION_STARTERS: { chip: string; title: string }[] = [
  { chip: '🎮 Mostrar meu jogo', title: 'Olha o jogo que eu criei!' },
  { chip: '🙋 Pedir uma ajuda', title: 'Preciso de uma ajuda com o meu projeto' },
  { chip: '🕹️ Jogo favorito', title: 'Qual é o seu jogo favorito?' },
  { chip: '💡 Uma ideia nova', title: 'Tive uma ideia e quero mostrar!' },
]

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

export function KidsSpaceViewClient({
  slug,
  viewerId,
  mode = 'forum',
  isStaff = false,
  lockedView,
  unavailableTitle,
  canRemix = false,
  challenge = null,
}: {
  slug: string
  viewerId: string
  mode?: SpaceViewMode
  /** Viewer é da EQUIPE (superadmin/admin/staff) → pode escrever nos canais `staff_only`. */
  isStaff?: boolean
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
  // "Mostrar meu jogo no Clube": os jogos da própria criança (do Mural) p/ anexar à
  // conversa + o playId escolhido. Buscados sob demanda (só quando abre o picker).
  const [myGames, setMyGames] = useState<HubMyThreadView[] | null>(null)
  const [newPlayId, setNewPlayId] = useState<string | null>(null)
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

  // Rosto+aura+nome (clicável no post aberto) — o que aquece o Clube. Usado na
  // assinatura do tópico e em cada resposta.
  const authorLabel = useCallback(
    (item: AuthorItem): ReactNode => (
      <AuthorBadge item={item} viewerId={viewerId} nameNode={displayAuthor(item, viewerId)} />
    ),
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
        // Gamificação (retenção pós-cursos): registra o marco da missão de remix.
        // BEST-EFFORT fire-and-forget — o toast/navegação não esperam; os guards
        // anti-farm (posse + playId real no hub + não-self) são do members.
        void fetch('/api/studio/remix', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ playId: t.playId }),
        }).catch(() => {})
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

  // Abrir uma conversa a partir do SINO (`ClubeActivityBell`): busca o tópico
  // completo por id (pode ser de outro canal) e reusa o fluxo de `openThread`.
  async function openThreadById(id: string) {
    try {
      const t = await apiGet<HubThreadView>(`/api/hub/threads/${enc(id)}`)
      await openThread(t)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Não consegui abrir a conversa.')
    }
  }

  // Canal `staff_only` (ex.: Recados da equipe): só a EQUIPE compõe tópico; `geral`
  // e demais canais `members` seguem livres (no Mural o composer nem aparece).
  const canComposeInChannel = channel?.postingPolicy !== 'staff_only' || isStaff
  // Ids dos canais DESTE servidor → o sino só mostra conversas daqui (não do Mural).
  const spaceChannelIds = useMemo(() => channels.map((c) => c.id), [channels])

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

  // Carrega os jogos da PRÓPRIA criança (publicados no Mural) p/ "Mostrar meu jogo no
  // Clube" — só quando ela abre o picker (best-effort; sem jogos → lista vazia).
  async function loadMyGames() {
    if (myGames) return
    try {
      const res = await apiGet<{ items: HubMyThreadView[] }>('/api/hub/my-threads')
      setMyGames(res.items.filter((t) => t.playId))
    } catch {
      setMyGames([])
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
          // "Mostrar meu jogo no Clube": referência opcional a um jogo do Mural.
          playId: newPlayId,
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
      setNewPlayId(null)
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
        {!isWall ? (
          // Cabeçalho acolhedor do Clube: o Zappy dá "oi" e convida a turma; o botão
          // "Combinados" (e o onboarding de 1ª visita) mora aqui.
          <div className="mb-4 flex items-center gap-3 rounded-3xl border-2 border-border bg-(--kids-cyan-tint) p-4">
            <KidsMascot expression="happy" className="size-14 shrink-0 md:size-16" />
            <div className="min-w-0 flex-1">
              <h1 className="[font-family:var(--font-display)] font-bold text-2xl">{space.name}</h1>
              <p className="text-muted-foreground text-sm">
                {space.description || 'Converse com a turma e mostre o que você criou! 🎉'}
              </p>
            </div>
            <ClubeActivityBell
              viewerId={viewerId}
              channelIds={spaceChannelIds}
              onOpenThread={openThreadById}
            />
            <ClubeCombinados viewerId={viewerId} />
          </div>
        ) : (
          <>
            <h1 className="mb-1 [font-family:var(--font-display)] font-bold text-2xl">
              {space.name}
            </h1>
            {space.description ? (
              <p className="mb-4 text-muted-foreground text-sm">{space.description}</p>
            ) : (
              <div className="mb-4" />
            )}
          </>
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
                  <span aria-hidden="true" className="shrink-0 text-base leading-none">
                    {channelPresentation(c.slug).emoji}
                  </span>
                  <span className="truncate">{c.name}</span>
                  {/* Canal da equipe: cadeado discreto ("aqui só a equipe escreve"). */}
                  {c.postingPolicy === 'staff_only' ? (
                    <Lock className="size-3 shrink-0 opacity-60" />
                  ) : null}
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
                canReply={
                  isStaff ||
                  thread.isShowcase ||
                  channels.find((c) => c.id === thread.channelId)?.postingPolicy !== 'staff_only'
                }
              />
            ) : (
              <div className="space-y-3">
                {/* O Mural é só leitura+reação+comentário: sem composer de tópico. */}
                {!isWall ? (
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground text-sm">
                      {channel ? channel.topic || `#${channel.slug}` : 'Escolha um canal'}
                    </p>
                    {/* Canal "somente avisos" (ex.: Recados da equipe): só a equipe abre
                        conversa — sem o botão, o aluno não pensa que pode escrever. */}
                    {channel && canComposeInChannel ? (
                      <button
                        type="button"
                        onClick={() => setShowNew((v) => !v)}
                        className="inline-flex items-center gap-1 rounded-2xl bg-primary px-4 py-2 font-bold text-primary-foreground text-sm"
                      >
                        <Plus className="size-4" /> Começar conversa
                      </button>
                    ) : channel && channel.postingPolicy === 'staff_only' ? (
                      <span className="text-muted-foreground text-xs">
                        Aqui só a equipe escreve 💬
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {!isWall && showNew && canComposeInChannel ? (
                  <div className="space-y-2 rounded-2xl border-2 border-border bg-card p-3">
                    {/* Sugestões: um empurrãozinho pra criança que travou na tela branca. */}
                    <div className="flex flex-wrap gap-1.5">
                      {SUGGESTION_STARTERS.map((s) => (
                        <button
                          type="button"
                          key={s.chip}
                          onClick={() => setNewTitle(s.title)}
                          className="rounded-full border-2 border-border px-2.5 py-1 font-bold text-muted-foreground text-xs transition-colors hover:border-primary hover:text-primary"
                        >
                          {s.chip}
                        </button>
                      ))}
                    </div>
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
                    {/* "Mostrar meu jogo no Clube": anexa um jogo do Mural à conversa. */}
                    <GamePicker
                      games={myGames}
                      selectedId={newPlayId}
                      onOpen={loadMyGames}
                      onSelect={setNewPlayId}
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
                  <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-border border-dashed p-6 text-center text-muted-foreground text-sm">
                    <KidsMascot expression="happy" className="size-16" />
                    <p>
                      {isWall
                        ? 'Os projetos dos criadores vão aparecer aqui! 🎨'
                        : channel
                          ? channelPresentation(channel.slug).emptyState
                          : 'Nenhuma conversa ainda. Comece a primeira! ✨'}
                    </p>
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
                                  viewerId={viewerId}
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
                              viewerId={viewerId}
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
                        <AuthorBadge
                          item={t}
                          viewerId={viewerId}
                          nameNode={authorText(t, viewerId)}
                        />
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
