'use client'
import {
  batchOperationSchema,
  type EditorialBatch,
  type EditorialDocument,
  type ProjectView,
} from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { useState } from 'react'
import { errorMessage, type WorkbenchPort } from './port'

export function conflictGroup(view: ProjectView, id: string) {
  const units = [
    ...view.pending.map((entry) => ({
      id: entry.operation.operationId,
      createdAt: entry.createdAt,
      state: entry.state,
      changes: [entry.operation],
    })),
    ...view.pendingBatches.map((entry) => ({
      id: entry.operation.operationId,
      createdAt: entry.createdAt,
      state: entry.state,
      changes: entry.operation.changes,
    })),
  ]
  const root = units.find((unit) => unit.id === id)
  if (!root) throw new Error('A pendência mudou; atualize a bancada')
  const touched = new Set(root.changes.map((change) => change.entityId)),
    group = new Set([id])
  let added = true
  while (added) {
    added = false
    for (const unit of units)
      if (!group.has(unit.id) && unit.changes.some((change) => touched.has(change.entityId))) {
        group.add(unit.id)
        for (const change of unit.changes) touched.add(change.entityId)
        added = true
      }
  }
  const selected = units
    .filter((unit) => group.has(unit.id))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
  const changes = new Map<string, EditorialBatch['changes'][number]>()
  for (const unit of selected)
    for (const change of unit.changes)
      changes.set(change.entityId, {
        entityId: change.entityId,
        baseRevisionId: view.items.find((item) => item.id === change.entityId)?.revisionId ?? null,
        action: change.action,
        ...(change.document ? { document: change.document } : {}),
      })
  return {
    operationIds: [...group],
    changes: [...changes.values()],
    ready: selected.every((unit) => unit.state === 'conflict' || unit.state === 'blocked'),
  }
}
export function ConflictResolution({
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
  const [selected, setSelected] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const pending = [...view.pending, ...view.pendingBatches].filter(
    (entry) => entry.state === 'conflict' || entry.state === 'blocked',
  )
  if (!pending.length) return null
  const id =
    pending.find((entry) => entry.operation.operationId === selected)?.operation.operationId ??
    pending[0]?.operation.operationId
  if (!id) return null
  const group = conflictGroup(view, id)
  async function resolve(local: boolean) {
    setBusy(true)
    setError('')
    try {
      await port.resolveDrafts({
        projectId,
        operationIds: group.operationIds,
        replacement: local
          ? batchOperationSchema.parse({
              schemaVersion: 1,
              operationId: crypto.randomUUID(),
              projectId,
              changes: group.changes,
            })
          : null,
      })
      await onChanged()
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  const text = (value: EditorialDocument | undefined) => {
    if (!value) return 'Sem conteúdo'
    return [
      value.title,
      'body' in value ? value.body : '',
      'brief' in value ? value.brief : '',
      'objective' in value ? `Objetivo: ${value.objective}` : '',
      'caption' in value ? `Legenda: ${value.caption}` : '',
      'cta' in value ? `Chamada para ação: ${value.cta}` : '',
      'format' in value ? `Formato: ${value.format} · ${value.medium}` : '',
      'week' in value
        ? `Semana: ${value.week ?? 'Sem semana'} · Data: ${value.editorialDate ?? 'Sem data'}`
        : '',
      'source' in value ? `Origem: ${value.source.label} ${value.source.url ?? ''}` : '',
    ]
      .filter(Boolean)
      .join('\n\n')
  }
  return (
    <details open className="rounded-xl border border-destructive/40 bg-card p-5">
      <summary className="cursor-pointer font-semibold">
        {pending.length} alterações precisam de resolução
      </summary>
      <p className="mt-2 text-sm text-muted-foreground">
        Confira o rascunho local e a versão da equipe. A resolução preserva os pedidos anteriores no
        armazenamento local; uma nova mudança da equipe será detectada antes de gravar.
      </p>
      <div className="my-3 flex flex-wrap gap-2">
        {pending.map((entry) => (
          <Button
            key={entry.operation.operationId}
            size="sm"
            variant={entry.operation.operationId === id ? 'secondary' : 'ghost'}
            onClick={() => setSelected(entry.operation.operationId)}
          >
            {entry.operation.operationId.slice(0, 8)}
          </Button>
        ))}
      </div>
      <div className="max-h-96 space-y-4 overflow-auto">
        {group.changes.map((change) => {
          const remote = view.items.find((item) => item.id === change.entityId)
          return (
            <article key={change.entityId}>
              <h4 className="font-medium">
                {change.document?.title ?? remote?.document.title ?? 'Peça arquivada'}
              </h4>
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <p className="text-xs font-semibold">Versão da equipe</p>
                  <pre className="mt-2 whitespace-pre-wrap break-words text-xs">
                    {remote ? text(remote.document) : 'Ainda não existe no servidor'}
                  </pre>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs font-semibold">Seu rascunho</p>
                  <pre className="mt-2 whitespace-pre-wrap break-words text-xs">
                    {change.action === 'archive'
                      ? 'Arquivamento solicitado'
                      : text(change.document)}
                  </pre>
                </div>
              </div>
            </article>
          )
        })}
      </div>
      {!group.ready ? (
        <p className="mt-3 text-sm">
          Aguarde os envios relacionados terminarem antes de resolver este grupo.
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={busy || !group.ready}
          onClick={() => void resolve(false)}
        >
          Conservar versão da equipe
        </Button>
        <Button disabled={busy || !group.ready} onClick={() => void resolve(true)}>
          Salvar meu rascunho como nova revisão
        </Button>
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </details>
  )
}
