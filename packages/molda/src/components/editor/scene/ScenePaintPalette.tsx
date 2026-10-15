import { hexToRgb, rgbToHex } from '../../../core/color'
import { COPY } from '../../../core/copy'
import type { MoldaPaletteFields } from '../../../core/model'
import { RESERVED_INDEX } from '../../../core/palette'
import { resolvePaletteColors } from '../../../core/sanitize'
import { SCENE_PAINT_COPY } from '../../../core/scenePaintCopy'
import type { ScenePaintRgba } from '../../../scene/imagePaint'
import { RequiresTool } from '../../toolAccess'
import { Button } from '../../ui/Button'
import { swatchClass } from '../../ui/interaction'
import type { useScenePaint } from './useScenePaint'

export function scenePaletteSwatches(palette: MoldaPaletteFields) {
  return resolvePaletteColors(palette).flatMap((hex, index) =>
    index === RESERVED_INDEX || !hex ? [] : [{ index, hex }],
  )
}

export function ScenePaintPalette({
  paint,
  palette,
}: {
  paint: ReturnType<typeof useScenePaint>
  palette: MoldaPaletteFields
}) {
  const busy = paint.drawing || paint.busy
  const ink = paint.ink
  const hex = rgbToHex(ink[0], ink[1], ink[2])
  const favorite = paint.favorites.some((entry) => entry.every((value, i) => value === ink[i]))
  const swatches = (colors: ScenePaintRgba[], label: string) =>
    colors.length > 0 && (
      <div>
        <p className="mb-1 text-xs text-mld-muted">{label}</p>
        <div className="flex flex-wrap gap-1">
          {colors.map((entry) => {
            const color = rgbToHex(entry[0], entry[1], entry[2])
            return (
              <button
                key={entry.join(',')}
                type="button"
                aria-label={`${label}: ${color}`}
                disabled={busy}
                className={swatchClass(entry.every((value, i) => value === ink[i]))}
                style={{ backgroundColor: color }}
                onClick={() => paint.setColor(entry)}
              />
            )
          })}
        </div>
      </div>
    )
  return (
    <RequiresTool family="paint.brush">
      <section
        aria-label={SCENE_PAINT_COPY.colors}
        className="shrink-0 space-y-3 border-b border-mld-border py-3"
      >
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-11 shrink-0 rounded-xl border-2 border-mld-border"
            style={{ backgroundColor: hex }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">Sua cor</p>
            <p className="text-xs text-mld-muted">{hex}</p>
          </div>
          <Button
            aria-label="Guardar cor favorita"
            aria-pressed={favorite}
            disabled={busy}
            onClick={paint.toggleFavorite}
          >
            ☆
          </Button>
        </div>
        {paint.fill && (
          <fieldset className="space-y-1">
            <legend className="text-sm font-bold">O que pintar?</legend>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="radio"
                name="fill-scope"
                checked={paint.fillScope === 'area'}
                onChange={() => paint.setFillScope('area')}
              />
              Área desta face
            </label>
            {(paint.data?.imageKind ?? 'color') === 'color' && (
              <RequiresTool family="model.finish">
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="fill-scope"
                    checked={paint.fillScope === 'base'}
                    onChange={() => paint.setFillScope('base')}
                  />
                  Cor de fundo da peça
                </label>
              </RequiresTool>
            )}
            <p className="text-xs text-mld-muted">
              {paint.fillScope === 'base'
                ? 'Os desenhos ficam por cima da nova cor.'
                : 'Toque na área que quer preencher.'}
            </p>
          </fieldset>
        )}
        {paint.eraser && (
          <p className="text-sm text-mld-muted">
            Apaga só o desenho
            {paint.data && paint.data.image.layers.length > 1
              ? ` da camada “${paint.data.layer.name}”`
              : ''}
            . A cor de baixo aparece.
          </p>
        )}
        <div className="flex flex-wrap gap-1">
          {scenePaletteSwatches(palette).map(({ index, hex }) => {
            const [r, g, b] = hexToRgb(hex)
            const active =
              !paint.eraser && ink[0] === r && ink[1] === g && ink[2] === b && ink[3] === 255
            return (
              <button
                key={index}
                type="button"
                aria-label={COPY.a11y.colorSwatch(index, hex)}
                aria-pressed={active}
                disabled={busy}
                onClick={() => paint.setColor([r, g, b, 255])}
                className={swatchClass(active)}
                style={{ backgroundColor: hex }}
              />
            )
          })}
          <label className="relative flex min-h-11 cursor-pointer items-center rounded-lg border border-dashed border-mld-border px-2 text-sm font-bold">
            + Nova cor
            <input
              type="color"
              name="molda-scene-new-color"
              aria-label={COPY.editor.model.addColor}
              disabled={busy}
              value={hex}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
              onInput={(event) => paint.newColorStep(event.currentTarget.value)}
              onChange={(event) => paint.newColorStep(event.target.value)}
            />
          </label>
        </div>
        {swatches(paint.favorites, 'Favoritas')}
        {swatches(paint.recentColors, 'Recentes')}
      </section>
    </RequiresTool>
  )
}
