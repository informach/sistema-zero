import {
  createEmptyProject,
  createLocalPersistenceAdapter,
  type Project,
  ProjectList,
  prefetchStudioModes,
  StudioEditor,
  type StudioShareAdapter,
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
type View =
  | { name: 'list' }
  | { name: 'editor'; projectId: string }
  | { name: 'dual' }
  | { name: 'guided' }

function parseViewFromLocation(): View {
  if (window.location.pathname === '/dual') return { name: 'dual' }
  if (window.location.pathname === '/guided') return { name: 'guided' }
  const match = window.location.pathname.match(/^\/editor\/(.+)$/)
  return match?.[1] ? { name: 'editor', projectId: decodeURIComponent(match[1]) } : { name: 'list' }
}

// REPRO TEMPORÁRIO (modo criação guiada): overlay `fixed inset-0` + grid 2 colunas,
// StudioEditor na DIREITA (layout NARROW). Semeia um bloco de valor p/ clicar e medir o
// deslocamento do editor de campo do Blockly. Em /guided.
function GuidedView(): JSX.Element {
  const [project] = useState(() => {
    const p = createEmptyProject('guided-repro', 'Repro Guiada')
    const bs = p.blocksState as { blocks: { blocks: unknown[] } }
    bs.blocks.blocks.push({ type: 'sz_val_number', x: 40, y: 40, fields: { NUM: 400 } })
    return p
  })
  const params = new URLSearchParams(window.location.search)
  // CONTROLES p/ bisseccionar o bug do editor de campo:
  //   ?plain        → SEM overlay fixed, largura TOTAL (layout wide) — imita o modo normal.
  //   ?plain&narrow → SEM overlay fixed, mas em coluna estreita (layout narrow, não-fixo).
  if (params.has('plain')) {
    const narrow = params.has('narrow')
    return (
      <div style={{ height: '100vh', display: 'flex', padding: 12, background: '#eef' }}>
        <div
          style={{
            isolation: 'isolate',
            overflow: 'hidden',
            flex: narrow ? undefined : 1,
            width: narrow ? 380 : undefined,
            minHeight: 0,
            border: '1px solid #99a',
          }}
        >
          <StudioEditor initialProject={project} persistence="none" theme="light" />
        </div>
      </div>
    )
  }
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        background: '#eef',
      }}
    >
      <div style={{ padding: 8, borderBottom: '1px solid #99a' }}>Repro do modo criação guiada</div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          padding: 12,
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <div style={{ background: '#cdf', display: 'grid', placeItems: 'center' }}>
          VÍDEO (coluna esquerda)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
              border: '1px solid #99a',
              padding: 12,
              background: '#fff',
            }}
          >
            <div
              style={{
                isolation: 'isolate',
                overflow: 'hidden',
                flex: 1,
                minHeight: 0,
                border: '1px solid #99a',
              }}
            >
              <StudioEditor initialProject={project} persistence="none" theme="light" />
            </div>
          </div>
        </div>
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
  const adapter = useMemo(() => createLocalPersistenceAdapter(), [])
  const [state, setState] = useState<EditorState>({ status: 'loading' })

  // Adapter de COMPARTILHAR de DEMONSTRAÇÃO: liga o botão "Compartilhar" na Topbar
  // e simula o servidor (a IA e o publish são mockados; o PRINT é capturado de
  // verdade no browser via captureCoverFromProject). No app real (community-kids),
  // o adapter chama /api/studio/describe e /api/studio/publish.
  const shareDemo = useMemo<StudioShareAdapter>(
    () => ({
      async generateDescription({ title }) {
        await new Promise((r) => setTimeout(r, 600))
        return `Um joguinho chamado "${title}", feito no Sistema Zero Studio. (Descrição de demonstração do playground.)`
      },
      async publish({ title, description, coverDataUrl }) {
        await new Promise((r) => setTimeout(r, 800))
        console.debug('[host] publish (demo)', {
          title,
          description,
          hasCover: Boolean(coverDataUrl),
        })
        return { muralUrl: '#mural-demo', playUrl: '#jogar-demo' }
      },
    }),
    [],
  )

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    adapter
      .load(projectId)
      .then((project) => {
        if (cancelled) return
        setState(project ? { status: 'ready', project } : { status: 'not-found' })
      })
      .catch((err) => {
        // Sem o catch, uma falha no load deixava a tela "Carregando projeto…" presa
        // para sempre (a Promise rejeitada nunca chamava setState).
        if (cancelled) return
        console.error('[host] falha ao carregar projeto', err)
        setState({ status: 'not-found' })
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
    <StudioEditor
      initialProject={state.project}
      onExit={onExit}
      // Liga o botão "Compartilhar" (publicar no Mural) com um adapter de demo.
      share={shareDemo}
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
        <StudioEditor initialProject={a} theme="dark" />
      </div>
      <div className="h-full min-h-0 overflow-hidden rounded">
        <StudioEditor initialProject={b} theme="light" />
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
  if (view.name === 'guided') {
    return <GuidedView />
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
