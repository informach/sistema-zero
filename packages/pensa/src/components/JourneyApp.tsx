import {
  canWorkOnPensaMission,
  nextPensaMissionFor,
  PENSA_ZERO_LABELS,
  type PensaJourneyCommand,
  type PensaJourneyListItem,
  type PensaJourneyTeamView,
  type PensaJourneyView,
  type PensaZeroStage,
  pensaMissionTarget,
  pensaZeroStage,
} from '@sistemazero/core/pensa'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { joinNames, missionPeople, teamMissionProgress } from '../core/journeyTeam'
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
import { HostBackLink, HostMenuButton, usePensaHostChrome } from './hostChrome'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BlocksIcon,
  CheckIcon,
  CircleCheckIcon,
  CubeIcon,
  LightbulbIcon,
  PaletteIcon,
  PlusIcon,
  TrashIcon,
  UsersIcon,
} from './icons'
import { JourneyTeamDialog } from './JourneyTeamDialog'

const errorText = (cause: unknown) =>
  cause instanceof Error ? cause.message : 'Não consegui fazer isso agora. Tente de novo.'
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
  const [note, setNote] = useState('')
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
  const keepRef = useRef<HTMLButtonElement>(null)
  // Equipe (14/10/2026): os nomes e fotos (`GET …/team`), a janela e quem a abriu.
  const [teamView, setTeamView] = useState<PensaJourneyTeamView | null>(null)
  const [teamOpen, setTeamOpen] = useState(false)
  const teamOpenerRef = useRef<HTMLButtonElement | null>(null)
  const teamSequence = useRef(0)
  // "Ver o caminho" do cartão de espera abre a sanfona e leva o foco até ela.
  const pathRef = useRef<HTMLDetailsElement>(null)
  // Entrar por código e sair da equipe trocam a tela inteira: o foco pousa no título novo.
  const titleRef = useRef<HTMLHeadingElement>(null)
  const focusTitle = useRef(false)
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

  useEffect(() => {
    try {
      setDraft({ key: draftKey, value: sessionStorage.getItem(draftKey) ?? '' })
    } catch {
      setDraft({ key: draftKey, value: '' })
    }
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
      setView(next)
      if (next.journey.missionIds.length) {
        const stage = await api.request<PensaStageView>(`/cycles/${next.journey.cycleId}/stages/z`)
        if (active.current === id && sequence === loadSequence.current) {
          setTasks(stage.tasks)
          setNextTaskId(stage.nextTaskId)
        }
      } else {
        setTasks([])
        setNextTaskId(null)
      }
    },
    [api, setView],
  )
  const open = useCallback(
    async (id: string) => {
      const visit = ++navigation.current
      active.current = id
      updateView(null)
      setTasks([])
      setNote('')
      setLoading(true)
      setError(null)
      setTalking(false)
      setConversationKind('planning')
      setRestoreTarget('')
      setConfirmDelete(false)
      setTeamOpen(false)
      setTeamView(null)
      try {
        await load(id)
      } catch (cause) {
        if (navigation.current !== visit) return
        if ((cause as { status?: number }).status === 404) onLegacy(id)
        else setError(errorText(cause))
      } finally {
        if (navigation.current === visit) setLoading(false)
      }
    },
    [load, onLegacy],
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
    const resume = async () => {
      if (document.hidden || disposed || inFlight) return
      inFlight = true
      try {
        await api
          .request(`/v2/projects/${id}/work`, { method: 'POST', body: {} })
          .catch((cause) => {
            if (!disposed) setError(errorText(cause))
          })
        if (!disposed) await load(id)
      } catch (cause) {
        if (!disposed) setError(errorText(cause))
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
        .catch(() => undefined)
        .finally(() => {
          inFlight = false
        })
    }, teamPollMs)
    return () => window.clearInterval(timer)
  }, [load, workProjectId, teamMode, teamPollMs, operationRunning])
  useEffect(() => {
    if (!focusTitle.current || loading) return
    focusTitle.current = false
    titleRef.current?.focus()
  })

  async function run(action: (isCurrent: () => boolean) => Promise<void>) {
    if (busyRef.current) return
    const visit = navigation.current
    busyRef.current = true
    setBusy(true)
    setError(null)
    try {
      await action(() => navigation.current === visit)
    } catch (cause) {
      if (navigation.current !== visit) return
      setError(errorText(cause))
      if (active.current && (cause as { status?: number }).status === 409)
        await load(active.current).catch(() => undefined)
    } finally {
      busyRef.current = false
      setBusy(false)
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
    setNote('')
    setTalking(false)
    setConversationKind('planning')
    setError(null)
    setTeamOpen(false)
    setTeamView(null)
    const visit = navigation.current
    void loadList(archived).catch((c) => {
      if (navigation.current === visit) setError(errorText(c))
    })
  }
  async function send() {
    if (!text.trim() || text.length > 4000 || voiceBusy) return
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
        return
      }
      if (!current) {
        draftProject.current ??= crypto.randomUUID()
        current = await api.request<PensaJourneyView>('/v2/projects', {
          method: 'POST',
          body: { id: draftProject.current },
        })
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
  const seePath = () => {
    const details = pathRef.current
    if (!details) return
    details.open = true
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    details.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    details.querySelector('summary')?.focus({ preventScroll: true })
  }
  const focusChat = (kind: 'planning' | 'help' | 'backlog' = 'help') => {
    setConversationKind(kind)
    setTalking(true)
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }
  const stage = state ? pensaZeroStage(state) : 'z'
  const composer =
    (!state || ['idea', 'proposal'].includes(state.stage) || talking) &&
    !state?.paused &&
    view?.project.status !== 'archived' &&
    state?.stage !== 'closed'
  const failed = view?.operation?.status === 'failed'
  const versionNumber = view?.cycles.find((c) => c.id === state?.cycleId)?.number ?? 1
  const doneCount = tasks.filter((t) => t.progress.status === 'completed').length
  const missionNumber = nextTask ? tasks.indexOf(nextTask) + 1 : 0
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
  const ideaChips =
    composer && state?.stage === 'idea' && conversationKind !== 'backlog' && state.backlog.length
      ? state.backlog.slice(-4)
      : []
  const continueGame = !view && !archived ? projects[0] : undefined
  // Pedir ajuda começa por um atalho que a criança reconhece; ela revisa e envia (nada sai sozinho).
  const helpChips =
    composer && talking && conversationKind === 'help' && !text.trim()
      ? [
          ...HELP_STARTERS,
          view?.studioAuthoring === 'code'
            ? 'Não achei o trecho de código'
            : 'Não achei o bloco certo',
        ]
      : []
  const placeholder = !state
    ? 'Pode ser uma ideia bem pequena. Não precisa saber como fazer ainda.'
    : conversationKind === 'backlog'
      ? 'Ex.: uma fase de neve para depois.'
      : conversationKind === 'help'
        ? 'Ex.: apertei a seta e nada aconteceu.'
        : 'Ex.: em vez de queijos, o gato pega estrelas.'

  return (
    <div className={`pensa-planner pensa-journey pensa-theme-${adapter.theme ?? 'light'}`}>
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
                  <h1 className="sz-tool-title" ref={titleRef} tabIndex={-1}>
                    {view?.project.name ??
                      (continueGame
                        ? 'Vamos continuar seu jogo?'
                        : 'Que jogo você está imaginando?')}
                  </h1>
                  {!view ? (
                    <p className="sz-tool-subtitle">
                      Conte do seu jeito. Eu ajudo a encontrar um começo, e você constrói o jogo.
                    </p>
                  ) : null}
                </div>
              </div>
              {headerStatus || showTeamButton ? (
                <div className="sz-tool-header__actions">
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
            {state ? <ZeroMap current={stage} allDone={allDone} /> : null}
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
                  <div className="pensa-journey-notice" role="alert">
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
                {view?.project.status === 'archived' ? (
                  <section className="pensa-journey-card pensa-journey-card--talk">
                    {mascot(72, 'sleeping')}
                    <div className="pensa-journey-card__body">
                      <h2 className="pensa-journey-card__title">Este jogo está guardado</h2>
                      <p>Você pode continuar de onde parou.</p>
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
                      <span className="pensa-journey-dots" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                      </span>
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
                                ['idea', 'proposal', 'preparing'].includes(cancelled.journey.stage)
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
                        <h2 className="pensa-journey-card__title">{state.proposal.firstResult}</h2>
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
                    <div className="pensa-journey-actions">
                      <button
                        type="button"
                        className="sz-tool-pill sz-tool-pill--primary"
                        disabled={busy || voiceBusy || Boolean(text.trim())}
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
                    {text.trim() ? (
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
                  state.stage === 'building' && nextTask ? (
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
                      <div className="pensa-journey-actions">
                        <button
                          type="button"
                          className="sz-tool-pill sz-tool-pill--primary"
                          onClick={() => adapter.onOpenTask(pensaMissionTarget(nextTask, view))}
                        >
                          Continuar no{' '}
                          {nextTask.destination === 'studio' && view.studioAuthoring === 'code'
                            ? 'Estúdio Pro'
                            : DESTINATIONS[nextTask.destination].label}
                          <ArrowRightIcon />
                        </button>
                        <button
                          type="button"
                          className="sz-tool-pill sz-tool-pill--outline"
                          onClick={() => focusChat('help')}
                        >
                          Travei nesta parte
                        </button>
                        {canProgram ? (
                          <button
                            type="button"
                            className="sz-tool-pill sz-tool-pill--quiet pensa-journey-try"
                            onClick={() => void command({ type: 'observe' })}
                          >
                            Já quero experimentar
                          </button>
                        ) : null}
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
                          <h2 className="pensa-journey-card__title">Vamos experimentar seu jogo</h2>
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
                      {canProgram ? (
                        <>
                          {tasks
                            .filter((t) => t.destination === 'studio')
                            .slice(-1)
                            .map((t) => (
                              <div className="pensa-journey-actions" key={t.id}>
                                <button
                                  type="button"
                                  className="sz-tool-pill sz-tool-pill--outline"
                                  onClick={() => adapter.onOpenTask(pensaMissionTarget(t, view))}
                                >
                                  <BlocksIcon />
                                  Abrir meu jogo
                                </button>
                              </div>
                            ))}
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
                              <p>Funcionou! Guarde esta versão para não perder o que você fez.</p>
                              <button
                                type="button"
                                className="sz-tool-pill sz-tool-pill--primary"
                                disabled={busy}
                                onClick={() =>
                                  void run(async () => {
                                    setView(
                                      await api.request(`/v2/projects/${state.projectId}/close`, {
                                        method: 'POST',
                                        body: { expectedRevision: state.revision, reason: 'met' },
                                      }),
                                    )
                                  })
                                }
                              >
                                Guardar esta versão pronta
                              </button>
                            </div>
                          ) : state.stage === 'observing' &&
                            state.tests.length > (state.testSessionStart ?? 0) ? (
                            <div className="pensa-journey-actions">
                              <button
                                type="button"
                                className="sz-tool-pill sz-tool-pill--outline"
                                onClick={() => {
                                  void run(async () => {
                                    await api.request(`/v2/projects/${state.projectId}/command`, {
                                      method: 'POST',
                                      body: {
                                        expectedRevision: state.revision,
                                        command: { type: 'repair' },
                                      },
                                    })
                                    await load(state.projectId)
                                  })
                                }}
                              >
                                Voltar para ajustar
                              </button>
                            </div>
                          ) : null}
                        </>
                      ) : null}
                    </section>
                  )
                ) : null}

                {state?.stage === 'closed' ? (
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
                    className="pensa-journey-card pensa-journey-compose"
                    onSubmit={(e) => {
                      e.preventDefault()
                      void send()
                    }}
                  >
                    <div className="pensa-journey-compose__ask">
                      {mascot(state ? 48 : 72, 'happy')}
                      <label className="pensa-journey-bubble" htmlFor="pensa-idea">
                        {state
                          ? conversationKind === 'backlog'
                            ? 'Que ideia você quer guardar para depois?'
                            : talking
                              ? 'Conte o que você quer mudar ou onde travou'
                              : 'Quer acrescentar ou mudar alguma coisa?'
                          : 'Como é o jogo que está na sua cabeça?'}
                      </label>
                    </div>
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
                        <legend>Ou comece por uma ideia que você guardou:</legend>
                        {ideaChips.map((idea) => (
                          <button
                            type="button"
                            className="sz-tool-chip"
                            key={idea.id}
                            onClick={() => {
                              setText(idea.text)
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
                          busy || running || voiceBusy || !text.trim() || text.length > 4000
                        }
                      >
                        {state
                          ? conversationKind === 'backlog'
                            ? 'Guardar minha ideia'
                            : 'Enviar para o Zappy'
                          : 'Encontrar um começo'}
                      </button>
                    </div>
                    {text.length > 4000 ? (
                      <p className="pensa-journey-warn" role="alert">
                        Sua ideia ficou grande para uma mensagem. Divida em duas partes; seu texto
                        continua inteiro aqui.
                      </p>
                    ) : (
                      <p className="pensa-journey-hint">
                        Você pode falar ou escrever. Confira o texto antes de enviar.
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
                  <h2 className="sz-tool-section-title" id="pensa-journey-more-title">
                    Meu caminho
                  </h2>
                  {tasks.length ? (
                    <details className="pensa-journey-fold" ref={pathRef}>
                      <summary>
                        Ver meu caminho ({doneCount} de {tasks.length})
                      </summary>
                      <ol className="pensa-journey-fold__body pensa-journey-path">
                        {tasks.map((t, index) => {
                          const done = t.progress.status === 'completed'
                          // "Agora" é a missão da frente: a minha ou a que a equipe espera.
                          const now = t.id === (nextTask ?? waitingTask)?.id
                          // Em equipe, quem faz cada missão ("você" / 1º nome).
                          const who =
                            team && teamMode
                              ? joinNames(missionPeople(t, team.roles).map(shortName))
                              : null
                          // Rever abre a missão na MINHA oficina: só a que eu posso fazer e que
                          // não foi feita por outra pessoa (a arte da colega mora na conta dela).
                          const reviewable =
                            !team ||
                            !teamMode ||
                            (canWorkOnPensaMission(
                              t.destination,
                              team.viewerProfileId,
                              team.roles,
                            ) &&
                              (!t.completedByProfileId ||
                                t.completedByProfileId === team.viewerProfileId))
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
                                <small>
                                  {DESTINATIONS[t.destination].label}
                                  {who ? ` · ${who}` : ''}
                                  {done ? ' · feita' : now ? ' · agora' : ''}
                                </small>
                              </span>
                              {done && reviewable ? (
                                <button
                                  type="button"
                                  className="sz-tool-pill sz-tool-pill--outline pensa-journey-path__review"
                                  aria-label={`Rever ${t.title}`}
                                  onClick={() => adapter.onOpenTask(pensaMissionTarget(t, view))}
                                >
                                  Rever
                                </button>
                              ) : null}
                            </li>
                          )
                        })}
                      </ol>
                    </details>
                  ) : null}
                  <details className="pensa-journey-fold">
                    <summary>Ideias para depois ({state.backlog.length})</summary>
                    <div className="pensa-journey-fold__body">
                      {state.backlog.length ? (
                        <ul className="pensa-journey-backlog">
                          {state.backlog.map((idea) => (
                            <li key={idea.id}>
                              <LightbulbIcon size={16} />
                              <span>
                                {idea.text}
                                {idea.origin === 'zappy' ? (
                                  <small> · sugestão do Zappy</small>
                                ) : null}
                              </span>
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
                          disabled={state.stage === 'closed' || view?.project.status === 'archived'}
                          onClick={() => focusChat('backlog')}
                        >
                          <PlusIcon />
                          Contar outra ideia
                        </button>
                      </div>
                    </div>
                  </details>
                  {state.proposal?.references.length ? (
                    <details className="pensa-journey-fold">
                      <summary>O que ajudou a montar este caminho</summary>
                      <div className="pensa-journey-fold__body">
                        <ul className="pensa-journey-refs">
                          {state.proposal.references.map((ref) => (
                            <li key={ref.id}>
                              {ref.href ? (
                                <a href={ref.href} target="_blank" rel="noopener noreferrer">
                                  {ref.title}
                                  <span className="pensa-sr-only"> (abre em outra aba)</span>
                                  <ArrowRightIcon size={14} />
                                </a>
                              ) : (
                                ref.title
                              )}
                            </li>
                          ))}
                        </ul>
                        <p className="pensa-journey-hint">
                          Estas são referências do Zappy. Você não precisa ter feito todas essas
                          aulas.
                        </p>
                      </div>
                    </details>
                  ) : null}
                  <details className="pensa-journey-fold">
                    <summary>Guardar e cuidar deste jogo</summary>
                    <div className="pensa-journey-fold__body">
                      {/* Em equipe: adaptar, encerrar e restaurar são de quem programa (usam o jogo
                          salvo no Estúdio dela); arquivar e apagar são da dona. */}
                      <ul className="pensa-journey-care">
                        {canProgram && ['building', 'observing', 'closed'].includes(state.stage) ? (
                          <li>
                            <button
                              type="button"
                              className="sz-tool-pill sz-tool-pill--outline"
                              disabled={busy || running}
                              onClick={() =>
                                void run(async (isCurrent) => {
                                  setView(
                                    await api.request(`/v2/projects/${state.projectId}/revise`, {
                                      method: 'POST',
                                      body: { expectedRevision: state.revision },
                                    }),
                                  )
                                  if (isCurrent()) focusChat('planning')
                                })
                              }
                            >
                              Adaptar meu caminho
                            </button>
                            <small>Muda o plano a partir do que você já fez.</small>
                          </li>
                        ) : null}
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
                        {canProgram && state.stage !== 'closed' ? (
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
                        {isOwner ? (
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
                                  if (isCurrent()) home()
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
                      {programmerNote}
                      {canProgram && state.checkpoint ? (
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
                                  if (isCurrent()) home()
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
                    <ul className="pensa-journey-games">
                      {projects.map((p) => (
                        <li key={p.id} className="pensa-journey-game">
                          <h3 className="pensa-journey-game__name">{p.name}</h3>
                          {/* Equipe: "De <dona>" no jogo em que entrei; "Em equipe · N" no meu
                              com gente dentro. Sem `role` (servidor antigo) = só meu. */}
                          {p.role === 'member' ? (
                            <span className="pensa-chip is-team pensa-journey-game__chip">
                              {TEAM_COPY.chipFrom(personName(p.team?.ownerFirstName ?? null))}
                            </span>
                          ) : (p.team?.memberCount ?? 0) > 0 ? (
                            <span className="pensa-chip is-team pensa-journey-game__chip">
                              {TEAM_COPY.chipTeam(p.team?.memberCount ?? 0)}
                            </span>
                          ) : null}
                          <ZeroTrack current={p.stage} />
                          <p className="pensa-journey-game__status">
                            {p.paused
                              ? 'Pausado · continuar quando quiser'
                              : PENSA_ZERO_LABELS[p.stage].action}
                          </p>
                          <button
                            type="button"
                            className="sz-tool-pill sz-tool-pill--primary"
                            aria-label={`Abrir o jogo ${p.name}`}
                            onClick={() => void open(p.id)}
                          >
                            {archived ? 'Abrir' : 'Continuar'}
                            <ArrowRightIcon />
                          </button>
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

const ZERO_ORDER = ['z', 'e', 'r', 'o'] as const

const HELP_STARTERS = ['Não sei por onde começar', 'Aconteceu uma coisa diferente']

/** O mapa Z·E·R·O do jogo aberto: a etapa vencida ganha o visto, a atual o fio e a ação do dia. */
function ZeroMap({ current, allDone }: { current: PensaZeroStage; allDone: boolean }) {
  const at = ZERO_ORDER.indexOf(current)
  return (
    <ol className="pensa-journey-zero" aria-label="Seu caminho no método ZERO">
      {ZERO_ORDER.map((key, index) => {
        const label = PENSA_ZERO_LABELS[key]
        const state = allDone || index < at ? 'done' : index === at ? 'current' : 'next'
        return (
          <li
            key={key}
            className={`is-${state}`}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <span className="pensa-journey-zero__tile" aria-hidden="true">
              {state === 'done' ? <CheckIcon size={18} /> : key.toUpperCase()}
            </span>
            <span className="pensa-journey-zero__text">
              <strong>{label.title}</strong>
              <small>
                {state === 'current' ? label.action : state === 'done' ? 'Feito' : 'Depois'}
              </small>
            </span>
          </li>
        )
      })}
    </ol>
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
