import { useMemo } from 'react'
import { COPY } from '../../../core/copy'
import { SCENE_PAINT_COPY } from '../../../core/scenePaintCopy'
import { scenePalette } from '../../../scene/composite'
import type { ScenePaintRgba } from '../../../scene/imagePaint'
import { sceneMaterialImageBase } from '../../../scene/materialImages'
import { RequiresTool, useMoldaToolAccess } from '../../toolAccess'
import { Button } from '../../ui/Button'
import { SceneAppearanceTools } from './SceneAppearanceTools'
import { SceneFlipbookPreview } from './SceneFlipbookPreview'
import { ScenePaintCanvas } from './ScenePaintCanvas'
import { ScenePaintStampTools } from './ScenePaintStampTools'
import { SceneRgbaColorInput } from './SceneRgbaColorInput'
import type { useSceneWorkshop } from './useSceneWorkshop'

const ADVANCED = ['paint.shapes', 'paint.sheet', 'paint.flipbook', 'paint.layers'] as const

/**
 * "Mais jeitos de pintar": o caminho avançado da aba Pintar, recolhido. Formas, área, degradê,
 * carimbo, transparência, a folha inteira e a pintura que se mexe, e "Materiais e camadas",
 * que saiu do Modelar. Lápis, Borracha, Balde, Conta-gotas, a largura e as cores ficam à vista
 * (`ScenePaintToolbox` e `ScenePaintPalette`). Sem nenhuma dessas famílias liberada, some.
 */
export function ScenePaintEditor({ workshop }: { workshop: ReturnType<typeof useSceneWorkshop> }) {
  const access = useMoldaToolAccess()
  const { paint, document, primary } = workshop
  const { data, color, drawing, fill, busy, shape, filled, scope } = paint
  const { paletteId, customPalette, extraColors } = document
  const palette = useMemo(
    () => scenePalette({ paletteId, customPalette, extraColors }),
    [paletteId, customPalette, extraColors],
  )
  if (!ADVANCED.some((family) => access.can(family))) return null
  const copy = COPY.scene
  const rgba: ScenePaintRgba = typeof color === 'number' ? [0, 0, 0, 255] : color
  return (
    <details className="rounded-xl border border-mld-border p-2">
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold">
        {SCENE_PAINT_COPY.more}
      </summary>
      <div className="space-y-3 pt-2">
        {data && (
          <section className="space-y-3" aria-label={copy.paintTitle}>
            <h3 className="mld-display text-lg">{copy.paintTitle}</h3>
            <p className="text-sm font-bold">
              {data.image.name} · {data.layer.name}
            </p>
            <p className="text-xs text-mld-muted">{copy.paintHint}</p>
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
            {data.imageKind !== 'color' && (
              <p className="text-xs text-mld-muted">{copy.materialMapHints[data.imageKind]}</p>
            )}
            <fieldset disabled={drawing || busy} className="space-y-3">
              <legend className="sr-only">{copy.paintTitle}</legend>
              <RequiresTool family="paint.shapes">
                <details className="rounded-lg border border-mld-border px-2">
                  <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold">
                    {copy.paintShapes}
                  </summary>
                  <div className="grid grid-cols-2 gap-2 pb-2">
                    {(['line', 'rectangle', 'ellipse', 'select', 'gradient', 'stamp'] as const).map(
                      (tool) => (
                        <Button
                          key={tool}
                          className="px-2 text-sm"
                          aria-pressed={shape === tool}
                          disabled={
                            (tool === 'gradient' || tool === 'stamp') &&
                            data.image.encoding === 'indexed'
                          }
                          onClick={() => paint.setShape(tool)}
                        >
                          {copy.paintShapeTools[tool]}
                        </Button>
                      ),
                    )}
                  </div>
                  {shape && <p className="pb-2 text-xs text-mld-muted">{copy.paintShapeHint}</p>}
                  {data.image.encoding === 'indexed' && (
                    <div className="space-y-2 pb-2">
                      <p className="text-xs text-mld-muted">{copy.paintGradientNeedsRgba}</p>
                      <Button className="w-full text-sm" onClick={paint.convert}>
                        {copy.imageRgba}
                      </Button>
                    </div>
                  )}
                  {shape === 'gradient' && (
                    <p className="pb-2 text-xs text-mld-muted">{copy.paintGradientHint}</p>
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
                  <div className="space-y-2">
                    <p className="text-xs text-mld-muted">{copy.paintSelectedArea}</p>
                    <Button className="w-full text-sm" onClick={paint.clearSelection}>
                      {copy.paintClearSelection}
                    </Button>
                  </div>
                )}
                {shape !== 'stamp' && data.image.encoding === 'rgba' && (
                  <SceneRgbaColorInput
                    value={rgba}
                    onChange={paint.setColor}
                    colorLabel={copy.paintColor}
                    alphaLabel={copy.paintAlpha}
                    colorName="paintColorRgba"
                    alphaName="paintAlpha"
                  />
                )}
                {shape === 'gradient' && data.image.encoding === 'rgba' && (
                  <SceneRgbaColorInput
                    value={paint.endColor}
                    onChange={paint.setEndColor}
                    colorLabel={copy.paintGradientEndColor}
                    alphaLabel={copy.paintGradientEndAlpha}
                    colorName="paintGradientColor"
                    alphaName="paintGradientAlpha"
                  />
                )}
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
            <RequiresTool family="paint.sheet">
              <ScenePaintCanvas
                image={data.image}
                palette={palette}
                base={sceneMaterialImageBase(data.material, palette, data.imageKind)}
                drawing={drawing}
                actions={paint.actions}
                twoPoint={shape !== null}
                draft={paint.draft}
                scope={scope}
              />
            </RequiresTool>
          </section>
        )}
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
      </div>
    </details>
  )
}
