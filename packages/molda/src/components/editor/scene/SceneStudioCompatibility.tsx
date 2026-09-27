import { clsx } from 'clsx'
import { COPY } from '../../../core/copy'
import { inspectSceneStudioCompatibility } from '../../../export/sceneStudioCompatibility'
import type { SceneGlbExportResult } from '../../../workers/sceneGlbProtocol'

/** Destination guidance does not block portable GLB downloads or grant loss consent. */
export function SceneStudioCompatibility({ result }: { result: SceneGlbExportResult }) {
  const report = inspectSceneStudioCompatibility({
      stats: result.stats,
      byteLength: result.bytes.byteLength,
    }),
    copy = COPY.scene.glbExport.studio
  return (
    <details className="rounded-xl border border-mld-border bg-mld-bg p-3">
      <summary
        className={clsx(
          'min-h-11 cursor-pointer content-center rounded-lg font-bold',
          'focus-visible:outline-2 focus-visible:outline-mld-accent',
        )}
      >
        {report.fitsSingleCopy ? copy.title : copy.needsChanges}
      </summary>
      <div className="space-y-2 pt-2 text-sm leading-relaxed">
        <p>{report.empty ? copy.empty : report.fitsSingleCopy ? copy.fits : copy.tooComplex}</p>
        {report.exceeded.map(({ limit, actual, maximum }) => (
          <p key={limit}>{copy.limits[limit](actual, maximum)}</p>
        ))}
        <p>{report.animated ? copy.animated : copy.static}</p>
        {report.skinned && <p>{copy.skinned}</p>}
        <p className="text-mld-muted">{copy.scope}</p>
        <p className="text-mld-muted">{copy.manual}</p>
      </div>
    </details>
  )
}
