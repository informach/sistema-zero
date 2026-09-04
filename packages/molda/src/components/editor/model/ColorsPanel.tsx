/**
 * As cores: a paleta (16 fixas + extras) como swatches. No MONTAR, tocar
 * pinta a cor BASE da peça selecionada; no PINTAR, escolhe a cor do lápis. O
 * "+" abre o seletor de cor NATIVO (regra da casa: nada de painel de cor
 * custom) e a cor nova entra nas extras; a lixeira só apaga extras (as 16 são
 * fixas por contrato do bitmap indexado).
 */
import { clsx } from 'clsx'
import type { ChangeEvent, JSX } from 'react'
import { useRef } from 'react'
import { normalizeHex } from '../../../core/color'
import { COPY } from '../../../core/copy'
import { MOLDA_LIMITS } from '../../../core/limits'
import type { MoldaPaletteFields } from '../../../core/model'
import {
  isPaletteId,
  PALETTE_SIZE,
  PALETTES,
  type PaletteId,
  RESERVED_INDEX,
} from '../../../core/palette'
import { resolvePaletteColors } from '../../../core/sanitize'
import { IconButton } from '../../ui/Button'
import { Plus, Trash2 } from '../../ui/icons'
import { Panel } from '../../ui/Panel'

export function ColorsPanel({
  palette: model,
  activeIndex,
  canPick,
  onPick,
  onAddColor,
  onRemoveColor,
  onPalette,
  className,
}: {
  /** Quem tem paleta: o modelo ou a textura. */
  palette: MoldaPaletteFields
  /** O índice em destaque (cor da peça no Montar, cor do lápis no Pintar). */
  activeIndex: number | null
  canPick: boolean
  onPick: (index: number) => void
  onAddColor: (hex: string) => void
  /** Só as extras (índice ≥ 16) são apagáveis. */
  onRemoveColor: (index: number) => void
  onPalette: (id: PaletteId) => void
  className?: string
}): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  const colors = resolvePaletteColors(model)
  // Chave estável por COR (as paletas não repetem cor; se repetirem, o sufixo desempata).
  const seen = new Map<string, number>()
  const swatches = colors.flatMap((hex, index) => {
    if (index === RESERVED_INDEX || !hex) return []
    const count = (seen.get(hex) ?? 0) + 1
    seen.set(hex, count)
    return [{ index, hex, key: count === 1 ? hex : `${hex}-${count}` }]
  })
  const extrasFull = (model.extraColors?.length ?? 0) >= MOLDA_LIMITS.maxExtraColors
  const removable = activeIndex !== null && activeIndex >= PALETTE_SIZE

  function onColorInput(event: ChangeEvent<HTMLInputElement>): void {
    const hex = normalizeHex(event.target.value)
    if (hex) onAddColor(hex)
  }

  return (
    <Panel
      title={COPY.editor.model.colors}
      className={className}
      actions={
        <>
          <select
            aria-label={COPY.a11y.paletteSelect}
            value={model.paletteId}
            onChange={(event) => {
              if (isPaletteId(event.target.value)) onPalette(event.target.value)
            }}
            className="min-h-9 rounded-lg border-2 border-mld-border bg-mld-surface px-1 text-xs font-bold text-mld-text"
          >
            {model.paletteId === 'custom' ? (
              <option value="custom">{model.customPalette?.name ?? 'Minha paleta'}</option>
            ) : null}
            {PALETTES.map((palette) => (
              <option key={palette.id} value={palette.id}>
                {palette.name}
              </option>
            ))}
          </select>
          <IconButton
            aria-label={COPY.editor.model.paint.removeColor}
            title={
              removable
                ? COPY.editor.model.paint.removeColor
                : COPY.editor.model.paint.removeColorBase
            }
            disabled={!removable}
            onClick={() => {
              if (activeIndex !== null) onRemoveColor(activeIndex)
            }}
            className="min-h-9 min-w-9"
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </IconButton>
          <IconButton
            aria-label={COPY.editor.model.addColor}
            title={extrasFull ? COPY.editor.model.colorsFull : COPY.editor.model.addColor}
            disabled={extrasFull}
            onClick={() => inputRef.current?.click()}
            className="min-h-9 min-w-9"
          >
            <Plus aria-hidden="true" className="size-4" />
          </IconButton>
          <input
            ref={inputRef}
            type="color"
            aria-label={COPY.editor.model.addColor}
            onChange={onColorInput}
            className="sr-only"
            tabIndex={-1}
          />
        </>
      }
      bodyClassName="grid grid-cols-8 gap-1 p-2"
    >
      {swatches.map(({ index, hex, key }) => {
        const active = activeIndex === index
        return (
          <button
            key={key}
            type="button"
            aria-label={COPY.a11y.colorSwatch(index, hex)}
            aria-pressed={active}
            disabled={!canPick}
            onClick={() => onPick(index)}
            className={clsx(
              'aspect-square min-h-6 rounded-md border-2 transition',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mld-accent',
              'disabled:cursor-not-allowed disabled:opacity-40',
              active ? 'scale-110 border-mld-text' : 'border-mld-border/60 hover:border-mld-text',
            )}
            style={{ backgroundColor: hex }}
          />
        )
      })}
    </Panel>
  )
}
