import { buildProRuntimeBridgeScript } from '@sistemazero/core/studio/pro-runtime-bridge'
import { type JSX, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '#ui'
import { useMeasuredWidth } from '../../hooks/useMeasuredWidth'
import { createGameStorageSession } from '../../state/gameStorage'
import { useLogsStore } from '../../state/logsStore'
import { captureProjectStorageScope } from '../../state/projectStorageRuntime'
import { useProjectStore } from '../../state/projectStore'
import type { StudioProRuntimeAdapter, StudioProRuntimeBuildResult } from '../../studio/pro-runtime'
import { ProArtifactPreview } from './ProArtifactPreview'
import { isProConsoleMessage } from './proConsoleBridge'
import { useProGameStorage } from './useProGameStorage'

const TOOLBAR_COMPACT_MAX_PX = 400

type Phase = 'building' | 'ready' | 'error'

export function RemoteProPreview({
  runtime,
  active = true,
}: {
  runtime: StudioProRuntimeAdapter
  active?: boolean
}): JSX.Element | null {
  const [started, setStarted] = useState(active)
  useEffect(() => {
    if (active) setStarted(true)
  }, [active])
  const project = useProjectStore((state) => state.project)
  const pushLog = useLogsStore((state) => state.push)
  const latestProjectRef = useRef(project)
  latestProjectRef.current = project
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const toolbarWidth = useMeasuredWidth(toolbarRef)
  const compactToolbar = toolbarWidth > 0 && toolbarWidth < TOOLBAR_COMPACT_MAX_PX

  const [phase, setPhase] = useState<Phase>('building')
  const [compiled, setCompiled] = useState<{
    projectId: string
    result: StudioProRuntimeBuildResult
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [output, setOutput] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [reloadNonce, setReloadNonce] = useState(0)
  const [builtRevision, setBuiltRevision] = useState<number | null>(null)
  const projectId = project?.id ?? null
  const currentRevision = project?.updatedAt ?? null
  const result = compiled?.projectId === projectId ? compiled.result : null
  const stale = currentRevision !== builtRevision
  const scope = captureProjectStorageScope()
  // biome-ignore lint/correctness/useExhaustiveDependencies: replace the captured backend on profile changes
  const backend = useMemo(
    () => (projectId ? createGameStorageSession(projectId) : undefined),
    [projectId, scope],
  )
  const storageName = useProGameStorage({
    frame: iframeRef,
    projectId,
    revision: builtRevision ?? 0,
    identity: `${result?.artifact?.id ?? builtRevision ?? ''}:${reloadNonce}`,
    origin: active && result?.html ? 'null' : null,
  })

  // `attempt` é o gatilho manual de recompilação. O snapshot vem do ref para
  // não recompilar automaticamente a cada tecla enquanto a criança edita.
  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt dispara a recompilação manual
  useEffect(() => {
    if (!started) return
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
        setCompiled({
          projectId: snapshot.id,
          result: result.artifact
            ? result
            : {
                ...result,
                html: injectConsoleBridge(result.html, window.location.origin),
              },
        })
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
  }, [projectId, attempt, runtime, started])

  useEffect(() => {
    if (!active) return
    const handler = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return
      if (event.origin !== 'null') return
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
  }, [pushLog, active])

  const rebuild = () => {
    const latest = latestProjectRef.current
    if (latest?.kind !== 'pro') return
    setAttempt((value) => value + 1)
  }

  if (!active) return null

  if (result) {
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
            disabled={phase === 'building'}
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
        {phase === 'building' ? (
          <p role="status" className="px-3 py-2 text-sz-fg-soft text-xs">
            Compilando alterações. A última versão continua disponível.
          </p>
        ) : null}
        {phase === 'error' ? (
          <div role="alert" className="border-sz-border border-b p-3 text-xs">
            <p className="text-sz-error">{error}</p>
            <p>Este preview mostra a última compilação válida.</p>
            <BuildOutput output={output} />
          </div>
        ) : null}
        <div className="min-h-0 flex-1 bg-white">
          {result.artifact ? (
            <ProArtifactPreview
              artifact={result.artifact}
              identity={`${scope.identity}:${projectId}:${reloadNonce}`}
              revision={builtRevision ?? 0}
              backend={backend}
              title="Pré-visualização do projeto Pro"
              recoveryHint="Use Executar alterações para compilar o projeto novamente."
              onConsole={(message) =>
                pushLog({
                  source: 'sz-preview',
                  kind: message.kind,
                  parts: message.parts,
                  timestamp: Date.now(),
                })
              }
            />
          ) : (
            <iframe
              key={storageName}
              ref={iframeRef}
              name={storageName}
              srcDoc={result.html}
              title="Pré-visualização do projeto Pro"
              sandbox="allow-scripts allow-pointer-lock"
              referrerPolicy="no-referrer"
              className="h-full w-full border-0"
            />
          )}
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
      <p className="text-sz-fg-soft">Preparando o projeto Pro…</p>
      <p className="max-w-md text-sz-fg-mute">
        O projeto está sendo compilado em um ambiente seguro. Isso pode levar alguns segundos na
        primeira vez.
      </p>
    </PreviewOverlay>
  )
}

function injectConsoleBridge(html: string, parentOrigin: string): string {
  const script = `<script>${buildProRuntimeBridgeScript(parentOrigin).replace(/<\/script/gi, '<\\/script')}</script>`
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
