'use client'
import {
  type ProductionLinkPreview,
  type ProductionReport,
  productionLinkPreviewSchema,
  productionLinkResultSchema,
} from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { useEffect, useRef, useState } from 'react'
import { sharedProductionReports } from './import-production-receipts'
import { applyImportSequence } from './import-sequence'
import type { WorkbenchPort } from './port'

type Row = {
  report: ProductionReport
  reportId: string
  key: string
  preview: ProductionLinkPreview
  pending: number
}

/** The server owns each plan and checks revisions again on apply. A sequence is
 * atomic per piece; stopping never rolls back a previously confirmed piece. */
export function ImportProductionBatchLinks({
  port,
  projectId,
  inventoryId,
  busy,
  editable,
  run,
  onOpenPiece,
  onOpenReport,
}: {
  port: WorkbenchPort
  projectId: string
  inventoryId: string
  busy: boolean
  editable: boolean
  run(work: () => Promise<void>): void
  onOpenPiece(id: string): void
  onOpenReport(report: ProductionReport): void
}) {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [notice, setNotice] = useState('')
  const [applying, setApplying] = useState(false)
  const [filter, setFilter] = useState<'all' | ProductionLinkPreview['status']>('all')
  const live = useRef(true),
    stop = useRef(false)
  useEffect(() => {
    live.current = true
    return () => {
      live.current = false
      stop.current = true
    }
  }, [])
  const ready = rows?.filter((row) => row.preview.status === 'ready') ?? []
  async function check() {
    setRows(null)
    setNotice('Conferindo os vínculos da carga…')
    const next: Row[] = []
    const reports = await sharedProductionReports(
      port.request,
      projectId,
      inventoryId,
      () => !live.current,
    )
    for (const report of reports) {
      if (!live.current) return
      const preview = productionLinkPreviewSchema.parse(
        await port.request(`/projects/${projectId}/production-reports/${report.id}/link`),
      )
      if ((preview.status === 'linked' ? preview.link.reportId : preview.reportId) !== report.id)
        throw new Error('O vínculo retornou outra conferência')
      next.push({ report, reportId: report.id, key: report.review.folder.key, preview, pending: 0 })
      if (live.current) setNotice(`${next.length} conferências consultadas…`)
    }
    if (live.current) {
      setRows(next)
      setNotice(
        `${next.length} conferências consultadas. As pendências estão identificadas abaixo.`,
      )
    }
  }
  return (
    <section className="space-y-3 rounded-lg border p-3" aria-label="Vínculos da carga inteira">
      <p className="text-sm font-medium">Continuar as peças com as artes do acervo</p>
      <p className="text-xs text-muted-foreground">
        Confira todas as conferências compartilhadas desta carga. Somente peças com fontes, ordem,
        textos e revisões compatíveis podem receber as artes. Cada peça conserva seu próprio recibo;
        as pendências continuam disponíveis para revisão.
      </p>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => run(check)}>
        Conferir vínculos da carga inteira
      </Button>
      {rows ? (
        <>
          <p className="text-sm">
            {ready.length} prontas para vínculo ·{' '}
            {rows.filter((row) => row.preview.status === 'linked').length} já vinculadas ·{' '}
            {rows.filter((row) => row.preview.status === 'blocked').length} com pendências
          </p>
          {ready.length && editable && port.inventory ? (
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const inventory = port.inventory
                  if (!inventory) return
                  stop.current = false
                  setApplying(true)
                  let linked = 0,
                    pending = 0
                  const describe = () =>
                    `${linked} peças vinculadas; ${pending} aguardam verificação de arquivos.`
                  try {
                    const result = await applyImportSequence(
                      ready,
                      async (row) => {
                        if (row.preview.status !== 'ready')
                          throw new Error('Plano de vínculo indisponível')
                        const result = productionLinkResultSchema.parse(
                          await inventory.linkProduction(
                            projectId,
                            row.reportId,
                            row.preview.planHash,
                          ),
                        )
                        if (result.status === 'linked') {
                          if (result.link.reportId !== row.reportId)
                            throw new Error('O recibo retornou outra conferência')
                          linked++
                        } else pending++
                        if (live.current)
                          setRows(
                            (previous) =>
                              previous?.map((value) =>
                                value.reportId !== row.reportId
                                  ? value
                                  : result.status === 'linked'
                                    ? { ...value, preview: result, pending: 0 }
                                    : { ...value, pending: result.pending },
                              ) ?? null,
                          )
                        return { status: result.status, message: '' }
                      },
                      () => stop.current || !live.current,
                      () => {
                        if (live.current) setNotice(describe())
                      },
                    )
                    if (live.current)
                      setNotice(
                        `${describe()} ${result.stopped ? 'Sequência pausada.' : 'Sequência concluída.'} ${pending ? 'Retome pelo mesmo botão após a verificação.' : ''}`,
                      )
                  } catch (error) {
                    if (live.current)
                      setNotice(
                        `${describe()} Sequência interrompida; os vínculos confirmados foram preservados. Confira novamente antes de retomar.`,
                      )
                    throw error
                  } finally {
                    if (live.current) setApplying(false)
                  }
                })
              }
            >
              Vincular artes de {ready.length} peças conferidas
            </Button>
          ) : ready.length && !port.inventory ? (
            <p className="text-sm">
              A preparação dos arquivos finais é feita no app desktop. Os vínculos confirmados
              aparecem também aqui.
            </p>
          ) : null}
          {applying ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                stop.current = true
                setNotice('A sequência será pausada ao terminar esta peça.')
              }}
            >
              Pausar após esta peça
            </Button>
          ) : null}
          <label className="flex flex-wrap items-center gap-2 text-sm">
            Mostrar peças
            <select
              aria-label="Filtrar situação das peças importadas"
              className="rounded border bg-background px-2 py-1"
              value={filter}
              onChange={(event) => {
                const value = event.target.value
                if (
                  value === 'all' ||
                  value === 'blocked' ||
                  value === 'ready' ||
                  value === 'linked'
                )
                  setFilter(value)
              }}
            >
              <option value="all">Todas ({rows.length})</option>
              <option value="blocked">
                Com pendências ({rows.filter((row) => row.preview.status === 'blocked').length})
              </option>
              <option value="ready">Prontas para vínculo ({ready.length})</option>
              <option value="linked">
                Artes vinculadas ({rows.filter((row) => row.preview.status === 'linked').length})
              </option>
            </select>
          </label>
          <ul
            className="max-h-64 space-y-2 overflow-auto text-sm"
            aria-label="Situação dos vínculos"
          >
            {rows
              .filter((row) => filter === 'all' || row.preview.status === filter)
              .map((row) => (
                <li key={row.reportId} className="rounded border p-2">
                  <p className="font-medium">{row.key}</p>
                  {row.preview.status === 'blocked' ? (
                    <>
                      <ul>
                        {row.preview.reasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => onOpenReport(row.report)}
                      >
                        Conferir pendência
                      </Button>
                    </>
                  ) : row.preview.status === 'linked' ? (
                    <>
                      <p>{row.preview.link.components.length} artes vinculadas.</p>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          if (row.preview.status === 'linked') onOpenPiece(row.preview.link.pieceId)
                        }}
                      >
                        Abrir peça
                      </Button>
                    </>
                  ) : (
                    <p>
                      {row.pending
                        ? `${row.pending} arquivos aguardam verificação.`
                        : `${row.preview.components.length} artes com ordem e alt conferidos.`}
                    </p>
                  )}
                </li>
              ))}
          </ul>
        </>
      ) : null}
      {notice ? (
        <p role="status" className="text-sm">
          {notice}
        </p>
      ) : null}
    </section>
  )
}
