'use client'

import { useFreeStudioRuntime } from '@sistemazero/member-shell/components/studio/use-free-runtime'
import type { StudioTier } from '@sistemazero/member-shell/lib/studio-tier'
import type {
  EditableStudioProject as Project,
  StudioMoldaLibraryAdapter,
  StudioPintaLibraryAdapter,
  StudioShareAdapter,
  StudioTaskSession,
  StudioTeamLibraryAdapter,
  StudioTutorConfig,
} from '@sistemazero/studio'
import { useStudioRuntimeAuthority } from '@sistemazero/studio/runtime-authority'
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import {
  assertPensaJavaScriptProject,
  PensaProjectLanguageRefused,
} from '../../lib/pensa-studio-link'
import { reportStudioError } from '../../lib/studio-error'
import { StudioRuntimeNotice } from '../studio/studio-runtime-notice'
import { useFocusMode } from './focus-mode'
import { openCreationInMolda, openDrawingInPinta } from './open-creation-tab'
import { useStudioActivity } from './use-studio-activity'

type StudioModule = typeof import('@sistemazero/studio')
// "Editar no Pinta/Molda": aba nova já na criação (ver `open-creation-tab.ts`).
type EditorState =
  | { status: 'loading' }
  | { status: 'ready'; project: Project; releaseOpening: () => void }
  | { status: 'not-found' }
  | { status: 'pensa-refused'; message: string }

/** Carrega o projeto local e concentra apenas o ciclo de vida do editor aberto. */
export function StudioFullEditor({
  mod,
  projectId,
  viewerId,
  audience = 'kids',
  onExit,
  share,
  tutor,
  theme,
  tier,
  showExamples,
  professional,
  taskSession,
  pintaLibrary,
  moldaLibrary,
  teamLibrary,
}: {
  mod: StudioModule
  projectId: string
  viewerId: string | null
  audience?: 'kids' | 'adult'
  onExit: () => void
  share: StudioShareAdapter
  tutor: StudioTutorConfig | undefined
  theme: 'light' | 'dark'
  tier: StudioTier
  showExamples: boolean
  professional: boolean
  taskSession: StudioTaskSession | undefined
  pintaLibrary: StudioPintaLibraryAdapter | undefined
  moldaLibrary: StudioMoldaLibraryAdapter | undefined
  /**
   * "Trazer da equipe" (Pensa em equipe): chega DEPOIS de o jogo abrir, quando o servidor
   * confirma a equipe e a arte entregue. O Estúdio não o latcha, então o botão aparece sozinho.
   */
  teamLibrary?: StudioTeamLibraryAdapter | undefined
}) {
  const adapter = useMemo(() => mod.createLocalPersistenceAdapter(), [mod])
  const [state, setState] = useState<EditorState>({ status: 'loading' })
  const runtime = useFreeStudioRuntime({
    project: state.status === 'ready' ? state.project : null,
    viewerId,
    audience,
    enabled: state.status === 'ready' && state.project.kind !== 'pro' && !taskSession,
  })
  useStudioRuntimeAuthority(runtime.environment ?? null)
  const pythonProject =
    state.status === 'ready' && state.project.programmingLanguage === 'python'
      ? state.project
      : null
  const pythonRuntimeReady = Boolean(
    runtime.environment &&
      !runtime.environment.signal?.aborted &&
      !runtime.loading &&
      !runtime.error,
  )
  const pythonExtensions =
    pythonProject && pythonRuntimeReady
      ? runtime.environment?.access(pythonProject).grantedExtensionIds
      : undefined
  const [openedPython, setOpenedPython] = useState<{
    project: Project
    extensions: readonly string[]
  } | null>(null)
  useLayoutEffect(() => {
    if (pythonProject && pythonExtensions)
      setOpenedPython((current) =>
        current?.project === pythonProject &&
        current.extensions.length === pythonExtensions.length &&
        current.extensions.every((id, index) => id === pythonExtensions[index])
          ? current
          : { project: pythonProject, extensions: [...pythonExtensions] },
      )
  }, [pythonProject, pythonExtensions])
  // Absence of authority is preparation/failure, not an empty curriculum decision.
  // Once opened, retain the editor's buffers across retries and authority loss.
  const pythonUnavailable = Boolean(pythonProject && !pythonRuntimeReady)
  const mountEditor =
    !pythonProject || pythonRuntimeReady || openedPython?.project === pythonProject
  // Keep the mounted Shell during missing authority. Its old presentation is inaccessible,
  // editing is suspended and the runtime is removed; only a new decision can deny extensions.
  const pythonAllowedExtensions =
    pythonExtensions ?? (openedPython?.project === pythonProject ? openedPython.extensions : [])
  const { setWorkspaceActive } = useFocusMode()
  const workspaceActive = state.status === 'ready' && state.project.kind !== 'pro'
  useLayoutEffect(() => {
    setWorkspaceActive(workspaceActive)
    return () => setWorkspaceActive(false)
  }, [setWorkspaceActive, workspaceActive])
  const handleActivity = useStudioActivity(taskSession)

  const handlePromoteToPro = useCallback(
    (project: Project) => {
      const query = taskSession ? `?missao=${encodeURIComponent(taskSession.mission.id)}` : ''
      window.location.assign(`/estudio/pro/${encodeURIComponent(project.id)}${query}`)
    },
    [taskSession],
  )

  useEffect(() => {
    let active = true
    const lifetime = new AbortController()
    const releaseOpening =
      adapter.beginOpening?.(projectId, { signal: lifetime.signal }) ?? (() => {})
    setState({ status: 'loading' })
    adapter
      .load(projectId)
      .then((project) => {
        if (!active) return
        if (project) assertPensaJavaScriptProject(project)
        if (!project || project.kind === 'pro') releaseOpening()
        setState(project ? { status: 'ready', project, releaseOpening } : { status: 'not-found' })
      })
      .catch((cause: unknown) => {
        releaseOpening()
        if (active)
          setState(
            cause instanceof PensaProjectLanguageRefused
              ? { status: 'pensa-refused', message: cause.message }
              : { status: 'not-found' },
          )
      })
    return () => {
      active = false
      lifetime.abort()
      releaseOpening()
    }
  }, [adapter, projectId])

  useEffect(() => {
    if (state.status !== 'not-found') return
    const timer = setTimeout(onExit, 1_200)
    return () => clearTimeout(timer)
  }, [state.status, onExit])

  // O modo Pro precisa de uma navegação de documento completa para receber COOP/COEP.
  useEffect(() => {
    if (state.status === 'ready' && state.project.kind === 'pro') {
      handlePromoteToPro(state.project)
    }
  }, [state, handlePromoteToPro])

  if (state.status === 'loading') {
    return (
      <div className="grid h-full place-items-center text-muted-foreground text-sm">
        Carregando projeto…
      </div>
    )
  }
  if (state.status === 'pensa-refused') {
    return (
      <div role="alert" className="grid h-full place-content-center gap-3 p-6 text-center">
        <p>{state.message}</p>
        <button type="button" onClick={onExit} className="underline">
          Voltar
        </button>
      </div>
    )
  }
  if (state.status === 'not-found') {
    return (
      <div className="grid h-full place-items-center text-muted-foreground text-sm">
        Projeto não encontrado. Voltando à lista…
      </div>
    )
  }
  if (state.project.kind === 'pro') {
    return (
      <div className="grid h-full place-items-center text-muted-foreground text-sm">
        Abrindo o modo Código…
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {pythonUnavailable && (
        <StudioRuntimeNotice
          theme={theme}
          projectName={state.project.name}
          error={runtime.error}
          onRetry={runtime.retry}
          onExit={onExit}
        />
      )}
      <div className="min-h-0 flex-1" hidden={pythonUnavailable} inert={pythonUnavailable}>
        {mountEditor && (
          <mod.StudioEditor
            initialProject={state.project}
            persistence={adapter}
            onProjectOpeningSettled={state.releaseOpening}
            onExit={onExit}
            onChange={handleActivity}
            // Erro que o editor CONTEVE sozinho (ex.: o painel do Zappy caindo na sua
            // própria boundary). Sem este fio ele morria num console.error e a
            // próxima ocorrência voltava a ser adivinhação — foi exatamente o que
            // aconteceu com o tutor derrubando a IDE em 08/2026.
            onError={reportStudioError}
            share={share}
            tutor={tutor}
            theme={theme}
            level={tier.level}
            grantedBlockIds={
              state.project.programmingLanguage === 'python' ? undefined : tier.allowBlocks
            }
            pythonLevel={state.project.programmingLanguage === 'python' ? 3 : undefined}
            allowExtensions={
              state.project.programmingLanguage === 'python'
                ? pythonAllowedExtensions
                : tier.allowedExtensions
            }
            editingAccess={pythonUnavailable ? 'observer' : undefined}
            runtimeEnvironment={pythonUnavailable ? undefined : runtime.environment}
            allowedModes={tier.allowedModes}
            allowLevelReveal={tier.allowLevelReveal}
            features={{ professional }}
            onPromoteToPro={handlePromoteToPro}
            // Só com posse do Pinta e do Molda (produtos vendidos à parte): sem o adapter, sem botão.
            // Antes o "Editar o desenho" ia sempre e levava quem não tem o Pinta a uma tela bloqueada.
            {...(pintaLibrary ? { onEditDrawing: openDrawingInPinta } : {})}
            {...(moldaLibrary ? { onEditCreation: openCreationInMolda } : {})}
            pintaLibrary={pintaLibrary}
            moldaLibrary={moldaLibrary}
            teamLibrary={teamLibrary}
            showExamples={showExamples}
            taskSession={taskSession}
          />
        )}
      </div>
    </div>
  )
}
