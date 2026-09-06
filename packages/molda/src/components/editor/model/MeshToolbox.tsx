/**
 * A caixa de ferramentas do sub-modo EDITAR MALHA (no lugar da do Montar
 * enquanto uma peça de malha está aberta): o que um toque escolhe (Pontos,
 * Arestas, Faces), "Somar à seleção" (o Shift para o toque), as ferramentas de
 * forma do modo ATIVO, Apagar seleção e Pronto. Depois de uma operação contínua,
 * o painel "Ajustar" a reexecuta sobre o "antes" (um passo só no desfazer).
 */
import type { JSX } from 'react'
import { COPY } from '../../../core/copy'
import type { MeshSelectMode } from '../../../state/sessionStore'
import { ToolButton } from '../../ui/Button'
import { Stepper } from '../../ui/Stepper'
import {
  bindModelCommand,
  MESH_ACTION_COMMAND,
  MESH_MODE_COMMAND,
  modelCommand,
} from './commandRegistry'
import { contextualMeshCommands, type MeshCommandId, type MeshCommandState } from './meshCommands'

const MODES: MeshSelectMode[] = ['vertex', 'edge', 'face']

export interface MeshAdjust {
  label: string
  short?: string
  value: number
  step: number
  min: number
  max: number
  onValue: (value: number) => void
}

export interface MeshToolboxProps {
  mode: MeshSelectMode
  onMode: (mode: MeshSelectMode) => void
  additive: boolean
  onToggleAdditive: () => void
  /** Quantos itens do modo atual estão escolhidos (o rótulo da seleção). */
  selectedCount: number
  commands: Record<MeshCommandId, MeshCommandState>
  /** O "Ajustar" da última ação contínua (some quando qualquer outra coisa muda). */
  adjust: MeshAdjust | null
  onDeleteSelection: () => void
  onDone: () => void
}

export function MeshToolbox(props: MeshToolboxProps): JSX.Element {
  const copy = COPY.editor.model.mesh
  const commands = contextualMeshCommands(props.mode, props.commands)
  return (
    <aside
      aria-label={copy.toolbox}
      className="mld-scroll-y flex w-28 shrink-0 flex-col gap-2 overflow-y-auto border-r-2 border-mld-border bg-mld-surface p-2"
    >
      <fieldset className="flex flex-col gap-1">
        <legend className="mld-display px-1 text-[0.65rem] uppercase tracking-wide text-mld-muted">
          {copy.toolbox}
        </legend>
        <div className="grid grid-cols-2 gap-1">
          {MODES.map((mode) =>
            (() => {
              const command = bindModelCommand(MESH_MODE_COMMAND[mode], {
                enabled: true,
                active: props.mode === mode,
                run: () => props.onMode(mode),
              })
              return (
                <ToolButton
                  key={mode}
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
            icon={modelCommand('mesh.additive').icon}
            label={modelCommand('mesh.additive').label}
            shortcut={modelCommand('mesh.additive').shortcut?.display}
            active={props.additive}
            onClick={props.onToggleAdditive}
          />
        </div>
      </fieldset>
      <p className="px-1 text-xs font-bold text-mld-muted">
        {props.selectedCount > 0
          ? copy.selected(props.selectedCount, props.mode)
          : copy.nothingSelected}
      </p>
      <fieldset className="flex flex-col gap-1">
        <legend className="sr-only">{copy.toolsLegend}</legend>
        <div className="grid grid-cols-2 gap-1">
          {commands.map((command) =>
            (() => {
              const resolved = bindModelCommand(MESH_ACTION_COMMAND[command.id], {
                enabled: command.enabled,
                disabledReason: command.disabledMessage,
                run: command.run,
              })
              return (
                <ToolButton
                  key={command.id}
                  icon={resolved.icon}
                  label={resolved.label}
                  shortcut={resolved.shortcut?.display}
                  disabled={!resolved.enabled}
                  hint={!resolved.enabled ? resolved.disabledReason : undefined}
                  onClick={resolved.run}
                />
              )
            })(),
          )}
        </div>
      </fieldset>
      {props.adjust ? (
        <section
          aria-label={copy.adjust}
          className="flex flex-col gap-1 rounded-xl border-2 border-mld-border bg-mld-bg p-1"
        >
          <span className="px-1 text-[0.65rem] font-bold uppercase tracking-wide text-mld-muted">
            {copy.adjust}
          </span>
          <Stepper
            label={props.adjust.label}
            short={props.adjust.short}
            value={props.adjust.value}
            step={props.adjust.step}
            min={props.adjust.min}
            max={props.adjust.max}
            onChange={props.adjust.onValue}
          />
        </section>
      ) : null}
      <div className="grid grid-cols-2 gap-1">
        <ToolButton
          icon={modelCommand('mesh.delete').icon}
          label={modelCommand('mesh.delete').label}
          shortcut={modelCommand('mesh.delete').shortcut?.display}
          disabled={props.selectedCount === 0}
          onClick={props.onDeleteSelection}
        />
        <ToolButton
          icon={modelCommand('mesh.done').icon}
          label={modelCommand('mesh.done').label}
          shortcut={modelCommand('mesh.done').shortcut?.display}
          onClick={props.onDone}
        />
      </div>
      <p className="px-1 text-xs text-mld-text-soft">{copy.modeHints[props.mode]}</p>
    </aside>
  )
}
