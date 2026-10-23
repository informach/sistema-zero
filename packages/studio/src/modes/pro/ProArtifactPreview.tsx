import { isStudioProArtifact, type StudioProArtifact } from '@sistemazero/core/studio/pro-artifact'
import { useEffect, useMemo, useRef, useState } from 'react'
import { isProConsoleMessage, type ProConsoleMessage } from './proConsoleBridge'
import type { ProStorageBackend } from './proStorageHost'
import { createEphemeralProStorage, useProStorageBridge } from './useProStorageBridge'

export type ProArtifactPreviewStatus = 'loading' | 'ready' | 'expired' | 'unavailable'
export interface ProArtifactPreviewProps {
  artifact: StudioProArtifact
  identity: string
  title?: string
  revision?: number
  /** Omitted means ephemeral; only the current-project renderer supplies durable storage. */
  backend?: ProStorageBackend
  recoveryHint?: string
  onStatus?(status: ProArtifactPreviewStatus): void
  onConsole?(message: ProConsoleMessage): void
}

/** Executes a server-issued artifact. It has no project store, build adapter or inference path. */
export function ProArtifactPreview(props: ProArtifactPreviewProps) {
  const {
    artifact,
    identity,
    title = 'Pré-visualização da proposta',
    revision = 0,
    backend,
  } = props
  const valid = isStudioProArtifact(artifact)
  const key = `${identity}:${artifact.id}`
  return (
    <ArtifactSession
      key={key}
      {...props}
      artifact={artifact}
      identity={key}
      title={title}
      revision={revision}
      backend={backend}
      valid={valid}
    />
  )
}

function ArtifactSession({
  artifact,
  identity,
  title,
  revision = 0,
  backend,
  onStatus,
  onConsole,
  recoveryHint = 'Recrie a prévia no Zappy Pro para experimentar novamente.',
  valid,
}: ProArtifactPreviewProps & { valid: boolean }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [status, setStatus] = useState<ProArtifactPreviewStatus>(() =>
    !valid ? 'unavailable' : artifact.expiresAt <= Date.now() ? 'expired' : 'loading',
  )
  const callbacks = useRef({ onStatus, onConsole })
  callbacks.current = { onStatus, onConsole }
  const memory = useMemo(() => createEphemeralProStorage(), [])
  const running = status === 'loading' || status === 'ready'
  const binding = useProStorageBridge({
    frame,
    backend: backend ?? memory,
    identity,
    revision,
    origin: running ? 'null' : null,
    onConnected: () => setStatus((state) => (state === 'loading' ? 'ready' : state)),
  })
  // The bridge closes every port on cleanup. Clearing also supports StrictMode's effect replay.
  useEffect(() => () => memory.clear(), [memory])
  useEffect(() => {
    callbacks.current.onStatus?.(status)
  }, [status])
  useEffect(() => {
    if (!valid) return
    const remaining = artifact.expiresAt - Date.now()
    if (remaining <= 0) {
      setStatus('expired')
      return
    }
    const timer = window.setTimeout(() => setStatus('expired'), Math.min(remaining, 2_147_483_647))
    return () => window.clearTimeout(timer)
  }, [artifact.expiresAt, valid])
  useEffect(() => {
    if (status !== 'loading') return
    const timer = window.setTimeout(() => setStatus('unavailable'), 12_000)
    return () => window.clearTimeout(timer)
  }, [status])
  useEffect(() => {
    if (!running) return
    const receive = (event: MessageEvent) => {
      if (
        event.source !== frame.current?.contentWindow ||
        event.origin !== 'null' ||
        !isProConsoleMessage(event.data)
      )
        return
      callbacks.current.onConsole?.(event.data)
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [running])
  if (!running)
    return (
      <div
        role="status"
        className="flex h-full items-center justify-center p-4 text-center text-sm text-sz-fg-soft"
      >
        {status === 'expired' ? 'Esta prévia expirou.' : 'Não foi possível abrir esta prévia.'}{' '}
        {recoveryHint}
      </div>
    )
  return (
    <div className="flex h-full min-h-0 flex-col">
      {status === 'loading' && (
        <p role="status" className="px-3 py-1 text-xs text-sz-fg-soft">
          Carregando prévia…
        </p>
      )}
      <iframe
        ref={frame}
        name={binding}
        src={artifact.url}
        title={title}
        sandbox="allow-scripts allow-pointer-lock"
        referrerPolicy="no-referrer"
        className="min-h-0 w-full flex-1 border-0 bg-white"
        onError={() => setStatus('unavailable')}
      />
    </div>
  )
}
