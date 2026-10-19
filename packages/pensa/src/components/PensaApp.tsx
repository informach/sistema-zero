import {
  PENSA_ZERO_LABELS,
  type PensaMission,
  PensaMissionHandoffSchema,
  type PensaNarratableRef,
  pensaZeroPresentation,
} from '@sistemazero/core/pensa'
import { PensaMissionContent } from '@sistemazero/ui/pensa-mission-content'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { editedAgo } from '../core/relativeTime'
import type { PensaHostAdapter } from '../core/types'
import { usePensaCredits } from './AiCredits'
import { ConfirmDialog } from './ConfirmDialog'
import { GameDefinition } from './GameDefinition'
import { HostBackLink, HostMenuButton, usePensaHostChrome } from './hostChrome'
import { ArrowLeftIcon } from './icons'
import { MissionCard } from './MissionCard'
import { PensaMessageText } from './PensaMessageText'
import { PensaTeamDialog } from './PensaTeamDialog'
import { PlanChangeReview } from './PlanChangeReview'
import { ProjectCare } from './ProjectCare'
import { ProjectPlan } from './ProjectPlan'
import { usePensaProject } from './usePensaProject'

export function PensaApp(props: {
  adapter: PensaHostAdapter
  initialProjectId?: string | null
  initialHelpMissionId?: string | null
  onWorkspaceChange?(open: boolean): void
}) {
  return <PensaWorkspace key={props.adapter.viewerId ?? 'session'} {...props} />
}

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
  const state = usePensaProject(adapter.transport, initialProjectId)
  const { view, projects, loading, busy, error } = state
  const credits = usePensaCredits(
    adapter.transport,
    view?.operation?.status,
    view?.revision?.id,
    adapter.mode,
  )
  const chrome = usePensaHostChrome()
  const [draftText, setDraftText] = useState({ key: '', value: '' })
  const [kind, setKind] = useState<'planning' | 'help'>(initialHelpMissionId ? 'help' : 'planning')
  const [helpMissionId, setHelpMissionId] = useState(initialHelpMissionId)
  const [voiceBusy, setVoiceBusy] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [teamOpen, setTeamOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const deleteKey = useRef<{ projectId: string; requestId: string } | null>(null)
  const deletingRef = useRef(false)
  const [previewSelection, setPreviewSelection] = useState<{
    key: string
    mission: PensaMission
  } | null>(null)
  const previewKey = `${view?.project.id}:${view?.revision?.id}:${view?.draft?.id}:${view?.draft?.revision}`
  const previewMission = previewSelection?.key === previewKey ? previewSelection.mission : null
  function setPreviewMission(item: PensaMission | null) {
    setPreviewSelection(item ? { key: previewKey, mission: item } : null)
  }
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState('')
  const inputId = useId()
  const previewTitleId = useId()
  const previewRef = useRef<HTMLElement>(null)
  const previewReturn = useRef<HTMLElement | null>(null)
  const textarea = useRef<HTMLTextAreaElement>(null)
  const teamButton = useRef<HTMLButtonElement>(null)
  const deleteButton = useRef<HTMLButtonElement>(null)
  const sendKey = useRef<{ fingerprint: string; id: string } | null>(null)
  const joinKey = useRef<{ code: string; id: string } | null>(null)
  useEffect(() => {
    if (!previewMission) return
    previewRef.current?.focus()
    previewRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [previewMission])
  function preview(item: PensaMission) {
    previewReturn.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    setPreviewMission(item)
  }
  const draftKey = `sz:pensa:draft:${adapter.viewerId ?? 'session'}:${view?.project.id ?? 'new'}:${kind}:${kind === 'help' ? (helpMissionId ?? 'general') : 'idea'}`
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
  const disabled =
    busy ||
    loading ||
    voiceBusy ||
    operationRunning ||
    credits.state === 'exhausted' ||
    Boolean(view?.project.paused || view?.project.status === 'archived')
  const owner = Boolean(view && view.team.ownerProfileId === view.team.viewerProfileId)
  const next = view?.nextAction
  const mission =
    next?.type === 'mission'
      ? view?.revision?.plan.missions.find((item) => item.id === next.missionId)
      : null
  const candidate = view?.draft
  const readyCandidate = candidate?.status === 'ready' && candidate.definition && candidate.plan
  const accepted = view?.revision
  const zeroStage = pensaZeroPresentation({
    revision: view?.revision ?? null,
    draft: view?.draft,
    progress: view?.progress ?? [],
    availability: view?.availability,
  })
  function focusComposer(mode: 'planning' | 'help') {
    setKind(mode)
    if (mode === 'help') setHelpMissionId(mission?.id ?? null)
    textarea.current?.focus()
  }
  async function send(choice: { choiceId: string; optionId: string; label: string } | null = null) {
    const message = choice?.label ?? text.trim()
    if (!message || message.length > 4000 || disabled) return
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
          missionId: requestKind === 'help' ? (helpMissionId ?? mission?.id ?? null) : null,
          choice: choice ? { choiceId: choice.choiceId, optionId: choice.optionId } : null,
        })
      : await state.execute('/projects', { requestId, message })
    if (result) {
      sendKey.current = null
      setText('')
      try {
        sessionStorage.removeItem(draftKey)
      } catch {}
    }
  }
  async function openMission(item: PensaMission) {
    try {
      const handoff = PensaMissionHandoffSchema.parse(
        await adapter.transport.request(`/missions/${item.id}/handoff`),
      )
      adapter.onOpenMission({
        missionId: item.id,
        destination: item.destination,
        studioProjectId: handoff.studioProjectId,
        studioAuthoring: handoff.studioAuthoring,
      })
    } catch (cause) {
      state.setError(
        cause instanceof Error ? cause.message : 'Não consegui abrir a missão. Tente novamente.',
      )
    }
  }
  const narration = (reference: PensaNarratableRef) => adapter.renderListen?.(reference)
  async function metadata(patch: {
    name?: string
    paused?: boolean
    status?: 'active' | 'archived'
  }) {
    if (!view) return
    await state.execute(
      `/projects/${view.project.id}`,
      {
        requestId: crypto.randomUUID(),
        expectedMetadataRevision: view.project.metadataRevision,
        ...patch,
      },
      'PATCH',
    )
  }
  function goHome() {
    if (voiceBusy) return
    setTeamOpen(false)
    setDeleteOpen(false)
    setPreviewMission(null)
    setKind('planning')
    state.home()
  }
  const listenMission = mission
    ? (section: 'objective' | 'rule' | 'check' | 'setup', itemId?: string) =>
        narration({
          origin: 'pensa_mission',
          missionId: mission.id,
          contentRevision: mission.contentRevision,
          section,
          itemId: itemId ?? null,
        })
    : undefined
  return (
    <main className="pensa-planner pensa-functional" data-pensa-theme={adapter.theme ?? 'light'}>
      <header className="pensa-functional-header sz-tool-band sz-tool-band--cream">
        <div className="sz-tool-header__nav">
          {chrome?.menu ? <HostMenuButton menu={chrome.menu} /> : null}
          {view ? (
            <button
              type="button"
              aria-label="Voltar aos meus jogos"
              className="sz-tool-icon-btn"
              disabled={voiceBusy}
              onClick={goHome}
            >
              <ArrowLeftIcon />
            </button>
          ) : chrome?.back ? (
            <HostBackLink back={chrome.back} />
          ) : null}
        </div>
        <div className="pensa-functional-heading">
          <p className="pensa-home-chip">Pensa · sua oficina de planos</p>
          {renaming && view ? (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void metadata({ name }).then(() => setRenaming(false))
              }}
            >
              <label>
                Nome do jogo
                <input
                  value={name}
                  maxLength={100}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <button type="submit" disabled={busy || name.trim().length < 2}>
                Guardar nome
              </button>
              <button type="button" onClick={() => setRenaming(false)}>
                Cancelar
              </button>
            </form>
          ) : (
            <h1 className="sz-tool-title">{view?.project.name ?? 'Meus jogos'}</h1>
          )}
          {!view ? (
            <p>Conte sua ideia. Vamos organizar o jogo e construir uma parte de cada vez.</p>
          ) : null}
        </div>
        {credits.state !== 'unknown' ? (
          <p className={`pensa-credits is-${credits.state}`}>{credits.inline}</p>
        ) : null}
        {view ? (
          <div className="pensa-journey-actions">
            {owner ? (
              <button
                type="button"
                className="sz-tool-pill sz-tool-pill--quiet"
                onClick={() => {
                  setName(view.project.name)
                  setRenaming(true)
                }}
              >
                Renomear
              </button>
            ) : null}
            <button
              ref={teamButton}
              type="button"
              className="sz-tool-pill sz-tool-pill--outline"
              onClick={() => setTeamOpen(true)}
            >
              Equipe · {view.team.people.length}
            </button>
          </div>
        ) : null}
      </header>
      <div className="pensa-functional-body">
        <ol className="pensa-zero-orientation" aria-label="Seu caminho no Pensa">
          {Object.entries(PENSA_ZERO_LABELS).map(([letter, label]) => (
            <li key={letter} aria-current={letter === zeroStage ? 'true' : undefined}>
              <strong aria-hidden="true">{letter.toUpperCase()}</strong>
              <span>
                {label.title}
                <small>{label.action}</small>
              </span>
            </li>
          ))}
        </ol>
        {error ? (
          <p role="alert" className="pensa-inline-error">
            {error}
            <button
              type="button"
              onClick={() => {
                void state
                  .refresh()
                  .then(() => state.setError(null))
                  .catch((cause: unknown) => {
                    state.setError(
                      cause instanceof Error
                        ? cause.message
                        : 'Não consegui atualizar seu plano. Tente novamente.',
                    )
                  })
              }}
            >
              Tentar novamente
            </button>
          </p>
        ) : null}
        {loading ? <p role="status">Buscando seu jogo…</p> : null}
        {!view && !loading ? (
          <>
            {projects.length ? (
              <section aria-label="Meus jogos" className="pensa-project-grid">
                {projects.map((item) => (
                  <article key={item.project.id} className="pensa-project-card">
                    <h2 className="sz-tool-card-title">{item.project.name}</h2>
                    <p>{item.summary ?? 'Sua ideia está sendo organizada.'}</p>
                    <p className="pensa-project-updated">{editedAgo(item.project.updatedAt)}</p>
                    <p>
                      {item.completedMissions} de {item.totalMissions} missões prontas
                      {item.needsReview ? ` · ${item.needsReview} para conferir` : ''}
                    </p>
                    <button
                      type="button"
                      className="sz-tool-pill sz-tool-pill--primary"
                      onClick={() => void state.open(item.project.id)}
                    >
                      Continuar {item.project.name}
                    </button>
                  </article>
                ))}
              </section>
            ) : null}
            <label>
              <input
                type="checkbox"
                checked={state.archived}
                onChange={(event) => state.setArchived(event.target.checked)}
              />
              Ver jogos guardados
            </label>
            <details>
              <summary>Entrar com um código</summary>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  if (joining || !joinCode.trim()) return
                  if (joinKey.current?.code !== joinCode.trim())
                    joinKey.current = { code: joinCode.trim(), id: crypto.randomUUID() }
                  setJoining(true)
                  void adapter.transport
                    .request<{ projectId: string }>('/projects/join', {
                      method: 'POST',
                      body: { requestId: joinKey.current.id, code: joinCode.trim() },
                    })
                    .then((result) => state.open(result.projectId))
                    .catch((cause: unknown) =>
                      state.setError(
                        cause instanceof Error ? cause.message : 'Não consegui entrar.',
                      ),
                    )
                    .finally(() => setJoining(false))
                }}
              >
                <label>
                  Código do jogo
                  <input value={joinCode} onChange={(event) => setJoinCode(event.target.value)} />
                </label>
                <button
                  type="submit"
                  className="sz-tool-pill sz-tool-pill--outline"
                  disabled={joining}
                >
                  Entrar no jogo
                </button>
              </form>
            </details>
          </>
        ) : null}
        {view && accepted ? (
          <GameDefinition
            definition={accepted.definition}
            listen={narration({
              origin: 'pensa_definition',
              projectId: view.project.id,
              projectRevisionId: accepted.id,
              section: 'summary',
            })}
          />
        ) : null}
        {operationRunning ? (
          <section className="pensa-journey-card" aria-live="polite">
            <h2>Organizando seu jogo…</h2>
            <p>
              {view?.operation?.kind === 'help'
                ? 'Estou pensando na sua dúvida.'
                : 'Estou conferindo as partes, a ordem e as ferramentas para este jogo.'}
            </p>
            <button
              type="button"
              className="sz-tool-pill sz-tool-pill--outline"
              onClick={() => {
                if (view?.operation)
                  void state.execute(
                    `/projects/${view.project.id}/operations/${view.operation.id}/cancel`,
                    { requestId: crypto.randomUUID() },
                  )
              }}
            >
              Parar esta organização
            </button>
          </section>
        ) : null}
        {view?.operation?.status === 'failed' ? (
          <section className="pensa-journey-card">
            <h2>Vamos retomar?</h2>
            <p>{view.operation.error ?? 'Seu rascunho está guardado.'}</p>
            <button
              type="button"
              className="sz-tool-pill sz-tool-pill--primary"
              disabled={busy}
              onClick={() =>
                void state.execute(
                  `/projects/${view.project.id}/operations/${view.operation!.id}/work`,
                  { requestId: crypto.randomUUID(), retry: true },
                )
              }
            >
              Tentar de novo
            </button>
          </section>
        ) : null}
        {candidate?.pendingChoices.map((choice) => (
          <section className="pensa-journey-card" key={choice.id}>
            <h2 className="pensa-journey-card__title">{choice.question}</h2>
            <div className="pensa-journey-actions">
              {choice.options.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  className="sz-tool-pill sz-tool-pill--outline"
                  disabled={disabled}
                  onClick={() =>
                    void send({ choiceId: choice.id, optionId: option.id, label: option.label })
                  }
                >
                  {option.label}
                  <small>{option.description}</small>
                </button>
              ))}
            </div>
          </section>
        ))}
        {readyCandidate && candidate ? (
          <>
            <GameDefinition
              definition={candidate.definition!}
              listen={
                view
                  ? narration({
                      origin: 'pensa_draft',
                      projectId: view.project.id,
                      draftId: candidate.id,
                      draftRevision: candidate.revision,
                      section: 'summary',
                    })
                  : null
              }
            />
            <ProjectPlan
              plan={candidate.plan!}
              progress={[]}
              currentMissionId={null}
              onOpen={preview}
            />
            <PlanChangeReview
              draft={candidate}
              busy={busy || Boolean(view?.project.paused || view?.project.status === 'archived')}
              onAccept={() => {
                if (view)
                  void state.execute(`/projects/${view.project.id}/draft/accept`, {
                    requestId: crypto.randomUUID(),
                    draftId: candidate.id,
                    draftRevision: candidate.revision,
                    baseRevisionId: candidate.baseRevisionId,
                    affectedProgressVersions: candidate.affectedProgressVersions,
                  })
              }}
              onDiscard={() => {
                if (view)
                  void state.execute(`/projects/${view.project.id}/draft`, undefined, 'DELETE')
              }}
            />
            <button
              type="button"
              className="sz-tool-pill sz-tool-pill--outline"
              onClick={() => focusComposer('planning')}
            >
              Quero mudar uma coisa
            </button>
          </>
        ) : null}
        {previewMission ? (
          <section
            className="pensa-journey-card"
            ref={previewRef}
            aria-labelledby={previewTitleId}
            tabIndex={-1}
          >
            <h2 id={previewTitleId}>{previewMission.title}</h2>
            <PensaMissionContent mission={previewMission} />
            {view?.availability.find((item) => item.missionId === previewMission.id)?.available ? (
              <button
                type="button"
                className="sz-tool-pill sz-tool-pill--primary"
                onClick={() => void openMission(previewMission)}
              >
                Continuar esta missão na oficina
              </button>
            ) : null}
            {view?.availability.find((item) => item.missionId === previewMission.id)?.message ? (
              <p role="status">
                {view.availability.find((item) => item.missionId === previewMission.id)?.message}
              </p>
            ) : null}
            <button
              type="button"
              className="sz-tool-pill sz-tool-pill--outline"
              onClick={() => {
                setPreviewMission(null)
                previewReturn.current?.focus()
              }}
            >
              Fechar missão
            </button>
          </section>
        ) : null}
        {view && mission && next?.type === 'mission' ? (
          <MissionCard
            mission={mission}
            mode={next.mode}
            blockedReason={
              view.availability.find((item) => item.missionId === mission.id)?.message ?? null
            }
            onOpen={() => void openMission(mission)}
            onHelp={() => focusComposer('help')}
            renderListen={listenMission}
          />
        ) : null}
        {next?.type === 'waiting' ? (
          <section className="pensa-journey-card">
            <h2>Enquanto isso</h2>
            <p>{next.reason}</p>
            <button
              type="button"
              className="sz-tool-pill sz-tool-pill--outline"
              onClick={() => focusComposer('help')}
            >
              Preciso de ajuda
            </button>
          </section>
        ) : null}
        {next?.type === 'completed' ? (
          <section className="pensa-journey-card">
            <h2>Seu jogo está pronto!</h2>
            <p>Você conferiu as partes do jogo que escolheu construir.</p>
          </section>
        ) : null}
        {view && accepted ? (
          <>
            <ProjectPlan
              plan={accepted.plan}
              progress={view.progress}
              availability={view.availability}
              currentMissionId={mission?.id ?? null}
              onOpen={preview}
            />
            <div className="pensa-journey-actions">
              <button
                type="button"
                className="sz-tool-pill sz-tool-pill--outline"
                onClick={() =>
                  adapter.onOpenGame({
                    projectId: view.project.id,
                    studioProjectId: `pensa-${view.project.id.replaceAll('-', '')}`,
                    studioAuthoring: view.studioAuthoring,
                  })
                }
              >
                Abrir meu jogo
              </button>
              <button
                type="button"
                className="sz-tool-pill sz-tool-pill--outline"
                onClick={() => focusComposer('planning')}
              >
                Mudar uma parte do jogo
              </button>
            </div>
            {accepted.definition.futureIdeas.length ? (
              <details className="pensa-journey-card">
                <summary>Ideias para depois</summary>
                <ul>
                  {accepted.definition.futureIdeas.map((idea) => (
                    <li key={idea.id}>{idea.text}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </>
        ) : null}
        {view ? (
          <details className="pensa-journey-card">
            <summary>Guardar e cuidar deste jogo</summary>
            <div className="pensa-journey-actions">
              {owner ? (
                <button
                  type="button"
                  className="sz-tool-pill sz-tool-pill--outline"
                  disabled={busy}
                  onClick={() => void metadata({ paused: !view.project.paused })}
                >
                  {view.project.paused ? 'Continuar de onde parei' : 'Pausar por enquanto'}
                </button>
              ) : null}
              {owner ? (
                <>
                  <button
                    type="button"
                    className="sz-tool-pill sz-tool-pill--outline"
                    disabled={busy}
                    onClick={() =>
                      void metadata({
                        status: view.project.status === 'active' ? 'archived' : 'active',
                      })
                    }
                  >
                    {view.project.status === 'active'
                      ? 'Guardar na lista de jogos'
                      : 'Voltar aos jogos ativos'}
                  </button>
                  <button
                    ref={deleteButton}
                    type="button"
                    className="sz-tool-pill sz-tool-pill--quiet"
                    onClick={() => setDeleteOpen(true)}
                  >
                    Apagar este plano
                  </button>
                </>
              ) : null}
            </div>
            <ProjectCare view={view} transport={adapter.transport} onChanged={state.refresh} />
          </details>
        ) : null}
        <section className="pensa-journey-card" aria-label="Conversa com Zappy">
          {credits.state === 'exhausted' ? (
            <p role="status">
              {credits.exhausted} {credits.renews}
            </p>
          ) : null}
          <h2 className="pensa-journey-card__title">
            {view
              ? kind === 'help'
                ? 'Vamos pensar nessa parte'
                : 'Conte o que você quer para o jogo'
              : 'Qual jogo você quer criar?'}
          </h2>
          {view?.messages.map((message) => (
            <article key={message.id} className={`pensa-functional-message is-${message.role}`}>
              <PensaMessageText text={message.text} />
              {message.role === 'assistant'
                ? narration({
                    origin: 'pensa_message',
                    projectId: view.project.id,
                    messageId: message.id,
                    messageRevision: message.revision,
                  })
                : null}
            </article>
          ))}
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void send()
            }}
          >
            <label htmlFor={inputId}>
              {kind === 'help' ? 'Sua dúvida' : 'Sua ideia ou mudança'}
            </label>
            <textarea
              id={inputId}
              ref={textarea}
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={4}
              disabled={voiceBusy}
            />
            {text.length > 4000 ? (
              <p role="status">
                Seu texto tem {text.length} caracteres. Guarde uma parte para enviar depois; cada
                mensagem pode ter até 4.000.
              </p>
            ) : null}
            <div className="pensa-journey-actions">
              {adapter.renderVoiceInput?.({
                value: text,
                onChange: setText,
                onBusyChange: setVoiceBusy,
                disabled: busy || operationRunning,
                textareaId: inputId,
              })}
              <button
                type="submit"
                className="sz-tool-pill sz-tool-pill--primary"
                disabled={disabled || !text.trim() || text.length > 4000}
              >
                {view ? 'Enviar' : 'Organizar meu jogo'}
              </button>
            </div>
          </form>
        </section>
      </div>
      {view && teamOpen ? (
        <PensaTeamDialog
          view={view}
          transport={adapter.transport}
          onClose={() => setTeamOpen(false)}
          onChanged={state.refresh}
          onLeft={goHome}
          returnFocusTo={teamButton}
        />
      ) : null}
      <ConfirmDialog
        open={deleteOpen}
        title="Apagar este plano?"
        body="O plano será apagado. Suas criações nas oficinas continuam guardadas."
        confirmLabel="Apagar plano"
        busy={busy || deleting}
        error={error}
        onClose={() => setDeleteOpen(false)}
        returnFocusTo={deleteButton}
        onConfirm={() => {
          if (!view || deletingRef.current) return
          deletingRef.current = true
          setDeleting(true)
          if (deleteKey.current?.projectId !== view.project.id)
            deleteKey.current = { projectId: view.project.id, requestId: crypto.randomUUID() }
          void adapter.transport
            .request(`/projects/${view.project.id}`, {
              method: 'DELETE',
              body: { requestId: deleteKey.current.requestId },
            })
            .then(goHome)
            .catch((cause: unknown) =>
              state.setError(cause instanceof Error ? cause.message : 'Não consegui apagar.'),
            )
            .finally(() => {
              deletingRef.current = false
              setDeleting(false)
            })
        }}
      />
    </main>
  )
}
