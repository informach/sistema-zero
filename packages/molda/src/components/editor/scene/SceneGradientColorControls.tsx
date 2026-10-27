import { COPY } from '../../../core/copy'
import type { ScenePaintRgba } from '../../../scene/imagePaint'
import { SceneHelpButton } from './SceneHelpButton'
import { SceneRgbaColorInput } from './SceneRgbaColorInput'

function cssRgba(color: ScenePaintRgba) {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3] / 255})`
}

export function SceneGradientColorControls({
  start,
  end,
  onStartChange,
  onEndChange,
}: {
  start: ScenePaintRgba
  end: ScenePaintRgba
  onStartChange(color: ScenePaintRgba): void
  onEndChange(color: ScenePaintRgba): void
}) {
  const copy = COPY.scene
  return (
    <section className="space-y-2" aria-label={copy.paintGradientColors}>
      <div className="flex min-h-8 items-center justify-between gap-2">
        <h4 className="text-sm font-bold">{copy.paintGradientColors}</h4>
        <SceneHelpButton title={copy.paintGradientHelp}>
          <p>{copy.paintGradientHint}</p>
          <p>{copy.paintGradientOpacityHint}</p>
          <p>{copy.paintGradientNeedsRgba}</p>
        </SceneHelpButton>
      </div>
      <div
        role="img"
        aria-label={copy.paintGradientPreview}
        className="h-7 rounded-md border border-mld-border"
        style={{
          backgroundImage: `linear-gradient(90deg, ${cssRgba(start)}, ${cssRgba(end)}), repeating-conic-gradient(var(--color-mld-border) 0% 25%, var(--color-mld-surface) 0% 50%)`,
          backgroundSize: '100% 100%, 12px 12px',
        }}
      />
      <SceneRgbaColorInput
        value={start}
        onChange={onStartChange}
        colorLabel={copy.paintGradientStartColor}
        alphaLabel={copy.paintGradientStartAlpha}
        colorName="paintColorRgba"
        alphaName="paintAlpha"
      />
      <SceneRgbaColorInput
        value={end}
        onChange={onEndChange}
        colorLabel={copy.paintGradientEndColor}
        alphaLabel={copy.paintGradientEndAlpha}
        colorName="paintGradientColor"
        alphaName="paintGradientAlpha"
      />
    </section>
  )
}
