/**
 * A caixa de ferramentas do Montar (coluna da esquerda, 2 colunas de botões
 * de 44 px): as cinco formas, as quatro ferramentas, duplicar/apagar e os
 * interruptores de espelho, encaixe e seleção múltipla.
 */
import type { JSX } from 'react'
import { COPY } from '../../../core/copy'
import type { ShapeId } from '../../../core/model'
import type { TransformTool } from '../../../state/sessionStore'
import { ToolButton } from '../../ui/Button'
import { bindModelCommand, modelCommand, SHAPE_COMMAND, TRANSFORM_COMMAND } from './commandRegistry'

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
  /** A peça selecionada já é malha ("Editar malha") ou é uma forma ("Transformar em malha"). */
  selectedIsMesh: boolean
  onEditMesh: () => void
  /** Seleção múltipla: o próximo toque SOMA a peça (o Shift do desktop, como botão). */
  partsAdditive: boolean
  onTogglePartsAdditive: () => void
}

export function Toolbox(props: ToolboxProps): JSX.Element {
  const shapes: ShapeId[] = ['box', 'wedge', 'cylinder', 'sphere', 'mesh']
  const tools: TransformTool[] = ['move', 'rotate', 'scale', 'snap']
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
          {shapes.map((shape) =>
            (() => {
              const command = bindModelCommand(SHAPE_COMMAND[shape], {
                enabled: !props.partsFull,
                active: props.placingShape === shape,
                run: () => props.onAdd(shape),
              })
              return (
                <ToolButton
                  key={shape}
                  icon={command.icon}
                  label={command.label}
                  shortcut={command.shortcut?.display}
                  active={command.active}
                  disabled={!command.enabled}
                  onClick={command.run}
                />
              )
            })(),
          )}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-1">
        <legend className="mld-display px-1 text-[0.65rem] uppercase tracking-wide text-mld-muted">
          {COPY.editor.model.toolbox}
        </legend>
        <div className="grid grid-cols-2 gap-1">
          {tools.map((tool) =>
            (() => {
              const command = bindModelCommand(TRANSFORM_COMMAND[tool], {
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
            icon={modelCommand('part.duplicate').icon}
            label={modelCommand('part.duplicate').label}
            shortcut={modelCommand('part.duplicate').shortcut?.display}
            disabled={!props.hasSelection || props.partsFull}
            onClick={props.onDuplicate}
          />
          <ToolButton
            icon={modelCommand('part.remove').icon}
            label={modelCommand('part.remove').label}
            shortcut={modelCommand('part.remove').shortcut?.display}
            disabled={!props.hasSelection}
            onClick={props.onRemove}
          />
        </div>
      </fieldset>
      <ToolButton
        icon={modelCommand('part.mesh').icon}
        label={props.selectedIsMesh ? COPY.editor.model.mesh.edit : COPY.editor.model.mesh.convert}
        shortcut={modelCommand('part.mesh').shortcut?.display}
        disabled={!props.hasSelection}
        onClick={props.onEditMesh}
        className="w-full"
      />
      <div className="grid grid-cols-2 gap-1">
        <ToolButton
          icon={modelCommand('build.mirror').icon}
          label={modelCommand('build.mirror').label}
          shortcut={modelCommand('build.mirror').shortcut?.display}
          active={props.mirrorX}
          onClick={props.onToggleMirror}
        />
        <ToolButton
          icon={modelCommand('build.snap-half').icon}
          label={modelCommand('build.snap-half').label}
          active={props.snapHalf}
          onClick={props.onToggleSnap}
        />
        <ToolButton
          icon={modelCommand('build.additive').icon}
          label={modelCommand('build.additive').label}
          shortcut={modelCommand('build.additive').shortcut?.display}
          active={props.partsAdditive}
          onClick={props.onTogglePartsAdditive}
        />
      </div>
    </aside>
  )
}
