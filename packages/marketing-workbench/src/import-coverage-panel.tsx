'use client'
import {
  type ImportCoverage,
  type ImportCoverageState,
  importCoverageSchema,
  importCoverageStateSchema,
} from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { Select } from '@sistemazero/ui/select'
import { useId, useState } from 'react'
import { ImportDecisionForm } from './import-decision-form'
import { ImportOfficeText } from './import-office-text'
import type { WorkbenchPort } from './port'

const labels: Record<ImportCoverageState, string> = {
  loaded: 'Preservadas no projeto',
  pending: 'Falta carregar',
  review: 'Exigem conferência',
  blocked: 'Bloqueadas na origem',
  excluded: 'Excluídas pelo inventário',
  'other-product': 'Pertencem a outro produto',
  unbound: 'Produto ainda sem vínculo',
  deferred: 'Pendências identificadas',
  omitted: 'Não carregar: decisão registrada',
}
export function ImportCoveragePanel({
  port,
  projectId,
  inventoryId,
  busy,
  editable,
  run,
  onOpenSource,
}: {
  port: WorkbenchPort
  projectId: string
  inventoryId: string
  busy: boolean
  editable: boolean
  run(work: () => Promise<void>): void
  onOpenSource(id: string, kind: 'piece' | 'evidence'): void
}) {
  const field = useId()
  const [page, setPage] = useState<ImportCoverage | null>(null)
  const [state, setState] = useState<ImportCoverageState | 'all'>('all')
  const [pageCursor, setPageCursor] = useState(0)
  async function load(filter: typeof state, cursor = 0) {
    const value = importCoverageSchema.parse(
      await port.request(
        `/projects/${projectId}/imports/${inventoryId}/coverage?state=${filter}&cursor=${cursor}`,
      ),
    )
    if (value.run.projectId !== projectId || value.run.id !== inventoryId)
      throw new Error('A cobertura retornou outra carga')
    setPage(value)
    setState(filter)
    setPageCursor(cursor)
  }
  return (
    <section className="space-y-3 rounded-lg border p-3" aria-label="Cobertura da carga">
      <p className="text-sm font-medium">O que já está no projeto e o que falta carregar</p>
      <p className="text-xs text-muted-foreground">
        A contagem cobre todo o inventário. Uma origem preservada pode continuar aguardando
        estruturação, vínculo das artes ou revisão; esta consulta não ativa nem aprova o conteúdo.
      </p>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => load(state))}>
        {page ? 'Atualizar cobertura da carga' : 'Conferir cobertura da carga'}
      </Button>
      {page ? (
        <>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {importCoverageStateSchema.options.map((value) => (
              <div key={value}>
                <dt className="text-muted-foreground">{labels[value]}</dt>
                <dd className="font-medium">
                  {(page.summary.find((row) => row.state === value)?.count ?? 0).toLocaleString(
                    'pt-BR',
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-muted-foreground">
            {page.run.received} de {page.run.entryCount} registros recebidos · consulta em{' '}
            {new Date(page.countedAt).toLocaleString('pt-BR')}
            {page.run.state === 'retired' ? ' · Carga desativada; recibos conservados.' : ''}
          </p>
          <label htmlFor={field} className="block text-sm">
            Origens a consultar
          </label>
          <Select
            id={field}
            disabled={busy}
            value={state}
            onChange={(event) => {
              const next =
                event.target.value === 'all'
                  ? 'all'
                  : importCoverageStateSchema.parse(event.target.value)
              run(() => load(next))
            }}
          >
            <option value="all">Todas as origens</option>
            {importCoverageStateSchema.options.map((value) => (
              <option key={value} value={value}>
                {labels[value]}
              </option>
            ))}
          </Select>
          <ul className="max-h-80 space-y-2 overflow-auto" aria-label="Origens e destinos da carga">
            {page.entries.map((entry) => (
              <li key={entry.ordinal} className="rounded border p-2 text-xs">
                <p className="break-all font-medium">{entry.source.path}</p>
                <p>
                  {labels[entry.state]} · {entry.source.product}
                </p>
                <p className="text-muted-foreground">{entry.source.reason}</p>
                {entry.decision ? (
                  <p>
                    Decisão de {new Date(entry.decision.decidedAt).toLocaleString('pt-BR')}:{' '}
                    {entry.decision.reason}
                  </p>
                ) : null}
                {editable &&
                page.run.state === 'inventoried' &&
                !entry.result &&
                ['pending', 'review', 'deferred', 'omitted'].includes(entry.state) ? (
                  <ImportDecisionForm
                    key={`${entry.ordinal}:${entry.decision?.revisionId ?? 'new'}`}
                    port={port}
                    projectId={projectId}
                    inventoryId={inventoryId}
                    ordinal={entry.ordinal}
                    decision={entry.decision}
                    busy={busy}
                    run={run}
                    onSaved={() => load(state, pageCursor)}
                  />
                ) : null}
                {entry.result ? (
                  <>
                    {entry.result.classificationReview ? (
                      <p>Classificação mudou; conferir antes de usar como direção.</p>
                    ) : null}
                    {/\.(docx|xlsx)$/i.test(entry.source.path) ? (
                      <ImportOfficeText
                        port={port}
                        projectId={projectId}
                        sourceId={entry.result.sourceVersionId}
                        canExtract={editable}
                        busy={busy}
                        run={run}
                        onOpen={onOpenSource}
                      />
                    ) : null}
                    {entry.result.destinations.map((destination, index) => (
                      <Button
                        key={destination.entityId}
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => onOpenSource(destination.entityId, 'evidence')}
                      >
                        Abrir referência preservada
                        {entry.result && entry.result.destinations.length > 1
                          ? ` ${index + 1}`
                          : ''}
                      </Button>
                    ))}
                  </>
                ) : null}
              </li>
            ))}
          </ul>
          {!page.entries.length ? <p className="text-sm">Nenhuma origem neste filtro.</p> : null}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={busy || pageCursor === 0}
              onClick={() => run(() => load(state))}
            >
              Voltar ao início
            </Button>
            {page.nextCursor !== null ? (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => run(() => load(state, page.nextCursor ?? 0))}
              >
                Próximas origens
              </Button>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  )
}
