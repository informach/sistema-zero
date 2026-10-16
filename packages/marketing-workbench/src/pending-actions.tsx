'use client'
import { Button } from '@sistemazero/ui/button'
import { useCallback, useEffect, useState } from 'react'
import { actionDefinition } from './action-definition'
import {
  actionJournalEvent,
  confirmWorkspaceAction,
  type PendingAction,
  pendingWorkspaceActions,
  retryWorkspaceAction,
} from './action-journal'
import { errorMessage, type WorkbenchPort } from './port'

export function PendingActions({
  port,
  projectId,
  onChanged,
}: {
  port: WorkbenchPort
  projectId: string
  onChanged: () => Promise<void>
}) {
  const [entries, setEntries] = useState<PendingAction[]>([]),
    [more, setMore] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [selected, setSelected] = useState<PendingAction | null>(null),
    [confirmed, setConfirmed] = useState(false)
  const refresh = useCallback(async () => {
    const result = await pendingWorkspaceActions(port, projectId)
    setEntries(result.items)
    setMore(result.more)
  }, [port, projectId])
  useEffect(() => {
    let live = true
    const load = () => {
      if (live)
        void refresh().catch((error) => {
          if (live) setError(errorMessage(error))
        })
    }
    load()
    window.addEventListener(actionJournalEvent, load)
    window.addEventListener('focus', load)
    return () => {
      live = false
      window.removeEventListener(actionJournalEvent, load)
      window.removeEventListener('focus', load)
    }
  }, [refresh])
  const work = async (run: () => Promise<void>) => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await run()
      await refresh()
      await port.synchronize()
      await onChanged()
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  if (!entries.length && !error && !message) return null
  return (
    <section
      aria-label="Confirmações pendentes"
      className="space-y-2 rounded-lg border p-3 text-sm"
    >
      <h2 className="font-semibold">Confirmações pendentes</h2>
      <p>
        Estes pedidos foram preservados neste dispositivo. Confira se o servidor os recebeu antes de
        reenviar. Nenhum pedido é reenviado automaticamente.
      </p>
      {error ? (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
      <ul className="space-y-2">
        {entries.map((entry) => {
          let definition: ReturnType<typeof actionDefinition>
          try {
            definition = actionDefinition(entry.path, entry.input, entry.operationId)
          } catch {
            return (
              <li key={entry.operationId}>
                Pedido preservado de uma versão incompatível. Atualize o aplicativo para
                recuperá-lo.
              </li>
            )
          }
          return (
            <li key={entry.operationId} className="rounded border p-3">
              <p className="font-medium">{definition.label}</p>
              <p className="text-muted-foreground">{definition.detail}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void work(async () => {
                      const found = await confirmWorkspaceAction(port, entry)
                      setMessage(
                        found
                          ? 'O servidor já confirmou este pedido. Reabra a entrega para ver seu estado atual.'
                          : 'Ainda não há confirmação registrada. O pedido foi preservado; aguarde ou confira os dados antes de reenviar.',
                      )
                    })
                  }
                >
                  Conferir confirmação
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    setSelected(entry)
                    setConfirmed(false)
                  }}
                >
                  Revisar reenvio
                </Button>
              </div>
              {selected?.operationId === entry.operationId ? (
                <div className="mt-2 space-y-2">
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      disabled={busy}
                      onChange={(event) => setConfirmed(event.target.checked)}
                    />
                    Quero concluir este pedido com os mesmos dados. Se ele já foi recebido,
                    recuperar sua confirmação.
                  </label>
                  <Button
                    size="sm"
                    disabled={busy || !confirmed}
                    onClick={() =>
                      void work(async () => {
                        await retryWorkspaceAction(port, entry)
                        setSelected(null)
                        setMessage(
                          'Pedido confirmado. A mesma identificação foi usada para evitar duplicação.',
                        )
                      })
                    }
                  >
                    Reenviar o mesmo pedido
                  </Button>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
      {more ? (
        <p>Mostrando 50 pendências. As próximas aparecem conforme estas forem confirmadas.</p>
      ) : null}
    </section>
  )
}
