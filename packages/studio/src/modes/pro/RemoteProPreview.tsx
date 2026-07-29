import { type JSX, type ReactNode, useEffect, useRef, useState } from 'react'
import { Button } from '#ui'
import { useMeasuredWidth } from '../../hooks/useMeasuredWidth'
import { useLogsStore } from '../../state/logsStore'
import { useProjectStore } from '../../state/projectStore'
import type { StudioProRuntimeAdapter } from '../../studio/pro-runtime'
import { buildProConsoleBridgeScript, isProConsoleMessage } from './proConsoleBridge'

const TOOLBAR_COMPACT_MAX_PX = 400

type Phase = 'building' | 'ready' | 'error'

export function RemoteProPreview({ runtime }: { runtime: StudioProRuntimeAdapter }): JSX.Element {
  const project = useProjectStore((state) => state.project)
  const pushLog = useLogsStore((state) => state.push)
  const latestProjectRef = useRef(project)
  latestProjectRef.current = project
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const toolbarWidth = useMeasuredWidth(toolbarRef)
  const compactToolbar = toolbarWidth > 0 && toolbarWidth < TOOLBAR_COMPACT_MAX_PX

  const [phase, setPhase] = useState<Phase>('building')
  const [html, setHtml] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [output, setOutput] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [reloadNonce, setReloadNonce] = useState(0)
  const [builtRevision, setBuiltRevision] = useState<number | null>(null)
  const projectId = project?.id ?? null
  const currentRevision = project?.updatedAt ?? null
  const stale = phase === 'ready' && currentRevision !== builtRevision

  // `attempt` é o gatilho manual de recompilação. O snapshot vem do ref para
  // não recompilar automaticamente a cada tecla enquanto a criança edita.
  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt dispara a recompilação manual
  useEffect(() => {
    const snapshot = latestProjectRef.current
    if (snapshot?.kind !== 'pro' || snapshot.id !== projectId) return
    const controller = new AbortController()
    const revision = snapshot.updatedAt
    setPhase('building')
    setError(null)
    setOutput('')

    void runtime
      .build({ project: snapshot, signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return
        setHtml(injectConsoleBridge(result.html, window.location.origin))
        setOutput(result.output ?? '')
        setBuiltRevision(revision)
        setPhase('ready')
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        const runtimeError = cause as { message?: unknown; output?: unknown }
        setError(
          typeof runtimeError?.message === 'string'
            ? runtimeError.message
            : 'Não foi possível compilar o projeto.',
        )
        setOutput(typeof runtimeError?.output === 'string' ? runtimeError.output : '')
        setPhase('error')
      })

    return () => controller.abort()
  }, [projectId, attempt, runtime])

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return
      if (!isProConsoleMessage(event.data)) return
      pushLog({
        source: 'sz-preview',
        kind: event.data.kind,
        parts: event.data.parts,
        timestamp: Date.now(),
      })
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [pushLog])

  const rebuild = () => {
    const latest = latestProjectRef.current
    if (latest?.kind !== 'pro') return
    setAttempt((value) => value + 1)
  }

  if (phase === 'ready') {
    return (
      <div className="flex h-full w-full flex-col bg-sz-bg">
        <div
          ref={toolbarRef}
          className="flex items-center gap-1 border-sz-border border-b bg-sz-panel px-2 py-1"
        >
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setReloadNonce((value) => value + 1)}
            title="Recarregar o resultado compilado"
            aria-label="Atualizar o preview"
          >
            {compactToolbar ? '⟳' : '⟳ Atualizar'}
          </Button>
          <Button
            size="sm"
            variant={stale ? 'primary' : 'ghost'}
            onClick={rebuild}
            title="Compilar novamente com as alterações atuais"
            aria-label="Executar alterações"
          >
            {compactToolbar ? '▶' : stale ? '▶ Executar alterações' : '▶ Executar de novo'}
          </Button>
          {project?.name ? (
            <span
              className="ml-2 min-w-0 flex-1 truncate font-medium text-sz-fg-soft text-xs"
              title={project.name}
            >
              {project.name}
            </span>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 bg-white">
          <iframe
            key={reloadNonce}
            ref={iframeRef}
            srcDoc={html}
            title="Pré-visualização da atividade Pro"
            sandbox="allow-scripts allow-pointer-lock"
            referrerPolicy="no-referrer"
            className="h-full w-full border-0"
          />
        </div>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <PreviewOverlay>
        <p className="text-sz-error">Não foi possível compilar o projeto.</p>
        {error ? <p className="max-w-md text-sz-fg-mute">{error}</p> : null}
        <BuildOutput output={output} />
        <Button variant="ghost" size="sm" onClick={rebuild}>
          Tentar de novo
        </Button>
      </PreviewOverlay>
    )
  }

  return (
    <PreviewOverlay>
      <p className="text-sz-fg-soft">Preparando a atividade Pro…</p>
      <p className="max-w-md text-sz-fg-mute">
        O projeto está sendo compilado em um ambiente seguro. Isso pode levar alguns segundos na
        primeira vez.
      </p>
    </PreviewOverlay>
  )
}

function injectConsoleBridge(html: string, parentOrigin: string): string {
  const script = `<script>${buildProConsoleBridgeScript(parentOrigin).replace(/<\/script/gi, '<\\/script')}</script>`
  return html.includes('</head>') ? html.replace('</head>', `${script}</head>`) : `${script}${html}`
}

function PreviewOverlay({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-sz-panel p-6 text-center text-xs">
      {children}
    </div>
  )
}

function BuildOutput({ output }: { output: string }): JSX.Element | null {
  if (!output.trim()) return null
  return (
    <pre className="max-h-40 w-full max-w-md overflow-auto rounded bg-sz-bg p-2 text-left font-mono text-[10px] text-sz-fg-mute leading-tight">
      {output}
    </pre>
  )
}
