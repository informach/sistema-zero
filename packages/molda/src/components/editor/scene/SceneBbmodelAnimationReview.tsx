import { useState } from 'react'
import {
  BBMODEL_CLIP_PROBLEM_COPY,
  BBMODEL_ANIMATION_IMPORT_COPY as copy,
} from '../../../core/bbmodelAnimationImportCopy'
import type { BbmodelConversionAnimations } from '../../../import/bbmodelConversionReport'
import type { MoldaSceneDocument } from '../../../scene/document'
import { Button } from '../../ui/Button'
import { importDisclosure } from './sceneImportStyles'

/** Summary is bounded for the UI; the existing download retains the entire validated report. */
export function SceneBbmodelAnimationReview({
  report,
  document,
}: {
  report: BbmodelConversionAnimations
  document: MoldaSceneDocument
}) {
  const [requestedPage, setPage] = useState(0),
    pages = Math.ceil(report.source.length / 5),
    page = Math.min(requestedPage, Math.max(0, pages - 1)),
    start = page * 5,
    clips = new Map((document.animations ?? []).map((clip) => [clip.id, clip])),
    sourceCounts = { fields: 0, markers: 0, omitted: 0 },
    trackCounts = { sampled: 0, split: 0, zeroes: 0, tiny: 0 }
  for (const clip of report.source) {
    if (clip.kind === 'prepared') {
      sourceCounts.fields += clip.metadataFields + clip.unmappedFields
      sourceCounts.markers += clip.markers
    } else sourceCounts.omitted++
  }
  for (const clip of report.conversions)
    for (const track of clip.tracks) {
      if (track.sampling === 'grid') trackCounts.sampled++
      trackCounts.split += track.prePostKeys
      trackCounts.zeroes += track.zeroScaleComponents
      trackCounts.tiny += track.underflowComponents
    }
  return (
    <section aria-label={copy.review} className="space-y-2 border-b border-mld-border pb-3">
      <h4 className="font-bold">{copy.review}</h4>
      {report.source.length === 0 ? (
        <p className="text-sm">{copy.empty}</p>
      ) : (
        <>
          <p className="text-sm font-bold">
            {copy.summary(report.counts.clips, sourceCounts.omitted)}
          </p>
          {report.counts.clips > 0 && (
            <p className="text-sm leading-relaxed">{copy.adaptationHint}</p>
          )}
          {trackCounts.sampled > 0 && (
            <p className="text-sm">{copy.sampledTracks(trackCounts.sampled)}</p>
          )}
          {(sourceCounts.fields > 0 || sourceCounts.markers > 0) && (
            <p className="text-sm">{copy.discarded(sourceCounts.fields, sourceCounts.markers)}</p>
          )}
          {trackCounts.split > 0 && <p className="text-sm">{copy.discontinuous}</p>}
          {trackCounts.zeroes > 0 && <p className="text-sm">{copy.zeroes}</p>}
          {trackCounts.tiny > 0 && <p className="text-sm">{copy.tiny}</p>}
          <details open={sourceCounts.omitted > 0}>
            <summary className={importDisclosure}>{copy.review}</summary>
            <ol start={start + 1} className="space-y-3 py-2 text-sm">
              {report.source.slice(start, start + 5).map((item) => {
                const clip =
                  item.kind === 'prepared' ? clips.get(`bbmodel_clip_${item.clip}`) : null
                if (item.kind === 'prepared' && !clip)
                  throw new Error('Missing reviewed native clip')
                return (
                  <li key={item.clip} className="break-words">
                    <p className="line-clamp-2 font-bold">
                      {clip?.name ?? (item.sourceName || copy.fallbackName(item.clip))}
                    </p>
                    <p className="leading-relaxed">
                      {item.kind === 'omitted'
                        ? BBMODEL_CLIP_PROBLEM_COPY[item.problem.code]
                        : clip?.tracks.length === 0
                          ? copy.emptyClip
                          : copy.prepared}
                    </p>
                  </li>
                )
              })}
            </ol>
            {pages > 1 && (
              <>
                <p role="status" className="text-sm text-mld-muted">
                  {copy.page(
                    start + 1,
                    Math.min(start + 5, report.source.length),
                    report.source.length,
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button disabled={page === 0} onClick={() => setPage(page - 1)}>
                    {copy.previous}
                  </Button>
                  <Button disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>
                    {copy.next}
                  </Button>
                </div>
              </>
            )}
          </details>
          <p className="text-sm leading-relaxed text-mld-muted">{copy.reportHint}</p>
        </>
      )}
    </section>
  )
}
