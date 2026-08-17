'use client'

import type { UploadedAttachment } from '@sistemazero/member-shell/components/attachment-uploader'
import {
  minCareerLevelForRemix,
  remixRequirementFromSnapshot,
  type StudioRemixCapability,
  type StudioRemixRequirement,
  studioRemixCovered,
} from '@sistemazero/member-shell/lib/studio-tier'
import { useRouter } from 'next/navigation'
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { KidsAccessUnavailable } from '@/components/kids/kids-access-unavailable'
import { KidsSpaceSkeleton } from '@/components/kids/kids-space-skeleton'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { levelInfo } from '@/lib/level-info'
import type {
  HubChannelView,
  HubCommentView,
  HubMyThreadView,
  HubPage,
  HubSpaceView,
  HubThreadView,
} from '@/lib/types'
import { KidsLockedSpace } from './kids-locked-space'
import { KidsSpaceContent, type KidsSpaceContentProps } from './kids-space-content'
import { AuthorBadge, type AuthorItem, displayAuthor, toggleReaction } from './space-author'
import { pickInitialChannel } from './space-channel'
import { useKidsSpaceReport } from './use-kids-space-report'

/** Modo de apresentação: fórum (Clube — conversa) ou vitrine (Mural — cards de projeto). */
export type SpaceViewMode = 'forum' | 'wall'

/**
 * Capacidade de remix do VIEWER (posse do Estúdio + rank já resolvidos no servidor):
 * `pro` = pode abrir projeto do modo Código (Lenda/equipe); `allowedExtensions` = a
 * allowlist acumulada do degrau. `null` na prop = sem remix (sem posse, Faísca ou
 * rank indisponível) — o botão nem renderiza.
 */
export type RemixTier = StudioRemixCapability

// Slugs/ids vêm do servidor (slug/UUID), mas codificamos por consistência/segurança.
const enc = encodeURIComponent

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
  remixTier = null,
  challenge = null,
}: {
  slug: string
  viewerId: string
  mode?: SpaceViewMode
  /** Viewer é da EQUIPE (superadmin/admin/staff) → pode escrever nos canais `staff_only`. */
  isStaff?: boolean
  /**
   * Capacidade de remix do viewer (posse do Estúdio Completo + rank com Estúdio
   * livre) → o card do Mural ganha "Fazer a minha versão" (remix: importa o
   * snapshot público como projeto novo no /estudio). `null` = sem remix (produto
   * vendido à parte / Faísca / rank indisponível): o botão nem renderiza. Jogo que
   * usa ferramentas ALÉM do degrau → selo "nível X" no card + recado gentil no
   * clique (a checagem autoritativa roda sobre o snapshot baixado).
   */
  remixTier?: RemixTier | null
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

  const { onReport, report: reportProps } = useKidsSpaceReport()

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

  const canRemix = remixTier !== null

  // Recado gentil quando o jogo usa ferramentas ALÉM do degrau do viewer — nomeia o
  // nível que destrava (a mesma régua do selo do card). Sem nível resolvível
  // (metadado desconhecido) → copy genérica; nunca destrava nada.
  const remixBlockedMessage = useCallback((req: StudioRemixRequirement): string => {
    const slug = minCareerLevelForRemix(req)
    const label = slug ? levelInfo(slug).label : null
    return label
      ? `Esse jogo usa ferramentas do nível ${label}. Continue a sua jornada de criador para fazer a sua versão! 🚀`
      : 'Esse jogo usa ferramentas que você ainda vai conquistar na sua carreira. 🚀'
  }, [])

  // Selo do card: o `studioMeta` do post (snapshot no publish) diz as ferramentas do
  // jogo; fora do degrau → rótulo do nível que destrava (`null` = sem selo). É só
  // APRESENTAÇÃO — a checagem autoritativa do clique roda sobre o snapshot baixado.
  const remixLockFor = useCallback(
    (t: HubThreadView): { levelLabel: string | null } | null => {
      if (!remixTier || !t.studioMeta) return null
      if (studioRemixCovered(remixTier, t.studioMeta)) return null
      const slug = minCareerLevelForRemix(t.studioMeta)
      return { levelLabel: slug ? levelInfo(slug).label : null }
    },
    [remixTier],
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
        // Selo do post já diz que falta nível → recado gentil sem nem baixar o jogo.
        if (remixTier && t.studioMeta && !studioRemixCovered(remixTier, t.studioMeta)) {
          toast.info(remixBlockedMessage(t.studioMeta))
          return
        }
        const res = await fetch(`/api/studio/play/${enc(t.playId)}`)
        if (!res.ok) throw new Error('play indisponível')
        const snapshot: unknown = await res.json()
        // Checagem AUTORITATIVA (post antigo sem metadado / metadado divergente): as
        // ferramentas REAIS do snapshot precisam caber no degrau — senão o projeto
        // importado nem abriria no Estúdio (trava de conquista) e viraria beco sem saída.
        const requirement = remixRequirementFromSnapshot(snapshot)
        if (remixTier && !studioRemixCovered(remixTier, requirement)) {
          toast.info(remixBlockedMessage(requirement))
          return
        }
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
    [viewerId, router, remixTier, remixBlockedMessage],
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

  const contentProps: KidsSpaceContentProps = {
    context: {
      isWall,
      space,
      viewerId,
      spaceChannelIds,
      onOpenThreadById: openThreadById,
    },
    navigation: { channels, channel, onSelectChannel: setChannel },
    discussion: {
      thread,
      comments,
      replyBody,
      onReplyBodyChange: setReplyBody,
      replyAttachments,
      onReplyAttachmentsChange: setReplyAttachments,
      commentsHasMore,
      loadingMoreComments,
      onLoadMoreComments: loadMoreComments,
      onBackFromThread: () => setThread(null),
      onSendReply: sendReply,
      onReact: react,
      onReport,
      authorLabel,
      onRemix: canRemix ? handleRemix : null,
      remixLockFor,
      canReply: Boolean(
        thread &&
          (isStaff ||
            thread.isShowcase ||
            channels.find((item) => item.id === thread.channelId)?.postingPolicy !== 'staff_only'),
      ),
    },
    composer: {
      canComposeInChannel,
      showNew,
      onToggleNew: () => setShowNew((visible) => !visible),
      onCancelNew: () => setShowNew(false),
      newTitle,
      onNewTitleChange: setNewTitle,
      newBody,
      onNewBodyChange: setNewBody,
      newAttachments,
      onNewAttachmentsChange: setNewAttachments,
      myGames,
      newPlayId,
      onLoadMyGames: loadMyGames,
      onNewPlayIdChange: setNewPlayId,
      onCreateThread: createThread,
    },
    feed: {
      threads,
      challengeThreads,
      challenge,
      onOpenThread: openThread,
      threadsHasMore,
      loadingMoreThreads,
      onLoadMoreThreads: loadMoreThreads,
    },
    report: reportProps,
    busy,
  }

  return <KidsSpaceContent {...contentProps} />
}
