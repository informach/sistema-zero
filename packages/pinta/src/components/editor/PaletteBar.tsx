/**
 * Paleta de cores do asset: o slot 0 é o "apagar" (transparente — vira a
 * borracha) e os demais selecionam a cor E voltam pro lápis se a criança
 * estava com a borracha (fluxo natural: escolher cor = querer pintar).
 *
 * Além das 16 cores base (por `paletteId`), a criança pode ADICIONAR qualquer
 * cor com o seletor livre ("Nova cor"): ela vira um swatch novo (índice ≥16) e
 * a arte já feita não muda — o bitmap continua indexado. Ver `resolveAssetPalette`.
 *
 * Dois layouts: `panel` (grade na coluna de cores, desktop) e `row` (uma linha
 * rolável, tela estreita — o trocador de paleta abre num Dialog para não roubar
 * altura do canvas).
 *
 * O TROCADOR de paleta troca só as 16 cores BASE (os índices ficam) — vira um
 * jeito rápido de repintar; as cores extras personalizadas são preservadas. A
 * troca commita no asset (desfazível + autosave).
 */
import type { JSX } from 'react'
import { useState } from 'react'
import { normalizeHex } from '../../core/color'
import { COPY } from '../../core/copy'
import { PALETTE_SIZE, PALETTES, TRANSPARENT_INDEX } from '../../core/palette'
import { PINTA_LIMITS, resolveAssetPalette } from '../../core/project'
import { Button, ToolButton } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Palette, Plus } from '../ui/icons'
import { useToast } from '../ui/Toast'
import { ColorPicker } from './ColorPicker'
import { useEditor, useEditorStores, useSession } from './editorContext'

export function PaletteBar({ layout = 'panel' }: { layout?: 'panel' | 'row' }): JSX.Element | null {
  const { editor, session } = useEditorStores()
  const { showToast } = useToast()
  const asset = useEditor((state) => state.asset)
  const color = useSession((state) => state.color)
  const tool = useSession((state) => state.tool)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [draft, setDraft] = useState('#ff8800')

  // Só kinds com paleta indexada própria (vetoriais usam cor livre).
  if (!('paletteId' in asset)) return null
  const colors = resolveAssetPalette(asset)

  /** Adiciona a cor do rascunho como swatch novo (ou seleciona se já existir). */
  function addCustomColor(): void {
    const norm = normalizeHex(draft)
    if (!norm) return
    const current = editor.getState().asset
    if (!('paletteId' in current)) return
    const resolved = resolveAssetPalette(current)
    const found = resolved.indexOf(norm)
    if (found >= 0) {
      session.getState().setColor(found)
    } else if (resolved.length - PALETTE_SIZE >= PINTA_LIMITS.maxExtraColors) {
      showToast(COPY.palette.colorLimit)
      setPickerOpen(false)
      return
    } else {
      editor.getState().commit({ ...current, extraColors: [...(current.extraColors ?? []), norm] })
      // A nova cor entra no fim: o índice dela é o tamanho ANTES de adicionar.
      session.getState().setColor(resolved.length)
    }
    const s = session.getState()
    if (s.tool === 'eraser' || s.tool === 'picker') s.setTool('pencil')
    setPickerOpen(false)
  }

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
      {colors.map((hex, index) => {
        if (index === TRANSPARENT_INDEX || !hex) return null
        const selected = color === index && tool !== 'eraser'
        return (
          <button
            key={hex + String(index)}
            type="button"
            aria-pressed={selected}
            aria-label={COPY.a11y.colorLabel(index)}
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
      <button
        type="button"
        aria-label={COPY.palette.addColor}
        title={COPY.palette.addColor}
        onClick={() => setPickerOpen(true)}
        className="flex size-11 shrink-0 items-center justify-center rounded-xl border-2 border-pin-border border-dashed text-pin-muted transition hover:border-pin-accent hover:text-pin-accent"
      >
        <Plus aria-hidden="true" className="size-5" />
      </button>
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

  const pickerDialog = (
    <Dialog
      open={pickerOpen}
      onClose={() => setPickerOpen(false)}
      title={COPY.palette.addColorTitle}
    >
      <ColorPicker value={draft} onChange={setDraft} recentColors={asset.extraColors} />
      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={() => setPickerOpen(false)}>{COPY.gallery.cancel}</Button>
        <Button variant="primary" onClick={addCustomColor}>
          {COPY.palette.add}
        </Button>
      </div>
    </Dialog>
  )

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
        {pickerDialog}
      </div>
    )
  }

  return (
    <section aria-label={COPY.palette.title} className="pin-panel flex flex-col gap-2 p-3">
      <span className="text-sm font-bold text-pin-muted">{COPY.palette.title}</span>
      <div className="grid grid-cols-4 justify-items-center gap-1">{swatches}</div>
      <div className="flex flex-col gap-1">{paletteChoices()}</div>
      {pickerDialog}
    </section>
  )
}
