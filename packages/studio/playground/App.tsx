import { createEmptyProject, type Project, Studio } from '@sistemazero/studio'
import type { JSX } from 'react'
import { useEffect, useState } from 'react'
import { LoadingScreen } from '../src/components/layout/LoadingViews'
import { ProjectListPage } from '../src/pages/ProjectListPage'
import { loadSanitizedProjectById } from '../src/state/projectStore'
import { useSettingsStore } from '../src/state/settingsStore'

// App do PLAYGROUND: simula o host que embarca o <Studio>. A navegação
// lista ⇄ editor usa history.pushState direto (o package não tem router —
// quem roteia é o app consumidor); manter /editor/:id na URL preserva o
// comportamento de reload e os specs e2e.
//
// Repare que o host NÃO seta data-sz-theme no <html>: o tema é escopado pelo
// root do <Studio> — trocar o tema nas configurações do editor muda SÓ a área
// do editor, provando o isolamento.
type View = { name: 'list' } | { name: 'editor'; projectId: string } | { name: 'dual' }

function parseViewFromLocation(): View {
  if (window.location.pathname === '/dual') return { name: 'dual' }
  const match = window.location.pathname.match(/^\/editor\/(.+)$/)
  return match?.[1] ? { name: 'editor', projectId: decodeURIComponent(match[1]) } : { name: 'list' }
}

/**
 * Prova do isolamento por instância (checkpoint da fase de stores): duas
 * cópias do <Studio> lado a lado, com temas diferentes, sem cross-talk de
 * projeto/console/preview. Acessível em /dual.
 */
function DualView(): JSX.Element {
  const [a] = useState(() => createEmptyProject('dual-a', 'Instância A'))
  const [b] = useState(() => createEmptyProject('dual-b', 'Instância B'))
  return (
    <div className="grid h-full grid-cols-2 gap-2 p-2" style={{ background: '#333' }}>
      <div className="h-full min-h-0 overflow-hidden rounded">
        <Studio initialProject={a} theme="dark" />
      </div>
      <div className="h-full min-h-0 overflow-hidden rounded">
        <Studio initialProject={b} theme="light" />
      </div>
    </div>
  )
}

type EditorState =
  | { status: 'loading' }
  | { status: 'ready'; project: Project }
  | { status: 'not-found' }

function EditorScreen({
  projectId,
  onExit,
}: {
  projectId: string
  onExit: () => void
}): JSX.Element {
  const [state, setState] = useState<EditorState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    void loadSanitizedProjectById(projectId).then((project) => {
      if (cancelled) return
      setState(project ? { status: 'ready', project } : { status: 'not-found' })
    })
    return () => {
      cancelled = true
    }
  }, [projectId])

  useEffect(() => {
    if (state.status !== 'not-found') return
    const timer = setTimeout(() => onExit(), 1500)
    return () => clearTimeout(timer)
  }, [state.status, onExit])

  if (state.status === 'loading') return <LoadingScreen message="Carregando projeto…" />
  if (state.status === 'not-found') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-sz-bg text-sz-fg-soft">
        <p className="text-sm">Projeto não encontrado. Voltando à lista…</p>
      </div>
    )
  }
  return (
    <Studio
      initialProject={state.project}
      onExit={onExit}
      // Experiência completa no playground (defaults embarcados: terminal/IA OFF).
      features={{ terminal: true, ai: true }}
      // Host fake: loga o fluxo híbrido p/ validação manual (DevTools).
      onChange={(project) => console.debug('[host] onChange', project.id, project.updatedAt)}
      onSave={(project) => console.debug('[host] onSave', project.id)}
      onError={(error) => console.warn('[host] onError', error)}
      onModeChange={(mode) => console.debug('[host] onModeChange', mode)}
      onReady={() => console.debug('[host] onReady')}
    />
  )
}

export function App(): JSX.Element {
  const loadSettings = useSettingsStore((s) => s.load)
  const fontSize = useSettingsStore((s) => s.fontSize)
  const [view, setView] = useState<View>(() => parseViewFromLocation())

  const navigate = (next: View) => {
    const url = next.name === 'editor' ? `/editor/${encodeURIComponent(next.projectId)}` : '/'
    window.history.pushState(null, '', url)
    setView(next)
  }

  useEffect(() => {
    const onPopState = () => setView(parseViewFromLocation())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  // Escala global da UI — hack de app standalone que segue no playground até a
  // fase que remove o fontSize de UI das configurações.
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`
  }, [fontSize])

  if (view.name === 'dual') {
    return <DualView />
  }
  if (view.name === 'editor') {
    return <EditorScreen projectId={view.projectId} onExit={() => navigate({ name: 'list' })} />
  }
  return <ProjectListPage onOpenProject={(id) => navigate({ name: 'editor', projectId: id })} />
}
