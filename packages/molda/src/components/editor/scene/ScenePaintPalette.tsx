/**
 * As cores da aba Pintar, em amostras grandes: uma por cor da paleta da criação, no lugar da
 * lista "índice: hex". Na pintura com cores livres, a amostra vira a mesma cor opaca.
 */
import { clsx } from 'clsx'
import { hexToRgb } from '../../../core/color'
import { COPY } from '../../../core/copy'
import type { MoldaPaletteFields } from '../../../core/model'
import { RESERVED_INDEX } from '../../../core/palette'
import { resolvePaletteColors } from '../../../core/sanitize'
import { SCENE_PAINT_COPY } from '../../../core/scenePaintCopy'
import { RequiresTool } from '../../toolAccess'
import type { useScenePaint } from './useScenePaint'

/** As cores que a criança pode escolher: sem o índice reservado e sem vagas vazias. */
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
  const rgba = paint.data?.image.encoding === 'rgba'
  const { color } = paint
  return (
    <RequiresTool family="paint.brush">
      {/* No celular, uma fileira que rola de lado: duas fileiras de cores roubavam o palco. */}
      <section
        aria-label={SCENE_PAINT_COPY.colors}
        className="mld-scroll-x flex shrink-0 gap-1 overflow-x-auto border-mld-border border-t bg-mld-surface p-2 lg:flex-wrap lg:overflow-x-visible"
      >
        {scenePaletteSwatches(palette).map(({ index, hex }) => {
          const [r, g, b] = hexToRgb(hex)
          const active =
            !paint.eraser &&
            (rgba
              ? typeof color !== 'number' &&
                color[0] === r &&
                color[1] === g &&
                color[2] === b &&
                color[3] === 255
              : color === index)
          return (
            <button
              key={index}
              type="button"
              aria-label={COPY.a11y.colorSwatch(index, hex)}
              aria-pressed={active}
              disabled={paint.drawing || paint.busy}
              onClick={() => paint.setColor(rgba ? [r, g, b, 255] : index)}
              className={clsx(
                'aspect-square min-h-11 min-w-11 rounded-md border-2 transition',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mld-accent',
                'disabled:cursor-not-allowed disabled:opacity-40',
                active ? 'scale-110 border-mld-text' : 'border-mld-border/60 hover:border-mld-text',
              )}
              style={{ backgroundColor: hex }}
            />
          )
        })}
      </section>
    </RequiresTool>
  )
}
