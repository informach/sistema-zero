/**
 * Paleta de 16 cores do asset: o slot 0 é o "apagar" (transparente — vira a
 * borracha) e os demais selecionam a cor E voltam pro lápis se a criança
 * estava com a borracha (fluxo natural: escolher cor = querer pintar).
 *
 * Em cima, o TROCADOR de paleta: como o bitmap é indexado, trocar a paleta só
 * troca as 16 cores (os índices ficam) — vira um jeito rápido de repintar tudo.
 * A troca commita no asset (desfazível + autosave).
 */
import type { JSX } from 'react'
import { COPY } from '../../core/copy'
import { getPalette, PALETTES, TRANSPARENT_INDEX } from '../../core/palette'
import { useEditor, useEditorStores, useSession } from './editorContext'

export function PaletteBar(): JSX.Element | null {
  const { editor, session } = useEditorStores()
  const asset = useEditor((state) => state.asset)
  const color = useSession((state) => state.color)
  const tool = useSession((state) => state.tool)

  // Só kinds com paleta indexada própria (vetoriais usam cor livre).
  if (!('paletteId' in asset)) return null
  const palette = getPalette(asset.paletteId)

  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl border-2 border-pin-border bg-pin-surface p-2">
      {/* Cada botão já se descreve ("Trocar paleta: Arcade"); dispensa role de grupo. */}
      <div className="flex w-full flex-wrap items-center justify-center gap-1">
        {PALETTES.map((p) => {
          const active = asset.paletteId === p.id
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={active}
              aria-label={`${COPY.palette.switchPalette}: ${p.name}`}
              title={p.name}
              onClick={() => {
                if (asset.paletteId === p.id) return
                editor.getState().commit({ ...asset, paletteId: p.id })
              }}
              className={`flex min-h-9 flex-col items-center gap-0.5 rounded-xl border-2 px-2 py-1 transition ${
                active ? 'border-pin-accent ring-2 ring-pin-accent' : 'border-pin-border'
              }`}
            >
              <span aria-hidden="true" className="flex h-2.5 w-12 overflow-hidden rounded-full">
                {p.colors.map((hex, i) =>
                  i === TRANSPARENT_INDEX || !hex ? null : (
                    <span
                      key={hex + String(i)}
                      className="h-full flex-1"
                      style={{ background: hex }}
                    />
                  ),
                )}
              </span>
              <span className="text-xs font-bold text-pin-muted">{p.name}</span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1">
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
    </div>
  )
}
