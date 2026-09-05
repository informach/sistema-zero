/**
 * A caixa de ferramentas do PINTAR (coluna da esquerda): lápis, borracha,
 * balde na face, balde na peça, conta-gotas, espelho de pintura; o tamanho do
 * lápis; e os texels por bloco (a resolução das peles).
 */
import { clsx } from 'clsx'
import type { JSX } from 'react'
import { COPY } from '../../../core/copy'
import { MOLDA_LIMITS, type TexelsPerUnit } from '../../../core/limits'
import type { BrushSize } from '../../../paint/skinPaint'
import type { PaintTool } from '../../../paint/stroke'
import { ToolButton } from '../../ui/Button'
import {
  Eraser,
  FlipHorizontal2,
  ImageIcon,
  type LucideIcon,
  PaintBucket,
  Paintbrush,
  Pencil,
  Pipette,
} from '../../ui/icons'

const TOOL_ICONS: Record<PaintTool, LucideIcon> = {
  pencil: Pencil,
  eraser: Eraser,
  fillFace: PaintBucket,
  fillPart: Paintbrush,
  picker: Pipette,
}

const TOOL_SHORTCUTS: Partial<Record<PaintTool, string>> = {
  pencil: 'P',
  eraser: 'E',
  fillFace: 'G',
  picker: 'I',
}

const TOOLS: PaintTool[] = ['pencil', 'eraser', 'fillFace', 'fillPart', 'picker']
const SIZES: BrushSize[] = [1, 2, 3]

function chip(active: boolean): string {
  return clsx(
    'min-h-11 rounded-lg border-2 px-1 text-xs font-bold transition',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mld-accent',
    active
      ? 'border-mld-accent bg-mld-accent text-mld-accent-fg'
      : 'border-mld-border bg-mld-surface text-mld-text hover:border-mld-accent',
  )
}

export interface PaintToolboxProps {
  tool: PaintTool
  onTool: (tool: PaintTool) => void
  size: BrushSize
  onSize: (size: BrushSize) => void
  mirror: boolean
  onToggleMirror: () => void
  texelsPerUnit: TexelsPerUnit
  onTexels: (value: TexelsPerUnit) => void
  onApplyTexture: () => void
}

export function PaintToolbox(props: PaintToolboxProps): JSX.Element {
  const copy = COPY.editor.model.paint
  return (
    <aside
      aria-label={COPY.editor.model.toolbox}
      className="flex w-28 shrink-0 flex-col gap-2 overflow-y-auto border-r-2 border-mld-border bg-mld-surface p-2"
    >
      <fieldset className="flex flex-col gap-1">
        <legend className="mld-display px-1 text-[0.65rem] uppercase tracking-wide text-mld-muted">
          {COPY.editor.model.toolbox}
        </legend>
        <div className="grid grid-cols-2 gap-1">
          {TOOLS.map((tool) => (
            <ToolButton
              key={tool}
              icon={TOOL_ICONS[tool]}
              label={copy.tools[tool]}
              shortcut={TOOL_SHORTCUTS[tool]}
              active={props.tool === tool}
              onClick={() => props.onTool(tool)}
            />
          ))}
          <ToolButton
            icon={FlipHorizontal2}
            label={copy.mirror}
            shortcut="M"
            active={props.mirror}
            onClick={props.onToggleMirror}
          />
        </div>
      </fieldset>
      <ToolButton
        icon={ImageIcon}
        label={copy.apply.button}
        onClick={props.onApplyTexture}
        className="w-full"
      />
      <fieldset className="flex flex-col gap-1">
        <legend className="mld-display px-1 text-[0.65rem] uppercase tracking-wide text-mld-muted">
          {copy.sizeLabel}
        </legend>
        <div className="grid grid-cols-3 gap-1">
          {SIZES.map((size) => (
            <button
              key={size}
              type="button"
              aria-pressed={props.size === size}
              aria-label={`${copy.sizeLabel}: ${copy.sizes[size]}`}
              title={`${copy.sizes[size]} (${size})`}
              onClick={() => props.onSize(size)}
              className={chip(props.size === size)}
            >
              {size}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-1">
        <legend className="mld-display px-1 text-[0.65rem] uppercase tracking-wide text-mld-muted">
          {copy.texelsLabel}
        </legend>
        <div className="grid grid-cols-3 gap-1">
          {MOLDA_LIMITS.texelsPerUnit.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={props.texelsPerUnit === value}
              aria-label={`${copy.texelsLabel}: ${value}`}
              title={copy.texelsHint}
              onClick={() => props.onTexels(value)}
              className={chip(props.texelsPerUnit === value)}
            >
              {value}
            </button>
          ))}
        </div>
      </fieldset>
    </aside>
  )
}
