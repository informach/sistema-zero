'use client'
import { type ProductionReport, productionReportPageSchema } from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { useEffect, useRef, useState } from 'react'
import { AssetPreview } from './asset-preview'
import { ImportProductionBatchLinks } from './import-production-batch-links'
import { ImportProductionLink } from './import-production-link'
import type { WorkbenchPort } from './port'
import { ProductionReviewDetails } from './production-review-details'

export function ImportProductionReports({
  port,
  projectId,
  inventoryId,
  busy,
  run,
  added,
  editable,
  onOpenPiece,
}: {
  port: WorkbenchPort
  projectId: string
  inventoryId: string
  busy: boolean
  run(work: () => Promise<void>): void
  added: ProductionReport | null
  editable: boolean
  onOpenPiece(id: string): void
}) {
  const [reports, setReports] = useState<ProductionReport[] | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [asset, setAsset] = useState<{ id: string; alt: string } | null>(null)
  const details = useRef<HTMLElement>(null)
  useEffect(() => {
    if (selected) details.current?.focus()
  }, [selected])
  const rows = [
    ...(added ? [added] : []),
    ...(reports ?? []).filter((value) => value.id !== added?.id),
  ]
  const active = rows.find((value) => value.id === selected) ?? added
  async function load(after: string | null) {
    const page = productionReportPageSchema.parse(
      await port.request(
        `/projects/${projectId}/imports/${inventoryId}/production-reports${after ? `?after=${after}` : ''}`,
      ),
    )
    setReports((previous) =>
      after
        ? [
            ...(previous ?? []),
            ...page.items.filter((value) => !previous?.some((row) => row.id === value.id)),
          ]
        : page.items,
    )
    setCursor(page.nextCursor)
  }
  return (
    <section className="space-y-3 rounded-lg border p-3" aria-label="Conferências compartilhadas">
      <p className="text-sm font-medium">Conferências e originais da equipe</p>
      <p className="text-xs text-muted-foreground">
        Relatórios preservam o retrato da origem, as versões e os arquivos conferidos pelo servidor.
        Não aprovam a arte nem substituem a revisão atual da peça.
      </p>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => load(null))}>
        {reports ? 'Atualizar conferências' : 'Consultar conferências compartilhadas'}
      </Button>
      {reports && !rows.length ? (
        <p className="text-sm">Nenhuma conferência compartilhada neste inventário.</p>
      ) : null}
      <ul className="max-h-40 overflow-auto space-y-1">
        {rows.map((report) => (
          <li key={report.id}>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              aria-pressed={active?.id === report.id}
              onClick={() => {
                setSelected(report.id)
                setAsset(null)
              }}
            >
              {report.review.folder.key} · {new Date(report.createdAt).toLocaleString('pt-BR')}
            </Button>
          </li>
        ))}
      </ul>
      {cursor ? (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => load(cursor))}>
          Mais conferências
        </Button>
      ) : null}
      {active ? (
        <section
          ref={details}
          tabIndex={-1}
          className="space-y-3 outline-offset-4"
          aria-label={`Conferência ${active.review.folder.key}`}
        >
          <p className="text-xs text-muted-foreground">
            {active.sources.length} fontes preservadas · Conferido em{' '}
            {new Date(active.createdAt).toLocaleString('pt-BR')}
          </p>
          {active.inheritedFrom ? (
            <p className="text-xs text-muted-foreground">
              Conferência reaproveitada da carga anterior. Suas origens e arquivos continuam sem
              mudanças.
            </p>
          ) : null}
          <ProductionReviewDetails
            review={active.review}
            fileAction={(file) => {
              const assetId = active.sources.find((source) => source.path === file.path)?.assetId
              return assetId ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setAsset({ id: assetId, alt: file.alt?.short ?? file.path })}
                >
                  {file.path.endsWith('.mp4') ? 'Conferir vídeo' : 'Conferir imagem'}{' '}
                  {file.position}
                </Button>
              ) : null
            }}
          />
          <ImportProductionLink
            key={active.id}
            port={port}
            projectId={projectId}
            reportId={active.id}
            editable={editable}
            onOpenPiece={onOpenPiece}
            busy={busy}
            run={run}
          />
          {asset && active.sources.some((source) => source.assetId === asset.id) ? (
            <AssetPreview
              port={port}
              projectId={projectId}
              assetId={asset.id}
              alt={asset.alt}
              mediaType="auto"
            />
          ) : null}
        </section>
      ) : null}
      <ImportProductionBatchLinks
        port={port}
        projectId={projectId}
        inventoryId={inventoryId}
        busy={busy}
        editable={editable}
        run={run}
        onOpenPiece={onOpenPiece}
        onOpenReport={(report) => {
          setReports((previous) => [
            report,
            ...(previous ?? []).filter((value) => value.id !== report.id),
          ])
          setSelected(report.id)
          setAsset(null)
          if (selected === report.id) details.current?.focus()
        }}
      />
    </section>
  )
}
