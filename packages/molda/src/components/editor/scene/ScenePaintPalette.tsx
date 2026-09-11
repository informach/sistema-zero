/**
 * As cores da aba Pintar, em amostras grandes: uma por cor da paleta da criação, no lugar da
 * lista "índice: hex". Na pintura com cores livres, a amostra vira a mesma cor opaca.
 *
 * "+ Nova cor" abre o seletor NATIVO (o painel próprio foi rejeitado) e é um GESTO: cada passo
 * do arrasto chega em `newColorStep`, e o `change` nativo fecha UM passo de desfazer.
 */
import { clsx } from 'clsx'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { hexToRgb } from '../../../core/color'
import { COPY } from '../../../core/copy'
import { MOLDA_LIMITS } from '../../../core/limits'
import type { MoldaPaletteFields } from '../../../core/model'
import { RESERVED_INDEX } from '../../../core/palette'
import { resolvePaletteColors } from '../../../core/sanitize'
import { SCENE_PAINT_COPY } from '../../../core/scenePaintCopy'
import { RequiresTool } from '../../toolAccess'
import { IconButton } from '../../ui/Button'
import { Plus } from '../../ui/icons'
import { swatchClass } from '../../ui/interaction'
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
  const input = useRef<HTMLInputElement>(null)
  const plus = useRef<HTMLButtonElement>(null)
  const endGesture = useRef(paint.newColorEnd)
  useLayoutEffect(() => {
    endGesture.current = paint.newColorEnd
  })
  // O fim do gesto é o `change` NATIVO (o React entrega `input` e `change` no mesmo onChange).
  // O listener fica no elemento e roda antes do React; o microtask deixa o último passo entrar.
  useEffect(() => {
    const element = input.current
    if (!element) return
    const onNativeChange = () =>
      queueMicrotask(() => {
        endGesture.current()
        plus.current?.focus()
      })
    element.addEventListener('change', onNativeChange)
    return () => element.removeEventListener('change', onNativeChange)
  }, [])
  const full = (palette.extraColors?.length ?? 0) >= MOLDA_LIMITS.maxExtraColors
  const busy = paint.drawing || paint.busy
  return (
    <RequiresTool family="paint.brush">
      {/* No celular, uma fileira que rola de lado: duas fileiras de cores roubavam o palco. */}
      <section
        aria-label={SCENE_PAINT_COPY.colors}
        className={clsx(
          'mld-scroll-x flex shrink-0 gap-1 overflow-x-auto border-mld-border border-t bg-mld-surface p-2 lg:flex-wrap lg:overflow-x-visible',
          // No traço as cores ficam desligadas sem esmaecer (a faixa piscava a cada traço).
          paint.drawing && !paint.busy && '[&_button:disabled]:opacity-100',
        )}
      >
        {/* O "+" abre a faixa, como o cartão "Nova criação" abre a galeria: no celular a fileira
            rola de lado, e no fim dela ele ficava fora da tela. O campo escondido mora junto
            dele, então o seletor nativo abre ao lado do "+". */}
        <span className="relative shrink-0">
          <IconButton
            ref={plus}
            aria-label={COPY.editor.model.addColor}
            title={full ? COPY.editor.model.colorsFull : undefined}
            disabled={full || busy}
            onClick={() => {
              const element = input.current
              if (!element) return
              // Foco de verdade no campo: o blur dele é a rede quando o seletor fecha sem `change`.
              element.focus()
              element.click()
            }}
            className="border-2 border-mld-border border-dashed"
          >
            <Plus aria-hidden="true" className="size-5" />
          </IconButton>
          <input
            ref={input}
            type="color"
            name="molda-scene-new-color"
            aria-hidden="true"
            tabIndex={-1}
            className="sr-only"
            onChange={(event) => paint.newColorStep(event.target.value)}
            onBlur={() => paint.newColorEnd()}
          />
        </span>
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
              disabled={busy}
              onClick={() => paint.setColor(rgba ? [r, g, b, 255] : index)}
              className={swatchClass(active)}
              style={{ backgroundColor: hex }}
            />
          )
        })}
      </section>
    </RequiresTool>
  )
}
