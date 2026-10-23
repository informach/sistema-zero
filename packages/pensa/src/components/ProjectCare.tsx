import {
  type PensaCheckpoint,
  PensaCheckpointSchema,
  type PensaProjectView,
} from '@sistemazero/core/pensa'
import { useEffect, useId, useRef, useState } from 'react'
import { type PensaCopy, pensaCopy } from '../core/copy'
import { PensaApiError, type PensaTransport } from '../core/types'
import { ConfirmDialog } from './ConfirmDialog'
import { CheckIcon, HistoryIcon } from './icons'

const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
const day = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' })

/** "hoje, 16:40" ou "18/10, 10:15", no relógio de quem olha. */
export function versionLabel(iso: string, now: Date = new Date()): string {
  const at = new Date(iso)
  const today = at.toDateString() === now.toDateString()
  return `${today ? 'hoje' : day.format(at)}, ${time.format(at)}`
}

/**
 * As versões guardadas do jogo (Canvas "Cuidar do jogo"): guardar a versão de agora e voltar a
 * uma versão anterior. Só quem programa guarda, depois que o jogo está salvo na conta; quem
 * decide é o servidor (a lista e a restauração passam por ele).
 */
export function ProjectCare({
  view,
  transport,
  onChanged,
  copy = pensaCopy('kids'),
  readOnly = false,
  titleId,
}: {
  view: PensaProjectView
  transport: PensaTransport
  onChanged(): Promise<void>
  copy?: PensaCopy
  readOnly?: boolean
  titleId?: string
}) {
  const [checkpoints, setCheckpoints] = useState<PensaCheckpoint[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [restore, setRestore] = useState<PensaCheckpoint | null>(null)
  const [notice, setNotice] = useState('')
  const restoreFrom = useRef<HTMLButtonElement | null>(null)
  const acting = useRef(false)
  const pending = useRef<{ key: string; requestId: string } | null>(null)
  const ownTitle = useId()
  const canProtect =
    !readOnly &&
    view.team.viewerProfileId === view.team.programmerProfileId &&
    view.project.status === 'active' &&
    Boolean(view.gameCreation && view.revision)
  async function list() {
    const result = await transport.request(`/projects/${view.project.id}/checkpoints`)
    setCheckpoints(PensaCheckpointSchema.array().parse(result ?? []))
  }
  // biome-ignore lint/correctness/useExhaustiveDependencies: lists once per project when the panel opens.
  useEffect(() => {
    void list().catch(() => setError('Não consegui ver as versões agora. Tente de novo.'))
  }, [view.project.id])
  async function run(
    action: (requestId: string) => Promise<void>,
    success: string,
    intent: string,
  ) {
    if (acting.current) return
    acting.current = true
    setBusy(true)
    setError(null)
    setNotice('')
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
        cause instanceof Error ? cause.message : 'Não consegui guardar esta versão. Tente de novo.',
      )
    } finally {
      acting.current = false
      setBusy(false)
    }
  }
  return (
    <section className="pz-versions" aria-labelledby={titleId ?? ownTitle}>
      <div className="pz-versions__head">
        <span className="pz-menu__icon is-mint" aria-hidden="true">
          <HistoryIcon size={20} />
        </span>
        <h2 id={titleId ?? ownTitle} className="pz-title pz-title--md">
          Versões guardadas
        </h2>
      </div>
      <p className="pz-muted">
        Guarde uma versão do jogo antes de uma mudança grande. Depois, dá para voltar a ela.
      </p>
      {canProtect ? (
        <button
          type="button"
          className="pz-btn pz-btn--action pz-self-start"
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
      ) : null}
      <p role="status" className={notice ? 'pz-status-ok' : 'pz-sr-only'}>
        {notice ? <CheckIcon size={18} /> : null}
        {notice}
      </p>
      {error ? (
        <p role="alert" className="pz-alert-text">
          {error}
        </p>
      ) : null}
      {checkpoints.length ? (
        <ul className="pz-versions__list">
          {checkpoints.map((checkpoint) => (
            <li key={checkpoint.id}>
              <strong>Versão de {versionLabel(checkpoint.createdAt)}</strong>
              {checkpoint.status === 'ready' ? (
                <button
                  type="button"
                  className="pz-btn pz-btn--card pz-btn--sm"
                  disabled={!canProtect || busy}
                  onClick={(event) => {
                    restoreFrom.current = event.currentTarget
                    setRestore(checkpoint)
                  }}
                >
                  Voltar para esta
                </button>
              ) : (
                <span className="pz-muted">
                  {checkpoint.status === 'copying' ? 'Guardando…' : 'Não deu para guardar'}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="pz-small">
        Só quem programa guarda versões, depois que o jogo estiver salvo na conta.
      </p>
      <ConfirmDialog
        open={Boolean(restore)}
        title={restore ? `Voltar para a versão de ${versionLabel(restore.createdAt)}` : ''}
        body={copy.restoreBody}
        confirmLabel="Voltar para esta versão"
        tone="action"
        busy={busy}
        error={error}
        onClose={() => setRestore(null)}
        returnFocusTo={restoreFrom}
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
            'Versão restaurada. Confira o seu jogo antes de continuar.',
            `restore:${target}`,
          )
        }}
      />
    </section>
  )
}
