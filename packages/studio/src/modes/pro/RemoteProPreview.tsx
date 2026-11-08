import { buildProRuntimeBridgeScript } from '@sistemazero/core/studio/pro-runtime-bridge'
import { type JSX, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ProStageState } from '../../components/preview/ProStageState'
import { javaScriptProject } from '../../core/editableProject'
import { createGameStorageSession } from '../../state/gameStorage'
import { useLogsStore } from '../../state/logsStore'
import { captureProjectStorageScope } from '../../state/projectStorageRuntime'
import { useProjectStore } from '../../state/projectStore'
import { type ProRunActions, type ProRunState, useProRunApi } from '../../state/proRun'
import { useT } from '../../studio/i18n'
import type { StudioProRuntimeAdapter, StudioProRuntimeBuildResult } from '../../studio/pro-runtime'
import { ProArtifactPreview } from './ProArtifactPreview'
import { isProConsoleMessage } from './proConsoleBridge'
import { useProGameStorage } from './useProGameStorage'

type Phase = 'building' | 'ready' | 'error'

/**
 * A prévia do projeto Pro com o compilador REMOTO (aulas e Admin, sem COOP/COEP): manda o snapshot
 * ao BFF e mostra o HTML compilado num iframe isolado. Desde o redesenho de 11/2026 não tem barra
 * própria: Rodar (= compilar de novo), Parar (= esconder o resultado e abortar o build em voo) e
 * Atualizar chegam da Topbar pela store `proRun`, e os estados (parado, montando, erro) são o
 * cartão compartilhado das prévias Pro.
 */
export function RemoteProPreview({
  runtime,
  active = true,
}: {
  runtime: StudioProRuntimeAdapter
  active?: boolean
}): JSX.Element | null {
  const t = useT()
  const proRun = useProRunApi()
  const [started, setStarted] = useState(active)
  // Parar da criança: a volta de `active` (fechar a proposta do construtor) não religa sozinha.
  const stoppedByUser = useRef(false)
  useEffect(() => {
    if (active && !stoppedByUser.current) setStarted(true)
  }, [active])
  const startedRef = useRef(started)
  startedRef.current = started
  const project = useProjectStore((state) => javaScriptProject(state.project))
  const pushLog = useLogsStore((state) => state.push)
  const latestProjectRef = useRef(project)
  latestProjectRef.current = project
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const [phase, setPhase] = useState<Phase>('building')
  const [compiled, setCompiled] = useState<{
    projectId: string
    runtime: StudioProRuntimeAdapter
    result: StudioProRuntimeBuildResult
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [output, setOutput] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [reloadNonce, setReloadNonce] = useState(0)
  const [builtRevision, setBuiltRevision] = useState<number | null>(null)
  const projectId = project?.id ?? null
  const currentRevision = project?.updatedAt ?? null
  const [revoked, setRevoked] = useState<StudioProRuntimeAdapter | null>(null)
  const authorized = !runtime.signal?.aborted && revoked !== runtime
  const result =
    authorized && compiled?.projectId === projectId && compiled.runtime === runtime
      ? compiled.result
      : null
  // Parado esconde o resultado; o compilado fica guardado para quando a criança rodar de novo.
  const shown = started ? result : null
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
    identity: `${shown?.artifact?.id ?? builtRevision ?? ''}:${reloadNonce}`,
    origin: active && shown?.html ? 'null' : null,
  })

  useEffect(() => {
    const revoke = () => setRevoked(runtime)
    if (runtime.signal?.aborted) revoke()
    runtime.signal?.addEventListener('abort', revoke, { once: true })
    return () => runtime.signal?.removeEventListener('abort', revoke)
  }, [runtime])

  // `attempt` é o gatilho manual de recompilação. O snapshot vem do ref para
  // não recompilar automaticamente a cada tecla enquanto a criança edita.
  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt dispara a recompilação manual
  useEffect(() => {
    if (!started || !authorized) return
    const snapshot = latestProjectRef.current
    if (snapshot?.kind !== 'pro' || snapshot.id !== projectId) return
    const controller = new AbortController()
    const signal = runtime.signal
      ? AbortSignal.any([controller.signal, runtime.signal])
      : controller.signal
    const revision = snapshot.updatedAt
    setPhase('building')
    setError(null)
    setOutput('')

    void runtime
      .build({ project: snapshot, signal })
      .then((result) => {
        if (signal.aborted) return
        setCompiled({
          projectId: snapshot.id,
          runtime,
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
        if (signal.aborted) return
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
  }, [projectId, attempt, runtime, started, authorized])

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

  const rebuild = useCallback(() => {
    const latest = latestProjectRef.current
    if (latest?.kind !== 'pro') return
    setAttempt((value) => value + 1)
  }, [])
  // As ações que a Topbar chama. Rodar = compilar (de novo); Parar = abortar o build em voo (a
  // cleanup do efeito) e esconder o resultado; Atualizar = remontar o iframe.
  const actions = useMemo<ProRunActions>(
    () => ({
      run: () => {
        if (startedRef.current) {
          rebuild()
          return
        }
        stoppedByUser.current = false
        setStarted(true)
      },
      stop: () => {
        stoppedByUser.current = true
        setStarted(false)
      },
      reload: () => setReloadNonce((value) => value + 1),
    }),
    [rebuild],
  )
  const runState = useMemo<ProRunState | null>(() => {
    if (!active) return null
    if (!authorized)
      return {
        phase: 'error',
        canRun: false,
        canStop: false,
        error: t('pro.stage.authorityChanged'),
      }
    if (!started) return { phase: 'idle', canRun: true, canStop: false }
    if (phase === 'building')
      return {
        phase: 'preparing',
        step: { index: 1, total: 1 },
        canRun: false,
        canStop: true,
        ...(result ? { stale } : {}),
      }
    if (phase === 'error')
      return { phase: 'error', canRun: true, canStop: Boolean(result), error: error ?? undefined }
    return { phase: 'running', canRun: true, canStop: true, ...(stale ? { stale } : {}) }
  }, [active, authorized, started, phase, result, stale, error, t])
  useEffect(() => {
    proRun.getState().publish(runState, runState ? actions : null)
  }, [proRun, runState, actions])
  useEffect(() => () => proRun.getState().publish(null, null), [proRun])

  if (!active) return null

  if (!authorized) return <PreviewOverlay>{t('pro.stage.authorityChanged')}</PreviewOverlay>

  if (shown) {
    return (
      <div className="flex h-full w-full flex-col bg-sz-bg">
        {phase === 'building' ? (
          <p role="status" className="px-3 py-2 text-sz-fg-soft text-xs">
            {t('pro.stage.rebuilding')}
          </p>
        ) : null}
        {phase === 'error' ? (
          <div role="alert" className="border-sz-border border-b p-3 text-xs">
            <p className="text-sz-error">{error}</p>
            <p>{t('pro.stage.lastBuild')}</p>
            <BuildOutput output={output} />
          </div>
        ) : null}
        <div className="min-h-0 flex-1 bg-white">
          {shown.artifact ? (
            <ProArtifactPreview
              artifact={shown.artifact}
              identity={`${scope.identity}:${projectId}:${reloadNonce}`}
              revision={builtRevision ?? 0}
              backend={backend}
              title="Pré-visualização do projeto Pro"
              recoveryHint="Use Rodar de novo para montar o projeto outra vez."
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
              srcDoc={shown.html}
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

  return (
    <ProStageState
      state={runState ?? { phase: 'idle', canRun: true, canStop: false }}
      subject="game"
      flavor="remote"
      onRun={actions.run}
    >
      <BuildOutput output={output} />
    </ProStageState>
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
  return <pre className="sz-pro-stage-state__tech">{output}</pre>
}
