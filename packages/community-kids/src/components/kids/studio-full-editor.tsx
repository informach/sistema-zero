'use client'

import type { StudioTier } from '@sistemazero/member-shell/lib/studio-tier'
import type {
  Project,
  StudioPintaLibraryAdapter,
  StudioShareAdapter,
  StudioTaskSession,
  StudioTutorConfig,
} from '@sistemazero/studio'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

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

/** Carrega o projeto local e concentra apenas o ciclo de vida do editor aberto. */
export function StudioFullEditor({
  mod,
  projectId,
  onExit,
  share,
  tutor,
  theme,
  tier,
  showExamples,
  professional,
  taskSession,
  pintaLibrary,
}: {
  mod: StudioModule
  projectId: string
  onExit: () => void
  share: StudioShareAdapter
  tutor: StudioTutorConfig | undefined
  theme: 'light' | 'dark'
  tier: StudioTier
  showExamples: boolean
  professional: boolean
  taskSession: StudioTaskSession | undefined
  pintaLibrary: StudioPintaLibraryAdapter | undefined
}) {
  const adapter = useMemo(() => mod.createLocalPersistenceAdapter(), [mod])
  const [state, setState] = useState<EditorState>({ status: 'loading' })
  const router = useRouter()
  const activityBeaconedRef = useRef(false)

  const handleActivity = useCallback(
    (project: Project, ctx?: { reason: 'autosave' | 'flush' }) => {
      if (ctx?.reason !== 'autosave') return
      if (taskSession) {
        void taskSession
          .onProgress({
            outputRef: {
              kind: 'studio_project',
              projectId: project.id,
              saveRevision: String(project.updatedAt),
            },
          })
          .catch(() => {})
      }
      if (activityBeaconedRef.current) return
      activityBeaconedRef.current = true
      fetch('/api/studio/activity', { method: 'POST' })
        .then((response) => {
          if (response.ok) router.refresh()
        })
        .catch(() => {})
    },
    [router, taskSession],
  )

  const handlePromoteToPro = useCallback((project: Project) => {
    window.location.assign(`/estudio/pro/${encodeURIComponent(project.id)}`)
  }, [])

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
      window.location.assign(`/estudio/pro/${state.project.id}`)
    }
  }, [state])

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
    <mod.StudioEditor
      initialProject={state.project}
      persistence="local"
      onExit={onExit}
      onChange={handleActivity}
      share={share}
      tutor={tutor}
      theme={theme}
      level={tier.level}
      allowBlocks={tier.allowBlocks}
      allowExtensions={tier.allowedExtensions}
      allowedModes={tier.allowedModes}
      allowLevelReveal={tier.allowLevelReveal}
      features={{ professional }}
      onPromoteToPro={handlePromoteToPro}
      onEditDrawing={openDrawingInPinta}
      pintaLibrary={pintaLibrary}
      showExamples={showExamples}
      taskSession={taskSession}
    />
  )
}
