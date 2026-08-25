/**
 * "Criar paleta": nome + 15 slots SEMEADOS da paleta ativa do desenho (a
 * paleta nova nunca nasce com buraco — quem traz buracos é só o import de
 * imagem). Tocar num slot abre o seletor livre para trocar a cor dele.
 *
 * ⚠️ Monte com `key={String(open)}` (padrão NewAssetDialog): o estado nasce da
 * paleta ativa ATUAL a cada abertura.
 */
import type { JSX } from 'react'
import { useState } from 'react'
import { normalizeHex } from '../../core/color'
import { COPY } from '../../core/copy'
import { PALETTE_SIZE, TRANSPARENT_INDEX } from '../../core/palette'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { ColorPickerDialog } from './ColorPicker'

export function CreatePaletteDialog({
  open,
  initialColors,
  onClose,
  onCreate,
}: {
  open: boolean
  /** As cores da paleta ATIVA do desenho (semente; a posição 0 é ignorada). */
  initialColors: readonly string[]
  onClose(): void
  onCreate(name: string, colors: string[]): void
}): JSX.Element | null {
  const [name, setName] = useState('')
  const [colors, setColors] = useState<string[]>(() =>
    Array.from({ length: PALETTE_SIZE }, (_, i) =>
      i === TRANSPARENT_INDEX ? '' : (initialColors[i] ?? ''),
    ),
  )
  const [editingSlot, setEditingSlot] = useState<number | null>(null)
  if (!open) return null

  return (
    <>
      <Dialog open={open} onClose={onClose} title={COPY.palette.createPaletteTitle}>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            onCreate(name.trim() || COPY.a11y.customPaletteName, colors)
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="font-bold text-pin-text text-sm">{COPY.palette.paletteNameLabel}</span>
            <input
              name="pinta-palette-name"
              autoComplete="off"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={COPY.palette.paletteNamePlaceholder}
              className="min-h-11 rounded-xl border-2 border-pin-border bg-pin-bg px-4 text-base outline-none focus:border-pin-accent"
            />
          </label>
          <div className="grid grid-cols-5 justify-items-center gap-1 p-0.5">
            {colors.map((hex, index) => {
              if (index === TRANSPARENT_INDEX) return null
              return (
                <button
                  key={String(index)}
                  type="button"
                  aria-label={COPY.palette.editSlot(index)}
                  title={hex || COPY.palette.editSlot(index)}
                  onClick={() => setEditingSlot(index)}
                  className={`size-11 shrink-0 rounded-md border-2 border-pin-border transition hover:border-pin-accent ${
                    hex ? '' : 'pin-checkerboard'
                  }`}
                  style={hex ? { backgroundColor: hex } : undefined}
                />
              )
            })}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              {COPY.gallery.cancel}
            </Button>
            <Button type="submit" variant="primary">
              {COPY.palette.createConfirm}
            </Button>
          </div>
        </form>
      </Dialog>
      <ColorPickerDialog
        open={editingSlot !== null}
        value={(editingSlot !== null ? colors[editingSlot] : null) || '#ff8800'}
        onClose={() => setEditingSlot(null)}
        title={COPY.palette.addColorTitle}
        confirmLabel={COPY.colorPicker.apply}
        onConfirm={(value) => {
          const hex = normalizeHex(value)
          if (hex && editingSlot !== null) {
            setColors((prev) => prev.map((c, i) => (i === editingSlot ? hex : c)))
          }
          setEditingSlot(null)
        }}
      />
    </>
  )
}
