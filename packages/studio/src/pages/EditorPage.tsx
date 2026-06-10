import type { JSX } from 'react'
import { useEffect, useState } from 'react'
import { LoadingScreen } from '../components/layout/LoadingViews'
import { Shell } from '../components/layout/Shell'
import { useProjectStore } from '../state/projectStore'
import { useUIStore } from '../state/uiStore'

type LoadState = 'loading' | 'ready' | 'not-found'

export interface EditorPageProps {
  projectId: string
  /** Volta à navegação do host (ex.: lista de projetos). Também usado no not-found. */
  onExit: () => void
}

export function EditorPage({ projectId, onExit }: EditorPageProps): JSX.Element {
  const hasProject = useProjectStore((s) => Boolean(s.project))
  const loadProject = useProjectStore((s) => s.loadProject)
  const unloadProject = useProjectStore((s) => s.unloadProject)
  const setPreviewRunning = useUIStore((s) => s.setPreviewRunning)
  const [status, setStatus] = useState<LoadState>('loading')

  useEffect(() => {
    let cancelled = false
    if (!projectId) {
      setStatus('not-found')
      return
    }
    setStatus('loading')
    void (async () => {
      const loaded = await loadProject(projectId)
      if (cancelled) return
      if (loaded) setPreviewRunning(true)
      setStatus(loaded ? 'ready' : 'not-found')
    })()
    return () => {
      cancelled = true
      unloadProject()
    }
  }, [projectId, loadProject, unloadProject, setPreviewRunning])

  useEffect(() => {
    if (status !== 'not-found') return
    const timer = setTimeout(() => onExit(), 1500)
    return () => clearTimeout(timer)
  }, [status, onExit])

  if (status === 'loading' || (status === 'ready' && !hasProject)) {
    return <LoadingScreen message="Carregando projeto…" />
  }

  if (status === 'not-found') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-sz-bg text-sz-fg-soft">
        <p className="text-sm">Projeto não encontrado. Voltando à lista…</p>
      </div>
    )
  }

  return <Shell onExit={onExit} />
}
