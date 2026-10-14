import {
  PENSA_ZERO_LABELS,
  type PensaJourneyCommand,
  type PensaJourneyListItem,
  type PensaJourneyView,
  type PensaZeroStage,
  pensaZeroStage,
} from '@sistemazero/core/pensa'
import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  PensaHostAdapter,
  PensaMascotPose,
  PensaProjectListView,
  PensaStageView,
  PensaTaskView,
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

const errorText = (cause: unknown) =>
  cause instanceof Error ? cause.message : 'Não consegui fazer isso agora. Tente de novo.'
export function JourneyApp({
  adapter,
  initialProjectId,
  onWorkspaceChange,
  onLegacy,
}: {
  adapter: PensaHostAdapter
  initialProjectId?: string | null
  onWorkspaceChange?: (active: boolean) => void
  onLegacy(id?: string): void
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
  const nextTask =
    tasks.find((t) => t.id === nextTaskId) ??
    tasks.find(
      (t) =>
        t.progress.status !== 'completed' &&
        t.dependencies.every((id) =>
          tasks.some((d) => d.id === id && d.progress.status === 'completed'),
        ),
    )
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
    composer && talking && conversationKind === 'help' && !text.trim() ? HELP_STARTERS : []
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
                  <h1 className="sz-tool-title">
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
              {headerStatus ? (
                <p
                  className={`sz-tool-status pensa-journey-status${headerStatus.tone === 'ok' ? ' sz-tool-status--ok' : headerStatus.tone === 'warn' ? ' sz-tool-status--warn' : ''}`}
                >
                  <span className="pensa-plan-status__dot" aria-hidden="true" />
                  {headerStatus.text}
                </p>
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
                            Sua próxima missão · {missionNumber} de {tasks.length}
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
                          onClick={() =>
                            adapter.onOpenTask({
                              taskId: nextTask.id,
                              destination: nextTask.destination,
                            })
                          }
                        >
                          Continuar no {DESTINATIONS[nextTask.destination].label}
                          <ArrowRightIcon />
                        </button>
                        <button
                          type="button"
                          className="sz-tool-pill sz-tool-pill--outline"
                          onClick={() => focusChat('help')}
                        >
                          Travei nesta parte
                        </button>
                        <button
                          type="button"
                          className="sz-tool-pill sz-tool-pill--quiet pensa-journey-try"
                          onClick={() => void command({ type: 'observe' })}
                        >
                          Já quero experimentar
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
                        <li>Abra o jogo, experimente e salve antes de contar o resultado.</li>
                      </ol>
                      {tasks
                        .filter((t) => t.destination === 'studio')
                        .slice(-1)
                        .map((t) => (
                          <div className="pensa-journey-actions" key={t.id}>
                            <button
                              type="button"
                              className="sz-tool-pill sz-tool-pill--outline"
                              onClick={() =>
                                adapter.onOpenTask({ taskId: t.id, destination: 'studio' })
                              }
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
                          Divida seu relato em uma parte menor para este teste. Seu texto continua
                          inteiro aqui.
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
                                    await api.request(`/v2/projects/${state.projectId}/increment`, {
                                      method: 'POST',
                                      body: { expectedRevision: state.revision },
                                    }),
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
                    </div>
                  </section>
                ) : null}

                {state?.messages.length ? (
                  <details
                    className="pensa-journey-fold pensa-journey-conversation"
                    open={talking || (state.stage === 'idea' && !running)}
                  >
                    <summary>Minha conversa com o Zappy</summary>
                    <div className="pensa-journey-fold__body pensa-journey-chat" aria-live="polite">
                      {state.messages.map((m) => (
                        <div
                          className={`pensa-journey-message pensa-journey-message--${m.role}`}
                          key={m.id}
                        >
                          {m.role === 'assistant' ? mascot(36, 'happy') : null}
                          <div className="pensa-journey-message__bubble">
                            <strong>{m.role === 'user' ? 'Você' : 'Zappy'}</strong>
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
                    <details className="pensa-journey-fold">
                      <summary>
                        Ver meu caminho ({doneCount} de {tasks.length})
                      </summary>
                      <ol className="pensa-journey-fold__body pensa-journey-path">
                        {tasks.map((t, index) => {
                          const done = t.progress.status === 'completed'
                          return (
                            <li
                              key={t.id}
                              className={done ? 'is-done' : t.id === nextTask?.id ? 'is-now' : ''}
                            >
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
                                  {done ? ' · feita' : t.id === nextTask?.id ? ' · agora' : ''}
                                </small>
                              </span>
                              {done ? (
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
                      <ul className="pensa-journey-care">
                        {['building', 'observing', 'closed'].includes(state.stage) ? (
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
                        {state.stage !== 'closed' ? (
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
                      </ul>
                      {state.checkpoint ? (
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
                      {confirmDelete ? (
                        <fieldset
                          className="pensa-journey-danger"
                          aria-label="Confirmar exclusão do plano"
                        >
                          <p>
                            Apagar este plano remove a conversa, as missões e as cópias guardadas
                            aqui. Seu jogo no Estúdio e suas artes continuam nos editores.
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
                  {/* As equipes moram no plano clássico: sem este atalho, quem nunca teve um plano
                      antigo não tinha por onde digitar o código que o colega passou. */}
                  {!archived ? (
                    <div className="pensa-journey-join">
                      <UsersIcon />
                      <p>Um colega te passou o código de um plano em equipe?</p>
                      <button
                        type="button"
                        className="sz-tool-pill sz-tool-pill--outline"
                        onClick={() => onLegacy()}
                      >
                        Entrar com um código
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}

const DESTINATIONS = {
  studio: { label: 'Estúdio', tile: 'estudio', icon: <BlocksIcon /> },
  pinta: { label: 'Pinta', tile: 'pinta', icon: <PaletteIcon /> },
  molda: { label: 'Molda', tile: 'molda', icon: <CubeIcon /> },
} as const

const ZERO_ORDER = ['z', 'e', 'r', 'o'] as const

const HELP_STARTERS = [
  'Não sei por onde começar',
  'Aconteceu uma coisa diferente',
  'Não achei o bloco certo',
]

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
