/**
 * A caixa de ferramentas do PINTAR (coluna da esquerda): lápis, borracha,
 * balde na face, balde na peça, conta-gotas, espelho de pintura; o tamanho do
 * lápis; e os texels por bloco (a resolução das peles).
 */
import type { JSX } from 'react'
import { COPY } from '../../../core/copy'
import { MOLDA_LIMITS, type TexelsPerUnit } from '../../../core/limits'
import type { BrushSize } from '../../../paint/skinPaint'
import type { PaintTool } from '../../../paint/stroke'
import { ToolButton } from '../../ui/Button'
import { interactiveChipClass } from '../../ui/interaction'
import { bindModelCommand, modelCommand, PAINT_COMMAND } from './commandRegistry'

const TOOLS: PaintTool[] = [
  'pencil',
  'eraser',
  'fillFace',
  'fillPart',
  'picker',
  'rotateSkin',
  'faceEditor',
]
const SIZES: BrushSize[] = [1, 2, 3]

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
          {TOOLS.map((tool) =>
            (() => {
              const command = bindModelCommand(PAINT_COMMAND[tool], {
                enabled: true,
                active: props.tool === tool,
                run: () => props.onTool(tool),
              })
              return (
                <ToolButton
                  key={tool}
                  icon={command.icon}
                  label={command.label}
                  shortcut={command.shortcut?.display}
                  active={command.active}
                  onClick={command.run}
                />
              )
            })(),
          )}
          <ToolButton
            icon={modelCommand('paint.mirror').icon}
            label={modelCommand('paint.mirror').label}
            shortcut={modelCommand('paint.mirror').shortcut?.display}
            active={props.mirror}
            onClick={props.onToggleMirror}
          />
        </div>
      </fieldset>
      <ToolButton
        icon={modelCommand('paint.apply').icon}
        label={modelCommand('paint.apply').label}
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
              className={interactiveChipClass(props.size === size)}
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
              className={interactiveChipClass(props.texelsPerUnit === value)}
            >
              {value}
            </button>
          ))}
        </div>
      </fieldset>
    </aside>
  )
}
