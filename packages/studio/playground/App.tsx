import type { JSX } from 'react'
import { useEffect, useState } from 'react'
import { EditorPage } from '../src/pages/EditorPage'
import { ProjectListPage } from '../src/pages/ProjectListPage'
import { bootstrapPersistence } from '../src/state/persistence'
import { useProjectStore } from '../src/state/projectStore'
import { useSettingsStore } from '../src/state/settingsStore'

// App do PLAYGROUND: simula o host que embarca o studio. A navegação
// lista ⇄ editor usa history.pushState direto (o package não tem router —
// quem roteia é o app consumidor); manter /editor/:id na URL preserva o
// comportamento de reload e os specs e2e. O lifecycle abaixo (persistência,
// settings, tema, beforeunload) migra para dentro do <Studio> nas próximas
// fases.
type View = { name: 'list' } | { name: 'editor'; projectId: string }

function parseViewFromLocation(): View {
  const match = window.location.pathname.match(/^\/editor\/(.+)$/)
  return match?.[1] ? { name: 'editor', projectId: decodeURIComponent(match[1]) } : { name: 'list' }
}

export function App(): JSX.Element {
  const loadSettings = useSettingsStore((s) => s.load)
  const theme = useSettingsStore((s) => s.theme)
  const fontSize = useSettingsStore((s) => s.fontSize)
  const isDirty = useProjectStore((s) => s.isDirty)
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
    const cleanup = bootstrapPersistence()
    void loadSettings()
    return cleanup
  }, [loadSettings])

  useEffect(() => {
    document.documentElement.setAttribute('data-sz-theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`
  }, [fontSize])

  useEffect(() => {
    if (!isDirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  if (view.name === 'editor') {
    return <EditorPage projectId={view.projectId} onExit={() => navigate({ name: 'list' })} />
  }
  return <ProjectListPage onOpenProject={(id) => navigate({ name: 'editor', projectId: id })} />
}
