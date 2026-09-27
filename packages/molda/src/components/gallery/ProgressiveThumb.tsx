import { type JSX, useEffect, useRef, useState } from 'react'
import type { MoldaAssetSummary } from '../../core/assetSummary'
import { COPY } from '../../core/copy'
import type { GalleryPreview } from '../../core/galleryPreview'
import type { GalleryPreviews } from '../../state/galleryPreviews'
import { SkyThumb } from './thumbs'

/** Observe before loading; leaving the viewport releases both the request and rendered preview. */
function useGalleryPreview(summary: MoldaAssetSummary, previews: GalleryPreviews) {
  const ref = useRef<HTMLDivElement>(null)
  const [preview, setPreview] = useState<GalleryPreview | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    let request: AbortController | null = null
    const update = (visible: boolean) => {
      if (visible && request) return
      request?.abort()
      request = null
      setPreview(null)
      setFailed(false)
      if (!visible || summary.thumbDataUrl) return
      const controller = new AbortController()
      request = controller
      void previews.load(summary, controller.signal).then(
        (value) => {
          if (controller.signal.aborted) return
          setPreview(value)
          setFailed(value === null)
        },
        () => {
          if (!controller.signal.aborted) setFailed(true)
        },
      )
    }
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(
            (entries) => {
              for (const entry of entries)
                if (entry.target === element) update(entry.isIntersecting)
            },
            { rootMargin: '120px' },
          )
    if (observer) observer.observe(element)
    else update(true)
    return () => {
      observer?.disconnect()
      request?.abort()
    }
  }, [summary, previews])
  return { ref, preview, failed }
}

export function ProgressiveThumb({
  summary,
  previews,
}: {
  summary: MoldaAssetSummary
  previews: GalleryPreviews
}): JSX.Element {
  const { ref, preview, failed } = useGalleryPreview(summary, previews)
  const [failedImage, setFailedImage] = useState<string | null>(null)
  const label = COPY.gallery.preview(summary.name)
  const source = summary.thumbDataUrl ?? (preview?.kind === 'texture' ? preview.dataUrl : null)
  const unavailable = failed || (source !== null && failedImage === source)
  let content: JSX.Element
  if (source && !unavailable) {
    content = (
      <img
        src={source}
        onError={() => setFailedImage(source)}
        alt={label}
        loading="lazy"
        decoding="async"
        draggable={false}
        className={
          summary.kind === 'texture'
            ? 'mld-pixelated size-full object-contain'
            : 'size-full object-cover'
        }
      />
    )
  } else if (preview?.kind === 'sky') {
    content = <SkyThumb params={preview.params} />
  } else if (preview?.kind === 'model' && preview.projection) {
    content = (
      <svg
        viewBox={preview.projection.viewBox}
        role="img"
        aria-label={label}
        preserveAspectRatio="xMidYMid meet"
        className="size-full p-2"
      >
        {preview.projection.polygons.map((polygon, index) => (
          <polygon
            // biome-ignore lint/suspicious/noArrayIndexKey: depth-sorted immutable derived triangles
            key={index}
            points={polygon.points}
            fill={polygon.fill}
          />
        ))}
      </svg>
    )
  } else {
    content = (
      <div
        role="img"
        aria-label={unavailable ? COPY.gallery.previewUnavailable : label}
        className="flex size-full flex-col items-center justify-center gap-1 p-2 text-mld-muted"
      >
        <span aria-hidden="true" className="text-4xl">
          {COPY.kinds[summary.kind].emoji}
        </span>
        {unavailable && (
          <span className="text-center text-xs">{COPY.gallery.previewUnavailable}</span>
        )}
      </div>
    )
  }
  return (
    <div
      ref={ref}
      className={summary.kind === 'texture' ? 'mld-checkerboard size-full' : 'size-full'}
    >
      {content}
    </div>
  )
}
