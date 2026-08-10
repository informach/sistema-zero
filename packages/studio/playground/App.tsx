import {
  createEmptyProject,
  createLocalPersistenceAdapter,
  type Project,
  ProjectList,
  type StudioPintaDrawingSummary,
  type StudioPintaLibraryAdapter,
  type StudioShareAdapter,
  type StudioTutorAdapter,
  type StudioTutorHistoryMessage,
} from '@sistemazero/studio'
import { savePersonalAsset, setPersonalAssetsNamespace } from '@sistemazero/studio/personal-assets'
import type { JSX } from 'react'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'

const StudioEditor = lazy(async () => {
  const module = await import('@sistemazero/studio/editor')
  return { default: module.StudioEditor }
})

// App do PLAYGROUND: simula o host que embarca o <Studio>, consumindo SOMENTE
// a API pública do package — prova de que a superfície é suficiente. A
// navegação lista ⇄ editor usa history.pushState direto (o package não tem
// router — quem roteia é o app consumidor); manter /editor/:id na URL preserva
// o comportamento de reload e os specs e2e.
//
// O host NÃO seta data-sz-theme no <html>: o tema é escopado pelo root do
// <Studio> — o toggle da Topbar muda SÓ a área do editor, provando o isolamento.
type View = { name: 'list' } | { name: 'editor'; projectId: string } | { name: 'dual' }

// A biblioteca "Meus desenhos" (alimentada pelo Pinta) só aparece com namespace
// de perfil. O playground liga um fixo para dar como testar aqui a ponte
// Pinta↔Estúdio (botão "Editar" + a sincronia do desenho salvo).
setPersonalAssetsNamespace('playground')

function parseViewFromLocation(): View {
  if (window.location.pathname === '/dual') return { name: 'dual' }
  const match = window.location.pathname.match(/^\/editor\/(.+)$/)
  return match?.[1] ? { name: 'editor', projectId: decodeURIComponent(match[1]) } : { name: 'list' }
}

type EditorState =
  | { status: 'loading' }
  | { status: 'ready'; project: Project }
  | { status: 'not-found' }

const tutorHistory = new Map<string, StudioTutorHistoryMessage[]>()

// "Trazer do Pinta" de DEMONSTRAÇÃO: uma galeria fixa (sem o Pinta real) para
// exercitar a modal (busca, selo "no projeto", erro de apagado). O `import`
// grava DE VERDADE na biblioteca pessoal — igual ao host real — para provar a
// mão-dupla: o desenho importado ganha o "✏️ editar desenho" em "No projeto".
const PINTA_DEMO_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const PINTA_DEMO_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="4" fill="#38bdf8"/><circle cx="12" cy="12" r="6" fill="#fbbf24"/></svg>',
)}`
const pintaDrawingsDemo: StudioPintaDrawingSummary[] = [
  {
    id: 'pg-dragao',
    name: 'dragao-do-pinta',
    role: 'sprite',
    style: 'pixel',
    updatedAt: Date.now(),
    thumbDataUrl: PINTA_DEMO_PNG,
  },
  {
    id: 'pg-ceu',
    name: 'ceu-do-pinta',
    role: 'background',
    style: 'vector',
    updatedAt: Date.now() - 60_000,
    thumbDataUrl: PINTA_DEMO_SVG,
    projectName: 'jogo-demo',
  },
  {
    id: 'pg-mapa',
    name: 'mapa-sem-miniatura',
    role: 'tilemap',
    updatedAt: Date.now() - 120_000,
    thumbDataUrl: null,
  },
]
const pintaLibraryDemo: StudioPintaLibraryAdapter = {
  async list() {
    await new Promise((r) => setTimeout(r, 300))
    return pintaDrawingsDemo
  },
  async import(drawingId) {
    const drawing = pintaDrawingsDemo.find((d) => d.id === drawingId)
    if (!drawing) {
      return {
        ok: false,
        error: 'Esse desenho não está mais na galeria do Pinta.',
        code: 'not-found',
      }
    }
    const dataUrl = drawing.thumbDataUrl ?? PINTA_DEMO_PNG
    const saved = await savePersonalAsset({ id: drawing.id, name: drawing.name, dataUrl })
    if (!saved.ok) {
      return { ok: false, error: saved.error ?? 'Não consegui trazer esse desenho agora.' }
    }
    return {
      ok: true,
      asset: { id: drawing.id, name: saved.name ?? drawing.name, dataUrl, width: 24, height: 24 },
    }
  },
}

/**
 * Adapter local do playground. Ele exercita a API pública completa do tutor sem
 * rede nem credenciais; autorização, quota e persistência real pertencem ao host.
 */
const tutorDemo: StudioTutorAdapter = {
  async loadHistory(projectId) {
    return { messages: tutorHistory.get(projectId) ?? [], nextCursor: null }
  },
  async deleteHistory(projectId) {
    tutorHistory.delete(projectId)
  },
  async ask(input) {
    const createdAt = new Date().toISOString()
    const response = {
      id: `zappy-demo-${input.clientMessageId}`,
      text: 'Abra a categoria HTML e procure o bloco de texto. Eu só mostro o caminho: seu projeto continua do jeitinho que está.',
      scope: 'block' as const,
      blockReferences: [
        {
          blockType: 'sz_html_text',
          name: 'texto',
          category: 'HTML',
          area: 'structure',
        },
      ],
      createdAt,
    }
    const current = tutorHistory.get(input.projectId) ?? []
    tutorHistory.set(input.projectId, [
      ...current,
      {
        id: input.clientMessageId,
        role: 'user',
        text: input.question,
        createdAt,
      },
      {
        id: response.id,
        role: 'assistant',
        text: response.text,
        response,
        createdAt,
      },
    ])
    // O playground não tem quota: sem saldo, o medidor simplesmente não aparece.
    return { response }
  },
  async feedback() {},
}

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
    <Suspense
      fallback={
        <div
          role="status"
          className="flex h-full items-center justify-center bg-sz-bg text-sm text-sz-fg-soft"
        >
          Carregando editor…
        </div>
      }
    >
      <StudioEditor
        initialProject={state.project}
        onExit={onExit}
        // Liga o botão "Compartilhar" (publicar no Mural) com um adapter de demo.
        share={shareDemo}
        // O tutor é opt-in e só existe no editor completo; aulas não recebem esta prop.
        tutor={{ adapter: tutorDemo, cooldownMs: 0 }}
        // Playground = superfície do admin: mostra os EXEMPLOS prontos (escondidos
        // para clientes, pois podem estar desatualizados). Ver examples-visibility.ts.
        showExamples
        // Experiência completa no playground (defaults embarcados: terminal/IA OFF).
        // Projeto profissional força terminal + allowedModes:['code'] via a flag.
        features={isPro ? { professional: true, ai: true } : { terminal: true, ai: true }}
        // Host fake: loga o fluxo híbrido p/ validação manual (DevTools).
        onChange={(project) => console.debug('[host] onChange', project.id, project.updatedAt)}
        onSave={(project) => console.debug('[host] onSave', project.id)}
        onError={(error) => console.warn('[host] onError', error)}
        onModeChange={(mode) => console.debug('[host] onModeChange', mode)}
        onReady={() => console.debug('[host] onReady')}
        // Botão "Editar" nos desenhos do Pinta. No app de verdade abre
        // `/pinta?desenho=<id>` numa aba nova; aqui só loga (não há Pinta).
        onEditDrawing={(drawingId) => console.debug('[host] onEditDrawing', drawingId)}
        // "Trazer do Pinta" com galeria fake (ver pintaLibraryDemo).
        pintaLibrary={pintaLibraryDemo}
      />
    </Suspense>
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
    <Suspense
      fallback={
        <div
          role="status"
          className="flex h-full items-center justify-center bg-sz-bg text-sm text-sz-fg-soft"
        >
          Carregando editores…
        </div>
      }
    >
      <div className="grid h-full grid-cols-2 gap-2 p-2" style={{ background: '#333' }}>
        <div className="h-full min-h-0 overflow-hidden rounded">
          <StudioEditor initialProject={a} theme="dark" />
        </div>
        <div className="h-full min-h-0 overflow-hidden rounded">
          <StudioEditor initialProject={b} theme="light" />
        </div>
      </div>
    </Suspense>
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

  if (view.name === 'dual') {
    return <DualView />
  }
  if (view.name === 'editor') {
    return <EditorScreen projectId={view.projectId} onExit={() => navigate({ name: 'list' })} />
  }
  // professional habilita o seletor de template profissional no "Novo projeto"
  // (o dev server do Vite já envia COOP/COEP, exigidos pelo WebContainer).
  return (
    <ProjectList
      professional
      showExamples
      onOpenProject={(id) => navigate({ name: 'editor', projectId: id })}
    />
  )
}
