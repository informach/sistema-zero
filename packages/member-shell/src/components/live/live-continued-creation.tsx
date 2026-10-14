'use client'
import type { LiveWorkspaceView } from '@sistemazero/core/live'
import { Button } from '@sistemazero/ui'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { liveDeviceId, liveRequest } from '../../lib/live/client'
import { LiveContinuedWorkspace } from './live-workspace'

export function LiveContinuedCreation({ workspaceId }: { workspaceId: string }) {
  const [workspace, setWorkspace] = useState<LiveWorkspaceView | null>(null)
  const [deviceId, setDeviceId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    setDeviceId(liveDeviceId())
  }, [])
  // biome-ignore lint/correctness/useExhaustiveDependencies: Retry deliberately reloads the saved workspace.
  useEffect(() => {
    const controller = new AbortController()
    liveRequest<LiveWorkspaceView>(
      `/api/live/workspaces/${workspaceId}`,
      undefined,
      'GET',
      controller.signal,
    )
      .then((next) => {
        setWorkspace(next)
        setError(null)
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause.message)
      })
    return () => controller.abort()
  }, [workspaceId, retry])
  return (
    <div className="space-y-5 p-4 md:p-6">
      <Link
        href="/criar"
        className="inline-flex min-h-11 items-center gap-2 font-bold text-primary"
      >
        <ArrowLeft className="size-4" />
        Voltar às minhas criações
      </Link>
      <header>
        <h1 className="sz-display text-2xl font-bold">Meu projeto da oficina</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Continue criando no mesmo projeto que você começou com a turma.
        </p>
      </header>
      {error ? (
        <div role="alert" className="rounded-xl border p-4">
          <p>{error}</p>
          <Button variant="outline" className="mt-2" onClick={() => setRetry((value) => value + 1)}>
            Tentar novamente
          </Button>
        </div>
      ) : null}
      {workspace && deviceId ? (
        <LiveContinuedWorkspace workspace={workspace} deviceId={deviceId} onError={setError} />
      ) : !error ? (
        <p role="status">Abrindo sua criação…</p>
      ) : null}
    </div>
  )
}
