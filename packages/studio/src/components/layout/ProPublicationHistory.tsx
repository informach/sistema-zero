import type { StudioProPublication } from '@sistemazero/core/studio/pro-publication'
import { useEffect, useRef, useState } from 'react'
import { flushProjectOperations } from '../../state/projectOperations'
import { captureProjectStorageScope } from '../../state/projectStorageRuntime'
import { useProjectStoreApi } from '../../state/projectStore'
import type { StudioShareAdapter } from '../../studio/share'

export function ProPublicationHistory({
  adapter,
  playId,
  projectId,
}: {
  adapter: NonNullable<StudioShareAdapter['publication']>
  playId: string
  projectId: string
}) {
  const store = useProjectStoreApi()
  const [state, setState] = useState<StudioProPublication | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [reload, setReload] = useState(0)
  const scope = useRef(captureProjectStorageScope())
  const active = useRef(false)
  const controller = useRef<AbortController | null>(null)
  const pending = useRef<{ identity: string; requestId: string } | null>(null)
  const running = useRef(false)
  const loadGeneration = useRef(0)
  useEffect(() => {
    const abort = new AbortController()
    loadGeneration.current = reload
    controller.current = abort
    active.current = true
    scope.current = captureProjectStorageScope()
    setBusy(true)
    setError(null)
    setState(null)
    void adapter
      .get(playId, abort.signal)
      .then((value) => {
        if (current()) setState(value)
      })
      .catch((cause) => {
        if (current())
          setError(
            cause instanceof Error ? cause.message : 'Não foi possível consultar o histórico.',
          )
      })
      .finally(() => {
        if (current()) setBusy(false)
      })
    return () => {
      active.current = false
      abort.abort()
    }
    function current() {
      return (
        loadGeneration.current === reload &&
        !abort.signal.aborted &&
        captureProjectStorageScope() === scope.current &&
        store.getState().project?.id === projectId
      )
    }
  }, [adapter, playId, projectId, reload, store])
  const current = () =>
    active.current &&
    captureProjectStorageScope() === scope.current &&
    store.getState().project?.id === projectId
  async function change(revision?: string, disabled = false) {
    if (!state || busy || running.current || !current()) return
    const capturedScope = scope.current,
      capturedController = controller.current
    const stillCurrent = () =>
      current() && capturedScope === scope.current && capturedController === controller.current
    running.current = true
    setBusy(true)
    setError(null)
    try {
      await flushProjectOperations(store, projectId)
      if (!stillCurrent()) return
      const project = store.getState().project
      if (!project) return
      const identity = JSON.stringify({
        playId,
        version: state.version,
        revision,
        disabled,
        ...(revision ? {} : { project }),
      })
      if (pending.current?.identity !== identity)
        pending.current = { identity, requestId: crypto.randomUUID() }
      const base = { playId, expectedVersion: state.version, requestId: pending.current.requestId }
      const next = revision
        ? await adapter.activate({ ...base, revision, disabled }, controller.current?.signal)
        : await adapter.update(
            { ...base, project: structuredClone(project) },
            controller.current?.signal,
          )
      if (stillCurrent()) {
        setState(next)
        pending.current = null
      }
    } catch (cause) {
      if (stillCurrent())
        setError(
          cause instanceof Error
            ? cause.message
            : 'A publicação anterior foi preservada. Atualize o histórico.',
        )
    } finally {
      running.current = false
      if (stillCurrent()) setBusy(false)
    }
  }
  return (
    <section
      aria-label="Versões do jogo publicado"
      className="mb-4 space-y-2 rounded-lg border border-sz-border p-3 text-sm"
    >
      <p className="font-semibold">Jogo publicado</p>
      <p className="text-sz-fg-soft">
        Alterações no editor só chegam ao link quando você publica uma nova versão.
      </p>
      {error && (
        <p role="alert" className="text-sz-error">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => setReload((value) => value + 1)}
        className="underline disabled:opacity-50"
      >
        Atualizar histórico
      </button>
      {busy && <p role="status">Verificando a publicação…</p>}
      {state && (
        <>
          <p role="status">{state.disabled ? 'Link desativado' : 'Link ativo'}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void change()}
              className="rounded border border-sz-border px-3 py-2 disabled:opacity-50"
            >
              {state.disabled
                ? 'Publicar versão atual e reativar link'
                : 'Publicar versão atual neste link'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void change(state.activeRevision, !state.disabled)}
              className="rounded border border-sz-border px-3 py-2 disabled:opacity-50"
            >
              {state.disabled ? 'Reativar link' : 'Desativar link'}
            </button>
          </div>
          <ol className="space-y-2">
            {state.revisions.map((revision, index) => (
              <li key={revision.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  Versão {index + 1} · {new Date(revision.createdAt).toLocaleString('pt-BR')}
                  {revision.id === state.activeRevision ? ' · atual' : ''}
                </span>
                {revision.id !== state.activeRevision && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void change(revision.id, state.disabled)}
                    className="underline disabled:opacity-50"
                  >
                    Restaurar no link
                  </button>
                )}
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  )
}
