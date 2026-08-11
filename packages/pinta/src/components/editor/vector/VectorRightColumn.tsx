/**
 * Coluna DIREITA dos kinds vetoriais (desktop), espelho da PixelRightColumn:
 * prévia (só personagem animado — ela se auto-remove nos demais) → CORES →
 * APARÊNCIA, todos na mesma largura (`w-68`), rolando JUNTOS por dentro.
 */
import type { JSX } from 'react'
import { useState } from 'react'
import { COPY } from '../../../core/copy'
import { ChevronDown } from '../../ui/icons'
import { PreviewPlayer } from '../PreviewPlayer'
import { VectorPropertiesPanel } from '../VectorPropertiesPanel'
import { VectorColorsPanel } from './VectorColorsPanel'
import { VectorLayerPanel } from './VectorLayerPanel'

export function VectorRightColumn(): JSX.Element {
  const [open, setOpen] = useState({ preview: true, layers: true, colors: true, appearance: true })
  const disclosure = (key: keyof typeof open, title: string) => ({
    open: open[key],
    onOpenChange: (next: boolean) => setOpen((current) => ({ ...current, [key]: next })),
    expandLabel: COPY.panel.expand(title),
    collapseLabel: COPY.panel.collapse(title),
  })
  return (
    <div className="flex min-h-0 w-68 shrink-0 flex-col gap-2 overflow-x-hidden overflow-y-auto">
      <PreviewPlayer disclosure={disclosure('preview', COPY.animation.preview)} />
      <VectorLayerPanel disclosure={disclosure('layers', COPY.layers.title)} />
      <VectorColorsPanel disclosure={disclosure('colors', COPY.palette.title)} />
      <VectorPropertiesPanel disclosure={disclosure('appearance', COPY.vector.appearance)} />
    </div>
  )
}

/**
 * Tela estreita: cores + aparência viram uma seção COLAPSÁVEL abaixo do palco
 * (mesma mecânica do SpritePanelDisclosure do pixel — abrir empurra in-flow,
 * nada de fixed/portal por cima da tab bar do host).
 */
export function VectorPanelsDisclosure(): JSX.Element {
  const [open, setOpen] = useState(false)
  return (
    <div className="pin-panel shrink-0 p-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-2 text-sm font-bold text-pin-text transition hover:bg-pin-border/40"
      >
        {COPY.vector.panelsTitle}
        <ChevronDown
          aria-hidden="true"
          className={`size-5 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open ? (
        <div className="flex gap-2 overflow-x-auto pt-2">
          <VectorColorsPanel />
          <VectorLayerPanel />
          <VectorPropertiesPanel />
        </div>
      ) : null}
    </div>
  )
}
