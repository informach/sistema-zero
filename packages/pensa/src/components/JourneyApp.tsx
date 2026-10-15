import { type AiCreditsView, resolveAiCredits } from '@sistemazero/core/ai-credits'
import {
  canWorkOnPensaMission,
  nextPensaMissionFor,
  PENSA_ZERO_LABELS,
  type PensaJourney,
  type PensaJourneyCommand,
  type PensaJourneyListItem,
  type PensaJourneyTeamView,
  type PensaJourneyView,
  type PensaQuestionTopic,
  type PensaZeroStage,
  pensaZeroStage,
} from '@sistemazero/core/pensa'
import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { joinNames, missionPeople, teamMissionProgress } from '../core/journeyTeam'
import { editedAgo } from '../core/relativeTime'
import { JOURNEY_TEAM_COPY, personName, TEAM_COPY } from '../core/teamCopy'
import type {
  PensaHostAdapter,
  PensaJourneyJoinView,
  PensaMascotPose,
  PensaProjectListView,
  PensaStageView,
  PensaTaskView,
  PensaTransport,
} from '../core/types'
import { AiCreditsBadge, AiCreditsNotice } from './AiCredits'
import { ConfirmDialog } from './ConfirmDialog'
import { HostBackLink, HostMenuButton, usePensaHostChrome } from './hostChrome'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BlocksIcon,
  CheckIcon,
  CircleCheckIcon,
  CubeIcon,
  EyeIcon,
  FlagIcon,
  LightbulbIcon,
  PaletteIcon,
  PencilIcon,
  PlusIcon,
  TargetIcon,
  TrashIcon,
  UsersIcon,
} from './icons'
import { JourneyTeamDialog } from './JourneyTeamDialog'

// A rede caída chega como `TypeError` ("Failed to fetch"): a criança lê uma frase, nunca o erro cru.
const errorText = (cause: unknown) =>
  cause instanceof TypeError
    ? 'Não consegui falar com o Pensa agora. Confira a internet e tente de novo.'
    : cause instanceof Error && cause.message
      ? cause.message
      : 'Não consegui fazer isso agora. Tente de novo.'
/** O jogo sumiu (apagado pela dona, ou a criança saiu da equipe): ela volta à lista com isto. */
const GONE_TEXT = 'Esse jogo não está mais aqui. Ele pode ter sido apagado, ou você saiu da equipe.'
export function JourneyApp({
  adapter,
  initialProjectId,
  onWorkspaceChange,
  onLegacy,
  teamPollMs = 20_000,
}: {
  adapter: PensaHostAdapter
  initialProjectId?: string | null
  onWorkspaceChange?: (active: boolean) => void
  onLegacy(id?: string): void
  /** O compasso de um jogo EM EQUIPE (o teste injeta um curto; 0 desliga). */
  teamPollMs?: number
}) {
  const chrome = usePensaHostChrome()
  const api = adapter.transport
  const [view, updateView] = useState<PensaJourneyView | null>(null)
  const [projects, setProjects] = useState<PensaJourneyListItem[]>([])
  const [legacy, setLegacy] = useState<PensaProjectListView[]>([])
  const [archived, setArchived] = useState(false)
  const [restoreTarget, setRestoreTarget] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [loadedTasks, setTasks] = useState<PensaTaskView[]>([])
  const [nextTaskId, setNextTaskId] = useState<string | null>(null)
  const [draft, setDraft] = useState({ key: '', value: '' })
  // O relato do teste fica no rascunho da aba (como o campo de contar): o cartão manda abrir o
  // jogo no Estúdio, e o relato não pode se perder na ida e volta.
  const [noteDraft, setNoteDraft] = useState({ key: '', value: '' })
  const [busy, setBusy] = useState(false)
  const [voiceBusy, setVoiceBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [talking, setTalking] = useState(false)
  const [conversationKind, setConversationKind] = useState<'planning' | 'help' | 'backlog'>(
    'planning',
  )
  const active = useRef<string | null>(initialProjectId ?? null)
  const navigation = useRef(0)
  const loadSequence = useRef(0)
  const listSequence = useRef(0)
  const busyRef = useRef(false)
  const draftProject = useRef<string | null>(null)
  const request = useRef<{ text: string; id: string; key: string } | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const noticeRef = useRef<HTMLDivElement>(null)
  // "Adaptar meu caminho" pede confirmação: refaz as próximas missões (e, em equipe, as de todos).
  const [confirmRevise, setConfirmRevise] = useState(false)
  const keepRef = useRef<HTMLButtonElement>(null)
  // Equipe (14/10/2026): os nomes e fotos (`GET …/team`), a janela e quem a abriu.
  const [teamView, setTeamView] = useState<PensaJourneyTeamView | null>(null)
  const [teamOpen, setTeamOpen] = useState(false)
  const teamOpenerRef = useRef<HTMLButtonElement | null>(null)
  const teamSequence = useRef(0)
  // "Ver o caminho" do cartão de espera rola até o caminho e leva o foco até ele.
  const pathRef = useRef<HTMLElement>(null)
  // Entrar por código e sair da equipe trocam a tela inteira: o foco pousa no título novo.
  const titleRef = useRef<HTMLHeadingElement>(null)
  const focusTitle = useRef(false)
  // "Meu caminho": o título é para onde o "Ver o caminho" leva o foco.
  const pathTitleRef = useRef<HTMLHeadingElement>(null)
  // A home com jogos guarda o campo de um jogo NOVO atrás do "+ Novo jogo" (15/10/2026): aberto
  // sempre, ele parecia ser o lugar de mexer no jogo de cima.
  const [newGame, setNewGame] = useState(false)
  const newGameRef = useRef<HTMLButtonElement>(null)
  // Rever uma etapa vencida do Z·E·R·O (o "peek" do plano clássico, que o v2 tinha perdido).
  const [review, setReview] = useState<PensaZeroStage | null>(null)
  const reviewTitleRef = useRef<HTMLHeadingElement>(null)
  const zeroButtons = useRef<Partial<Record<PensaZeroStage, HTMLButtonElement | null>>>({})
  const focusReview = useRef(false)
  // A lixeira do cartão do jogo na home (a do plano clássico, que o v2 tinha perdido).
  const [removeTarget, setRemoveTarget] = useState<PensaJourneyListItem | null>(null)
  const [removing, setRemoving] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const removeOpenerRef = useRef<HTMLElement | null>(null)
  const state = view?.journey
  const tasks = loadedTasks.filter((task) => state?.missionIds.includes(task.id))
  const setView = useCallback((next: PensaJourneyView) => {
    if (active.current !== next.project.id) return
    updateView((current) =>
      current?.project.id === next.project.id && current.journey.revision > next.journey.revision
        ? current
        : next,
    )
  }, [])
  const draftKey = `sz:pensa-v2:draft:${adapter.viewerId ?? 'session'}:${view?.project.id ?? 'new'}`
  const text = draft.key === draftKey ? draft.value : ''
  const setText = useCallback((value: string) => setDraft({ key: draftKey, value }), [draftKey])
  const noteKey = `sz:pensa-v2:note:${adapter.viewerId ?? 'session'}:${view?.project.id ?? 'new'}`
  const note = noteDraft.key === noteKey ? noteDraft.value : ''
  const setNote = useCallback((value: string) => setNoteDraft({ key: noteKey, value }), [noteKey])
  const workspaceOpen = Boolean(view)
  const workProjectId = view?.project.id
  const operationId = view?.operation?.id
  const operationStatus = view?.operation?.status
  // Sem `team` (servidor anterior à equipe): a dona faz tudo, como antes.
  const team = view?.team ?? null
  const isOwner = view?.role !== 'member'
  const canProgram = !team || team.roles.code === team.viewerProfileId
  const teamMode = Boolean(team && team.memberCount > 0)
  // Os nomes só servem com gente na equipe; a chave muda quando entra/sai alguém ou as funções.
  const teamKey =
    team && workProjectId && teamMode
      ? `${workProjectId}|${team.memberCount}|${team.roles.code}|${team.roles.art.join(',')}`
      : null

  // Lê o rascunho guardado quando o campo muda de dono, sem apagar o que a criança JÁ digitou para
  // este dono (o jogo acabou de abrir e ela começou a escrever antes desta leitura).
  useEffect(() => {
    let saved = ''
    try {
      saved = sessionStorage.getItem(draftKey) ?? ''
    } catch {
      /* Sem armazenamento: começa vazio. */
    }
    setDraft((current) => (current.key === draftKey ? current : { key: draftKey, value: saved }))
  }, [draftKey])
  useEffect(() => {
    if (draft.key !== draftKey) return
    try {
      if (text) sessionStorage.setItem(draftKey, text)
      else sessionStorage.removeItem(draftKey)
    } catch {
      /* Texto continua nesta tela. */
    }
  }, [text, draftKey, draft.key])
  useEffect(() => {
    let saved = ''
    try {
      saved = sessionStorage.getItem(noteKey) ?? ''
    } catch {
      /* Sem armazenamento: começa vazio. */
    }
    setNoteDraft((current) => (current.key === noteKey ? current : { key: noteKey, value: saved }))
  }, [noteKey])
  useEffect(() => {
    if (noteDraft.key !== noteKey) return
    try {
      if (note) sessionStorage.setItem(noteKey, note)
      else sessionStorage.removeItem(noteKey)
    } catch {
      /* O relato continua nesta tela. */
    }
  }, [note, noteKey, noteDraft.key])
  // Abrir a confirmação de apagar leva o foco ao "Manter": o botão que a abriu sumiu da tela.
  useEffect(() => {
    if (confirmDelete) keepRef.current?.focus()
  }, [confirmDelete])
  useEffect(() => {
    onWorkspaceChange?.(workspaceOpen)
    return () => onWorkspaceChange?.(false)
  }, [workspaceOpen, onWorkspaceChange])

  const loadList = useCallback(
    async (showArchived: boolean) => {
      const sequence = ++listSequence.current
      const [items, old] = await Promise.all([
        api.request<PensaJourneyListItem[]>(
          `/v2/projects?status=${showArchived ? 'archived' : 'active'}`,
        ),
        api
          .request<{ projects: PensaProjectListView[] }>('/projects')
          .catch(() => ({ projects: [] })),
      ])
      if (sequence !== listSequence.current) return
      setProjects(items)
      // O legado continua acessível. O detail distingue v2 mesmo quando a lista antiga o inclui.
      setLegacy(old.projects.filter((p) => !items.some((v) => v.id === p.id)))
    },
    [api],
  )
  const load = useCallback(
    async (id: string) => {
      if (active.current !== id) return
      const sequence = ++loadSequence.current
      const next = await api.request<PensaJourneyView>(`/v2/projects/${id}`)
      if (active.current !== id || sequence !== loadSequence.current) return
      // A jornada e as missões entram JUNTAS: com a jornada antes, o fim da preparação piscava o
      // cartão do teste até as missões chegarem.
      const stage = next.journey.missionIds.length
        ? await api.request<PensaStageView>(`/cycles/${next.journey.cycleId}/stages/z`)
        : null
      if (active.current !== id || sequence !== loadSequence.current) return
      setView(next)
      setTasks(stage?.tasks ?? [])
      setNextTaskId(stage?.nextTaskId ?? null)
    },
    [api, setView],
  )
  /** O jogo sumiu: volta à lista (recarregada) com o recado, sem cair no plano clássico. */
  const leaveGone = useCallback(() => {
    active.current = null
    navigation.current += 1
    loadSequence.current += 1
    updateView(null)
    setTasks([])
    setTalking(false)
    setReview(null)
    setTeamOpen(false)
    setTeamView(null)
    setArchived(false)
    setError(GONE_TEXT)
    void loadList(false).catch(() => undefined)
  }, [loadList])
  const open = useCallback(
    async (id: string) => {
      const visit = ++navigation.current
      active.current = id
      updateView(null)
      setTasks([])
      setLoading(true)
      setError(null)
      setTalking(false)
      setConversationKind('planning')
      setRestoreTarget('')
      setConfirmDelete(false)
      setTeamOpen(false)
      setTeamView(null)
      setReview(null)
      setNewGame(false)
      setConfirmRevise(false)
      try {
        await load(id)
      } catch (cause) {
        if (navigation.current !== visit) return
        if ((cause as { status?: number }).status === 404) {
          // Só um plano CLÁSSICO cai no planejador antigo; um jogo v2 que sumiu volta à lista.
          const old = await api
            .request<{ projects: PensaProjectListView[] }>('/projects')
            .catch(() => ({ projects: [] as PensaProjectListView[] }))
          if (navigation.current !== visit) return
          if (old.projects.some((plan) => plan.id === id)) onLegacy(id)
          else leaveGone()
        } else setError(errorText(cause))
      } finally {
        if (navigation.current === visit) setLoading(false)
      }
    },
    [api, load, leaveGone, onLegacy],
  )
  useEffect(() => {
    if (initialProjectId) void open(initialProjectId)
    else
      void loadList(false)
        .catch((c) => setError(errorText(c)))
        .finally(() => setLoading(false))
  }, [initialProjectId, loadList, open])
  // GET não gasta. O POST work apenas retoma leases abandonados; failed exige o botão explícito.
  useEffect(() => {
    const id = workProjectId
    if (!id || !operationId || !operationStatus || !['queued', 'running'].includes(operationStatus))
      return
    let disposed = false
    let inFlight = false
    // O recado que ESTE laço deixou: quando a volta seguinte dá certo, ele sai sozinho (antes um
    // tropeço de rede deixava o aviso vermelho até a próxima ação da criança).
    let shown: string | null = null
    const show = (message: string | null) => {
      if (disposed) return
      if (message) {
        shown = message
        setError(message)
      } else if (shown) {
        const stale = shown
        shown = null
        setError((current) => (current === stale ? null : current))
      }
    }
    const resume = async () => {
      if (document.hidden || disposed || inFlight) return
      inFlight = true
      try {
        let failed = false
        await api
          .request(`/v2/projects/${id}/work`, { method: 'POST', body: {} })
          .catch((cause) => {
            failed = true
            show(errorText(cause))
          })
        if (!disposed) await load(id)
        if (!failed) show(null)
      } catch (cause) {
        show(errorText(cause))
      } finally {
        inFlight = false
      }
    }
    void resume()
    const timer = window.setInterval(() => void resume(), 5000)
    return () => {
      disposed = true
      window.clearInterval(timer)
    }
  }, [api, load, workProjectId, operationId, operationStatus])
  // Os nomes da equipe ("Missão de Bia", "Quem testa… é Leo"). Best-effort: sem eles a tela usa
  // "alguém da equipe", nunca trava.
  useEffect(() => {
    const sequence = ++teamSequence.current
    if (!teamKey || !workProjectId) {
      setTeamView(null)
      return
    }
    api
      .request<PensaJourneyTeamView>(`/v2/projects/${workProjectId}/team`)
      .then((next) => {
        if (sequence === teamSequence.current && active.current === workProjectId) setTeamView(next)
      })
      .catch(() => undefined)
  }, [api, teamKey, workProjectId])
  // O compasso do jogo EM EQUIPE: a cada 20 s (aba visível, nada em voo) relê o jogo e a etapa.
  // O texto do campo mora no rascunho (`draft`), fora da view: reler nunca o apaga.
  const operationRunning = Boolean(
    operationStatus && ['queued', 'running'].includes(operationStatus),
  )
  useEffect(() => {
    const id = workProjectId
    if (!id || !teamMode || teamPollMs <= 0 || operationRunning) return
    let inFlight = false
    const timer = window.setInterval(() => {
      if (document.hidden || inFlight || busyRef.current || active.current !== id) return
      inFlight = true
      void load(id)
        .catch((cause) => {
          if ((cause as { status?: number }).status === 404 && active.current === id) leaveGone()
        })
        .finally(() => {
          inFlight = false
        })
    }, teamPollMs)
    return () => window.clearInterval(timer)
  }, [load, leaveGone, workProjectId, teamMode, teamPollMs, operationRunning])
  useEffect(() => {
    if (!focusTitle.current || loading) return
    focusTitle.current = false
    titleRef.current?.focus()
  })
  useEffect(() => {
    if (!focusReview.current || !review) return
    focusReview.current = false
    reviewTitleRef.current?.focus()
  })

  async function run(action: (isCurrent: () => boolean) => Promise<void>) {
    if (busyRef.current) return
    const visit = navigation.current
    busyRef.current = true
    setBusy(true)
    setError(null)
    try {
      await action(() => navigation.current === visit)
      // O botão que a criança apertou costuma sumir com a tela nova: o foco não fica no vazio.
      window.setTimeout(() => {
        const focused = document.activeElement
        if (focused && focused !== document.body) return
        const title = rootRef.current?.querySelector<HTMLElement>(
          '.pensa-journey-now .pensa-journey-card__title',
        )
        if (!title) return
        title.tabIndex = -1
        title.focus()
      }, 0)
    } catch (cause) {
      if (navigation.current !== visit) return
      const status = (cause as { status?: number }).status
      const message = errorText(cause)
      if (status === 404 && active.current) {
        leaveGone()
        return
      }
      // O conflito genérico vira o que de fato aconteceu: a tela já releu a versão nova.
      setError(
        status === 409 &&
          // A do BFF e a padrão do members (adulta: "Recarregue o guia…"), que chegava crua.
          (message.includes('mudou em outra tela') ||
            message.startsWith('A tarefa mudou em outro aparelho'))
          ? teamMode
            ? 'Alguém da equipe mexeu no jogo. Já mostrei como ele está agora: confira e tente de novo.'
            : 'O jogo mudou em outra tela. Já mostrei como ele está agora: confira e tente de novo.'
          : message,
      )
      // O recado mora no alto da faixa do meio; a ação pode ter vindo lá de baixo.
      window.setTimeout(() => noticeRef.current?.scrollIntoView?.({ block: 'nearest' }), 0)
      if (active.current && status === 409) await load(active.current).catch(() => undefined)
    } finally {
      busyRef.current = false
      setBusy(false)
      // Toda ação pode ter gasto, devolvido ou sido recusada por falta de usos: o selo relê.
      setCreditsTick((tick) => tick + 1)
    }
  }
  const command = (command: PensaJourneyCommand) =>
    run(async () => {
      if (!view) return
      const result = await api.request<PensaJourneyView>(
        `/v2/projects/${view.project.id}/command`,
        { method: 'POST', body: { expectedRevision: view.journey.revision, command } },
      )
      setView(result)
    })
  const home = () => {
    if (voiceBusy) return
    active.current = null
    navigation.current += 1
    loadSequence.current += 1
    updateView(null)
    setTasks([])
    setTalking(false)
    setConversationKind('planning')
    setError(null)
    setTeamOpen(false)
    setTeamView(null)
    setReview(null)
    setNewGame(false)
    setConfirmRevise(false)
    const visit = navigation.current
    void loadList(archived).catch((c) => {
      if (navigation.current === visit) setError(errorText(c))
    })
  }
  async function send() {
    // O mesmo bloqueio do botão (o Ctrl/Cmd+Enter também chega aqui).
    if (!text.trim() || text.length > 4000 || voiceBusy || outOfUses) return
    const sent = text.trim()
    const visit = navigation.current
    await run(async () => {
      let current = view
      if (current && conversationKind === 'backlog') {
        if (sent.length > 2000)
          throw new Error(
            'Guarde uma ideia de até 2.000 caracteres por vez. Seu texto continua aqui.',
          )
        setView(
          await api.request<PensaJourneyView>(`/v2/projects/${current.project.id}/command`, {
            method: 'POST',
            body: {
              expectedRevision: current.journey.revision,
              command: {
                type: 'keep_idea',
                idea: { id: crypto.randomUUID(), text: sent, origin: 'child' },
              },
            },
          }),
        )
        if (navigation.current !== visit) return
        setText('')
        setTalking(false)
        setConversationKind('planning')
        return
      }
      if (!current) {
        draftProject.current ??= crypto.randomUUID()
        current = await api.request<PensaJourneyView>('/v2/projects', {
          method: 'POST',
          body: { id: draftProject.current },
        })
        // O texto vai junto para o rascunho do jogo novo: se o envio falhar e a criança abrir o
        // jogo de novo ("Atualizar"), a ideia dela está lá.
        try {
          sessionStorage.setItem(
            `sz:pensa-v2:draft:${adapter.viewerId ?? 'session'}:${current.project.id}`,
            sent,
          )
        } catch {
          /* O texto continua nesta tela. */
        }
        if (navigation.current === visit) active.current = current.project.id
      }
      if (request.current?.text !== sent || request.current.key !== draftKey)
        request.current = { text: sent, id: crypto.randomUUID(), key: draftKey }
      const result = await api.request<PensaJourneyView>(
        `/v2/projects/${current.project.id}/start`,
        {
          method: 'POST',
          body: {
            id: request.current.id,
            expectedRevision: current.journey.revision,
            message: sent,
            kind:
              ['building', 'observing'].includes(current.journey.stage) ||
              conversationKind === 'help'
                ? 'help'
                : 'planning',
          },
        },
      )
      try {
        sessionStorage.removeItem(draftKey)
        // O primeiro envio copiou o texto para o rascunho do jogo novo (para não se perder se
        // falhasse). Deu certo: sai de lá também, senão a ideia voltava para o campo do jogo.
        sessionStorage.removeItem(
          `sz:pensa-v2:draft:${adapter.viewerId ?? 'session'}:${current.project.id}`,
        )
      } catch {
        /* Nada a limpar. */
      }
      request.current = null
      draftProject.current = null
      if (navigation.current !== visit) return
      setText('')
      setView(result)
    })
  }
  const running = Boolean(view?.operation && ['queued', 'running'].includes(view.operation.status))
  // O selo de usos do Zappy (o do plano clássico): relido ao abrir e quando o Zappy termina.
  // Sem dado, `null`, e o selo some: "não sei" nunca vira "acabou".
  const [credits, setCredits] = useState<AiCreditsView | null>(null)
  // Relê o saldo depois de cada ação, ao entrar num jogo e quando a criança volta para a aba
  // (um irmão pode ter gastado em outro aparelho, a reserva vence, o dia vira). Sem isso, um
  // "acabou" ficava preso até recarregar a página, porque o envio bloqueado não relia nada.
  const [creditsTick, setCreditsTick] = useState(0)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setCreditsTick((tick) => tick + 1)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])
  const creditsGame = view?.project.id ?? null
  useEffect(() => {
    if (running) return
    // As dependências que só disparam a releitura (o valor não é usado aqui dentro).
    void creditsTick
    void creditsGame
    let alive = true
    api
      .request<{ credits: AiCreditsView | null }>('/v2/credits')
      .then((res) => {
        if (alive) setCredits(res?.credits ?? null)
      })
      .catch(() => {
        if (alive) setCredits(null)
      })
    return () => {
      alive = false
    }
  }, [api, running, creditsTick, creditsGame])
  // Em equipe, cada criança vê a SUA próxima missão (régua do core); sem nenhuma, a missão que
  // está na frente do caminho e quem pode fazê-la ("Esperando a arte de Bia").
  const teamNext =
    team && teamMode
      ? nextPensaMissionFor(teamMissionProgress(tasks), team.viewerProfileId, team.roles)
      : null
  const nextTask = teamNext
    ? tasks.find((t) => t.id === teamNext.mine)
    : (tasks.find((t) => t.id === nextTaskId) ??
      tasks.find(
        (t) =>
          t.progress.status !== 'completed' &&
          t.dependencies.every((id) =>
            tasks.some((d) => d.id === id && d.progress.status === 'completed'),
          ),
      ))
  // "Abrir meu jogo" sem o host saber abrir o jogo direto: a missão do Estúdio mais adiantada que
  // já começou (abrir a ÚLTIMA, que ainda depende das anteriores, fazia o servidor recusar).
  const studioTasks = tasks.filter((t) => t.destination === 'studio')
  const gameTask =
    [...studioTasks].reverse().find((t) => t.progress.status !== 'planned') ??
    (nextTask?.destination === 'studio' ? nextTask : undefined) ??
    // Nunca uma missão que ainda depende de outra: o servidor recusaria abrir por ela.
    studioTasks.find((t) =>
      t.dependencies.every((id) =>
        tasks.some((d) => d.id === id && d.progress.status === 'completed'),
      ),
    )
  const waitingOn = teamNext?.waitingOn ?? null
  const waitingTask = waitingOn ? tasks.find((t) => t.id === waitingOn.missionId) : undefined
  /** 1º nome de alguém da equipe, ou `null` (a frase então diz "alguém da equipe"). */
  const firstNameOf = (profileId: string) =>
    teamView?.people.find((p) => p.profileId === profileId)?.firstName?.trim() || null
  /** Rótulo curto do "Meu caminho": "você" ou o 1º nome ("Colega" sem nome). */
  const shortName = (profileId: string) =>
    profileId === team?.viewerProfileId ? JOURNEY_TEAM_COPY.you : personName(firstNameOf(profileId))
  const programmerName = team ? firstNameOf(team.roles.code) : null
  const waitingTitle = waitingTask
    ? waitingTask.destination === 'studio'
      ? JOURNEY_TEAM_COPY.waitingCode(firstNameOf(waitingOn?.workers[0] ?? ''))
      : (waitingOn?.workers.length ?? 0) > 1
        ? JOURNEY_TEAM_COPY.waitingArtTeam
        : JOURNEY_TEAM_COPY.waitingArt(firstNameOf(waitingOn?.workers[0] ?? ''))
    : ''
  const waitingKicker = waitingTask
    ? (waitingOn?.workers.length ?? 0) > 1
      ? JOURNEY_TEAM_COPY.missionOfArtTeam
      : JOURNEY_TEAM_COPY.missionOf(firstNameOf(waitingOn?.workers[0] ?? ''))
    : ''
  // A dona vê o "Equipe" mesmo sozinha (é por ele que ela convida); quem entrou, sempre.
  const showTeamButton = Boolean(
    team && view?.project.status === 'active' && (team.memberCount > 0 || isOwner),
  )
  /** Quem NÃO programa: no lugar dos botões de testar e guardar, quem faz isso. */
  const programmerNote = canProgram ? null : (
    <p className="pensa-journey-team-note">
      <span className="pensa-journey-team-note__icon" aria-hidden="true">
        <UsersIcon size={16} />
      </span>
      <span>{JOURNEY_TEAM_COPY.programmerOnly(programmerName)}</span>
    </p>
  )
  /** "Travei nesta parte" também no teste: pedir ajuda não pode depender de estar numa missão. */
  const stuckButton = (
    <button
      type="button"
      className="sz-tool-pill sz-tool-pill--quiet"
      onClick={() => focusChat('help')}
    >
      Travei nesta parte
    </button>
  )
  const seePath = () => {
    const section = pathRef.current
    if (!section) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    section.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    pathTitleRef.current?.focus({ preventScroll: true })
  }
  /** Abre (ou fecha) a revisão de uma etapa vencida e leva o foco ao título dela. */
  const openReview = (key: PensaZeroStage | null) => {
    const closing = key === null && review !== null
    const previous = review
    setReview(key)
    if (key) focusReview.current = true
    else if (closing && previous) window.setTimeout(() => zeroButtons.current[previous]?.focus(), 0)
  }
  const focusChat = (kind: 'planning' | 'help' | 'backlog' = 'help') => {
    setConversationKind(kind)
    setTalking(true)
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }
  const stage = state ? pensaZeroStage(state) : 'z'
  const hasGames = projects.length > 0
  // Na home, o campo do jogo NOVO nasce aberto só no primeiro jogo; com jogos, ele abre pelo
  // "+ Novo jogo" (aberto sempre, parecia o lugar de mexer no jogo de cima).
  const homeComposer = !view && !archived && (newGame || !hasGames)
  // No jogo: enquanto a ideia é contada, quando a criança pede para mudar ou trava, e na
  // proposta só se já existe um texto guardado (senão "Envie sua mudança" ficaria sem campo).
  // O Zappy perguntou e espera a resposta (só o planejamento pergunta com respostas prontas).
  // Vale também na proposta ("Quero mudar uma coisa" pode virar pergunta) e depois de reabrir o
  // jogo: o campo abre sozinho, senão a pergunta sumia e o aceite da proposta antiga era recusado.
  const lastMessage = state?.messages.at(-1)
  const questionWaiting =
    !running && lastMessage?.role === 'assistant' && Boolean(lastMessage.choices)
  const gameComposer =
    Boolean(state) &&
    view?.project.status !== 'archived' &&
    // Guardar uma ideia vale em qualquer momento (pausado, versão pronta): o core aceita.
    ((talking && conversationKind === 'backlog') ||
      ((state?.stage === 'idea' ||
        talking ||
        questionWaiting ||
        (state?.stage === 'proposal' && Boolean(text.trim()))) &&
        !state?.paused &&
        state?.stage !== 'closed'))
  const composer = (homeComposer || gameComposer) && !review
  const failed = view?.operation?.status === 'failed'
  const versionNumber = view?.cycles.find((c) => c.id === state?.cycleId)?.number ?? 1
  const doneCount = tasks.filter((t) => t.progress.status === 'completed').length
  const missionsLeft = tasks.some((t) => t.progress.status !== 'completed')
  const activeGame = view?.project.status === 'active'
  const missionNumber = nextTask ? tasks.indexOf(nextTask) + 1 : 0
  /** O que o botão da missão FAZ: começar a que ainda não começou, continuar a começada. */
  const missionCta = nextTask
    ? `${nextTask.progress.status === 'in_progress' ? 'Continuar' : 'Começar'} a missão no ${DESTINATIONS[nextTask.destination].label}`
    : ''
  // Todas as etapas vencidas: a versão foi experimentada e guardada pronta.
  const allDone = state?.stage === 'closed' && state.closedReason === 'met'
  const pose: PensaMascotPose = running
    ? 'thinking'
    : failed
      ? 'sleeping'
      : allDone
        ? 'celebrating'
        : 'happy'
  const mascot = (size: number, which: PensaMascotPose = pose) =>
    adapter.mascotImages?.[which] ? (
      <img
        className="pensa-journey-zappy"
        src={adapter.mascotImages[which]}
        alt=""
        width={size}
        height={size}
      />
    ) : null
  // A preparação diz o que está acontecendo de verdade: ajuda não é "organizar a ideia".
  const waiting =
    state?.stage === 'preparing'
      ? {
          title: 'Preparando seu caminho',
          text: 'Estou separando as missões e conferindo o que dá para fazer com as suas ferramentas. Você pode sair e voltar depois.',
        }
      : view?.operation?.kind === 'help'
        ? {
            title: 'Pensando na sua dúvida',
            text: 'Já volto com uma dica para esta parte. Você pode continuar olhando o seu jogo.',
          }
        : {
            title: 'Organizando sua ideia',
            text: 'Estou conferindo o que dá para criar com as suas ferramentas. Você pode sair e voltar depois.',
          }
  const headerStatus = !view
    ? null
    : view.project.status === 'archived'
      ? { tone: 'warn', text: 'Nos arquivados' }
      : state?.paused
        ? { tone: 'warn', text: 'Pausado' }
        : running
          ? { tone: 'info', text: 'Zappy pensando…' }
          : allDone
            ? { tone: 'ok', text: 'Versão pronta' }
            : null
  const continueGame = !view && !archived ? projects[0] : undefined
  // "+ Novo jogo" só na home de quem já tem jogo (no primeiro, o campo já está aberto).
  const showNewGame = !view && !archived && hasGames && !loading
  // Pedir ajuda começa por um atalho que a criança reconhece; ela revisa e envia (nada sai sozinho).
  const helpChips =
    composer && talking && conversationKind === 'help' && !text.trim() ? HELP_STARTERS : []
  // A pergunta do Zappy que espera resposta: as respostas viram botões que PREENCHEM o campo (o
  // gesto dos chips que ela aprovou; nada sai sozinho), mais "Tanto faz" e "Contar do meu jeito".
  const pendingQuestion =
    composer && conversationKind === 'planning' && questionWaiting && lastMessage?.choices
      ? { text: lastMessage.text, ...lastMessage.choices }
      : null
  // As ideias para depois (as da criança e os caprichos que o Zappy guardou) ajudam a começar a
  // versão nova; com uma pergunta esperando, a resposta vem antes.
  const ideaChips =
    composer &&
    state?.stage === 'idea' &&
    conversationKind !== 'backlog' &&
    !pendingQuestion &&
    state.backlog.length
      ? state.backlog.slice(-4)
      : []
  const answerTexts = pendingQuestion
    ? [...pendingQuestion.options.map((option) => option.label), ANY_ANSWER]
    : []
  // A resposta pronta escolhida é a ÚLTIMA linha do campo; o que vem antes é o que a criança
  // escreveu do jeito dela, e fica.
  const answerLines = text.trimEnd().split('\n')
  const chosenAnswer = answerTexts.includes(answerLines.at(-1)?.trim() ?? '')
    ? (answerLines.at(-1)?.trim() ?? null)
    : null
  const ownText = (chosenAnswer ? answerLines.slice(0, -1).join('\n') : text).trimEnd()
  /** Uma resposta troca a outra; o texto dela fica, com a resposta embaixo. */
  const answer = (value: string) => {
    // Sem foco no campo: no tablet ele abriria o teclado por cima das respostas e do "Enviar"
    // (tocar existe para não precisar digitar). O foco fica no botão tocado.
    setText(ownText ? `${ownText}\n${value}` : value)
  }
  // Sem ideia: sugestões COMPLETAS que só preenchem o campo do jogo novo (o `suggestions.ts` do
  // sandbox). Somem quando há texto, e voltam se ela apagar.
  const ideaStarters = homeComposer && !text.trim() ? IDEA_STARTERS : []
  // Os usos do Zappy acabaram: o campo avisa ANTES de ela escrever (guardar ideia não gasta).
  const creditsMeter = resolveAiCredits(credits)
  // O que o envio vai pedir ao servidor (a mesma conta do `send`).
  const sendKind: 'planning' | 'help' =
    state && (['building', 'observing'].includes(state.stage) || conversationKind === 'help')
      ? 'help'
      : 'planning'
  // Responder ao Zappy que está esperando não gasta uso novo: o servidor retoma o MESMO pedido
  // (a mesma reserva, a mesma régua do members). Bloquear aqui deixava a criança sem responder a
  // pergunta com o servidor pronto para aceitar.
  const operation = view?.operation
  const reusesHold = Boolean(
    operation?.status === 'waiting' &&
      (operation.kind === 'planning'
        ? sendKind === 'planning' || state?.stage === 'proposal'
        : operation.kind === sendKind),
  )
  const outOfUses =
    creditsMeter.state === 'exhausted' && conversationKind !== 'backlog' && !reusesHold
  // Desenhar a arte do jogo é uma OFERTA (15/10/2026, decisão dela): a proposta começa com figuras
  // prontas, e a missão do Pinta (ou do Molda, num jogo 3D) só entra se a criança aceitar. Aceitar
  // é o gesto das respostas prontas: o pedido vai para o campo e ela toca em "Enviar para o Zappy",
  // que refaz o começo com a missão de desenhar. Só no começo do jogo (versão 1, nenhuma arte no
  // caminho, nem nas missões já feitas), com a oficina na proposta, um uso do Zappy sobrando e o
  // campo fora do "guardar ideia" (lá o pedido viraria uma ideia guardada).
  const offeredProposal =
    state?.stage === 'proposal' &&
    !questionWaiting &&
    versionNumber === 1 &&
    !outOfUses &&
    !(talking && conversationKind === 'backlog') &&
    !tasks.some((t) => t.destination !== 'studio')
      ? (state.proposal ?? null)
      : null
  const artTool: 'pinta' | 'molda' | null =
    offeredProposal && !offeredProposal.missions.some((m) => m.destination !== 'studio' || m.asset)
      ? offeredProposal.dimension === '3d'
        ? offeredProposal.capabilities.molda
          ? 'molda'
          : null
        : offeredProposal.capabilities.pinta
          ? 'pinta'
          : null
      : null
  // Em equipe, a arte é de quem cuida das artes: quem só programa pede o desenho para a equipe.
  const artForTeam = Boolean(team && teamMode && !team.roles.art.includes(team.viewerProfileId))
  const artOffer = artTool
    ? { tool: artTool, ...ART_OFFERS[artTool][artForTeam ? 'team' : 'self'] }
    : null
  const artOfferChosen = Boolean(artOffer && answerLines.at(-1)?.trim() === artOffer.request)
  // Tocar de novo tira o pedido (como trocar de resposta pronta): o botão fica, com `aria-pressed`,
  // e o foco fica nele. O campo aparece embaixo do cartão; a tela rola até ele sem focar (no
  // tablet o teclado cobriria o "Enviar").
  const toggleArtOffer = () => {
    if (!artOffer) return
    if (artOfferChosen) {
      setText(answerLines.slice(0, -1).join('\n').trimEnd())
      return
    }
    setConversationKind('planning')
    setTalking(true)
    setText(text.trim() ? `${text.trimEnd()}\n${artOffer.request}` : artOffer.request)
    window.setTimeout(() => inputRef.current?.scrollIntoView?.({ block: 'nearest' }), 0)
  }
  // As etapas de verdade do que o Zappy está fazendo (o sandbox mostra cada passo do agente).
  const operationStep = view?.operation?.step
  const waitingSteps: Array<{ label: string; state: 'done' | 'now' | 'next' }> | null =
    view?.operation?.kind !== 'planning'
      ? null
      : state?.stage === 'preparing'
        ? [
            { label: 'Você escolheu o começo', state: 'done' },
            { label: 'Escrevendo o passo a passo de cada missão', state: 'now' },
          ]
        : [
            {
              label: 'Entendendo a sua ideia',
              state: operationStep === 'propose' ? 'now' : 'done',
            },
            {
              label: 'Conferindo com os seus blocos e montando o começo',
              state: operationStep === 'propose' ? 'next' : 'now',
            },
          ]
  const placeholder = !state
    ? 'Pode ser uma ideia bem pequena. Não precisa saber como fazer ainda.'
    : pendingQuestion
      ? 'Ou conte do seu jeito.'
      : conversationKind === 'backlog'
        ? 'Ex.: uma fase de neve para depois.'
        : conversationKind === 'help'
          ? 'Ex.: apertei a seta e nada aconteceu.'
          : 'Ex.: em vez de queijos, o gato pega estrelas.'

  /** Renomear (o lápis do plano clássico): troca na hora e desfaz se o servidor recusar. */
  const renameGame = async (name: string) => {
    if (!view) return
    const id = view.project.id
    const before = view.project.name
    updateView((now) =>
      now?.project.id === id ? { ...now, project: { ...now.project, name } } : now,
    )
    try {
      setView(
        await api.request<PensaJourneyView>(`/v2/projects/${id}`, {
          method: 'PATCH',
          body: { name },
        }),
      )
    } catch (cause) {
      updateView((now) =>
        now?.project.id === id ? { ...now, project: { ...now.project, name: before } } : now,
      )
      setError(errorText(cause))
    }
  }
  /** A lixeira do cartão na home: apaga, tira o cartão da grade e devolve o foco ao título. */
  const confirmRemove = async () => {
    const target = removeTarget
    if (!target || removing) return
    setRemoving(true)
    setRemoveError(null)
    try {
      await api.request(`/v2/projects/${target.id}`, { method: 'DELETE' })
      // O cartão (e a lixeira dele) sumiu: o foco volta ao título da página.
      removeOpenerRef.current = titleRef.current
      setRemoveTarget(null)
      setProjects((list) => list.filter((game) => game.id !== target.id))
      void loadList(archived).catch(() => undefined)
    } catch (cause) {
      setRemoveError(errorText(cause))
    } finally {
      setRemoving(false)
    }
  }
  // A oficina da missão precisa estar liberada para a criança: sem ela, o botão fica desligado e
  // diz por quê (o plano clássico fazia isso; o v2 abria uma tela trancada, sem saída).
  const toolOwned = (destination: PensaTaskView['destination']) =>
    destination === 'studio'
      ? adapter.capabilities.studioOwned
      : destination === 'pinta'
        ? adapter.capabilities.pintaOwned
        : adapter.capabilities.moldaOwned === true
  const toolLockedText = (destination: PensaTaskView['destination']) =>
    `O ${DESTINATIONS[destination].label} ainda não está liberado para você. Esta missão espera por ele, e o resto do caminho continua aqui.`
  /** As missões do caminho, uma por linha: a lista de "Meu caminho" e da revisão da etapa R. */
  const renderPath = (withSummary = false) => (
    <ol className="pensa-journey-path">
      {tasks.map((t, index) => {
        const done = t.progress.status === 'completed'
        // "Agora" é a missão da frente: a minha ou a que a equipe espera.
        const now = t.id === (nextTask ?? waitingTask)?.id
        // Em equipe, quem faz cada missão ("você" / 1º nome).
        const who = team && teamMode ? joinNames(missionPeople(t, team.roles).map(shortName)) : null
        // Rever abre a missão na MINHA oficina: só a que eu posso fazer e que
        // não foi feita por outra pessoa (a arte da colega mora na conta dela).
        const reviewable =
          !team ||
          !teamMode ||
          (canWorkOnPensaMission(t.destination, team.viewerProfileId, team.roles) &&
            (!t.completedByProfileId || t.completedByProfileId === team.viewerProfileId))
        return (
          <li key={t.id} className={done ? 'is-done' : now ? 'is-now' : ''}>
            <span
              className={`pensa-journey-path__tile pensa-journey-path__tile--${DESTINATIONS[t.destination].tile}`}
              aria-hidden="true"
            >
              {done ? <CheckIcon size={16} /> : index + 1}
            </span>
            <span className="pensa-journey-path__text">
              <strong>{t.title}</strong>
              {withSummary && t.summary ? (
                <span className="pensa-journey-path__summary">{t.summary}</span>
              ) : null}
              <small>
                {DESTINATIONS[t.destination].label}
                {who ? ` · ${who}` : ''}
                {done ? ' · feita' : now ? ' · agora' : ''}
              </small>
            </span>
            {done && reviewable && toolOwned(t.destination) ? (
              <button
                type="button"
                className="sz-tool-pill sz-tool-pill--outline pensa-journey-path__review"
                aria-label={`Rever ${t.title}`}
                onClick={() =>
                  adapter.onOpenTask({
                    taskId: t.id,
                    destination: t.destination,
                  })
                }
              >
                Rever
              </button>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
  return (
    <div
      ref={rootRef}
      className={`pensa-planner pensa-journey pensa-theme-${adapter.theme ?? 'light'}`}
    >
      <div className="sz-tool-bands">
        <header className="sz-tool-band sz-tool-band--creme pensa-journey-top">
          <div className="sz-tool-band__inner">
            <div className="sz-tool-header">
              <div className="sz-tool-header__lead">
                {chrome?.menu || view || chrome?.back ? (
                  <div className="sz-tool-header__nav">
                    {chrome?.menu ? <HostMenuButton menu={chrome.menu} /> : null}
                    {view ? (
                      <button
                        type="button"
                        className="sz-tool-icon-btn"
                        aria-label="Voltar aos meus jogos"
                        onClick={home}
                        disabled={voiceBusy}
                      >
                        <ArrowLeftIcon />
                      </button>
                    ) : chrome?.back ? (
                      <HostBackLink back={chrome.back} />
                    ) : null}
                  </div>
                ) : null}
                <div className="sz-tool-header__title">
                  {view ? (
                    <p className="sz-tool-kicker">Meu jogo · versão {versionNumber}</p>
                  ) : (
                    <p className="pensa-home-chip">
                      <LightbulbIcon size={16} />
                      Pensa · sua oficina de jogos
                    </p>
                  )}
                  {view ? (
                    <GameNameTitle
                      name={view.project.name}
                      canRename={isOwner && view.project.status === 'active'}
                      titleRef={titleRef}
                      onRename={renameGame}
                    />
                  ) : (
                    <h1 className="sz-tool-title" ref={titleRef} tabIndex={-1}>
                      {archived
                        ? 'Jogos guardados'
                        : continueGame
                          ? 'Vamos continuar seu jogo?'
                          : 'Que jogo você está imaginando?'}
                    </h1>
                  )}
                  {!view ? (
                    <p className="sz-tool-subtitle">
                      {archived
                        ? 'Os jogos que você guardou continuam aqui.'
                        : hasGames
                          ? 'Escolha um jogo para continuar ou comece um novo.'
                          : 'Conte do seu jeito. Eu ajudo a encontrar um começo, e você constrói o jogo.'}
                    </p>
                  ) : null}
                </div>
              </div>
              {headerStatus || showTeamButton || showNewGame ? (
                <div className="sz-tool-header__actions">
                  {showNewGame ? (
                    <button
                      ref={newGameRef}
                      type="button"
                      className="sz-tool-pill sz-tool-pill--primary"
                      aria-expanded={newGame}
                      aria-controls="pensa-new-game"
                      onClick={() => {
                        setNewGame(true)
                        window.setTimeout(() => inputRef.current?.focus(), 0)
                      }}
                    >
                      <PlusIcon />
                      Novo jogo
                    </button>
                  ) : null}
                  {showTeamButton && team ? (
                    // "Equipe · N" (N = quem entrou). O "·" é desenho: o nome acessível vem
                    // inteiro do texto invisível ("Equipe, N na equipe"), como no plano clássico.
                    <button
                      ref={teamOpenerRef}
                      type="button"
                      className="sz-tool-pill sz-tool-pill--outline pensa-team-button"
                      aria-haspopup="dialog"
                      onClick={() => setTeamOpen(true)}
                    >
                      <UsersIcon size={16} />
                      <span aria-hidden="true">
                        {TEAM_COPY.button} · {team.memberCount}
                      </span>
                      <span className="pensa-sr-only">
                        {TEAM_COPY.button}, {team.memberCount} na equipe
                      </span>
                    </button>
                  ) : null}
                  {headerStatus ? (
                    <p
                      className={`sz-tool-status pensa-journey-status${headerStatus.tone === 'ok' ? ' sz-tool-status--ok' : headerStatus.tone === 'warn' ? ' sz-tool-status--warn' : ''}`}
                    >
                      <span className="pensa-plan-status__dot" aria-hidden="true" />
                      {headerStatus.text}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
            {state ? (
              <ZeroMap
                current={stage}
                allDone={allDone}
                reviewing={review}
                onReview={openReview}
                buttons={zeroButtons.current}
              />
            ) : null}
            {continueGame && !loading ? (
              <section className="pensa-journey-continue" aria-label="Continuar meu jogo">
                <span className="sz-tool-tile sz-tool-tile--pensa" aria-hidden="true">
                  {continueGame.stage.toUpperCase()}
                </span>
                <div className="pensa-journey-continue__body">
                  <p className="sz-tool-kicker">Continuar de onde parou</p>
                  <h2 className="pensa-journey-continue__name">{continueGame.name}</h2>
                  <p className="pensa-journey-continue__text">
                    {continueGame.paused
                      ? 'Sua ideia e seu caminho continuam aqui.'
                      : `${PENSA_ZERO_LABELS[continueGame.stage].title}: ${PENSA_ZERO_LABELS[continueGame.stage].action.toLowerCase()}.`}
                  </p>
                </div>
                <button
                  type="button"
                  className="sz-tool-pill sz-tool-pill--primary"
                  onClick={() => void open(continueGame.id)}
                >
                  Continuar este jogo
                  <ArrowRightIcon />
                </button>
              </section>
            ) : null}
          </div>
        </header>

        <section className="sz-tool-band sz-tool-band--ceu pensa-journey-now" aria-label="Agora">
          <div className="sz-tool-band__inner pensa-journey-stack">
            {loading ? (
              <p className="pensa-journey-loading" role="status">
                {mascot(56, 'thinking')}
                Abrindo seu caminho…
              </p>
            ) : (
              <>
                {error ? (
                  <div className="pensa-journey-notice" role="alert" ref={noticeRef}>
                    <p>{error}</p>
                    <button
                      type="button"
                      className="sz-tool-pill sz-tool-pill--outline"
                      onClick={() =>
                        void run(async () => {
                          if (active.current) await load(active.current)
                          else await loadList(archived)
                        })
                      }
                    >
                      Atualizar
                    </button>
                  </div>
                ) : null}
                {review && state ? (
                  <StageReview
                    stage={review}
                    state={state}
                    teamMode={teamMode}
                    titleRef={reviewTitleRef}
                    onClose={() => openReview(null)}
                    path={renderPath(true)}
                  />
                ) : (
                  <>
                    {view?.project.status === 'archived' ? (
                      <section className="pensa-journey-card pensa-journey-card--talk">
                        {mascot(72, 'sleeping')}
                        <div className="pensa-journey-card__body">
                          <h2 className="pensa-journey-card__title">Este jogo está guardado</h2>
                          <p>
                            {isOwner
                              ? 'Ele está nos arquivados. Você pode trazer de volta e continuar de onde parou.'
                              : 'Ele está nos arquivados. Só quem criou o jogo pode trazer de volta.'}
                          </p>
                          {isOwner ? (
                            <div className="pensa-journey-actions">
                              <button
                                type="button"
                                className="sz-tool-pill sz-tool-pill--primary"
                                disabled={busy}
                                onClick={() =>
                                  void run(async () => {
                                    setView(
                                      await api.request(`/v2/projects/${view.project.id}`, {
                                        method: 'PATCH',
                                        body: { status: 'active' },
                                      }),
                                    )
                                  })
                                }
                              >
                                Continuar este jogo
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </section>
                    ) : state?.paused ? (
                      <section className="pensa-journey-card pensa-journey-card--talk">
                        {mascot(72, 'sleeping')}
                        <div className="pensa-journey-card__body">
                          <h2 className="pensa-journey-card__title">Seu caminho está guardado</h2>
                          <p>A ideia e as missões continuam aqui.</p>
                          <div className="pensa-journey-actions">
                            <button
                              type="button"
                              className="sz-tool-pill sz-tool-pill--primary"
                              disabled={busy}
                              onClick={() => void command({ type: 'resume' })}
                            >
                              Continuar de onde parei
                            </button>
                          </div>
                        </div>
                      </section>
                    ) : running ? (
                      <section
                        className="pensa-journey-card pensa-journey-card--talk"
                        aria-live="polite"
                      >
                        {mascot(72, 'thinking')}
                        <div className="pensa-journey-card__body">
                          <h2 className="pensa-journey-card__title">{waiting.title}</h2>
                          <p>{waiting.text}</p>
                          {state?.stage === 'preparing' && state.proposal ? (
                            <p className="pensa-journey-chosen">
                              <CheckIcon size={16} />
                              <span>
                                <strong>O começo que você escolheu:</strong>{' '}
                                {state.proposal.firstResult}
                              </span>
                            </p>
                          ) : null}
                          {waitingSteps ? (
                            <ol className="pensa-journey-progress">
                              {waitingSteps.map((step) => (
                                <li key={step.label} className={`is-${step.state}`}>
                                  <span className="pensa-journey-progress__mark" aria-hidden="true">
                                    {step.state === 'done' ? <CheckIcon size={14} /> : null}
                                  </span>
                                  {step.label}
                                  <span className="pensa-sr-only">
                                    {step.state === 'done'
                                      ? ' (feito)'
                                      : step.state === 'now'
                                        ? ' (agora)'
                                        : ' (depois)'}
                                  </span>
                                </li>
                              ))}
                            </ol>
                          ) : (
                            <span className="pensa-journey-dots" aria-hidden="true">
                              <span />
                              <span />
                              <span />
                            </span>
                          )}
                          <div className="pensa-journey-actions">
                            <button
                              type="button"
                              className="sz-tool-pill sz-tool-pill--outline"
                              disabled={busy}
                              onClick={() =>
                                void run(async () => {
                                  if (view)
                                    setView(
                                      await api.request(`/v2/projects/${view.project.id}/cancel`, {
                                        method: 'POST',
                                      }),
                                    )
                                })
                              }
                            >
                              Parar por aqui
                            </button>
                          </div>
                        </div>
                      </section>
                    ) : failed && view?.operation ? (
                      <section className="pensa-journey-card pensa-journey-card--talk">
                        {mascot(72, 'sleeping')}
                        <div className="pensa-journey-card__body">
                          <h2 className="pensa-journey-card__title">Sua ideia continua guardada</h2>
                          <p>{view.operation.error}</p>
                          <div className="pensa-journey-actions">
                            <button
                              type="button"
                              className="sz-tool-pill sz-tool-pill--primary"
                              disabled={busy}
                              onClick={() =>
                                void run(async () => {
                                  await api.request(`/v2/projects/${view.project.id}/work`, {
                                    method: 'POST',
                                    body: { retry: true },
                                  })
                                  await load(view.project.id)
                                })
                              }
                            >
                              Tentar de novo
                            </button>
                            <button
                              type="button"
                              className="sz-tool-pill sz-tool-pill--outline"
                              disabled={busy}
                              onClick={() =>
                                void run(async (isCurrent) => {
                                  const cancelled = await api.request<PensaJourneyView>(
                                    `/v2/projects/${view.project.id}/cancel`,
                                    { method: 'POST' },
                                  )
                                  setView(
                                    await api.request(`/v2/projects/${view.project.id}/command`, {
                                      method: 'POST',
                                      body: {
                                        expectedRevision: cancelled.journey.revision,
                                        command: { type: 'resume' },
                                      },
                                    }),
                                  )
                                  if (!isCurrent()) return
                                  focusChat(
                                    ['idea', 'proposal', 'preparing'].includes(
                                      cancelled.journey.stage,
                                    )
                                      ? 'planning'
                                      : 'help',
                                  )
                                })
                              }
                            >
                              Ajustar meu pedido
                            </button>
                          </div>
                        </div>
                      </section>
                    ) : null}

                    {state?.stage === 'proposal' &&
                    state.proposal &&
                    !state.paused &&
                    !running &&
                    view?.project.status === 'active' ? (
                      <section className="pensa-journey-card pensa-journey-proposal">
                        <div className="pensa-journey-card__head">
                          {mascot(56, 'happy')}
                          <div>
                            <p className="sz-tool-kicker">Um começo para seu jogo</p>
                            <h2 className="pensa-journey-card__title">
                              {state.proposal.firstResult}
                            </h2>
                          </div>
                        </div>
                        <p className="pensa-journey-lead">{state.proposal.summary}</p>
                        {adapter.renderListen ? (
                          <div className="pensa-journey-listen">
                            {adapter.renderListen({
                              origin: 'pensa_proposal',
                              projectId: state.projectId,
                              cycleId: state.cycleId,
                              proposalId: state.proposal.id,
                            })}
                          </div>
                        ) : null}
                        <div className="pensa-journey-ideas">
                          <h3 className="pensa-journey-subtitle">Da sua ideia</h3>
                          <ul className="pensa-journey-essentials">
                            {state.proposal.essentials.map((s) => (
                              <li key={s}>
                                <CheckIcon size={16} />
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                        {state.proposal.suggestions.length ? (
                          <details className="pensa-journey-fold pensa-journey-fold--inline">
                            <summary>O que o Zappy sugeriu</summary>
                            <div className="pensa-journey-fold__body">
                              <ul className="pensa-journey-suggestions">
                                {state.proposal.suggestions.map((s) => (
                                  <li key={s}>{s}</li>
                                ))}
                              </ul>
                              <p className="pensa-journey-hint">Você pode mudar essas escolhas.</p>
                            </div>
                          </details>
                        ) : null}
                        {artOffer ? (
                          <div className="pensa-journey-offer">
                            <span
                              className={`sz-tool-tile sz-tool-tile--${DESTINATIONS[artOffer.tool].tile}`}
                              aria-hidden="true"
                            >
                              {DESTINATIONS[artOffer.tool].icon}
                            </span>
                            <div className="pensa-journey-offer__body">
                              <h3 className="pensa-journey-offer__title">{artOffer.title}</h3>
                              <p className="pensa-journey-offer__text" aria-live="polite">
                                {artOfferChosen ? artOffer.chosen : artOffer.text}
                              </p>
                              <button
                                type="button"
                                className="sz-tool-pill sz-tool-pill--outline pensa-journey-offer__btn"
                                aria-pressed={artOfferChosen}
                                disabled={busy || voiceBusy}
                                onClick={toggleArtOffer}
                              >
                                {artOfferChosen ? (
                                  <CheckIcon size={18} />
                                ) : (
                                  DESTINATIONS[artOffer.tool].icon
                                )}
                                {artOffer.button}
                              </button>
                            </div>
                          </div>
                        ) : null}
                        <div className="pensa-journey-actions">
                          <button
                            type="button"
                            className="sz-tool-pill sz-tool-pill--primary"
                            disabled={busy || voiceBusy || Boolean(text.trim()) || questionWaiting}
                            onClick={() =>
                              void command({ type: 'accept', proposalId: state.proposal!.id })
                            }
                          >
                            Vamos construir esse começo
                          </button>
                          <button
                            type="button"
                            className="sz-tool-pill sz-tool-pill--outline"
                            onClick={() => focusChat('planning')}
                          >
                            Quero mudar uma coisa
                          </button>
                        </div>
                        {questionWaiting ? (
                          // O Zappy perguntou algo sobre a mudança: o servidor só aceita escolher
                          // este começo depois da resposta (antes, o aceite voltava como conflito).
                          <p className="pensa-journey-hint">
                            Responda a pergunta do Zappy antes de escolher esse começo.
                          </p>
                        ) : text.trim() ? (
                          <p className="pensa-journey-hint">
                            Envie sua mudança antes de escolher esse começo.
                          </p>
                        ) : null}
                      </section>
                    ) : null}

                    {state &&
                    ['building', 'observing'].includes(state.stage) &&
                    !state.paused &&
                    !running &&
                    view?.project.status === 'active' ? (
                      // Em equipe, quem faz as artes continua vendo a SUA missão enquanto quem
                      // programa testa (antes o teste escondia a missão de todo mundo).
                      (state.stage === 'building' || (teamMode && !canProgram)) && nextTask ? (
                        <section className="pensa-journey-card pensa-journey-mission">
                          <div className="pensa-journey-card__head">
                            <span
                              className={`sz-tool-tile sz-tool-tile--${DESTINATIONS[nextTask.destination].tile}`}
                              aria-hidden="true"
                            >
                              {DESTINATIONS[nextTask.destination].icon}
                            </span>
                            <div>
                              <p className="sz-tool-kicker">
                                {teamMode ? JOURNEY_TEAM_COPY.yourMission : 'Sua próxima missão'} ·{' '}
                                {missionNumber} de {tasks.length}
                              </p>
                              <h2 className="pensa-journey-card__title">{nextTask.title}</h2>
                            </div>
                          </div>
                          {nextTask.summary ? (
                            <p className="pensa-journey-lead">{nextTask.summary}</p>
                          ) : null}
                          <MissionDots tasks={tasks} current={nextTask.id} />
                          {/* Um caminho só (15/10/2026, relato dela: três botões e a criança na
                          dúvida). O que fazer está escrito; o botão principal abre a missão com o
                          guia; "Travei" é a ajuda. Experimentar o jogo inteiro vem sozinho quando
                          as missões acabam, nunca antes (o jogo nem existe no começo). */}
                          {/* Oficina trancada: o aviso diz por quê, e os passos apontariam para
                          um botão desligado. */}
                          {!toolOwned(nextTask.destination) ? null : tasks.some(
                              (t) => t.progress.status === 'completed',
                            ) ? (
                            <p className="pensa-journey-hint">
                              O Guia do Pensa abre junto, com os passos. No fim, toque em{' '}
                              <strong>Experimentei e funcionou</strong>.
                            </p>
                          ) : (
                            <ol className="pensa-journey-steps" aria-label="Como fazer a missão">
                              <li>
                                Toque em <strong>{missionCta}</strong>. O Guia do Pensa abre junto,
                                com os passos.
                              </li>
                              <li>
                                Faça um passo de cada vez, do jeito que o Guia do Pensa mostra.
                              </li>
                              <li>
                                {nextTask.destination === 'studio' ? (
                                  <>
                                    Aperte <strong>▶ Reproduzir</strong> para ver funcionando e
                                    toque em <strong>Experimentei e funcionou</strong>.
                                  </>
                                ) : (
                                  <>
                                    No fim, toque em <strong>Experimentei e funcionou</strong> no
                                    Guia do Pensa.
                                  </>
                                )}
                              </li>
                            </ol>
                          )}
                          {toolOwned(nextTask.destination) ? null : (
                            <p className="pensa-journey-warn" id="pensa-tool-locked">
                              {toolLockedText(nextTask.destination)}
                            </p>
                          )}
                          <div className="pensa-journey-actions">
                            <button
                              type="button"
                              className="sz-tool-pill sz-tool-pill--primary"
                              disabled={!toolOwned(nextTask.destination)}
                              aria-describedby={
                                toolOwned(nextTask.destination) ? undefined : 'pensa-tool-locked'
                              }
                              onClick={() =>
                                adapter.onOpenTask({
                                  taskId: nextTask.id,
                                  destination: nextTask.destination,
                                })
                              }
                            >
                              {missionCta}
                              <ArrowRightIcon />
                            </button>
                            <button
                              type="button"
                              className="sz-tool-pill sz-tool-pill--quiet"
                              onClick={() => focusChat('help')}
                            >
                              Travei nesta parte
                            </button>
                          </div>
                        </section>
                      ) : state.stage === 'building' && waitingTask ? (
                        // Em equipe, sem missão MINHA: a missão da frente, de quem é, e o que dá para
                        // fazer enquanto isso (ver o caminho, guardar ideias). Nada de botão morto.
                        <section className="pensa-journey-card pensa-journey-mission pensa-journey-waiting">
                          <div className="pensa-journey-card__head">
                            <span
                              className={`sz-tool-tile sz-tool-tile--${DESTINATIONS[waitingTask.destination].tile}`}
                              aria-hidden="true"
                            >
                              {DESTINATIONS[waitingTask.destination].icon}
                            </span>
                            <div>
                              <p className="sz-tool-kicker">
                                {waitingKicker} · {tasks.indexOf(waitingTask) + 1} de {tasks.length}
                              </p>
                              <h2 className="pensa-journey-card__title">{waitingTitle}</h2>
                            </div>
                          </div>
                          <p className="pensa-journey-waiting__mission">
                            <strong className="pensa-journey-waiting__title">
                              {waitingTask.title}
                            </strong>
                            {waitingTask.summary ? (
                              <span className="pensa-journey-waiting__summary">
                                {waitingTask.summary}
                              </span>
                            ) : null}
                          </p>
                          <MissionDots tasks={tasks} current={waitingTask.id} />
                          <p className="pensa-journey-hint">{JOURNEY_TEAM_COPY.waitingLead}</p>
                          <div className="pensa-journey-actions">
                            <button
                              type="button"
                              className="sz-tool-pill sz-tool-pill--primary"
                              onClick={seePath}
                            >
                              {JOURNEY_TEAM_COPY.seePath}
                            </button>
                            <button
                              type="button"
                              className="sz-tool-pill sz-tool-pill--outline"
                              onClick={() => focusChat('backlog')}
                            >
                              <LightbulbIcon size={16} />
                              {JOURNEY_TEAM_COPY.keepIdea}
                            </button>
                          </div>
                        </section>
                      ) : (
                        <section className="pensa-journey-card pensa-journey-test">
                          <div className="pensa-journey-card__head">
                            {mascot(56, 'happy')}
                            <div>
                              <p className="sz-tool-kicker">Hora de testar</p>
                              <h2 className="pensa-journey-card__title">
                                Vamos experimentar seu jogo
                              </h2>
                            </div>
                          </div>
                          <ol className="pensa-journey-steps">
                            <li>
                              <strong>Faça:</strong> {state.proposal?.test.action}
                            </li>
                            <li>
                              <strong>Veja se:</strong> {state.proposal?.test.expected}
                            </li>
                            {canProgram ? (
                              <li>Abra o jogo, experimente e salve antes de contar o resultado.</li>
                            ) : null}
                          </ol>
                          {programmerNote}
                          {canProgram ? null : (
                            <div className="pensa-journey-actions">{stuckButton}</div>
                          )}
                          {canProgram ? (
                            <>
                              {view && toolOwned('studio') && (adapter.onOpenGame || gameTask) ? (
                                <div className="pensa-journey-actions">
                                  <button
                                    type="button"
                                    className="sz-tool-pill sz-tool-pill--outline"
                                    onClick={() =>
                                      adapter.onOpenGame
                                        ? adapter.onOpenGame({ projectId: view.project.id })
                                        : gameTask &&
                                          adapter.onOpenTask({
                                            taskId: gameTask.id,
                                            destination: 'studio',
                                          })
                                    }
                                  >
                                    <BlocksIcon />
                                    Abrir meu jogo
                                  </button>
                                </div>
                              ) : null}
                              <label className="pensa-journey-label" htmlFor="pensa-test-note">
                                O que aconteceu? (se quiser contar)
                              </label>
                              <textarea
                                className="pensa-journey-field"
                                id="pensa-test-note"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                rows={2}
                              />
                              {adapter.renderVoiceInput ? (
                                <div className="pensa-journey-actions">
                                  {adapter.renderVoiceInput({
                                    value: note,
                                    onChange: setNote,
                                    onBusyChange: setVoiceBusy,
                                    disabled: busy,
                                    textareaId: 'pensa-test-note',
                                  })}
                                </div>
                              ) : null}
                              {note.length > 2000 ? (
                                <p className="pensa-journey-warn" role="alert">
                                  Divida seu relato em uma parte menor para este teste. Seu texto
                                  continua inteiro aqui.
                                </p>
                              ) : null}
                              <fieldset className="pensa-journey-results">
                                <legend className="pensa-journey-label">Como foi?</legend>
                                {(
                                  [
                                    ['met', 'Funcionou!'],
                                    ['needs_adjustment', 'Quero ajustar'],
                                    ['inconclusive', 'Não sei ainda'],
                                  ] as const
                                ).map(([result, label]) => (
                                  <button
                                    type="button"
                                    className={`sz-tool-pill ${result === 'met' ? 'sz-tool-pill--primary' : 'sz-tool-pill--outline'}`}
                                    key={result}
                                    disabled={busy || voiceBusy || note.length > 2000}
                                    onClick={() =>
                                      void run(async (isCurrent) => {
                                        const next = await api.request<PensaJourneyView>(
                                          `/v2/projects/${state.projectId}/test`,
                                          {
                                            method: 'POST',
                                            body: {
                                              expectedRevision: state.revision,
                                              id: crypto.randomUUID(),
                                              result,
                                              note,
                                            },
                                          },
                                        )
                                        setView(next)
                                        if (isCurrent()) setNote('')
                                      })
                                    }
                                  >
                                    {label}
                                  </button>
                                ))}
                              </fieldset>
                              {state.stage === 'observing' &&
                              state.tests.length > (state.testSessionStart ?? 0) &&
                              state.tests.at(-1)?.result === 'met' ? (
                                <div className="pensa-journey-done">
                                  <CircleCheckIcon />
                                  <p>
                                    Funcionou! Guarde esta versão para não perder o que você fez.
                                  </p>
                                  <button
                                    type="button"
                                    className="sz-tool-pill sz-tool-pill--primary"
                                    disabled={busy}
                                    onClick={() =>
                                      void run(async () => {
                                        setView(
                                          await api.request(
                                            `/v2/projects/${state.projectId}/close`,
                                            {
                                              method: 'POST',
                                              body: {
                                                expectedRevision: state.revision,
                                                reason: 'met',
                                              },
                                            },
                                          ),
                                        )
                                      })
                                    }
                                  >
                                    Guardar esta versão pronta
                                  </button>
                                </div>
                              ) : state.stage === 'observing' &&
                                (state.tests.length > (state.testSessionStart ?? 0) ||
                                  missionsLeft) ? (
                                // Depois de um teste "Quero ajustar"/"Não sei ainda", ou antes de
                                // qualquer teste com missão faltando: sempre há volta para construir.
                                <div className="pensa-journey-actions">
                                  <button
                                    type="button"
                                    className="sz-tool-pill sz-tool-pill--outline"
                                    disabled={busy}
                                    onClick={() => {
                                      void run(async () => {
                                        await api.request(
                                          `/v2/projects/${state.projectId}/command`,
                                          {
                                            method: 'POST',
                                            body: {
                                              expectedRevision: state.revision,
                                              command: { type: 'repair' },
                                            },
                                          },
                                        )
                                        await load(state.projectId)
                                      })
                                    }}
                                  >
                                    {state.tests.length > (state.testSessionStart ?? 0)
                                      ? 'Voltar para ajustar'
                                      : 'Voltar para as missões'}
                                  </button>
                                  {stuckButton}
                                </div>
                              ) : (
                                <div className="pensa-journey-actions">{stuckButton}</div>
                              )}
                            </>
                          ) : null}
                        </section>
                      )
                    ) : null}

                    {state?.stage === 'closed' && view?.project.status === 'active' ? (
                      <section className="pensa-journey-card pensa-journey-card--talk pensa-journey-closed">
                        {mascot(88, state.closedReason === 'met' ? 'celebrating' : 'happy')}
                        <div className="pensa-journey-card__body">
                          <h2 className="pensa-journey-card__title">
                            {state.closedReason === 'met'
                              ? 'Seu primeiro resultado está guardado!'
                              : 'Você guardou este começo'}
                          </h2>
                          <p>
                            {state.closedReason === 'met'
                              ? 'Você pode brincar com ele ou escolher o próximo pedaço.'
                              : 'Dá para continuar esta mesma versão quando quiser.'}
                          </p>
                          {/* Retomar é de toda a equipe; a versão seguinte e testar de novo são de quem
                            programa (o jogo mora no Estúdio dela). */}
                          {state.closedReason === 'met' && !canProgram ? (
                            programmerNote
                          ) : (
                            <div className="pensa-journey-actions">
                              <button
                                type="button"
                                className="sz-tool-pill sz-tool-pill--primary"
                                disabled={busy}
                                onClick={() =>
                                  state.closedReason === 'incomplete'
                                    ? void command({ type: 'resume' })
                                    : void run(async () => {
                                        setView(
                                          await api.request(
                                            `/v2/projects/${state.projectId}/increment`,
                                            {
                                              method: 'POST',
                                              body: { expectedRevision: state.revision },
                                            },
                                          ),
                                        )
                                      })
                                }
                              >
                                {state.closedReason === 'met'
                                  ? 'Escolher o próximo pedaço'
                                  : 'Continuar esta versão'}
                              </button>
                              {state.closedReason === 'met' ? (
                                <button
                                  type="button"
                                  className="sz-tool-pill sz-tool-pill--outline"
                                  disabled={busy}
                                  onClick={() => void command({ type: 'resume' })}
                                >
                                  Testar mudanças
                                </button>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </section>
                    ) : null}
                  </>
                )}

                {state?.messages.length ? (
                  <details
                    className="pensa-journey-fold pensa-journey-conversation"
                    open={talking || (state.stage === 'idea' && !running)}
                  >
                    <summary>
                      {teamMode ? 'Conversa da equipe com o Zappy' : 'Minha conversa com o Zappy'}
                    </summary>
                    <div className="pensa-journey-fold__body pensa-journey-chat" aria-live="polite">
                      {state.messages.map((m) => (
                        <div
                          className={`pensa-journey-message pensa-journey-message--${m.role}`}
                          key={m.id}
                        >
                          {m.role === 'assistant' ? mascot(36, 'happy') : null}
                          <div className="pensa-journey-message__bubble">
                            <strong>
                              {m.role === 'user' ? (teamMode ? 'Equipe' : 'Você') : 'Zappy'}
                            </strong>
                            {m.choices && !(pendingQuestion && m === lastMessage) ? (
                              <span className="pensa-journey-message__topic">
                                Sobre: {QUESTION_TOPIC[m.choices.about]}
                              </span>
                            ) : null}
                            <p>{m.text}</p>
                            {m.role === 'assistant' && adapter.renderListen ? (
                              <div className="pensa-journey-listen">
                                {adapter.renderListen({
                                  origin: 'pensa_message',
                                  projectId: state.projectId,
                                  cycleId: state.cycleId,
                                  messageId: m.id,
                                  revision: m.revision,
                                })}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}

                {composer ? (
                  <form
                    id={state ? undefined : 'pensa-new-game'}
                    className="pensa-journey-card pensa-journey-compose"
                    onSubmit={(e) => {
                      e.preventDefault()
                      void send()
                    }}
                    onKeyDown={(e) => {
                      // Ctrl/Cmd+Enter envia (o plano clássico fazia isso); Esc fecha o jogo novo.
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault()
                        void send()
                      } else if (e.key === 'Escape' && !state && newGame && !busy) {
                        e.preventDefault()
                        setNewGame(false)
                        newGameRef.current?.focus()
                      }
                    }}
                  >
                    <div className="pensa-journey-compose__ask">
                      {mascot(state ? 48 : 72, 'happy')}
                      <label className="pensa-journey-bubble" htmlFor="pensa-idea">
                        {pendingQuestion ? (
                          <>
                            <span className="pensa-journey-bubble__topic">
                              Sobre: {QUESTION_TOPIC[pendingQuestion.about]}
                            </span>{' '}
                            {pendingQuestion.text}
                          </>
                        ) : state ? (
                          conversationKind === 'backlog' ? (
                            'Que ideia você quer guardar para depois?'
                          ) : talking ? (
                            'Conte o que você quer mudar ou onde travou'
                          ) : (
                            'Quer acrescentar ou mudar alguma coisa?'
                          )
                        ) : hasGames ? (
                          'Como é o seu jogo novo?'
                        ) : (
                          'Como é o jogo que está na sua cabeça?'
                        )}
                      </label>
                    </div>
                    {pendingQuestion ? (
                      <fieldset className="pensa-journey-answers">
                        <legend className="pensa-sr-only">
                          Respostas prontas para a pergunta do Zappy
                        </legend>
                        <div className="pensa-journey-answers__row">
                          {pendingQuestion.options.map((option) => (
                            <button
                              type="button"
                              className="pensa-journey-answer"
                              key={option.label}
                              aria-pressed={chosenAnswer === option.label}
                              disabled={busy}
                              onClick={() => answer(option.label)}
                            >
                              <strong>{option.label}</strong>
                              <span>{option.description}</span>
                            </button>
                          ))}
                        </div>
                        <div className="pensa-journey-answers__row">
                          <button
                            type="button"
                            className="pensa-journey-answer pensa-journey-answer--any"
                            aria-pressed={chosenAnswer === ANY_ANSWER}
                            disabled={busy}
                            onClick={() => answer(ANY_ANSWER)}
                          >
                            <strong>Tanto faz, escolhe você</strong>
                            <span>O Zappy decide e mostra como sugestão dele.</span>
                          </button>
                          <button
                            type="button"
                            className="pensa-journey-answer pensa-journey-answer--own"
                            disabled={busy}
                            onClick={() => {
                              // Tira a resposta pronta e deixa o que ela já escreveu.
                              if (chosenAnswer) setText(ownText)
                              window.setTimeout(() => inputRef.current?.focus(), 0)
                            }}
                          >
                            <strong>Contar do meu jeito</strong>
                            <span>
                              {adapter.renderVoiceInput
                                ? 'Escreva ou fale a sua resposta.'
                                : 'Escreva a sua resposta.'}
                            </span>
                          </button>
                        </div>
                      </fieldset>
                    ) : null}
                    {ideaStarters.length ? (
                      <fieldset className="pensa-journey-chips">
                        <legend>Sem ideia? Comece por uma destas:</legend>
                        {ideaStarters.map((starter) => (
                          <button
                            type="button"
                            className="sz-tool-chip"
                            key={starter.label}
                            onClick={() => {
                              setText(starter.text)
                              window.setTimeout(() => inputRef.current?.focus(), 0)
                            }}
                          >
                            {starter.label}
                          </button>
                        ))}
                      </fieldset>
                    ) : null}
                    {helpChips.length ? (
                      <fieldset className="pensa-journey-chips">
                        <legend>Pode começar por aqui:</legend>
                        {helpChips.map((starter) => (
                          <button
                            type="button"
                            className="sz-tool-chip"
                            key={starter}
                            onClick={() => {
                              setText(starter)
                              window.setTimeout(() => inputRef.current?.focus(), 0)
                            }}
                          >
                            {starter}
                          </button>
                        ))}
                      </fieldset>
                    ) : null}
                    {ideaChips.length ? (
                      <fieldset className="pensa-journey-chips">
                        <legend>Ou comece por uma ideia para depois:</legend>
                        {ideaChips.map((idea) => (
                          <button
                            type="button"
                            className="sz-tool-chip"
                            key={idea.id}
                            onClick={() => {
                              // Junta ao que a criança já escreveu, nunca apaga.
                              setText(text.trim() ? `${text.trimEnd()}\n${idea.text}` : idea.text)
                              window.setTimeout(() => inputRef.current?.focus(), 0)
                            }}
                          >
                            {idea.text}
                          </button>
                        ))}
                      </fieldset>
                    ) : null}
                    <textarea
                      className="pensa-journey-field"
                      ref={inputRef}
                      id="pensa-idea"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      rows={4}
                      placeholder={placeholder}
                      disabled={busy || running}
                    />
                    <div className="pensa-journey-actions pensa-journey-compose__actions">
                      {(!state && newGame) || (state && talking) ? (
                        <button
                          type="button"
                          className="sz-tool-pill sz-tool-pill--quiet"
                          disabled={busy}
                          onClick={() => {
                            if (!state) {
                              setNewGame(false)
                              window.setTimeout(() => newGameRef.current?.focus(), 0)
                              return
                            }
                            // Desistir de pedir ajuda, mudar ou guardar ideia: o campo volta a
                            // ser a conversa de sempre (ou some), e o foco vai ao cartão do momento.
                            setText('')
                            setTalking(false)
                            setConversationKind('planning')
                            window.setTimeout(() => {
                              if (
                                document.activeElement &&
                                document.activeElement !== document.body
                              )
                                return
                              rootRef.current
                                ?.querySelector<HTMLElement>(
                                  '.pensa-journey-now .pensa-journey-card__title',
                                )
                                ?.focus()
                            }, 0)
                          }}
                        >
                          Cancelar
                        </button>
                      ) : null}
                      {conversationKind !== 'backlog' ? <AiCreditsBadge credits={credits} /> : null}
                      {adapter.renderVoiceInput?.({
                        value: text,
                        onChange: setText,
                        onBusyChange: setVoiceBusy,
                        disabled: busy || running,
                        textareaId: 'pensa-idea',
                      })}
                      <button
                        type="submit"
                        className="sz-tool-pill sz-tool-pill--primary"
                        disabled={
                          busy ||
                          running ||
                          voiceBusy ||
                          outOfUses ||
                          !text.trim() ||
                          text.length > 4000
                        }
                      >
                        {state
                          ? conversationKind === 'backlog'
                            ? 'Guardar minha ideia'
                            : 'Enviar para o Zappy'
                          : 'Encontrar um começo'}
                      </button>
                    </div>
                    {outOfUses ? (
                      <AiCreditsNotice>{creditsMeter.exhausted}</AiCreditsNotice>
                    ) : text.length > 4000 ? (
                      <p className="pensa-journey-warn" role="alert">
                        Sua ideia ficou grande para uma mensagem. Divida em duas partes; seu texto
                        continua inteiro aqui.
                      </p>
                    ) : creditsMeter.state === 'exhausted' &&
                      reusesHold &&
                      conversationKind !== 'backlog' ? (
                      <p className="pensa-journey-hint">
                        Responder ao Zappy não gasta uma ideia nova.
                      </p>
                    ) : (
                      <p className="pensa-journey-hint">
                        {adapter.renderVoiceInput
                          ? 'Você pode falar ou escrever. Confira o texto antes de enviar.'
                          : 'Confira o texto antes de enviar.'}
                      </p>
                    )}
                  </form>
                ) : null}
              </>
            )}
          </div>
        </section>

        {!loading ? (
          <section
            className="sz-tool-band sz-tool-band--lilas pensa-journey-more"
            aria-labelledby="pensa-journey-more-title"
          >
            <div className="sz-tool-band__inner pensa-journey-stack">
              {state ? (
                <>
                  <section className="pensa-journey-path-card" ref={pathRef}>
                    <div className="pensa-journey-path-card__head">
                      <h2
                        className="sz-tool-section-title"
                        id="pensa-journey-more-title"
                        ref={pathTitleRef}
                        tabIndex={-1}
                      >
                        Meu caminho
                      </h2>
                      {tasks.length ? (
                        <p className="pensa-journey-path-card__count">
                          Missões feitas: {doneCount} de {tasks.length}
                        </p>
                      ) : null}
                    </div>
                    {tasks.length ? (
                      renderPath()
                    ) : (
                      <p className="pensa-journey-hint">
                        {state.stage === 'idea'
                          ? 'Conte sua ideia para o Zappy. As missões aparecem aqui depois que você escolher um começo.'
                          : 'As missões aparecem aqui depois que você escolher um começo.'}
                      </p>
                    )}
                  </section>
                  <details className="pensa-journey-fold">
                    <summary>Ideias para depois ({state.backlog.length})</summary>
                    <div className="pensa-journey-fold__body">
                      {state.backlog.length ? (
                        <ul className="pensa-journey-backlog">
                          {state.backlog.map((idea) => (
                            <li key={idea.id}>
                              <LightbulbIcon size={16} />
                              <span className="pensa-journey-backlog__text">
                                {idea.text}
                                {idea.origin === 'zappy' ? (
                                  <small> (sugestão do Zappy)</small>
                                ) : null}
                              </span>
                              {view?.project.status === 'archived' ? null : (
                                <button
                                  type="button"
                                  className="pensa-journey-backlog__remove"
                                  aria-label={`Tirar a ideia: ${idea.text}`}
                                  title="Tirar esta ideia"
                                  disabled={busy}
                                  onClick={() =>
                                    void command({ type: 'remove_idea', ideaId: idea.id })
                                  }
                                >
                                  <TrashIcon size={16} />
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="pensa-journey-hint">
                          As próximas ideias ficam aqui, sem atrapalhar o que você está construindo.
                        </p>
                      )}
                      <div className="pensa-journey-actions">
                        <button
                          type="button"
                          className="sz-tool-pill sz-tool-pill--outline"
                          disabled={view?.project.status === 'archived'}
                          onClick={() => focusChat('backlog')}
                        >
                          <PlusIcon />
                          Contar outra ideia
                        </button>
                      </div>
                    </div>
                  </details>
                  <details className="pensa-journey-fold">
                    <summary>Guardar e cuidar deste jogo</summary>
                    <div className="pensa-journey-fold__body">
                      {/* Em equipe: adaptar, encerrar e restaurar são de quem programa (usam o jogo
                          salvo no Estúdio dela); arquivar e apagar são da dona. */}
                      {/* Arquivado: só apagar (da dona). Os outros botões sempre falhariam com
                          "Abra o plano arquivado antes de continuar". */}
                      <ul className="pensa-journey-care">
                        {activeGame &&
                        canProgram &&
                        ['building', 'observing', 'closed'].includes(state.stage) ? (
                          confirmRevise ? (
                            <li className="pensa-journey-care__confirm">
                              <p>
                                {teamMode
                                  ? 'O Zappy vai montar um caminho novo para a equipe, a partir do que vocês já fizeram. As missões que faltam podem mudar para todo mundo.'
                                  : 'O Zappy vai montar um caminho novo a partir do que você já fez. As missões que faltam podem mudar.'}
                              </p>
                              <div className="pensa-journey-actions">
                                <button
                                  type="button"
                                  className="sz-tool-pill sz-tool-pill--primary"
                                  disabled={busy || running}
                                  onClick={() =>
                                    void run(async (isCurrent) => {
                                      setView(
                                        await api.request(
                                          `/v2/projects/${state.projectId}/revise`,
                                          {
                                            method: 'POST',
                                            body: { expectedRevision: state.revision },
                                          },
                                        ),
                                      )
                                      if (!isCurrent()) return
                                      setConfirmRevise(false)
                                      focusChat('planning')
                                    })
                                  }
                                >
                                  Sim, adaptar meu caminho
                                </button>
                                <button
                                  type="button"
                                  className="sz-tool-pill sz-tool-pill--outline"
                                  onClick={() => setConfirmRevise(false)}
                                >
                                  Deixar como está
                                </button>
                              </div>
                            </li>
                          ) : (
                            <li>
                              <button
                                type="button"
                                className="sz-tool-pill sz-tool-pill--outline"
                                disabled={busy || running}
                                onClick={() => setConfirmRevise(true)}
                              >
                                Adaptar meu caminho…
                              </button>
                              <small>Muda as próximas missões a partir do que você já fez.</small>
                            </li>
                          )
                        ) : null}
                        {activeGame && state.stage !== 'closed' ? (
                          <li>
                            <button
                              type="button"
                              className="sz-tool-pill sz-tool-pill--outline"
                              disabled={busy || state.paused}
                              onClick={() => void command({ type: 'pause' })}
                            >
                              Pausar por enquanto
                            </button>
                            <small>Fica tudo guardado do jeito que está.</small>
                          </li>
                        ) : null}
                        {activeGame && canProgram && state.stage !== 'closed' ? (
                          <li>
                            <button
                              type="button"
                              className="sz-tool-pill sz-tool-pill--outline"
                              disabled={busy || running}
                              onClick={() =>
                                void run(async () => {
                                  setView(
                                    await api.request(`/v2/projects/${state.projectId}/close`, {
                                      method: 'POST',
                                      body: {
                                        expectedRevision: state.revision,
                                        reason: 'incomplete',
                                      },
                                    }),
                                  )
                                })
                              }
                            >
                              Encerrar por enquanto
                            </button>
                            <small>Guarda uma cópia do seu jogo como ele está agora.</small>
                          </li>
                        ) : null}
                        {isOwner && activeGame ? (
                          <li>
                            <button
                              type="button"
                              className="sz-tool-pill sz-tool-pill--outline"
                              disabled={busy}
                              onClick={() =>
                                void run(async (isCurrent) => {
                                  await api.request(`/v2/projects/${state.projectId}`, {
                                    method: 'PATCH',
                                    body: { status: 'archived' },
                                  })
                                  if (!isCurrent()) return
                                  focusTitle.current = true
                                  home()
                                })
                              }
                            >
                              Guardar nos arquivados
                            </button>
                            <small>
                              Sai da lista de jogos em andamento. Dá para trazer de volta.
                            </small>
                          </li>
                        ) : null}
                      </ul>
                      {activeGame ? programmerNote : null}
                      {activeGame && canProgram && state.checkpoint ? (
                        <div className="pensa-journey-restore">
                          <label className="pensa-journey-label" htmlFor="pensa-version">
                            Versão guardada
                          </label>
                          <select
                            className="pensa-journey-field"
                            id="pensa-version"
                            value={restoreTarget || state.checkpoint.id}
                            onChange={(event) => setRestoreTarget(event.target.value)}
                          >
                            {(view?.checkpoints ?? [state.checkpoint]).map((checkpoint) => (
                              <option key={checkpoint.id} value={checkpoint.id}>
                                Versão{' '}
                                {view?.cycles.find((c) => c.id === checkpoint.cycleId)?.number ?? 1}{' '}
                                · {new Date(checkpoint.createdAt).toLocaleString('pt-BR')}
                              </option>
                            ))}
                          </select>
                          <p className="pensa-journey-hint">
                            O jogo atual também ganha uma cópia antes de voltar. Depois, você pode
                            recuperá-lo aqui.
                          </p>
                          <div className="pensa-journey-actions">
                            <button
                              type="button"
                              className="sz-tool-pill sz-tool-pill--outline"
                              disabled={busy}
                              onClick={() =>
                                void run(async (isCurrent) => {
                                  setView(
                                    await api.request(`/v2/projects/${state.projectId}/restore`, {
                                      method: 'POST',
                                      body: {
                                        checkpointId: restoreTarget || state.checkpoint!.id,
                                        expectedRevision: state.revision,
                                      },
                                    }),
                                  )
                                  await load(state.projectId)
                                  if (isCurrent()) setRestoreTarget('')
                                })
                              }
                            >
                              Voltar à versão guardada
                            </button>
                          </div>
                        </div>
                      ) : null}
                      {!isOwner ? null : confirmDelete ? (
                        <fieldset
                          className="pensa-journey-danger"
                          aria-label="Confirmar exclusão do plano"
                        >
                          {/* Em equipe, a dona apaga para TODAS, e o jogo não é só dela: a frase diz
                              onde cada parte continua. */}
                          <p>
                            {teamMode
                              ? 'Apagar este plano remove a conversa, as missões e as cópias guardadas aqui, para toda a equipe. O jogo no Estúdio de quem programa e as artes de cada pessoa continuam nos editores.'
                              : 'Apagar este plano remove a conversa, as missões e as cópias guardadas aqui. Seu jogo no Estúdio e suas artes continuam nos editores.'}
                          </p>
                          <div className="pensa-journey-actions">
                            <button
                              type="button"
                              className="sz-tool-pill pensa-journey-delete"
                              disabled={busy}
                              onClick={() =>
                                void run(async (isCurrent) => {
                                  await api.request(`/v2/projects/${state.projectId}`, {
                                    method: 'DELETE',
                                  })
                                  if (!isCurrent()) return
                                  focusTitle.current = true
                                  home()
                                })
                              }
                            >
                              Sim, apagar este plano
                            </button>
                            <button
                              type="button"
                              className="sz-tool-pill sz-tool-pill--outline"
                              ref={keepRef}
                              onClick={() => setConfirmDelete(false)}
                            >
                              Manter meu plano
                            </button>
                          </div>
                        </fieldset>
                      ) : (
                        <div className="pensa-journey-actions">
                          <button
                            type="button"
                            className="sz-tool-pill sz-tool-pill--quiet pensa-journey-remove"
                            disabled={busy}
                            onClick={() => setConfirmDelete(true)}
                          >
                            <TrashIcon />
                            Apagar este plano…
                          </button>
                        </div>
                      )}
                    </div>
                  </details>
                </>
              ) : (
                <>
                  <div className="sz-tool-header pensa-journey-games-head">
                    <h2 className="sz-tool-section-title" id="pensa-journey-more-title">
                      {archived
                        ? 'Jogos guardados'
                        : projects.length
                          ? 'Meus jogos'
                          : 'Como o Pensa ajuda'}
                    </h2>
                    <button
                      type="button"
                      className="sz-tool-pill sz-tool-pill--outline"
                      disabled={busy}
                      onClick={() => {
                        void run(async () => {
                          setArchived(!archived)
                          await loadList(!archived)
                        })
                      }}
                    >
                      {archived ? 'Ver jogos em andamento' : 'Ver arquivados'}
                    </button>
                  </div>
                  {projects.length ? (
                    <ul className="pensa-project-grid pensa-journey-games">
                      {projects.map((p) => (
                        <li key={p.id}>
                          <GameCard
                            game={p}
                            archived={archived}
                            onOpen={() => void open(p.id)}
                            onRemove={(opener) => {
                              removeOpenerRef.current = opener
                              setRemoveError(null)
                              setRemoveTarget(p)
                            }}
                          />
                        </li>
                      ))}
                    </ul>
                  ) : archived ? (
                    <p className="pensa-journey-empty">Nenhum jogo arquivado.</p>
                  ) : (
                    <ZeroExplainer />
                  )}
                  {legacy.length ? (
                    <details className="pensa-journey-fold">
                      <summary>Meus planos anteriores e equipes</summary>
                      <div className="pensa-journey-fold__body">
                        <ul className="pensa-journey-legacy">
                          {legacy.map((p) => (
                            <li key={p.id}>
                              <button
                                type="button"
                                className="sz-tool-pill sz-tool-pill--outline"
                                onClick={() => void open(p.id)}
                              >
                                {p.name}
                              </button>
                            </li>
                          ))}
                        </ul>
                        <div className="pensa-journey-actions">
                          <button
                            type="button"
                            className="sz-tool-pill sz-tool-pill--quiet"
                            onClick={() => onLegacy()}
                          >
                            Abrir meus planos anteriores
                          </button>
                        </div>
                      </div>
                    </details>
                  ) : null}
                  {/* O código do colega entra DIRETO no jogo v2 (14/10/2026). Um código de plano
                      clássico também entra: o jogo abre e, sem v2, o `open` cai no plano clássico. */}
                  {!archived ? (
                    <JourneyJoin
                      transport={api}
                      onJoined={(id) => {
                        focusTitle.current = true
                        void open(id)
                      }}
                    />
                  ) : null}
                </>
              )}
            </div>
          </section>
        ) : null}
      </div>
      <ConfirmDialog
        open={removeTarget !== null}
        title="Apagar este plano?"
        body={
          removeTarget
            ? `O plano de "${removeTarget.name}" vai sumir: a conversa com o Zappy, as missões e as cópias guardadas aqui.${(removeTarget.team?.memberCount ?? 0) > 0 ? ' Ele some para toda a equipe.' : ''} O que você fez no Estúdio, no Pinta e no Molda continua guardado lá. Não dá para desfazer.`
            : ''
        }
        confirmLabel="Apagar"
        busyLabel="Apagando…"
        busy={removing}
        error={removeError}
        onConfirm={() => void confirmRemove()}
        onClose={() => {
          if (!removing) setRemoveTarget(null)
        }}
        returnFocusTo={removeOpenerRef}
      />
      {/* A janela fica FORA das faixas (o mesmo motivo das janelas do plano clássico: lá dentro
          as pílulas ganhariam o relevo das galerias). */}
      {view && team ? (
        <JourneyTeamDialog
          open={teamOpen}
          projectId={view.project.id}
          projectName={view.project.name}
          transport={api}
          onClose={() => setTeamOpen(false)}
          onLeft={() => {
            setTeamOpen(false)
            focusTitle.current = true
            home()
          }}
          onTeamChanged={(next) => {
            // O espelho otimista (o "Equipe · N" acompanha na hora) e, atrás dele, o jogo do
            // servidor (as funções voltam para a dona quando quem programava sai).
            const id = view.project.id
            updateView((now) =>
              now?.project.id === id && now.team ? { ...now, team: { ...now.team, ...next } } : now,
            )
            void load(id).catch(() => undefined)
          }}
          onRolesSaved={(next) => setView(next)}
          onLoaded={setTeamView}
          returnFocusTo={teamOpenerRef}
        />
      ) : null}
    </div>
  )
}

/**
 * "Entrar com um código" (14/10/2026): entra DIRETO no v2 (`POST /v2/projects/join` →
 * `{projectId}`) e abre o jogo. O erro do servidor fica ao lado do campo (`role="alert"`, a frase
 * dele); Esc no FORMULÁRIO (vale com o foco nos botões) e "Cancelar" fecham e devolvem o foco ao
 * botão. O código vai como a criança digitou: quem normaliza é o members.
 */
function JourneyJoin({
  transport,
  onJoined,
}: {
  transport: PensaTransport
  onJoined(projectId: string): void
}) {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const formId = useId()
  const inputId = useId()
  const errorId = useId()
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])
  const close = () => {
    setOpen(false)
    setCode('')
    setError(null)
    buttonRef.current?.focus()
  }
  const submit = async () => {
    const typed = code.trim()
    if (typed.length < 4 || busy) return
    setBusy(true)
    setError(null)
    try {
      const joined = await transport.request<PensaJourneyJoinView>('/v2/projects/join', {
        method: 'POST',
        body: { code: typed },
      })
      setOpen(false)
      setCode('')
      onJoined(joined.projectId)
    } catch (cause) {
      setError(errorText(cause))
      inputRef.current?.focus()
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="pensa-journey-join">
      <UsersIcon />
      <p>Um colega te passou o código de um jogo em equipe?</p>
      <button
        ref={buttonRef}
        type="button"
        className="sz-tool-pill sz-tool-pill--outline"
        aria-expanded={open}
        aria-controls={formId}
        onClick={() => (open ? close() : setOpen(true))}
      >
        {TEAM_COPY.joinButton}
      </button>
      {open ? (
        <form
          id={formId}
          className="pensa-journey-join__form"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !busy) {
              event.preventDefault()
              close()
            }
          }}
        >
          <label className="pensa-journey-label" htmlFor={inputId}>
            {TEAM_COPY.joinLabel}
          </label>
          <div className="pensa-journey-join__row">
            <input
              ref={inputRef}
              id={inputId}
              className="pensa-journey-field pensa-journey-join__input"
              value={code}
              maxLength={16}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder={TEAM_COPY.joinPlaceholder}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              onChange={(event) => setCode(event.target.value)}
            />
            <button
              type="submit"
              className="sz-tool-pill sz-tool-pill--primary"
              disabled={busy || code.trim().length < 4}
            >
              {busy ? TEAM_COPY.joinBusy : TEAM_COPY.joinSubmit}
            </button>
            <button
              type="button"
              className="sz-tool-pill sz-tool-pill--quiet"
              disabled={busy}
              onClick={close}
            >
              Cancelar
            </button>
          </div>
          {error ? (
            <p id={errorId} className="pensa-inline-error" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  )
}

const DESTINATIONS = {
  studio: { label: 'Estúdio', tile: 'estudio', icon: <BlocksIcon /> },
  pinta: { label: 'Pinta', tile: 'pinta', icon: <PaletteIcon /> },
  molda: { label: 'Molda', tile: 'molda', icon: <CubeIcon /> },
} as const

/**
 * A oferta de desenhar a arte do jogo, por oficina (a do Molda só num jogo 3D). `team` é para quem
 * só programa numa equipe: a arte é de quem cuida das artes, então o pedido é para a equipe.
 */
const ART_OFFERS = {
  pinta: {
    self: {
      title: 'Quer desenhar o seu personagem?',
      text: 'Este começo usa uma figura pronta do Estúdio. Se quiser, você desenha o personagem do seu jeito no Pinta, e ele entra no jogo logo depois.',
      button: 'Quero desenhar no Pinta',
      request: 'Quero desenhar o personagem do jogo no Pinta.',
      chosen:
        'Agora toque em "Enviar para o Zappy". Ele refaz o começo com a missão de desenhar no Pinta.',
    },
    team: {
      title: 'Quer o personagem desenhado no Pinta?',
      text: 'Este começo usa uma figura pronta do Estúdio. Se quiser, quem cuida das artes desenha o personagem no Pinta, e ele entra no jogo logo depois.',
      button: 'Pedir o desenho no Pinta',
      request: 'Quero que quem cuida das artes desenhe o personagem do jogo no Pinta.',
      chosen:
        'Agora toque em "Enviar para o Zappy". Ele refaz o começo com a missão de desenhar no Pinta para quem cuida das artes.',
    },
  },
  molda: {
    self: {
      title: 'Quer modelar o seu personagem?',
      text: 'Este começo usa uma peça pronta do Estúdio. Se quiser, você modela o personagem do seu jeito no Molda, e ele entra no jogo logo depois.',
      button: 'Quero modelar no Molda',
      request: 'Quero modelar o personagem do jogo no Molda.',
      chosen:
        'Agora toque em "Enviar para o Zappy". Ele refaz o começo com a missão de modelar no Molda.',
    },
    team: {
      title: 'Quer o personagem modelado no Molda?',
      text: 'Este começo usa uma peça pronta do Estúdio. Se quiser, quem cuida das artes modela o personagem no Molda, e ele entra no jogo logo depois.',
      button: 'Pedir o modelo no Molda',
      request: 'Quero que quem cuida das artes modele o personagem do jogo no Molda.',
      chosen:
        'Agora toque em "Enviar para o Zappy". Ele refaz o começo com a missão de modelar no Molda para quem cuida das artes.',
    },
  },
} as const

const ZERO_ORDER = ['z', 'e', 'r', 'o'] as const

const HELP_STARTERS = [
  'Não sei por onde começar',
  'Aconteceu uma coisa diferente',
  'Não achei o bloco certo',
]

/** Do que trata a pergunta do Zappy, nas palavras da criança (o selo em cima dela). */
const QUESTION_TOPIC: Record<PensaQuestionTopic, string> = {
  action: 'o que você faz no jogo',
  goal: 'o objetivo do jogo',
  challenge: 'o que atrapalha',
  controls: 'como você controla',
  world: 'onde o jogo acontece',
  dimension: '2D ou 3D',
}

/** "Tanto faz": o Zappy decide e põe a escolha nas sugestões dele (o prompt sabe ler esta frase). */
const ANY_ANSWER = 'Tanto faz, escolhe você.'

/**
 * Ideias para começar (15/10/2026, o `suggestions.ts` do sandbox): o rótulo é curto e o texto é a
 * ideia INTEIRA na voz da criança (o que ela faz, o que acontece e como termina), para o Zappy ir
 * direto à proposta, sem pergunta. Só blocos do começo do Jogo 2D (andar com as setas, pegar,
 * desviar, pontos, vidas); nada de 2D ou 3D no texto: quem decide é o que ela tem liberado.
 */
const IDEA_STARTERS = [
  {
    label: 'Gato nos telhados',
    text: 'Um gato que anda pelos telhados com as setas pegando peixes. Cada peixe vale um ponto. Se encostar no cachorro, perde uma vida.',
  },
  {
    label: 'Nave e asteroides',
    text: 'Uma nave que desvia dos asteroides com as setas. Cada segundo sem bater vale um ponto. Se bater três vezes, o jogo acaba.',
  },
  {
    label: 'Dragão e o ninho',
    text: 'Um dragão que voa pegando ovos pelo caminho e leva até o ninho. Ganha quando juntar 10 ovos no ninho.',
  },
  {
    label: 'Robô e as moedas',
    text: 'Um robô que anda de um lado para o outro pegando as moedas que caem do céu. Se deixar cair cinco moedas, o jogo acaba.',
  },
  {
    label: 'Peixe no fundo do mar',
    text: 'Um peixe que nada com as setas comendo bolhas e fugindo do tubarão. Ganha quando comer 20 bolhas.',
  },
  {
    label: 'Sapo na estrada',
    text: 'Um sapo que pula com as setas para atravessar a rua sem encostar nos carros. Cada vez que chega do outro lado, ganha um ponto.',
  },
]

/**
 * O mapa Z·E·R·O do jogo aberto: a etapa vencida ganha o visto, a atual o fio e a ação do dia.
 * A etapa vencida é um BOTÃO que abre a revisão dela (15/10/2026, o "peek" do plano clássico que o
 * v2 tinha perdido); revendo, a etapa atual vira o caminho de volta. `aria-pressed` diz qual está
 * aberta.
 */
function ZeroMap({
  current,
  allDone,
  reviewing,
  onReview,
  buttons,
}: {
  current: PensaZeroStage
  allDone: boolean
  reviewing: PensaZeroStage | null
  onReview(stage: PensaZeroStage | null): void
  buttons: Partial<Record<PensaZeroStage, HTMLButtonElement | null>>
}) {
  const at = ZERO_ORDER.indexOf(current)
  return (
    <ol className="pensa-journey-zero" aria-label="Seu caminho no método ZERO">
      {ZERO_ORDER.map((key, index) => {
        const label = PENSA_ZERO_LABELS[key]
        const state = allDone || index < at ? 'done' : index === at ? 'current' : 'next'
        const open = reviewing === key
        const content = (
          <>
            <span className="pensa-journey-zero__tile" aria-hidden="true">
              {state === 'done' ? <CheckIcon size={18} /> : key.toUpperCase()}
            </span>
            <span className="pensa-journey-zero__text">
              <strong>{label.title}</strong>
              <small>
                {state === 'done'
                  ? open
                    ? 'Revendo agora'
                    : 'Feito. Ver de novo'
                  : state === 'current'
                    ? reviewing
                      ? 'Voltar para agora'
                      : label.action
                    : 'Depois'}
              </small>
            </span>
          </>
        )
        // Feita: abre (ou fecha) a revisão. Atual com uma revisão aberta: volta para agora.
        const clickable = state === 'done' || (state === 'current' && reviewing !== null)
        return (
          <li
            key={key}
            className={`is-${state}${open ? ' is-reviewing' : ''}`}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            {clickable ? (
              <button
                type="button"
                className="pensa-journey-zero__btn"
                ref={(node) => {
                  buttons[key] = node
                }}
                aria-pressed={state === 'done' ? open : undefined}
                onClick={() => onReview(state === 'done' && !open ? key : null)}
              >
                {content}
              </button>
            ) : (
              <div className="pensa-journey-zero__item">{content}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

/** Rótulo de cada resultado de teste, na voz dos botões do cartão "Hora de testar". */
const TEST_RESULT_LABELS: Record<PensaJourney['tests'][number]['result'], string> = {
  met: 'Funcionou!',
  needs_adjustment: 'Quis ajustar',
  inconclusive: 'Ainda não sabia',
}

/**
 * A revisão de uma etapa vencida, só para ler (nada aqui muda o jogo): Z = a ideia que a criança
 * contou; E = o começo escolhido (proposta, o que veio dela, o que o Zappy sugeriu, como testar);
 * R = as missões do caminho; O = os testes guardados. O aviso é `role="status"` e o "Voltar para
 * agora" fecha, como o aviso de "revendo" do plano clássico.
 */
function StageReview({
  stage,
  state,
  teamMode,
  titleRef,
  onClose,
  path,
}: {
  stage: PensaZeroStage
  state: PensaJourney
  teamMode: boolean
  titleRef: RefObject<HTMLHeadingElement | null>
  onClose(): void
  path: ReactNode
}) {
  const label = PENSA_ZERO_LABELS[stage]
  const proposal = state.proposal
  const tests = state.tests
  return (
    <section
      className="pensa-journey-card pensa-journey-review"
      aria-labelledby="pensa-review-title"
    >
      <div className="pensa-journey-review__banner" role="status">
        <EyeIcon size={18} />
        <span>Você está revendo a etapa {label.title}. Nada muda aqui.</span>
        <button type="button" className="sz-tool-pill sz-tool-pill--outline" onClick={onClose}>
          Voltar para agora
        </button>
      </div>
      <div className="pensa-journey-card__head">
        <span
          className="sz-tool-tile sz-tool-tile--pensa pensa-journey-review__tile"
          aria-hidden="true"
        >
          {stage.toUpperCase()}
        </span>
        <div>
          <p className="sz-tool-kicker">{label.title}</p>
          <h2
            className="pensa-journey-card__title"
            id="pensa-review-title"
            ref={titleRef}
            tabIndex={-1}
          >
            {stage === 'z'
              ? teamMode
                ? 'A ideia que a equipe contou'
                : 'A ideia que você contou'
              : stage === 'e'
                ? (proposal?.firstResult ?? 'O começo do jogo')
                : stage === 'r'
                  ? 'As missões do seu caminho'
                  : 'O que você testou'}
          </h2>
        </div>
      </div>
      {stage === 'z' ? (
        state.intent.trim() ? (
          <blockquote className="pensa-journey-review__quote">{state.intent}</blockquote>
        ) : (
          <p className="pensa-journey-hint">A ideia está na conversa com o Zappy, logo abaixo.</p>
        )
      ) : null}
      {stage === 'e' ? (
        proposal ? (
          <>
            <p className="pensa-journey-lead">{proposal.summary}</p>
            <div className="pensa-journey-ideas">
              <h3 className="pensa-journey-subtitle">Da sua ideia</h3>
              <ul className="pensa-journey-essentials">
                {proposal.essentials.map((item) => (
                  <li key={item}>
                    <CheckIcon size={16} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {proposal.suggestions.length ? (
              <div>
                <h3 className="pensa-journey-subtitle">O que o Zappy sugeriu</h3>
                <ul className="pensa-journey-suggestions">
                  {proposal.suggestions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div>
              <h3 className="pensa-journey-subtitle">Como testar</h3>
              <ol className="pensa-journey-steps">
                <li>
                  <strong>Faça:</strong> {proposal.test.action}
                </li>
                <li>
                  <strong>Veja se:</strong> {proposal.test.expected}
                </li>
              </ol>
            </div>
          </>
        ) : (
          <p className="pensa-journey-hint">Esta versão ainda não tem um começo guardado.</p>
        )
      ) : null}
      {stage === 'r' ? path : null}
      {stage === 'o' ? (
        tests.length ? (
          <ul className="pensa-journey-review__tests">
            {tests.map((test) => (
              <li key={test.id}>
                <strong>{TEST_RESULT_LABELS[test.result]}</strong>
                {test.note.trim() ? <span>{test.note}</span> : null}
                <small>{new Date(test.at).toLocaleDateString('pt-BR')}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="pensa-journey-hint">Ainda não há testes guardados nesta versão.</p>
        )
      ) : null}
    </section>
  )
}

/**
 * O cartão de um jogo na home, no desenho do cartão do plano clássico que ela aprovou: o alvo e o
 * nome, os selos (versão, etapa ou pausa, equipe), a trilha Z·E·R·O, a linha do andamento e o pé
 * com "Editado há…", a lixeira (só de quem criou) e o "Continuar". O cartão não é clicável: quem
 * abre é o botão e quem apaga é a lixeira.
 */
function GameCard({
  game,
  archived,
  onOpen,
  onRemove,
}: {
  game: PensaJourneyListItem
  archived: boolean
  onOpen(): void
  onRemove(opener: HTMLElement): void
}) {
  const label = PENSA_ZERO_LABELS[game.stage]
  return (
    <article className="pensa-project-card pensa-journey-game">
      <div className="pensa-project-card__head">
        <span className="pensa-project-orbit" aria-hidden="true">
          <TargetIcon size={22} />
        </span>
        <h3 className="sz-tool-card-title pensa-project-card__name">{game.name}</h3>
      </div>
      <div className="pensa-project-card__chips">
        <span className="pensa-chip">Versão {game.cycleNumber}</span>
        {game.paused ? (
          <span className="pensa-chip is-stage">Pausado</span>
        ) : (
          <span className="pensa-chip is-stage">Etapa {game.stage.toUpperCase()}</span>
        )}
        {/* Equipe: "De <dona>" no jogo em que entrei; "Em equipe · N" no meu com gente dentro.
            Sem `role` (servidor antigo) = só meu. */}
        {game.role === 'member' ? (
          <span className="pensa-chip is-team">
            {TEAM_COPY.chipFrom(personName(game.team?.ownerFirstName ?? null))}
          </span>
        ) : (game.team?.memberCount ?? 0) > 0 ? (
          <span className="pensa-chip is-team">
            {TEAM_COPY.chipTeam(game.team?.memberCount ?? 0)}
          </span>
        ) : null}
      </div>
      <ZeroTrack current={game.stage} />
      <p className="pensa-project-card__progress">
        <FlagIcon size={16} />
        {game.paused
          ? 'Pausado. Continue quando quiser.'
          : `${label.title}: ${label.action.toLowerCase()}`}
      </p>
      <div className="pensa-project-card__foot">
        <span className="pensa-project-card__edited">{editedAgo(game.lastInteractionAt)}</span>
        <div className="pensa-project-card__actions">
          {game.role === 'member' ? null : (
            <button
              type="button"
              className="pensa-project-card__remove"
              aria-label={`Apagar o plano ${game.name}`}
              title="Apagar"
              onClick={(event) => onRemove(event.currentTarget)}
            >
              <TrashIcon size={18} />
            </button>
          )}
          <button
            type="button"
            className="sz-tool-pill sz-tool-pill--primary pensa-project-card__open"
            aria-label={`Abrir o jogo ${game.name}`}
            onClick={onOpen}
          >
            {archived ? 'Abrir' : 'Continuar'}
            <ArrowRightIcon />
          </button>
        </div>
      </div>
    </article>
  )
}

/**
 * O nome do jogo com o lápis (o do plano clássico, que o v2 tinha perdido): clicar troca o título
 * pelo campo "Nome do jogo" com o texto selecionado; Enter ou sair do campo grava, Esc desiste, e
 * o foco volta ao lápis. Nome igual ao atual ou com menos de 2 letras só fecha.
 * ⚠️ O lápis é IRMÃO do h1, não filho: dentro dele entraria no nome acessível do título.
 */
function GameNameTitle({
  name,
  canRename,
  titleRef,
  onRename,
}: {
  name: string
  canRename: boolean
  titleRef: RefObject<HTMLHeadingElement | null>
  onRename(name: string): Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const inputRef = useRef<HTMLInputElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  // Esc desiste: um `blur` que chegue depois (a remoção do campo) não pode gravar o rascunho.
  const cancelledRef = useRef(false)
  const returnFocusRef = useRef(false)
  useEffect(() => {
    if (!editing) setDraft(name)
  }, [editing, name])
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    } else if (returnFocusRef.current) {
      returnFocusRef.current = false
      buttonRef.current?.focus()
    }
  }, [editing])
  const commit = () => {
    const next = draft.trim().replace(/\s+/g, ' ')
    setEditing(false)
    if (next.length < 2 || next === name) return
    void onRename(next)
  }
  if (editing)
    return (
      <input
        ref={inputRef}
        className="pensa-title-input"
        aria-label="Nome do jogo"
        autoComplete="off"
        maxLength={120}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (cancelledRef.current) return
          commit()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            returnFocusRef.current = true
            event.currentTarget.blur()
          }
          if (event.key === 'Escape') {
            cancelledRef.current = true
            returnFocusRef.current = true
            setDraft(name)
            setEditing(false)
          }
        }}
      />
    )
  return (
    <div className="pensa-project-title__row">
      <h1 className="sz-tool-title" ref={titleRef} tabIndex={-1}>
        {name}
      </h1>
      {canRename ? (
        <button
          ref={buttonRef}
          type="button"
          className="sz-tool-icon-btn pensa-title-rename"
          aria-label={`Renomear o jogo ${name}`}
          title="Renomear"
          onClick={() => {
            cancelledRef.current = false
            setDraft(name)
            setEditing(true)
          }}
        >
          <PencilIcon />
        </button>
      ) : null}
    </div>
  )
}

/** A trilha curta do cartão de jogo na lista (mesma régua do mapa, só as letras). */
function ZeroTrack({ current }: { current: PensaZeroStage }) {
  const at = ZERO_ORDER.indexOf(current)
  return (
    <ol className="pensa-zero-track" aria-label={`Etapa ${PENSA_ZERO_LABELS[current].title}`}>
      {ZERO_ORDER.map((key, index) => (
        <li
          key={key}
          className={index < at ? 'is-complete' : index === at ? 'is-current' : 'is-next'}
          aria-hidden="true"
        >
          {key.toUpperCase()}
        </li>
      ))}
    </ol>
  )
}

/** As bolinhas do caminho na missão atual: quantas já foram, qual é agora. */
function MissionDots({ tasks, current }: { tasks: PensaTaskView[]; current: string }) {
  return (
    <ol className="pensa-journey-dots-path" aria-hidden="true">
      {tasks.map((t) => (
        <li
          key={t.id}
          className={
            t.progress.status === 'completed' ? 'is-done' : t.id === current ? 'is-now' : ''
          }
        />
      ))}
    </ol>
  )
}

/** O que a criança vê antes do primeiro jogo: o método em quatro frases, sem formulário. */
function ZeroExplainer() {
  const steps = [
    ['z', 'Você conta a ideia do seu jeito, falando ou escrevendo.'],
    ['e', 'O Zappy mostra um começo pequeno que dá para construir.'],
    ['r', 'Você constrói por partes no Estúdio, no Pinta ou no Molda.'],
    ['o', 'Você experimenta, melhora e escolhe o próximo pedaço.'],
  ] as const
  return (
    <ol className="pensa-journey-explainer" aria-label="Como o Pensa ajuda">
      {steps.map(([key, text]) => (
        <li key={key}>
          <span className="sz-tool-tile sz-tool-tile--pensa" aria-hidden="true">
            {key.toUpperCase()}
          </span>
          <strong>{PENSA_ZERO_LABELS[key].title}</strong>
          <p>{text}</p>
        </li>
      ))}
    </ol>
  )
}
