import { useMemo } from 'react'
import { COPY } from '../../../core/copy'
import { resolvePaletteColors } from '../../../core/sanitize'
import { scenePalette } from '../../../scene/composite'
import type { ScenePaintRgba } from '../../../scene/imagePaint'
import { sceneMaterialImageBase } from '../../../scene/materialImages'
import { Button } from '../../ui/Button'
import { SceneFlipbookPreview } from './SceneFlipbookPreview'
import { ScenePaintCanvas } from './ScenePaintCanvas'
import { ScenePaintStampTools } from './ScenePaintStampTools'
import { SceneRgbaColorInput } from './SceneRgbaColorInput'
import { SCENE_APPEARANCE_FIELD as field } from './sceneAppearanceForm'
import type { useSceneWorkshop } from './useSceneWorkshop'

export function ScenePaintEditor({ workshop }: { workshop: ReturnType<typeof useSceneWorkshop> }) {
  const { paint, document } = workshop
  const { data, color, brush, eraser, drawing, fill, picker, busy, shape, filled, scope } = paint
  const { paletteId, customPalette, extraColors } = document
  const palette = useMemo(
    () => scenePalette({ paletteId, customPalette, extraColors }),
    [paletteId, customPalette, extraColors],
  )
  if (!data) return null
  const copy = COPY.scene
  const colors = resolvePaletteColors(document).map((hex, index) => ({ hex, index }))
  const rgba: ScenePaintRgba = typeof color === 'number' ? [0, 0, 0, 255] : color
  return (
    <section className="space-y-3 border-t border-mld-border pt-3" aria-label={copy.paintTitle}>
      <h3 className="mld-display text-lg">{copy.paintTitle}</h3>
      <p className="text-sm font-bold">
        {data.image.name} · {data.layer.name}
      </p>
      <p className="text-xs text-mld-muted">{copy.paintHint}</p>
      {data.image.flipbook && (
        <SceneFlipbookPreview
          image={data.image}
          palette={palette}
          base={sceneMaterialImageBase(data.material, palette, data.imageKind)}
          player={workshop.flipbook}
          disabled={drawing || busy}
          allowPlay={false}
          beforeChange={paint.cancel}
        />
      )}
      {data.imageKind !== 'color' && (
        <p className="text-xs text-mld-muted">{copy.materialMapHints[data.imageKind]}</p>
      )}
      {paint.error && (
        <p role="alert" className="text-sm text-mld-danger">
          {paint.error}
        </p>
      )}
      {busy && (
        <div role="status" className="space-y-2">
          <p className="text-sm">
            {paint.stampFile.busy ? copy.imageImportBusy : copy.imageTaskBusy}
          </p>
          <Button className="w-full text-sm" onClick={() => paint.cancel()}>
            {copy.imageTaskCancel}
          </Button>
        </div>
      )}
      <fieldset disabled={drawing || busy} className="space-y-3">
        <legend className="sr-only">{copy.paintTitle}</legend>
        <div className="grid grid-cols-2 gap-2">
          <Button
            className="flex-1 text-sm"
            aria-pressed={!eraser && !fill && !shape && !picker}
            onClick={() => paint.setEraser(false)}
          >
            {copy.paintPencil}
          </Button>
          <Button
            className="flex-1 text-sm"
            aria-pressed={eraser}
            onClick={() => paint.setEraser(true)}
          >
            {copy.paintEraser}
          </Button>
          <Button className="flex-1 text-sm" aria-pressed={fill} onClick={paint.setFill}>
            {copy.paintFill}
          </Button>
          <Button className="flex-1 text-sm" aria-pressed={picker} onClick={paint.setPicker}>
            {copy.paintPicker}
          </Button>
        </div>
        {picker && <p className="text-xs text-mld-muted">{copy.paintPickerHint}</p>}
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
                    (tool === 'gradient' || tool === 'stamp') && data.image.encoding === 'indexed'
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
        {fill && <p className="text-xs text-mld-muted">{copy.paintFillHint}</p>}
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
        {!fill &&
          !picker &&
          shape !== 'gradient' &&
          shape !== 'stamp' &&
          shape !== 'select' &&
          (!shape || shape === 'line' || !filled) && (
            <fieldset className="space-y-1">
              <legend className="text-sm">{copy.paintBrush}</legend>
              <div className="flex gap-2">
                {([1, 2, 3] as const).map((size) => (
                  <Button
                    key={size}
                    className="flex-1 px-2 text-sm"
                    aria-pressed={size === brush}
                    onClick={() => paint.setBrush(size)}
                  >
                    {copy.paintBrushSize(size)}
                  </Button>
                ))}
              </div>
            </fieldset>
          )}
        {shape === 'stamp' ? null : data.image.encoding === 'indexed' ? (
          <label className="block space-y-1 text-sm">
            <span>{copy.paintColor}</span>
            <select
              name="paintColorIndex"
              value={typeof color === 'number' ? color : 7}
              className={field}
              onChange={(e) => {
                paint.setColor(Number(e.target.value))
              }}
            >
              {colors
                .filter(({ index, hex }) => index > 0 && hex)
                .map(({ index, hex }) => (
                  <option key={index} value={index}>
                    {copy.materialColor(index, hex)}
                  </option>
                ))}
            </select>
          </label>
        ) : (
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
      </fieldset>
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
      <Button className="w-full text-sm" onClick={paint.close}>
        {copy.paintFinish}
      </Button>
    </section>
  )
}
