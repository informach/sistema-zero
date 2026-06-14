import {
  createEmptyProject,
  createLocalPersistenceAdapter,
  type Project,
  ProjectList,
  prefetchStudioModes,
  Studio,
} from '@sistemazero/studio'
import type { JSX } from 'react'
import { useEffect, useMemo, useState } from 'react'

// App do PLAYGROUND: simula o host que embarca o <Studio>, consumindo SOMENTE
// a API pública do package — prova de que a superfície é suficiente. A
// navegação lista ⇄ editor usa history.pushState direto (o package não tem
// router — quem roteia é o app consumidor); manter /editor/:id na URL preserva
// o comportamento de reload e os specs e2e.
//
// O host NÃO seta data-sz-theme no <html>: o tema é escopado pelo root do
// <Studio> — o toggle da Topbar muda SÓ a área do editor, provando o isolamento.
type View = { name: 'list' } | { name: 'editor'; projectId: string } | { name: 'dual' }

function parseViewFromLocation(): View {
  if (window.location.pathname === '/dual') return { name: 'dual' }
  const match = window.location.pathname.match(/^\/editor\/(.+)$/)
  return match?.[1] ? { name: 'editor', projectId: decodeURIComponent(match[1]) } : { name: 'list' }
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
  const adapter = useMemo(() => createLocalPersistenceAdapter(), [])
  const [state, setState] = useState<EditorState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    void adapter.load(projectId).then((project) => {
      if (cancelled) return
      setState(project ? { status: 'ready', project } : { status: 'not-found' })
    })
    return () => {
      cancelled = true
    }
  }, [adapter, projectId])

  useEffect(() => {
    if (state.status !== 'not-found') return
    const timer = setTimeout(() => onExit(), 1500)
    return () => clearTimeout(timer)
  }, [state.status, onExit])

  if (state.status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center bg-sz-bg text-sm text-sz-fg-soft">
        Carregando projeto…
      </div>
    )
  }
  if (state.status === 'not-found') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-sz-bg text-sz-fg-soft">
        <p className="text-sm">Projeto não encontrado. Voltando à lista…</p>
      </div>
    )
  }
  const isPro = state.project.kind === 'pro'
  return (
    <Studio
      initialProject={state.project}
      onExit={onExit}
      // Experiência completa no playground (defaults embarcados: terminal/IA OFF).
      // Projeto profissional força terminal + allowedModes:['code'] via a flag.
      features={isPro ? { professional: true, ai: true } : { terminal: true, ai: true }}
      // Host fake: loga o fluxo híbrido p/ validação manual (DevTools).
      onChange={(project) => console.debug('[host] onChange', project.id, project.updatedAt)}
      onSave={(project) => console.debug('[host] onSave', project.id)}
      onError={(error) => console.warn('[host] onError', error)}
      onModeChange={(mode) => console.debug('[host] onModeChange', mode)}
      onReady={() => console.debug('[host] onReady')}
    />
  )
}

/**
 * Prova do isolamento por instância: duas cópias do <Studio> lado a lado, com
 * temas diferentes, sem cross-talk de projeto/console/preview. Em /dual.
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

export function App(): JSX.Element {
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

  // Aquece os chunks pesados (Blockly/Monaco) enquanto o aluno olha a lista.
  useEffect(() => {
    prefetchStudioModes()
  }, [])

  if (view.name === 'dual') {
    return <DualView />
  }
  if (view.name === 'editor') {
    return <EditorScreen projectId={view.projectId} onExit={() => navigate({ name: 'list' })} />
  }
  // professional habilita o seletor de template profissional no "Novo projeto"
  // (o dev server do Vite já envia COOP/COEP, exigidos pelo WebContainer).
  return (
    <ProjectList professional onOpenProject={(id) => navigate({ name: 'editor', projectId: id })} />
  )
}
