import {
  type PensaIdea,
  type PensaMission,
  PensaMissionHandoffSchema,
  type PensaNarratableRef,
  type PensaPendingChoice,
} from '@sistemazero/core/pensa'
import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { DESTINATION_NAMES, pensaCopy } from '../core/copy'
import type { PensaHostAdapter, PensaMascotPose, PensaTransport } from '../core/types'
import { usePensaCredits } from './AiCredits'
import { careMenuItems, VersionsDialog } from './CareMenu'
import type { Composer } from './ChatPanel'
import { ConfirmDialog } from './ConfirmDialog'
import { type PensaUi, PensaUiProvider } from './context'
import { useDialogFocus } from './dialogFocus'
import { GameCard } from './GameCard'
import { AlertIcon, CloseIcon } from './icons'
import type { RenderListen } from './MissionBrief'
import { MissionDialog } from './MissionDialog'
import { PensaTeamDialog } from './PensaTeamDialog'
import {
  IdeasExhausted,
  ListSkeleton,
  LoadError,
  OperationFailed,
  type PensaToast,
  ProjectSkeleton,
  StatusBanner,
  SupportBanner,
  Toasts,
} from './States'
import { ChangeReview } from './screens/ChangeReview'
import { Clarify } from './screens/Clarify'
import { GameList } from './screens/GameList'
import { Generating } from './screens/Generating'
import { NewIdea } from './screens/NewIdea'
import { type ProjectTab, ProjectWorkspace } from './screens/ProjectWorkspace'
import { Proposal } from './screens/Proposal'
import { ScreenHeader } from './screens/ScreenHeader'
import { Mascot } from './ui'
import { isReadOnlyRefusal, usePensaProject } from './usePensaProject'

export function PensaApp(props: {
  adapter: PensaHostAdapter
  initialProjectId?: string | null
  initialHelpMissionId?: string | null
  onWorkspaceChange?(open: boolean): void
}) {
  return <PensaWorkspace key={props.adapter.viewerId ?? 'session'} {...props} />
}

/** Abaixo desta largura do planner, o projeto vira abas (Plano, Conversa, Carta do jogo). */
const NARROW_PX = 900

function useNarrow(ref: RefObject<HTMLElement | null>): boolean {
  const [narrow, setNarrow] = useState(false)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => {
      const width = element.getBoundingClientRect().width
      // Largura zero = ainda sem layout (testes, aba escondida): fica no desenho largo.
      setNarrow(width > 0 && width < NARROW_PX)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return narrow
}

type Preview = { mission: PensaMission; preview: boolean }

function PensaWorkspace({
  adapter,
  initialProjectId = null,
  initialHelpMissionId = null,
  onWorkspaceChange,
}: {
  adapter: PensaHostAdapter
  initialProjectId?: string | null
  initialHelpMissionId?: string | null
  onWorkspaceChange?(open: boolean): void
}) {
  const [readOnly, setReadOnly] = useState(Boolean(adapter.readOnly))
  // A sessão de suporte só leitura também se descobre pela recusa do BFF.
  const transport = useMemo<PensaTransport>(
    () => ({
      async request<T>(path: string, init?: Parameters<PensaTransport['request']>[1]) {
        try {
          return await adapter.transport.request<T>(path, init)
        } catch (cause) {
          if (isReadOnlyRefusal(cause)) setReadOnly(true)
          throw cause
        }
      },
    }),
    [adapter.transport],
  )
  const state = usePensaProject(transport, initialProjectId)
  const { view, projects, loading, busy, error } = state
  const credits = usePensaCredits(
    transport,
    view?.operation?.status,
    view?.revision?.id,
    adapter.mode,
  )
  const kids = adapter.mode === 'kids'
  const copy = pensaCopy(adapter.mode)
  const [toasts, setToasts] = useState<PensaToast[]>([])
  const toastId = useRef(0)
  const notify = useCallback((message: string, tone: 'ok' | 'error' = 'ok') => {
    const id = ++toastId.current
    setToasts((current) => [...current, { id, message, tone }])
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 4_000)
  }, [])
  const ui = useMemo<PensaUi>(
    () => ({
      adapter,
      copy,
      kids,
      readOnly,
      credits,
      notify,
      mascot: (pose: PensaMascotPose) =>
        kids
          ? (adapter.mascotImages?.[pose] ??
            (pose === 'speaking' ? adapter.mascotImages?.happy : null) ??
            null)
          : null,
    }),
    [adapter, copy, kids, readOnly, credits, notify],
  )
  const root = useRef<HTMLDivElement>(null)
  const narrow = useNarrow(root)
  const [creating, setCreating] = useState<boolean | null>(initialProjectId ? false : null)
  useEffect(() => {
    if (creating !== null || !state.counts) return
    setCreating(state.counts.active + state.counts.archived === 0)
  }, [creating, state.counts])
  const [draftText, setDraftText] = useState({ key: '', value: '' })
  const [kind, setKind] = useState<'planning' | 'help'>(initialHelpMissionId ? 'help' : 'planning')
  const [helpMissionId, setHelpMissionId] = useState(initialHelpMissionId)
  const [voiceBusy, setVoiceBusy] = useState(false)
  const [tab, setTab] = useState<ProjectTab>(initialHelpMissionId ? 'conversa' : 'plano')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [teamOpen, setTeamOpen] = useState(false)
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [cartaOpen, setCartaOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showChange, setShowChange] = useState(false)
  const [editingIdea, setEditingIdea] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)
  const deleteKey = useRef<{ projectId: string; requestId: string } | null>(null)
  const deletingRef = useRef(false)
  const opener = useRef<HTMLElement | null>(null)
  const teamButton = useRef<HTMLButtonElement>(null)
  const inputId = useId()
  const textarea = useRef<HTMLTextAreaElement>(null)
  const sendKey = useRef<{ fingerprint: string; id: string } | null>(null)
  const joinKey = useRef<{ code: string; id: string } | null>(null)
  const lastOpened = useRef<string | null>(initialProjectId)

  const projectId = view?.project.id ?? null
  // Trocar de jogo volta à aba do plano e fecha o que era do jogo anterior.
  // biome-ignore lint/correctness/useExhaustiveDependencies: resets only when the project changes.
  useEffect(() => {
    setPreview(null)
    setShowChange(false)
    setEditingIdea(false)
    if (!initialHelpMissionId || projectId !== initialProjectId) setTab('plano')
  }, [projectId])

  const draftKeyFor = (mode: 'planning' | 'help', missionId: string | null) =>
    `sz:pensa:draft:${adapter.viewerId ?? 'session'}:${view?.project.id ?? 'new'}:${mode}:${mode === 'help' ? (missionId ?? 'general') : 'idea'}`
  const draftKey = draftKeyFor(kind, helpMissionId)
  const text = draftText.key === draftKey ? draftText.value : ''
  const setText = useCallback((value: string) => setDraftText({ key: draftKey, value }), [draftKey])
  useEffect(() => {
    let value = ''
    try {
      value = sessionStorage.getItem(draftKey) ?? ''
    } catch {}
    setDraftText((current) => (current.key === draftKey ? current : { key: draftKey, value }))
  }, [draftKey])
  useEffect(() => {
    if (draftText.key !== draftKey) return
    try {
      if (text) sessionStorage.setItem(draftKey, text)
      else sessionStorage.removeItem(draftKey)
    } catch {}
  }, [draftKey, draftText.key, text])
  const workspace = Boolean(view)
  useEffect(() => {
    onWorkspaceChange?.(workspace)
    return () => onWorkspaceChange?.(false)
  }, [workspace, onWorkspaceChange])

  const operationRunning = Boolean(
    view?.operation && ['queued', 'running'].includes(view.operation.status),
  )
  const exhausted = credits.state === 'exhausted'
  const locked = Boolean(view?.project.paused || view?.project.status === 'archived')
  const blocked =
    busy || loading || voiceBusy || operationRunning || exhausted || locked || readOnly
  const owner = Boolean(view && view.team.ownerProfileId === view.team.viewerProfileId)
  const accepted = view?.revision ?? null
  const next = view?.nextAction
  const nextMission =
    next?.type === 'mission'
      ? (accepted?.plan.missions.find((item) => item.id === next.missionId) ?? null)
      : null
  const helpMission =
    accepted?.plan.missions.find((item) => item.id === (helpMissionId ?? nextMission?.id)) ?? null
  const draft = view?.draft ?? null
  const readyDraft =
    draft?.status === 'ready' && draft.definition && draft.plan
      ? { ...draft, definition: draft.definition, plan: draft.plan }
      : null
  const pendingChoice = draft?.pendingChoices[0] ?? null
  const userMessages = view?.messages.filter((message) => message.role === 'user') ?? []
  const lastUserText = userMessages.at(-1)?.text ?? draft?.definition?.originalIntent ?? null
  const lastMessage = view?.messages.at(-1)
  const lastAssistantText = lastMessage?.role === 'assistant' ? lastMessage.text : null

  function focusComposer(mode: 'planning' | 'help', missionId?: string | null) {
    setKind(mode)
    if (mode === 'help') setHelpMissionId(missionId ?? nextMission?.id ?? null)
    if (narrow) setTab('conversa')
    requestAnimationFrame(() => textarea.current?.focus())
  }
  async function send(choice: { choiceId: string; optionId: string; label: string } | null = null) {
    const message = choice?.label ?? text.trim()
    if (!message || message.length > 4000 || blocked) return
    const requestKind = choice ? 'planning' : kind
    const fingerprint = JSON.stringify([
      view?.project.id,
      requestKind,
      message,
      choice?.choiceId,
      choice?.optionId,
    ])
    if (sendKey.current?.fingerprint !== fingerprint)
      sendKey.current = { fingerprint, id: crypto.randomUUID() }
    const requestId = sendKey.current.id
    const result = view
      ? await state.execute(`/projects/${view.project.id}/messages`, {
          requestId,
          kind: requestKind,
          message,
          baseRevisionId: accepted?.id ?? null,
          missionId: requestKind === 'help' ? (helpMissionId ?? nextMission?.id ?? null) : null,
          choice: choice ? { choiceId: choice.choiceId, optionId: choice.optionId } : null,
        })
      : await state.execute('/projects', { requestId, message })
    if (result) {
      sendKey.current = null
      setEditingIdea(false)
      if (!choice) {
        setText('')
        try {
          sessionStorage.removeItem(draftKey)
        } catch {}
      }
    }
  }
  async function openMission(item: PensaMission) {
    try {
      const handoff = PensaMissionHandoffSchema.parse(
        await transport.request(`/missions/${item.id}/handoff`),
      )
      adapter.onOpenMission({
        missionId: item.id,
        destination: item.destination,
        studioProjectId: handoff.studioProjectId,
        studioAuthoring: handoff.studioAuthoring,
      })
    } catch (cause) {
      state.setError(
        cause instanceof Error ? cause.message : 'Não consegui abrir a missão. Tente de novo.',
      )
    }
  }
  function openGame() {
    if (!view) return
    adapter.onOpenGame({
      projectId: view.project.id,
      studioProjectId: `pensa-${view.project.id.replaceAll('-', '')}`,
      studioAuthoring: view.studioAuthoring,
    })
  }
  const narration = (reference: PensaNarratableRef) => adapter.renderListen?.(reference)
  const listenFor =
    (mission: PensaMission): RenderListen =>
    (section, itemId) =>
      narration({
        origin: 'pensa_mission',
        missionId: mission.id,
        contentRevision: mission.contentRevision,
        section,
        itemId: itemId ?? null,
      })
  async function metadata(patch: {
    name?: string
    paused?: boolean
    status?: 'active' | 'archived'
  }) {
    if (!view) return
    const result = await state.execute(
      `/projects/${view.project.id}`,
      {
        requestId: crypto.randomUUID(),
        expectedMetadataRevision: view.project.metadataRevision,
        ...patch,
      },
      'PATCH',
    )
    if (result && patch.name) notify('Nome guardado.')
  }
  function goHome() {
    if (voiceBusy) return
    setTeamOpen(false)
    setDeleteOpen(false)
    setVersionsOpen(false)
    setCartaOpen(false)
    setPreview(null)
    setKind('planning')
    setCreating(false)
    state.home()
  }
  function openProject(id: string) {
    lastOpened.current = id
    setCreating(false)
    void state.open(id)
  }
  function remember(element: HTMLElement | null) {
    opener.current =
      element ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
  }
  function acceptDraft() {
    if (!view || !draft) return
    void state
      .execute(`/projects/${view.project.id}/draft/accept`, {
        requestId: crypto.randomUUID(),
        draftId: draft.id,
        draftRevision: draft.revision,
        baseRevisionId: draft.baseRevisionId,
        affectedProgressVersions: draft.affectedProgressVersions,
      })
      .then((result) => {
        if (result) setShowChange(false)
      })
  }
  function discardDraft() {
    if (!view) return
    void state.execute(`/projects/${view.project.id}/draft`, undefined, 'DELETE').then((result) => {
      if (result) setShowChange(false)
    })
  }
  function cancelOperation() {
    if (view?.operation)
      void state.execute(`/projects/${view.project.id}/operations/${view.operation.id}/cancel`, {
        requestId: crypto.randomUUID(),
      })
  }
  function retryOperation() {
    if (view?.operation)
      void state.execute(`/projects/${view.project.id}/operations/${view.operation.id}/work`, {
        requestId: crypto.randomUUID(),
        retry: true,
      })
  }
  function join(code: string) {
    if (joining) return
    if (joinKey.current?.code !== code) joinKey.current = { code, id: crypto.randomUUID() }
    setJoining(true)
    setJoinError(null)
    void transport
      .request<{ projectId: string }>('/projects/join', {
        method: 'POST',
        body: { requestId: joinKey.current.id, code },
      })
      .then((result) => openProject(result.projectId))
      .catch((cause: unknown) =>
        setJoinError(
          cause instanceof Error ? cause.message : 'Não consegui entrar com este código.',
        ),
      )
      .finally(() => setJoining(false))
  }

  const composer: Composer = {
    text,
    setText,
    kind,
    helpMission,
    inputId,
    textareaRef: textarea,
    voiceBusy,
    setVoiceBusy,
    blocked,
    onSend: () => void send(),
  }
  const exhaustedCard = (
    <IdeasExhausted
      actions={
        view && accepted ? (
          <>
            {nextMission ? (
              <button
                type="button"
                className="pz-btn pz-btn--action"
                disabled={readOnly}
                onClick={() => void openMission(nextMission)}
              >
                Continuar no {DESTINATION_NAMES[nextMission.destination]}
              </button>
            ) : null}
            <button
              type="button"
              className="pz-btn pz-btn--card"
              onClick={() => {
                if (narrow) setTab('plano')
                else
                  requestAnimationFrame(() =>
                    document.getElementById('pensa-mapa')?.scrollIntoView?.({ block: 'start' }),
                  )
              }}
            >
              Ver o mapa das missões
            </button>
          </>
        ) : (
          <button type="button" className="pz-btn pz-btn--card" onClick={goHome}>
            Ver os meus jogos
          </button>
        )
      }
    />
  )
  const viewerName =
    view?.team.people.find((person) => person.profileId === view.team.viewerProfileId)?.firstName ??
    null

  let screen: ReactNode
  if (!view) {
    if (loading) screen = <ProjectSkeleton />
    else if (error && lastOpened.current && !state.projects.length && state.listState !== 'failed')
      screen = (
        <div className="pz-screen pz-column pz-column--900">
          <LoadError
            title="O jogo não abriu agora"
            text="O seu jogo e as suas missões estão guardados. Tente de novo daqui a pouco."
            onRetry={() => openProject(lastOpened.current!)}
          />
          <button type="button" className="pz-link-btn pz-self-center" onClick={goHome}>
            Ver os meus jogos
          </button>
        </div>
      )
    else if (state.listState === 'loading') screen = <ListSkeleton />
    else if (state.listState === 'failed')
      screen = (
        <div className="pz-screen pz-column pz-column--900">
          <LoadError
            title="O Pensa não abriu agora"
            text="Os seus jogos e as suas missões estão guardados. Tente de novo daqui a pouco."
            onRetry={() => void state.reloadList()}
          />
        </div>
      )
    else if (creating)
      screen = (
        <NewIdea
          title={null}
          composer={composer}
          exhausted={exhausted}
          exhaustedCard={exhaustedCard}
          busy={busy}
          onBack={() => setCreating(false)}
        />
      )
    else
      screen = (
        <GameList
          projects={projects}
          counts={state.counts}
          archived={state.archived}
          onArchived={state.setArchived}
          onOpen={openProject}
          onNew={() => {
            setKind('planning')
            setCreating(true)
          }}
          onJoin={join}
          joinError={joinError}
          joining={joining}
        />
      )
  } else if (!accepted) {
    const operation = view.operation
    if (operation && operationRunning)
      screen = (
        <Generating
          name={view.project.name}
          userText={lastUserText}
          operation={operation}
          busy={busy}
          onBack={goHome}
          onCancel={cancelOperation}
        />
      )
    else if (operation?.status === 'failed' && !editingIdea)
      screen = (
        <div className="pz-screen">
          <ScreenHeader
            titleAs="strong"
            title={view.project.name}
            back={{ label: 'Voltar aos meus jogos', onClick: goHome }}
          />
          <div className="pz-column pz-column--860">
            <OperationFailed
              kind={operation.kind === 'help' ? 'help' : 'planning'}
              quote={lastUserText}
              busy={busy}
              onRetry={retryOperation}
              onEdit={() => {
                setKind('planning')
                setText(lastUserText ?? '')
                setEditingIdea(true)
                requestAnimationFrame(() => textarea.current?.focus())
              }}
            />
          </div>
        </div>
      )
    else if (pendingChoice)
      screen = (
        <Clarify
          name={view.project.name}
          userText={lastUserText}
          choice={pendingChoice}
          assistantText={lastAssistantText}
          composer={composer}
          disabled={blocked}
          onBack={goHome}
          onChoose={(option) =>
            void send({ choiceId: pendingChoice.id, optionId: option.id, label: option.label })
          }
        />
      )
    else if (readyDraft)
      screen = (
        <Proposal
          view={view}
          draft={readyDraft}
          composer={composer}
          busy={busy}
          onAccept={acceptDraft}
          onLater={goHome}
          onOpenMission={(mission) => {
            remember(null)
            setPreview({ mission, preview: true })
          }}
        />
      )
    else
      screen = (
        <NewIdea
          title={view.project.name}
          composer={composer}
          exhausted={exhausted}
          exhaustedCard={exhaustedCard}
          busy={busy}
          onBack={goHome}
        />
      )
  } else if (showChange && readyDraft && draft?.baseRevisionId) {
    screen = (
      <ChangeReview
        view={view}
        revision={accepted}
        draft={readyDraft}
        request={
          [...userMessages].reverse().find((message) => message.kind === 'planning')?.text ?? null
        }
        busy={busy}
        onBack={() => setShowChange(false)}
        onAccept={acceptDraft}
        onDiscard={discardDraft}
      />
    )
  } else {
    const banners = (
      <>
        {readOnly ? <SupportBanner name={viewerName} /> : null}
        <StatusBanner
          paused={view.project.paused}
          archived={view.project.status === 'archived'}
          owner={owner}
          busy={busy}
          onResume={() => void metadata({ paused: false })}
          onRestore={() => void metadata({ status: 'active' })}
        />
      </>
    )
    screen = (
      <ProjectWorkspace
        view={view}
        revision={accepted}
        owner={owner}
        busy={busy}
        narrow={narrow}
        tab={tab}
        onTab={setTab}
        composer={composer}
        nextMission={nextMission}
        banners={banners}
        changeReady={Boolean(readyDraft && draft?.baseRevisionId)}
        changeChoice={pendingChoice}
        lastAssistantText={lastAssistantText}
        exhausted={exhausted}
        exhaustedCard={exhaustedCard}
        definitionListen={narration({
          origin: 'pensa_definition',
          projectId: view.project.id,
          projectRevisionId: accepted.id,
          section: 'summary',
        })}
        careItems={careMenuItems({
          view,
          owner: owner && !readOnly,
          onPause: () => void metadata({ paused: !view.project.paused }),
          onArchive: () =>
            void metadata({ status: view.project.status === 'active' ? 'archived' : 'active' }),
          onVersions: () => {
            remember(null)
            setVersionsOpen(true)
          },
          onDelete: () => {
            remember(null)
            setDeleteOpen(true)
          },
          onTeam: () => {
            remember(null)
            setTeamOpen(true)
          },
          onOpenGame: openGame,
        })}
        teamButtonRef={teamButton}
        renderListen={nextMission ? listenFor(nextMission) : undefined}
        onBack={goHome}
        onRename={(name) => void metadata({ name })}
        onTeam={() => {
          opener.current = teamButton.current
          setTeamOpen(true)
        }}
        onOpenGame={openGame}
        onOpenMission={(mission) => void openMission(mission)}
        onPreview={(mission, element) => {
          remember(element)
          setPreview({ mission, preview: false })
        }}
        onHelp={() => focusComposer('help')}
        onAskChange={() => focusComposer('planning')}
        onClearHelp={() => setKind('planning')}
        onChoose={(choice: PensaPendingChoice, option) =>
          void send({ choiceId: choice.id, optionId: option.id, label: option.label })
        }
        onCancelOperation={cancelOperation}
        onRetryOperation={retryOperation}
        onReviewChange={() => setShowChange(true)}
        onOpenCarta={(element) => {
          remember(element)
          setCartaOpen(true)
        }}
        onUseIdea={(idea: PensaIdea) => {
          setKind('planning')
          setDraftText({
            key: draftKeyFor('planning', null),
            value: `Quero colocar no jogo: ${idea.text}`,
          })
          focusComposer('planning')
        }}
        onNewGame={() => {
          goHome()
          setCreating(true)
        }}
      />
    )
  }

  const previewPlan = preview?.preview ? readyDraft?.plan : accepted?.plan
  return (
    <PensaUiProvider value={ui}>
      <div
        ref={root}
        className={`pensa-planner pensa-theme-${adapter.theme ?? 'light'} pz-audience-${adapter.mode}`}
      >
        {readOnly && (!view || !accepted || showChange) ? (
          <div className="pz-top-banner">
            <SupportBanner name={viewerName} />
          </div>
        ) : null}
        {error && (view || state.listState === 'ready') ? (
          <div className="pz-alert" role="alert">
            <AlertIcon size={20} />
            <span>{error}</span>
            {view ? (
              <button
                type="button"
                className="pz-btn pz-btn--card pz-btn--sm"
                onClick={() => {
                  void state
                    .refresh()
                    .then(() => state.setError(null))
                    .catch((cause: unknown) =>
                      state.setError(
                        cause instanceof Error
                          ? cause.message
                          : 'Não consegui atualizar o seu jogo. Tente de novo.',
                      ),
                    )
                }}
              >
                Tentar de novo
              </button>
            ) : null}
            <button
              type="button"
              className="pz-icon-btn is-small"
              aria-label="Fechar o aviso"
              onClick={() => state.setError(null)}
            >
              <CloseIcon size={16} />
            </button>
          </div>
        ) : null}
        {screen}
        {preview && previewPlan ? (
          <MissionDialog
            mission={preview.mission}
            plan={previewPlan}
            technical={(preview.preview ? readyDraft?.technical : accepted?.technical) ?? null}
            progress={
              preview.preview
                ? undefined
                : view?.progress.find((item) => item.missionId === preview.mission.id)
            }
            access={
              preview.preview
                ? undefined
                : view?.availability.find((item) => item.missionId === preview.mission.id)
            }
            team={view?.team}
            preview={preview.preview}
            renderListen={listenFor(preview.mission)}
            onContinue={() => {
              const mission = preview.mission
              setPreview(null)
              void openMission(mission)
            }}
            onClose={() => setPreview(null)}
            returnFocusTo={opener}
          />
        ) : null}
        {view && teamOpen ? (
          <PensaTeamDialog
            view={view}
            transport={transport}
            onClose={() => setTeamOpen(false)}
            onChanged={state.refresh}
            onLeft={goHome}
            returnFocusTo={opener}
          />
        ) : null}
        {view && versionsOpen ? (
          <VersionsDialog
            view={view}
            transport={transport}
            onChanged={state.refresh}
            onClose={() => setVersionsOpen(false)}
            returnFocusTo={opener}
          />
        ) : null}
        {view && accepted && cartaOpen ? (
          <CartaDialog onClose={() => setCartaOpen(false)} returnFocusTo={opener}>
            <GameCard
              definition={accepted.definition}
              plan={accepted.plan}
              listen={narration({
                origin: 'pensa_definition',
                projectId: view.project.id,
                projectRevisionId: accepted.id,
                section: 'summary',
              })}
            />
          </CartaDialog>
        ) : null}
        <ConfirmDialog
          open={deleteOpen}
          art={<Mascot pose="sleeping" size={72} />}
          title={`Apagar o plano do ${view?.project.name ?? 'jogo'}`}
          body="O plano e as missões somem. As criações no Estúdio, no Pinta e no Molda continuam guardadas."
          confirmLabel="Apagar plano"
          busyLabel="Apagando…"
          busy={busy || deleting}
          error={deleteOpen ? error : null}
          onClose={() => setDeleteOpen(false)}
          returnFocusTo={opener}
          onConfirm={() => {
            if (!view || deletingRef.current) return
            deletingRef.current = true
            setDeleting(true)
            if (deleteKey.current?.projectId !== view.project.id)
              deleteKey.current = { projectId: view.project.id, requestId: crypto.randomUUID() }
            void transport
              .request(`/projects/${view.project.id}`, {
                method: 'DELETE',
                body: { requestId: deleteKey.current.requestId },
              })
              .then(() => {
                goHome()
                notify('Plano apagado.')
              })
              .catch((cause: unknown) =>
                state.setError(cause instanceof Error ? cause.message : 'Não consegui apagar.'),
              )
              .finally(() => {
                deletingRef.current = false
                setDeleting(false)
              })
          }}
        />
        <Toasts toasts={toasts} />
      </div>
    </PensaUiProvider>
  )
}

/** A carta do jogo inteira, numa janela (no celular ela é a aba "Carta do jogo"). */
function CartaDialog({
  children,
  onClose,
  returnFocusTo,
}: {
  children: ReactNode
  onClose(): void
  returnFocusTo: RefObject<HTMLElement | null>
}) {
  const card = useRef<HTMLDivElement>(null)
  useDialogFocus({ open: true, cardRef: card, busy: false, onClose, returnFocusTo })
  return (
    <div className="pz-scrim">
      <div
        ref={card}
        className="pz-dialog pz-dialog--carta"
        role="dialog"
        aria-modal="true"
        aria-label="A carta do jogo"
        tabIndex={-1}
      >
        <button
          type="button"
          className="pz-icon-btn is-quiet pz-dialog__close"
          aria-label="Fechar a carta"
          onClick={onClose}
        >
          <CloseIcon size={20} />
        </button>
        {children}
      </div>
    </div>
  )
}
