import { useMemo } from 'react'
import { COPY } from '../../../core/copy'
import { SCENE_PAINT_COPY } from '../../../core/scenePaintCopy'
import { sceneAppearanceUsage } from '../../../scene/appearanceUsage'
import type { ScenePaintRgba } from '../../../scene/imagePaint'
import { RequiresTool, useMoldaToolAccess } from '../../toolAccess'
import { Button } from '../../ui/Button'
import { SceneGradientColorControls } from './SceneGradientColorControls'
import { SceneHelpButton } from './SceneHelpButton'
import { ScenePaintStampTools } from './ScenePaintStampTools'
import { SceneRgbaColorInput } from './SceneRgbaColorInput'
import { SCENE_PAINT_ADVANCED_FAMILIES } from './sceneCommandAccess'
import type { useSceneWorkshop } from './useSceneWorkshop'

/** The active paint controls; texture management lives next to the sheet. */
export function ScenePaintEditor({ workshop }: { workshop: ReturnType<typeof useSceneWorkshop> }) {
  const access = useMoldaToolAccess()
  const { paint, document, primary } = workshop
  const { data, color, drawing, fill, busy, shape, filled, scope } = paint
  const appearance = useMemo(() => sceneAppearanceUsage(document), [document])
  if (!data || !SCENE_PAINT_ADVANCED_FAMILIES.some((family) => access.can(family))) return null
  const copy = COPY.scene
  const rgba: ScenePaintRgba = typeof color === 'number' ? [0, 0, 0, 255] : color
  const transparentBase = [...(appearance.byNode.get(primary?.id ?? '') ?? [])].every((id) => {
    const material = appearance.index.materials.get(id)!
    return (
      material.baseColor.kind === 'rgba' && material.baseColor.value[3] === 0 && !material.alphaMask
    )
  })
  return (
    <>
      {data.imageKind === 'color' && (
        <section className="space-y-2 rounded-xl border border-mld-border bg-mld-surface p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold">Fundo transparente</h3>
            <SceneHelpButton title={copy.paintTransparentBaseHelp}>
              <p>{copy.paintTransparentBaseHint}</p>
            </SceneHelpButton>
          </div>
          <Button
            className="w-full text-sm"
            aria-pressed={transparentBase}
            disabled={transparentBase || drawing || busy}
            onClick={paint.makeBaseTransparent}
          >
            {copy.paintTransparentBase}
          </Button>
        </section>
      )}
      <RequiresTool family="paint.shapes">
        <section
          className="space-y-2 rounded-xl border border-mld-border bg-mld-surface p-3"
          aria-label={copy.paintShapeTools.gradient}
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold">{copy.paintShapeTools.gradient}</h3>
            <SceneHelpButton title="Como usar o gradiente">
              <p>{copy.paintGradientHint}</p>
            </SceneHelpButton>
          </div>
          {data.image.encoding === 'rgba' ? (
            <>
              <Button
                className="w-full text-sm"
                aria-pressed={shape === 'gradient'}
                disabled={drawing || busy}
                onClick={() => paint.setShape('gradient')}
              >
                {copy.paintShapeTools.gradient}
              </Button>
              {shape === 'gradient' && (
                <SceneGradientColorControls
                  start={rgba}
                  end={paint.endColor}
                  onStartChange={paint.setColor}
                  onEndChange={paint.setEndColor}
                />
              )}
            </>
          ) : (
            <>
              <p className="text-xs text-mld-muted">{copy.paintGradientConvertHint}</p>
              <Button className="w-full text-sm" disabled={drawing || busy} onClick={paint.convert}>
                {copy.paintGradientConvertAction}
              </Button>
            </>
          )}
        </section>
      </RequiresTool>
      <details className="mld-disclosure" open={shape !== null && shape !== 'gradient'}>
        <summary>{SCENE_PAINT_COPY.more}</summary>
        <div className="space-y-3 pt-2">
          <section className="space-y-3" aria-label={copy.paintTitle}>
            <p className="text-xs text-mld-muted">Camada: {data.layer.name}</p>
            <fieldset disabled={drawing || busy} className="space-y-3">
              <legend className="sr-only">{copy.paintTitle}</legend>
              <RequiresTool family="paint.shapes">
                <details className="rounded-lg border border-mld-border px-2">
                  <summary className="flex min-h-11 cursor-pointer items-center pr-11 text-sm font-bold">
                    {copy.paintShapes}
                  </summary>
                  <div className="grid grid-cols-3 gap-1.5 pb-2">
                    {(['line', 'rectangle', 'ellipse', 'select', 'stamp'] as const).map((tool) => (
                      <Button
                        key={tool}
                        className="px-1.5 text-xs"
                        aria-pressed={shape === tool}
                        disabled={tool === 'stamp' && data.image.encoding === 'indexed'}
                        onClick={() => paint.setShape(tool)}
                      >
                        {copy.paintShapeTools[tool]}
                      </Button>
                    ))}
                  </div>
                  {(shape === 'rectangle' || shape === 'ellipse') && (
                    <label className="flex min-h-11 items-center gap-2 text-sm">
                      <input
                        name="paintShapeFilled"
                        type="checkbox"
                        checked={filled}
                        className="size-5 accent-mld-accent"
                        onChange={(event) => paint.setFilled(event.target.checked)}
                      />
                      {copy.paintShapeFilled}
                    </label>
                  )}
                </details>
                {shape === 'stamp' && data.image.encoding === 'rgba' && (
                  <ScenePaintStampTools paint={paint} />
                )}
                {scope && (
                  <Button className="w-full text-sm" onClick={paint.clearSelection}>
                    {copy.paintClearSelection}
                  </Button>
                )}
                {shape !== 'stamp' && shape !== 'gradient' && data.image.encoding === 'rgba' ? (
                  <SceneRgbaColorInput
                    value={rgba}
                    onChange={paint.setColor}
                    colorLabel={copy.paintColor}
                    alphaLabel={copy.paintAlpha}
                    colorName="paintColorRgba"
                    alphaName="paintAlpha"
                  />
                ) : null}
              </RequiresTool>
              {fill && data.image.encoding === 'rgba' && (
                <label className="block space-y-1 text-sm">
                  <span>{copy.paintTolerance}</span>
                  <input
                    name="paintTolerance"
                    type="range"
                    min={0}
                    max={255}
                    step={1}
                    value={paint.tolerance}
                    onChange={(event) => paint.setTolerance(Number(event.target.value))}
                    className="min-h-11 w-full accent-mld-accent"
                  />
                  <span>{paint.tolerance}</span>
                </label>
              )}
            </fieldset>
          </section>
        </div>
      </details>
    </>
  )
}
