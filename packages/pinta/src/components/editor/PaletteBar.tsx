/**
 * Paleta de 16 cores do asset: o slot 0 é o "apagar" (transparente — vira a
 * borracha) e os demais selecionam a cor E voltam pro lápis se a criança
 * estava com a borracha (fluxo natural: escolher cor = querer pintar).
 */
import type { JSX } from 'react'
import { COPY } from '../../core/copy'
import { getPalette, TRANSPARENT_INDEX } from '../../core/palette'
import { useEditor, useEditorStores, useSession } from './editorContext'

export function PaletteBar(): JSX.Element | null {
  const { session } = useEditorStores()
  const asset = useEditor((state) => state.asset)
  const color = useSession((state) => state.color)
  const tool = useSession((state) => state.tool)

  // Só kinds com paleta indexada própria (vetoriais usam cor livre).
  if (!('paletteId' in asset)) return null
  const palette = getPalette(asset.paletteId)

  return (
    <div className="flex flex-wrap items-center justify-center gap-1 rounded-3xl border-2 border-pin-border bg-pin-surface p-2">
      <button
        type="button"
        aria-pressed={tool === 'eraser'}
        aria-label={COPY.palette.transparent}
        title={COPY.palette.transparent}
        onClick={() => session.getState().setTool('eraser')}
        className={`pin-checkerboard h-11 w-11 rounded-xl border-2 transition ${
          tool === 'eraser' ? 'border-pin-accent ring-2 ring-pin-accent' : 'border-pin-border'
        }`}
      />
      {palette.colors.map((hex, index) => {
        if (index === TRANSPARENT_INDEX || !hex) return null
        const selected = color === index && tool !== 'eraser'
        return (
          <button
            key={hex + String(index)}
            type="button"
            aria-pressed={selected}
            aria-label={`Cor ${index}`}
            title={hex}
            onClick={() => {
              const s = session.getState()
              s.setColor(index)
              if (s.tool === 'eraser' || s.tool === 'picker') s.setTool('pencil')
            }}
            className={`h-11 w-11 rounded-xl border-2 transition ${
              selected ? 'border-pin-accent ring-2 ring-pin-accent' : 'border-pin-border'
            }`}
            style={{ backgroundColor: hex }}
          />
        )
      })}
    </div>
  )
}
