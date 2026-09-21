import type { JSX } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { COPY } from '../../core/copy'
import type { PintaVectorAnimation, VectorSpriteAsset } from '../../core/project'
import { type AnimatedVectorSvgResult, buildAnimatedVectorSvg } from '../../export/animatedSvg'
import { Button } from '../ui/Button'
import { Download, Sparkles } from '../ui/icons'

function sizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${Math.round((bytes / 1024) * 10) / 10} KB`
}

function failureMessage(result: AnimatedVectorSvgResult): string | null {
  if (result.ok) return null
  switch (result.reason) {
    case 'empty':
      return COPY.exportDialog.animatedSvgEmpty
    case 'text':
      return COPY.exportDialog.animatedSvgText
    case 'image':
      return COPY.exportDialog.animatedSvgImage
    case 'too-large':
      return COPY.exportDialog.animatedSvgTooLarge
  }
}

export function AnimatedSvgExport({
  asset,
  animation,
  onDownload,
}: {
  asset: VectorSpriteAsset
  animation: PintaVectorAnimation
  onDownload: (svg: string) => void
}): JSX.Element {
  const [smooth, setSmooth] = useState(true)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const result = useMemo(
    () => buildAnimatedVectorSvg(asset, animation, { smooth }),
    [asset, animation, smooth],
  )

  useEffect(() => {
    if (!result.ok || typeof URL.createObjectURL !== 'function') {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(new Blob([result.svg], { type: 'image/svg+xml;charset=utf-8' }))
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [result])

  const failure = failureMessage(result)

  return (
    <section className="mt-2 rounded-2xl border-2 border-pin-border bg-pin-bg p-3">
      <div className="mb-2 flex items-center gap-2 font-bold text-pin-text">
        <Sparkles aria-hidden="true" className="size-5 text-pin-accent" />
        <h3>{COPY.exportDialog.animatedSvgTitle(animation.name)}</h3>
      </div>

      {previewUrl ? (
        <div className="mb-3 flex min-h-32 items-center justify-center overflow-hidden rounded-xl border-2 border-pin-border bg-white p-2">
          <img
            src={previewUrl}
            alt={COPY.exportDialog.animatedSvgPreview}
            className="max-h-40 max-w-full"
          />
        </div>
      ) : null}

      <label className="flex min-h-11 cursor-pointer items-start gap-2 py-1">
        <input
          type="checkbox"
          className="mt-1 size-4 accent-pin-accent"
          checked={smooth}
          onChange={(event) => setSmooth(event.target.checked)}
        />
        <span>
          <strong className="block text-sm text-pin-text">{COPY.exportDialog.smoothMotion}</strong>
          <small className="block text-pin-muted">{COPY.exportDialog.smoothMotionHint}</small>
        </span>
      </label>

      {result.ok ? (
        <p className="mb-2 text-sm text-pin-muted">
          {COPY.exportDialog.animatedSvgStats(
            sizeLabel(result.bytes),
            result.smoothedTracks,
            result.sourceFrameCount - result.poseCount,
          )}
        </p>
      ) : (
        <p className="mb-2 text-sm font-bold text-pin-warn">{failure}</p>
      )}
      <Button
        className="w-full"
        disabled={!result.ok}
        onClick={() => {
          if (result.ok) onDownload(result.svg)
        }}
      >
        <Download aria-hidden="true" className="size-4" />
        {COPY.exportDialog.animatedSvgDownload}
      </Button>
      {result.ok ? (
        <p className="mt-2 text-xs text-pin-muted">{COPY.exportDialog.animatedSvgHint}</p>
      ) : null}
    </section>
  )
}
