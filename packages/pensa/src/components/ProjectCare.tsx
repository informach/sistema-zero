import {
  type PensaCheckpoint,
  PensaCheckpointSchema,
  type PensaProjectView,
} from '@sistemazero/core/pensa'
import { useRef, useState } from 'react'
import { PensaApiError, type PensaTransport } from '../core/types'
import { ConfirmDialog } from './ConfirmDialog'

export function ProjectCare({
  view,
  transport,
  onChanged,
}: {
  view: PensaProjectView
  transport: PensaTransport
  onChanged(): Promise<void>
}) {
  const [checkpoints, setCheckpoints] = useState<PensaCheckpoint[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [restore, setRestore] = useState<PensaCheckpoint | null>(null)
  const [notice, setNotice] = useState('')
  const returnFocus = useRef<HTMLButtonElement>(null)
  const acting = useRef(false)
  const pending = useRef<{ key: string; requestId: string } | null>(null)
  const canProtect =
    view.team.viewerProfileId === view.team.programmerProfileId &&
    view.project.status === 'active' &&
    Boolean(view.gameCreation && view.revision)
  async function list() {
    const result = await transport.request(`/projects/${view.project.id}/checkpoints`)
    setCheckpoints(PensaCheckpointSchema.array().parse(result))
  }
  async function run(
    action: (requestId: string) => Promise<void>,
    success: string,
    intent: string,
  ) {
    if (acting.current) return
    acting.current = true
    setBusy(true)
    setError(null)
    const key = JSON.stringify([
      view.project.id,
      view.revision?.id,
      view.gameCreation?.saveRevision,
      intent,
    ])
    if (pending.current?.key !== key) pending.current = { key, requestId: crypto.randomUUID() }
    try {
      await action(pending.current.requestId)
      await onChanged()
      await list()
      setNotice(success)
      setRestore(null)
      pending.current = null
    } catch (cause) {
      if (cause instanceof PensaApiError && cause.status >= 400 && cause.status < 500) {
        pending.current = null
        await onChanged().catch(() => {})
      }
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não consegui guardar esta versão. Tente novamente.',
      )
    } finally {
      acting.current = false
      setBusy(false)
    }
  }
  return (
    <section>
      <h3>Versões guardadas</h3>
      <p>Guarde uma versão do jogo para poder voltar a ela depois.</p>
      {canProtect ? (
        <button
          type="button"
          className="sz-tool-pill sz-tool-pill--outline"
          disabled={busy}
          onClick={() =>
            void run(
              async (requestId) => {
                await transport.request(`/projects/${view.project.id}/checkpoints`, {
                  method: 'POST',
                  body: {
                    requestId,
                    baseRevisionId: view.revision!.id,
                    saveRevision: view.gameCreation!.saveRevision,
                  },
                })
              },
              'Versão guardada.',
              'protect',
            )
          }
        >
          Guardar esta versão
        </button>
      ) : (
        <p>Quem programa pode guardar uma versão depois que o jogo estiver salvo na conta.</p>
      )}
      <button
        ref={returnFocus}
        type="button"
        className="sz-tool-pill sz-tool-pill--quiet"
        disabled={busy}
        onClick={() =>
          void list().catch(() => setError('Não consegui consultar as versões. Tente novamente.'))
        }
      >
        Ver versões guardadas
      </button>
      <ul>
        {checkpoints.map((checkpoint) => (
          <li key={checkpoint.id}>
            <span>
              Versão de{' '}
              {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
                new Date(checkpoint.createdAt),
              )}
            </span>
            <button
              type="button"
              className="sz-tool-pill sz-tool-pill--outline"
              disabled={!canProtect || busy || checkpoint.status !== 'ready'}
              onClick={() => setRestore(checkpoint)}
            >
              Voltar para esta versão
            </button>
          </li>
        ))}
      </ul>
      {error ? <p role="alert">{error}</p> : null}
      <p role="status">{notice}</p>
      <ConfirmDialog
        open={Boolean(restore)}
        title="Voltar para esta versão?"
        body="Vamos proteger o jogo atual antes de voltar para a versão escolhida. A conferência final precisa ser feita de novo."
        confirmLabel="Voltar para a versão"
        busy={busy}
        error={error}
        onClose={() => setRestore(null)}
        returnFocusTo={returnFocus}
        onConfirm={() => {
          if (!restore || !view.revision || !view.gameCreation) return
          const target = restore.id,
            baseRevisionId = view.revision.id,
            saveRevision = view.gameCreation.saveRevision
          void run(
            async (requestId) => {
              await transport.request(
                `/projects/${view.project.id}/checkpoints/${target}/restore`,
                {
                  method: 'POST',
                  body: { requestId, baseRevisionId, saveRevision },
                },
              )
            },
            'Versão restaurada. Confira seu jogo antes de continuar.',
            `restore:${target}`,
          )
        }}
      />
    </section>
  )
}
