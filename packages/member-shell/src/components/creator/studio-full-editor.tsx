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
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { reportStudioError } from '../../lib/studio-error'
import { useFocusMode } from './focus-mode'
import { useStudioActivity } from './use-studio-activity'

type StudioModule = typeof import('@sistemazero/studio')
type EditorState =
  | { status: 'loading' }
  | { status: 'ready'; project: Project }
  | { status: 'not-found' }

/**
 * "Editar o desenho" nos assets vindos do Pinta: abre o Pinta em aba nova já
 * naquele desenho. O id viaja na URL porque `noopener` isola as duas abas.
 */
function openDrawingInPinta(drawingId: string): void {
  window.open(`/pinta?desenho=${encodeURIComponent(drawingId)}`, '_blank', 'noopener,noreferrer')
}

/**
 * "Editar a criação" nos modelos, céus e texturas vindos do Molda: abre o Molda em
 * aba nova já naquela criação (o `molda-client` lê `?criacao=` no 1º render).
 */
function openCreationInMolda(creationId: string): void {
  window.open(`/molda?criacao=${encodeURIComponent(creationId)}`, '_blank', 'noopener,noreferrer')
}

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
    setState({ status: 'loading' })
    adapter
      .load(projectId)
      .then((project) => {
        if (!active) return
        setState(project ? { status: 'ready', project } : { status: 'not-found' })
      })
      .catch(() => {
        if (active) setState({ status: 'not-found' })
      })
    return () => {
      active = false
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
      {state.project.programmingLanguage === 'python' && (runtime.loading || runtime.error) && (
        <div
          role={runtime.error ? 'alert' : 'status'}
          className="flex items-center gap-2 px-3 py-2 text-sm"
        >
          {runtime.error ?? 'Preparando Python…'}
          {runtime.error && (
            <button type="button" onClick={runtime.retry}>
              Tentar novamente
            </button>
          )}
        </div>
      )}
      <div className="min-h-0 flex-1">
        <mod.StudioEditor
          initialProject={state.project}
          persistence="local"
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
          allowBlocks={
            state.project.programmingLanguage === 'python' ? undefined : tier.allowBlocks
          }
          pythonLevel={state.project.programmingLanguage === 'python' ? 3 : undefined}
          allowExtensions={
            state.project.programmingLanguage === 'python' ? undefined : tier.allowedExtensions
          }
          runtimeEnvironment={runtime.environment}
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
      </div>
    </div>
  )
}
