'use client'
import {
  type ImportDelta,
  type ImportDeltaState,
  type ImportRun,
  importDeltaSchema,
  importDeltaStateSchema,
  importReconcileResultSchema,
} from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { Select } from '@sistemazero/ui/select'
import { useId, useState } from 'react'
import { workspaceAction } from './action-journal'
import type { WorkbenchPort } from './port'

const labels: Record<ImportDeltaState, string> = {
  added: 'Origens novas',
  removed: 'Removidas da pasta',
  changed: 'Conteúdo alterado',
  reclassified: 'Classificação alterada',
  unchanged: 'Sem mudança',
}
export function ImportDeltaPanel({
  port,
  projectId,
  current,
  runs,
  busy,
  run,
  editable,
  onReconciled,
}: {
  port: WorkbenchPort
  projectId: string
  current: ImportRun
  runs: ImportRun[]
  busy: boolean
  run(work: () => Promise<void>): void
  editable: boolean
  onReconciled(): Promise<void>
}) {
  const field = useId()
  const candidates = runs
    .filter(
      (value) =>
        value.id !== current.id && value.origin === current.origin && value.state !== 'receiving',
    )
    .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))
  const [previousId, setPreviousId] = useState(
    candidates.find((value) => value.capturedAt <= current.capturedAt)?.id ?? '',
  )
  const [delta, setDelta] = useState<ImportDelta | null>(null)
  const [state, setState] = useState<ImportDeltaState | 'all'>('all')
  const [pageCursor, setPageCursor] = useState(0)
  const [notice, setNotice] = useState('')
  async function load(filter: typeof state, cursor = 0) {
    const value = importDeltaSchema.parse(
      await port.request(
        `/projects/${projectId}/imports/${current.id}/compare?previousId=${previousId}&state=${filter}&cursor=${cursor}`,
      ),
    )
    if (
      value.current.id !== current.id ||
      value.previous.id !== previousId ||
      value.current.projectId !== projectId ||
      value.previous.projectId !== projectId
    )
      throw new Error('A comparação retornou outros inventários')
    setDelta(value)
    setState(filter)
    setPageCursor(cursor)
  }
  return (
    <section className="space-y-3 rounded-lg border p-3" aria-label="Mudanças entre inventários">
      <p className="text-sm font-medium">O que mudou na pasta de origem</p>
      <p className="text-xs text-muted-foreground">
        Compare o retrato selecionado com outro inventário da mesma origem. A remoção de um arquivo
        da pasta mantém as peças e referências já preservadas no app. A comparação não substitui
        revisões da equipe.
      </p>
      {!candidates.length ? (
        <p className="text-sm">
          Confira novamente a pasta no desktop e registre o novo inventário para comparar as
          mudanças.
        </p>
      ) : (
        <>
          <label htmlFor={`${field}-previous`} className="block text-sm">
            Inventário de referência para a comparação
          </label>
          <Select
            id={`${field}-previous`}
            disabled={busy}
            value={previousId}
            onChange={(event) => {
              setPreviousId(event.target.value)
              setDelta(null)
              setNotice('')
            }}
          >
            <option value="">Selecione o inventário anterior</option>
            {candidates.map((value) => (
              <option key={value.id} value={value.id}>
                {new Date(value.capturedAt).toLocaleString('pt-BR')} · {value.entryCount} origens
              </option>
            ))}
          </Select>
          <Button
            size="sm"
            variant="outline"
            disabled={busy || !previousId || current.state === 'receiving'}
            onClick={() => run(() => load(state))}
          >
            Comparar inventários
          </Button>
        </>
      )}
      {delta ? (
        <>
          <p className="text-xs text-muted-foreground">
            Referência: {new Date(delta.previous.capturedAt).toLocaleString('pt-BR')} · Retrato
            selecionado: {new Date(delta.current.capturedAt).toLocaleString('pt-BR')}
          </p>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {importDeltaStateSchema.options.map((value) => (
              <div key={value}>
                <dt className="text-muted-foreground">{labels[value]}</dt>
                <dd>
                  {(delta.summary.find((row) => row.state === value)?.count ?? 0).toLocaleString(
                    'pt-BR',
                  )}
                </dd>
              </div>
            ))}
          </dl>
          {editable &&
          current.state === 'inventoried' &&
          delta.previous.state === 'inventoried' &&
          delta.current.createdAt >= delta.previous.createdAt ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Reaproveite as origens sem mudanças que já foram carregadas ou receberam uma
                decisão. Conferências e vínculos compatíveis são preservados. Depois, carregue as
                origens novas ou alteradas pelo desktop.
              </p>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const result = await workspaceAction(
                      port,
                      `/projects/${projectId}/imports/${current.id}/reconcile`,
                      {
                        previousId: delta.previous.id,
                        previousDigest: delta.previous.digest,
                        currentDigest: delta.current.digest,
                      },
                      importReconcileResultSchema,
                    )
                    if (
                      result.projectId !== projectId ||
                      result.inventoryId !== current.id ||
                      result.previousId !== delta.previous.id
                    )
                      throw new Error('A reconciliação retornou outro inventário')
                    await onReconciled()
                    setNotice(
                      `${result.sources} origens, ${result.decisions} decisões e ${result.reports} conferências reaproveitadas; ${result.links} vínculos preservados. ${result.reportsPending} conferências precisam de nova revisão.`,
                    )
                  })
                }
              >
                Reaproveitar origens sem mudanças
              </Button>
            </div>
          ) : null}
          {notice ? (
            <p role="status" className="text-sm">
              {notice}
            </p>
          ) : null}
          <label htmlFor={`${field}-state`} className="block text-sm">
            Mudanças a consultar
          </label>
          <Select
            id={`${field}-state`}
            value={state}
            disabled={busy}
            onChange={(event) => {
              const next =
                event.target.value === 'all'
                  ? 'all'
                  : importDeltaStateSchema.parse(event.target.value)
              run(() => load(next))
            }}
          >
            <option value="all">Todas as origens</option>
            {importDeltaStateSchema.options.map((value) => (
              <option key={value} value={value}>
                {labels[value]}
              </option>
            ))}
          </Select>
          <ul
            className="max-h-64 space-y-2 overflow-auto text-xs"
            aria-label="Diferenças das origens"
          >
            {delta.entries.map((entry) => (
              <li key={entry.path} className="rounded border p-2">
                <p className="break-all font-medium">{entry.path}</p>
                <p>{labels[entry.state]}</p>
                {entry.previous ? (
                  <p>
                    Antes: {entry.previous.product} · {entry.previous.category} ·{' '}
                    {entry.previous.reason}
                  </p>
                ) : null}
                {entry.current ? (
                  <p>
                    Agora: {entry.current.product} · {entry.current.category} ·{' '}
                    {entry.current.reason}
                  </p>
                ) : (
                  <p>Original anterior preservado no projeto, se já carregado.</p>
                )}
              </li>
            ))}
          </ul>
          {!delta.entries.length ? <p className="text-sm">Nenhuma origem neste filtro.</p> : null}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={busy || pageCursor === 0}
              onClick={() => run(() => load(state))}
            >
              Voltar ao início
            </Button>
            {delta.nextCursor !== null ? (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => run(() => load(state, delta.nextCursor ?? 0))}
              >
                Próximas diferenças
              </Button>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  )
}
