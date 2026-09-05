/**
 * A caixa de ferramentas do Montar (coluna da esquerda, 2 colunas de botões
 * de 44 px): as quatro formas, as três alças, duplicar/apagar e os dois
 * interruptores (espelho, encaixe de meio bloco).
 */
import type { JSX } from 'react'
import { COPY } from '../../../core/copy'
import type { ShapeId } from '../../../core/model'
import type { TransformTool } from '../../../state/sessionStore'
import { ToolButton } from '../../ui/Button'
import {
  Box,
  Circle,
  Copy,
  Cylinder,
  FlipHorizontal2,
  type LucideIcon,
  Magnet,
  Move,
  RotateCw,
  Scaling,
  Trash2,
  Triangle,
} from '../../ui/icons'

const SHAPE_ICONS: Record<ShapeId, LucideIcon> = {
  box: Box,
  wedge: Triangle,
  cylinder: Cylinder,
  sphere: Circle,
}

const SHAPE_SHORTCUTS: Partial<Record<ShapeId, string>> = { box: 'B' }

const TOOL_ICONS: Record<TransformTool, LucideIcon> = {
  move: Move,
  rotate: RotateCw,
  scale: Scaling,
}

const TOOL_SHORTCUTS: Record<TransformTool, string> = { move: 'V', rotate: 'R', scale: 'T' }

export interface ToolboxProps {
  tool: TransformTool
  onTool: (tool: TransformTool) => void
  onAdd: (shape: ShapeId) => void
  placingShape: ShapeId | null
  onDuplicate: () => void
  onRemove: () => void
  hasSelection: boolean
  partsFull: boolean
  mirrorX: boolean
  onToggleMirror: () => void
  snapHalf: boolean
  onToggleSnap: () => void
}

export function Toolbox(props: ToolboxProps): JSX.Element {
  const shapes: ShapeId[] = ['box', 'wedge', 'cylinder', 'sphere']
  const tools: TransformTool[] = ['move', 'rotate', 'scale']
  return (
    <aside
      aria-label={COPY.editor.model.toolbox}
      className="flex w-28 shrink-0 flex-col gap-2 overflow-y-auto border-r-2 border-mld-border bg-mld-surface p-2"
    >
      <fieldset className="flex flex-col gap-1">
        <legend className="mld-display px-1 text-[0.65rem] uppercase tracking-wide text-mld-muted">
          {COPY.editor.model.addGroup}
        </legend>
        <div className="grid grid-cols-2 gap-1">
          {shapes.map((shape) => (
            <ToolButton
              key={shape}
              icon={SHAPE_ICONS[shape]}
              label={`${COPY.editor.model.addGroup} ${COPY.editor.model.add[shape].toLowerCase()}`}
              shortcut={SHAPE_SHORTCUTS[shape]}
              active={props.placingShape === shape}
              disabled={props.partsFull}
              onClick={() => props.onAdd(shape)}
            />
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-1">
        <legend className="mld-display px-1 text-[0.65rem] uppercase tracking-wide text-mld-muted">
          {COPY.editor.model.toolbox}
        </legend>
        <div className="grid grid-cols-2 gap-1">
          {tools.map((tool) => (
            <ToolButton
              key={tool}
              icon={TOOL_ICONS[tool]}
              label={COPY.editor.model.tools[tool]}
              shortcut={TOOL_SHORTCUTS[tool]}
              active={props.tool === tool}
              onClick={() => props.onTool(tool)}
            />
          ))}
          <ToolButton
            icon={Copy}
            label={COPY.editor.model.duplicate}
            shortcut="Ctrl+D"
            disabled={!props.hasSelection || props.partsFull}
            onClick={props.onDuplicate}
          />
          <ToolButton
            icon={Trash2}
            label={COPY.editor.model.remove}
            shortcut="Delete"
            disabled={!props.hasSelection}
            onClick={props.onRemove}
          />
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-1">
        <ToolButton
          icon={FlipHorizontal2}
          label={COPY.editor.model.mirror}
          shortcut="M"
          active={props.mirrorX}
          onClick={props.onToggleMirror}
        />
        <ToolButton
          icon={Magnet}
          label={COPY.editor.model.snapHalf}
          active={props.snapHalf}
          onClick={props.onToggleSnap}
        />
      </div>
    </aside>
  )
}
