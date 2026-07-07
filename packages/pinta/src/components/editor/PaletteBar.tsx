/**
 * Paleta de 16 cores do asset: o slot 0 é o "apagar" (transparente — vira a
 * borracha) e os demais selecionam a cor E voltam pro lápis se a criança
 * estava com a borracha (fluxo natural: escolher cor = querer pintar).
 *
 * Dois layouts: `panel` (grade 4×4 na coluna direita do editor, desktop) e
 * `row` (uma linha rolável abaixo do palco, tela estreita — o trocador de
 * paleta abre num Dialog para não roubar altura do canvas).
 *
 * O TROCADOR de paleta: como o bitmap é indexado, trocar a paleta só troca as
 * 16 cores (os índices ficam) — vira um jeito rápido de repintar tudo. A troca
 * commita no asset (desfazível + autosave).
 */
import type { JSX } from 'react'
import { useState } from 'react'
import { COPY } from '../../core/copy'
import { getPalette, PALETTES, TRANSPARENT_INDEX } from '../../core/palette'
import { ToolButton } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Palette } from '../ui/icons'
import { useEditor, useEditorStores, useSession } from './editorContext'

export function PaletteBar({ layout = 'panel' }: { layout?: 'panel' | 'row' }): JSX.Element | null {
  const { editor, session } = useEditorStores()
  const asset = useEditor((state) => state.asset)
  const color = useSession((state) => state.color)
  const tool = useSession((state) => state.tool)
  const [switcherOpen, setSwitcherOpen] = useState(false)

  // Só kinds com paleta indexada própria (vetoriais usam cor livre).
  if (!('paletteId' in asset)) return null
  const palette = getPalette(asset.paletteId)

  const swatches = (
    <>
      <button
        type="button"
        aria-pressed={tool === 'eraser'}
        aria-label={COPY.palette.transparent}
        title={COPY.palette.transparent}
        onClick={() => session.getState().setTool('eraser')}
        className={`pin-checkerboard size-11 shrink-0 rounded-xl border-2 transition ${
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
            className={`size-11 shrink-0 rounded-xl border-2 transition ${
              selected ? 'border-pin-accent ring-2 ring-pin-accent' : 'border-pin-border'
            }`}
            style={{ backgroundColor: hex }}
          />
        )
      })}
    </>
  )

  /** Um botão por paleta (barra de cores + nome); `onDone` fecha o Dialog. */
  const paletteChoices = (onDone?: () => void): JSX.Element[] =>
    PALETTES.map((p) => {
      const active = asset.paletteId === p.id
      return (
        <button
          key={p.id}
          type="button"
          aria-pressed={active}
          aria-label={`${COPY.palette.switchPalette}: ${p.name}`}
          title={p.name}
          onClick={() => {
            if (asset.paletteId !== p.id) editor.getState().commit({ ...asset, paletteId: p.id })
            onDone?.()
          }}
          className={`flex min-h-11 items-center gap-2 rounded-xl border-2 px-2 transition ${
            active ? 'border-pin-accent ring-2 ring-pin-accent' : 'border-pin-border'
          }`}
        >
          <span
            aria-hidden="true"
            className="flex h-2.5 min-w-0 flex-1 overflow-hidden rounded-full"
          >
            {p.colors.map((hex, i) =>
              i === TRANSPARENT_INDEX || !hex ? null : (
                <span key={hex + String(i)} className="h-full flex-1" style={{ background: hex }} />
              ),
            )}
          </span>
          <span className="shrink-0 text-xs font-bold text-pin-muted">{p.name}</span>
        </button>
      )
    })

  if (layout === 'row') {
    return (
      <div className="pin-panel flex shrink-0 items-center gap-1 p-2">
        <ToolButton
          icon={Palette}
          label={COPY.palette.switchPalette}
          onClick={() => setSwitcherOpen(true)}
        />
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-1">
          {swatches}
        </div>
        <Dialog
          open={switcherOpen}
          onClose={() => setSwitcherOpen(false)}
          title={COPY.palette.switchPalette}
        >
          <div className="flex flex-col gap-2">{paletteChoices(() => setSwitcherOpen(false))}</div>
        </Dialog>
      </div>
    )
  }

  return (
    <section aria-label={COPY.palette.title} className="pin-panel flex flex-col gap-2 p-3">
      <span className="text-sm font-bold text-pin-muted">{COPY.palette.title}</span>
      <div className="grid grid-cols-4 justify-items-center gap-1">{swatches}</div>
      <div className="flex flex-col gap-1">{paletteChoices()}</div>
    </section>
  )
}
