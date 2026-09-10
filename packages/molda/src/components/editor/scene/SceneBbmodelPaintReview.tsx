import { useMemo, useState } from 'react'
import { BBMODEL_IMPORT_COPY as copy } from '../../../core/bbmodelImportCopy'
import type { BbmodelConversionReport } from '../../../import/bbmodelConversionReport'
import type { MoldaSceneDocument } from '../../../scene/document'
import { Button } from '../../ui/Button'
import { importDisclosure } from './sceneImportStyles'

const PAGE_SIZE = 5

export function SceneBbmodelPaintReview({
  report,
  document,
}: {
  report: BbmodelConversionReport
  document: MoldaSceneDocument
}) {
  const [requestedPage, setPage] = useState(0),
    rows = useMemo(() => report.issues.filter((issue) => issue.stage === 'paint-layers'), [report]),
    images = useMemo(
      () => new Map(document.images.map((image) => [image.id, image])),
      [document.images],
    ),
    pageCount = Math.ceil(rows.length / PAGE_SIZE),
    page = Math.min(requestedPage, Math.max(0, pageCount - 1))
  if (!rows.length) return null
  return (
    <section aria-label={copy.paintReview} className="space-y-3">
      <h4 className="font-bold">{copy.paintReview}</h4>
      <p className="text-sm leading-relaxed">
        {copy.paintSummary(
          rows.length,
          rows.reduce((sum, row) => sum + row.detail.layers.length, 0),
        )}
      </p>
      <p className="text-sm text-mld-muted">{copy.paintOrder}</p>
      {rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(({ detail }) => {
        const image = images.get(detail.targetId)
        if (!image) throw new Error('Missing reviewed paint image')
        return (
          <details key={image.id} className="rounded-lg border border-mld-border p-2">
            <summary className={importDisclosure}>
              {image.name} · {detail.layers.length} {copy.paintLayersUnit(detail.layers.length)}
            </summary>
            <ol className="list-decimal space-y-2 py-2 pl-5 text-sm">
              {detail.layers.map((layer) => {
                const native = image.layers[layer.layer]
                if (!native) throw new Error('Missing reviewed paint layer')
                return (
                  <li key={layer.targetId}>
                    <span className="break-words font-bold">{native.name}</span>
                    {' · '}
                    {layer.visible ? copy.paintVisible : copy.paintHidden}
                    {' · '}
                    {layer.sourceOpacity}%
                    {layer.nameChange && <p className="text-mld-muted">{copy.paintNameChanged}</p>}
                    {layer.declared.some(
                      (size, axis) => size !== null && size > 0 && size !== layer.actual[axis],
                    ) && <p className="text-mld-muted">{copy.paintSizeChanged}</p>}
                    {layer.rgba16 && <p className="text-mld-muted">{copy.paintColorChanged}</p>}
                  </li>
                )
              })}
            </ol>
          </details>
        )
      })}
      {pageCount > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={page === 0} onClick={() => setPage(page - 1)}>
            {copy.paintPrevious}
          </Button>
          <p role="status" className="text-sm">
            {copy.paintPage(page + 1, pageCount)}
          </p>
          <Button disabled={page + 1 === pageCount} onClick={() => setPage(page + 1)}>
            {copy.paintNext}
          </Button>
        </div>
      )}
    </section>
  )
}
