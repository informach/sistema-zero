import { useMemo } from 'react'
import { COPY } from '../../../core/copy'
import { SCENE_PAINT_COPY } from '../../../core/scenePaintCopy'
import { sceneAppearanceUsage } from '../../../scene/appearanceUsage'
import { scenePalette } from '../../../scene/composite'
import type { ScenePaintRgba } from '../../../scene/imagePaint'
import { sceneMaterialImageBase } from '../../../scene/materialImages'
import { RequiresTool, useMoldaToolAccess } from '../../toolAccess'
import { Button } from '../../ui/Button'
import { SceneAppearanceTools } from './SceneAppearanceTools'
import { SceneFlipbookPreview } from './SceneFlipbookPreview'
import { SceneGradientColorControls } from './SceneGradientColorControls'
import { ScenePaintStampTools } from './ScenePaintStampTools'
import { SceneRgbaColorInput } from './SceneRgbaColorInput'
import { SCENE_PAINT_ADVANCED_FAMILIES } from './sceneCommandAccess'
import type { useSceneWorkshop } from './useSceneWorkshop'

/** Contextual brush options and layers; the sheet and materials occupy their named workspace. */
export function ScenePaintEditor({ workshop }: { workshop: ReturnType<typeof useSceneWorkshop> }) {
  const access = useMoldaToolAccess()
  const { paint, document, primary } = workshop
  const { data, color, drawing, fill, busy, shape, filled, scope } = paint
  const { paletteId, customPalette, extraColors } = document
  const palette = useMemo(
    () => scenePalette({ paletteId, customPalette, extraColors }),
    [paletteId, customPalette, extraColors],
  )
  const appearance = useMemo(() => sceneAppearanceUsage(document), [document])
  if (!SCENE_PAINT_ADVANCED_FAMILIES.some((family) => access.can(family))) return null
  const copy = COPY.scene
  const rgba: ScenePaintRgba = typeof color === 'number' ? [0, 0, 0, 255] : color
  const transparentBase =
    data !== null &&
    [...(appearance.byNode.get(primary?.id ?? '') ?? [])].every((id) => {
      const material = appearance.index.materials.get(id)!
      return (
        material.baseColor.kind === 'rgba' &&
        material.baseColor.value[3] === 0 &&
        !material.alphaMask
      )
    })
  return (
    <>
      {primary?.kind === 'mesh' && (
        <RequiresTool family="paint.layers">
          <SceneAppearanceTools
            key={`appearance:${primary.id}`}
            workshop={workshop}
            onOpen={paint.close}
            closed={data !== null}
          />
        </RequiresTool>
      )}
      <details className="mld-disclosure" open={!paint.surfaceMode}>
        <summary>{SCENE_PAINT_COPY.more}</summary>
        <div className="space-y-3 pt-2">
          {!data && primary?.kind !== 'mesh' && (
            <p className="text-sm text-mld-muted">{SCENE_PAINT_COPY.moreChoose}</p>
          )}
          {data && (
            <section className="space-y-3" aria-label={copy.paintTitle}>
              <p className="text-xs text-mld-muted">Camada: {data.layer.name}</p>
              {data.image.flipbook && (
                <RequiresTool family="paint.flipbook">
                  <SceneFlipbookPreview
                    image={data.image}
                    palette={palette}
                    base={sceneMaterialImageBase(data.material, palette, data.imageKind)}
                    player={workshop.flipbook}
                    disabled={drawing || busy}
                    allowPlay={false}
                    beforeChange={paint.cancel}
                  />
                </RequiresTool>
              )}
              <fieldset disabled={drawing || busy} className="space-y-3">
                <legend className="sr-only">{copy.paintTitle}</legend>
                <RequiresTool family="paint.shapes">
                  <details className="rounded-lg border border-mld-border px-2">
                    <summary className="flex min-h-11 cursor-pointer items-center pr-11 text-sm font-bold">
                      {copy.paintShapes}
                    </summary>
                    <div className="grid grid-cols-3 gap-1.5 pb-2">
                      {(
                        ['line', 'rectangle', 'ellipse', 'select', 'gradient', 'stamp'] as const
                      ).map((tool) => (
                        <Button
                          key={tool}
                          className="px-1.5 text-xs"
                          aria-pressed={shape === tool}
                          disabled={
                            (tool === 'gradient' || tool === 'stamp') &&
                            data.image.encoding === 'indexed'
                          }
                          onClick={() => paint.setShape(tool)}
                        >
                          {copy.paintShapeTools[tool]}
                        </Button>
                      ))}
                    </div>
                    {data.image.encoding === 'indexed' && (
                      <div className="space-y-2 pb-2">
                        <p className="text-xs text-mld-muted">{copy.paintGradientConvertHint}</p>
                        <Button className="w-full text-sm" onClick={paint.convert}>
                          {copy.imageRgba}
                        </Button>
                      </div>
                    )}
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
                  {shape === 'gradient' && data.image.encoding === 'rgba' ? (
                    <SceneGradientColorControls
                      start={rgba}
                      end={paint.endColor}
                      onStartChange={paint.setColor}
                      onEndChange={paint.setEndColor}
                      transparentBase={transparentBase}
                      colorImage={data.imageKind === 'color'}
                      onMakeBaseTransparent={paint.makeBaseTransparent}
                    />
                  ) : shape !== 'stamp' && data.image.encoding === 'rgba' ? (
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
          )}
        </div>
      </details>
    </>
  )
}
