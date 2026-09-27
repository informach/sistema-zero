/**
 * A bancada contextual de EDITAR MALHA. Os comandos têm nome visível e rolam
 * horizontalmente quando a tela é estreita; os ajustes ficam numa bandeja larga
 * própria, nunca espremidos na antiga coluna de 112 px.
 */
import { clsx } from 'clsx'
import { type JSX, useId, useState } from 'react'
import { COPY } from '../../../core/copy'
import { MESH_SELECTION_ACTIONS, type MeshSelectionAction } from '../../../model/meshSelectionGraph'
import type { MeshExtrudeDirection } from '../../../model/meshTools'
import type { MeshSelectMode } from '../../../state/sessionStore'
import { Button, ToolButton } from '../../ui/Button'
import { X } from '../../ui/icons'
import { Stepper } from '../../ui/Stepper'
import {
  bindModelCommand,
  MESH_ACTION_COMMAND,
  MESH_MODE_COMMAND,
  type ModelCommandState,
  type ResolvedModelCommand,
} from './commandRegistry'
import { contextualMeshCommands, type MeshCommandId, type MeshCommandState } from './meshCommands'

const MODES: MeshSelectMode[] = ['vertex', 'edge', 'face']
const DIRECTIONS: MeshExtrudeDirection[] = ['auto', 'x', '-x', 'y', '-y', 'z', '-z']

interface ValueAdjust {
  kind: 'value'
  toolLabel: string
  label: string
  short?: string
  value: number
  step: number
  min: number
  max: number
  onValue: (value: number) => void
  onClose: () => void
}

interface LoopCutAdjust {
  kind: 'loop-cut'
  cuts: number
  position: number
  onCuts: (value: number) => void
  onPosition: (value: number) => void
  onClose: () => void
}

interface ExtrudeAdjust extends Omit<ValueAdjust, 'kind'> {
  kind: 'extrude'
  direction: MeshExtrudeDirection
  directionEnabled: Record<MeshExtrudeDirection, boolean>
  onDirection: (direction: MeshExtrudeDirection) => void
}

export type MeshAdjust = ValueAdjust | LoopCutAdjust | ExtrudeAdjust

export interface MeshToolboxProps {
  mode: MeshSelectMode
  onMode: (mode: MeshSelectMode) => void
  additive: boolean
  onToggleAdditive: () => void
  /** Quantos itens do modo atual estão escolhidos. */
  selectedCount: number
  commands: Record<MeshCommandId, MeshCommandState>
  selectionState: (action: MeshSelectionAction) => ModelCommandState
  onDeleteSelection: () => void
  onDone: () => void
}

function NamedCommand({ command }: { command: ResolvedModelCommand }): JSX.Element {
  const Icon = command.icon
  const title = `${command.label}${command.shortcut ? ` (${command.shortcut.display})` : ''}${command.disabledReason ? `. ${command.disabledReason}` : ''}`
  return (
    <Button
      variant="outline"
      aria-pressed={command.active}
      disabled={!command.enabled}
      title={title}
      onClick={command.run}
      className={clsx(
        'shrink-0 px-3 text-sm',
        command.active && 'mld-tool-active border-mld-accent bg-mld-accent text-mld-accent-fg',
      )}
    >
      <Icon aria-hidden="true" className="size-4" />
      <span>{command.label}</span>
    </Button>
  )
}

/** Barra horizontal acima do palco: modos, ações contextuais e saída. */
export function MeshToolbox(props: MeshToolboxProps): JSX.Element {
  const copy = COPY.editor.model.mesh
  const [selectionOpen, setSelectionOpen] = useState(false)
  const selectionId = useId()
  const commands = contextualMeshCommands(props.mode, props.commands)
  return (
    <aside
      aria-label={copy.toolbox}
      className="shrink-0 border-b-2 border-mld-border bg-mld-surface"
    >
      <div className="mld-scroll-x flex items-center gap-2 overflow-x-auto px-2 py-2">
        <fieldset className="flex shrink-0 items-center gap-1">
          <legend className="sr-only">{copy.toolbox}</legend>
          {MODES.map((mode) => (
            <NamedCommand
              key={mode}
              command={bindModelCommand(MESH_MODE_COMMAND[mode], {
                enabled: true,
                active: props.mode === mode,
                run: () => props.onMode(mode),
              })}
            />
          ))}
        </fieldset>
        <span aria-hidden="true" className="h-8 w-0.5 shrink-0 bg-mld-border" />
        <NamedCommand
          command={bindModelCommand('mesh.additive', {
            enabled: true,
            active: props.additive,
            run: props.onToggleAdditive,
          })}
        />
        <Button
          variant="outline"
          aria-expanded={selectionOpen}
          aria-controls={selectionId}
          onClick={() => setSelectionOpen((open) => !open)}
          className="shrink-0 text-sm"
        >
          {copy.selection.title}
        </Button>
        <fieldset className="flex shrink-0 items-center gap-1">
          <legend className="sr-only">{copy.toolsLegend}</legend>
          {commands.map((command) => (
            <NamedCommand
              key={command.id}
              command={bindModelCommand(MESH_ACTION_COMMAND[command.id], {
                enabled: command.enabled,
                disabledReason: command.enabled ? undefined : command.disabledMessage,
                run: command.run,
              })}
            />
          ))}
        </fieldset>
        <span aria-hidden="true" className="h-8 w-0.5 shrink-0 bg-mld-border" />
        <NamedCommand
          command={bindModelCommand('mesh.delete', {
            enabled: props.selectedCount > 0,
            disabledReason: copy.nothingSelected,
            run: props.onDeleteSelection,
          })}
        />
        <NamedCommand
          command={bindModelCommand('mesh.done', {
            enabled: true,
            run: props.onDone,
          })}
        />
      </div>
      {selectionOpen && (
        <fieldset
          id={selectionId}
          className="flex flex-wrap gap-2 border-t border-mld-border px-3 py-2"
        >
          <legend className="sr-only">{copy.selection.title}</legend>
          <p className="w-full text-xs text-mld-text-soft">{copy.selection.hint}</p>
          {MESH_SELECTION_ACTIONS.filter(
            (action) => props.mode === 'edge' || (action !== 'ring' && action !== 'loop'),
          ).map((action) => (
            <NamedCommand
              key={action}
              command={bindModelCommand(`mesh.select.${action}`, props.selectionState(action))}
            />
          ))}
        </fieldset>
      )}
      <p className="px-3 pb-2 text-xs text-mld-text-soft" role="status">
        <strong className="text-mld-text">
          {props.selectedCount > 0
            ? copy.selected(props.selectedCount, props.mode)
            : copy.nothingSelected}
        </strong>{' '}
        · {copy.modeHints[props.mode]}
      </p>
    </aside>
  )
}

/** Bandeja larga abaixo do canvas e acima dos controles de vista. */
export function MeshAdjustmentTray({ adjust }: { adjust: MeshAdjust | null }): JSX.Element | null {
  if (!adjust) return null
  const copy = COPY.editor.model.mesh
  return (
    <section
      aria-label={copy.adjust}
      className="shrink-0 border-t-2 border-mld-border bg-mld-bg px-3 py-2"
    >
      <div className="mb-1 flex min-h-11 items-center justify-between gap-3">
        <div>
          <strong className="mld-display text-sm uppercase tracking-wide text-mld-text">
            {copy.adjust}
          </strong>
          <p className="text-xs text-mld-muted">
            {adjust.kind === 'loop-cut' ? copy.tools.loopCut : adjust.toolLabel}
          </p>
        </div>
        <ToolButton icon={X} label={copy.closeAdjust} onClick={adjust.onClose} />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        {adjust.kind === 'loop-cut' ? (
          <>
            <Stepper
              label={copy.cuts}
              short="×"
              value={adjust.cuts}
              step={1}
              min={1}
              max={8}
              onChange={adjust.onCuts}
            />
            {adjust.cuts === 1 ? (
              <Stepper
                label={copy.cutPosition}
                short="%"
                value={adjust.position}
                step={5}
                min={10}
                max={90}
                onChange={adjust.onPosition}
              />
            ) : null}
          </>
        ) : (
          <Stepper
            label={adjust.label}
            short={adjust.short}
            value={adjust.value}
            step={adjust.step}
            min={adjust.min}
            max={adjust.max}
            onChange={adjust.onValue}
          />
        )}
        {adjust.kind === 'extrude' ? (
          <fieldset className="min-w-0">
            <legend className="mb-1 text-xs font-bold text-mld-muted">{copy.direction}</legend>
            <div className="mld-scroll-x flex max-w-full gap-1 overflow-x-auto pb-1">
              {DIRECTIONS.map((direction) => (
                <Button
                  key={direction}
                  variant="outline"
                  aria-pressed={adjust.direction === direction}
                  disabled={!adjust.directionEnabled[direction]}
                  onClick={() => adjust.onDirection(direction)}
                  className={clsx(
                    'shrink-0 px-3 text-sm',
                    adjust.direction === direction &&
                      'mld-tool-active border-mld-accent bg-mld-accent text-mld-accent-fg',
                  )}
                >
                  {copy.directions[direction]}
                </Button>
              ))}
            </div>
          </fieldset>
        ) : null}
      </div>
    </section>
  )
}
