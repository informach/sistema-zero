'use client'
import type { ProjectView } from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { useState } from 'react'
import { documentText } from './document-text'
import { errorMessage, type WorkbenchPort } from './port'
export function ResolvedDrafts({
  port,
  projectId,
  view,
  onChanged,
}: {
  port: WorkbenchPort
  projectId: string
  view: ProjectView
  onChanged: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  if (!view.resolvedDrafts?.length) return null
  return (
    <details className="rounded-xl border bg-card p-5">
      <summary className="cursor-pointer font-semibold">
        Rascunhos locais preservados · {view.resolvedDrafts.length}
      </summary>
      <p className="my-3 text-sm text-muted-foreground">
        Consulte o conteúdo anterior à resolução. Recuperar cria uma nova revisão e verifica
        mudanças concorrentes.
      </p>
      <div className="max-h-96 space-y-3 overflow-auto">
        {view.resolvedDrafts.map((entry) => {
          const changes = 'changes' in entry.operation ? entry.operation.changes : [entry.operation]
          return (
            <article key={entry.operation.operationId} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">
                {new Date(entry.resolvedAt).toLocaleString('pt-BR')} ·{' '}
                {entry.replacementId
                  ? 'Substituído por novo rascunho'
                  : 'Versão da equipe escolhida'}
              </p>
              {changes.map((change) => (
                <p key={change.entityId} className="mt-3 whitespace-pre-wrap text-sm">
                  {change.action === 'archive'
                    ? 'Arquivamento solicitado'
                    : documentText(change.document)}
                </p>
              ))}
              <Button
                className="mt-3"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setBusy(true)
                  setError('')
                  void port
                    .saveBatch({
                      schemaVersion: 1,
                      operationId: crypto.randomUUID(),
                      projectId,
                      changes: changes.map((change) => ({
                        ...change,
                        baseRevisionId:
                          view.items.find((item) => item.id === change.entityId)?.revisionId ??
                          null,
                      })),
                    })
                    .then(onChanged)
                    .catch((error) => setError(errorMessage(error)))
                    .finally(() => setBusy(false))
                }}
              >
                Recuperar como nova revisão
              </Button>
            </article>
          )
        })}
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </details>
  )
}
