import type { JSX } from 'react'
import { COPY } from '../../../core/copy'
import type { RepeatDirection } from '../../../model/arrange'
import { ToolButton } from '../../ui/Button'
import { interactiveChipClass } from '../../ui/interaction'
import { Panel } from '../../ui/Panel'
import { Stepper } from '../../ui/Stepper'
import { bindModelCommand, modelCommand } from './commandRegistry'

const DIRECTIONS: readonly RepeatDirection[] = ['+x', '-x', '+y', '-y', '+z', '-z']

export interface RepeatAdjustmentValue {
  direction: RepeatDirection
  count: number
  gapSteps: number
}

export interface ArrangePanelProps {
  repeat: RepeatAdjustmentValue | null
  selectedCount: number
  movementLocked: boolean
  onFloor: () => void
  onCenter: () => void
  onAlign: (axis: 'x' | 'y' | 'z') => void
  onRepeat: (value: RepeatAdjustmentValue) => void
}

export function ArrangePanel({
  repeat,
  selectedCount,
  movementLocked,
  onFloor,
  onCenter,
  onAlign,
  onRepeat,
}: ArrangePanelProps): JSX.Element {
  const copy = COPY.editor.model.arrange
  const value = repeat ?? { direction: '+x', count: 1, gapSteps: 0 }
  const floorCommand = bindModelCommand('arrange.floor', {
    enabled: !movementLocked,
    disabledReason: copy.errors.locked,
    run: onFloor,
  })
  const centerCommand = bindModelCommand('arrange.center', {
    enabled: !movementLocked,
    disabledReason: copy.errors.locked,
    run: onCenter,
  })
  const repeatCommand = modelCommand('arrange.repeat')
  const alignEnabled = selectedCount >= 2 && !movementLocked
  const alignReason = movementLocked ? copy.errors.locked : copy.alignSelection
  const alignCommands = {
    x: bindModelCommand('arrange.align-x', {
      enabled: alignEnabled,
      disabledReason: alignReason,
      run: () => onAlign('x'),
    }),
    y: bindModelCommand('arrange.align-y', {
      enabled: alignEnabled,
      disabledReason: alignReason,
      run: () => onAlign('y'),
    }),
    z: bindModelCommand('arrange.align-z', {
      enabled: alignEnabled,
      disabledReason: alignReason,
      run: () => onAlign('z'),
    }),
  } as const
  const RepeatIcon = repeatCommand.icon
  return (
    <Panel title={copy.title} bodyClassName="flex flex-col gap-3 p-2">
      <div className="grid grid-cols-2 gap-1">
        <ToolButton
          icon={floorCommand.icon}
          label={floorCommand.label}
          disabled={!floorCommand.enabled}
          hint={!floorCommand.enabled ? floorCommand.disabledReason : undefined}
          onClick={floorCommand.run}
        />
        <ToolButton
          icon={centerCommand.icon}
          label={centerCommand.label}
          disabled={!centerCommand.enabled}
          hint={!centerCommand.enabled ? centerCommand.disabledReason : undefined}
          onClick={centerCommand.run}
        />
      </div>
      <fieldset>
        <legend className="mb-1 text-xs font-bold text-mld-muted">{copy.align}</legend>
        <div className="grid grid-cols-3 gap-1">
          {(['x', 'y', 'z'] as const).map((axis) => {
            const command = alignCommands[axis]
            return (
              <button
                key={axis}
                type="button"
                className={`${interactiveChipClass(false, 'px-2')} disabled:cursor-not-allowed disabled:opacity-50`}
                aria-label={command.label}
                title={!command.enabled ? command.disabledReason : command.label}
                disabled={!command.enabled}
                onClick={command.run}
              >
                {axis.toUpperCase()}
              </button>
            )
          })}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-1 flex items-center gap-1 text-xs font-bold text-mld-muted">
          <RepeatIcon aria-hidden="true" className="size-4" />
          {repeatCommand.label}
        </legend>
        <span className="mb-1 block text-[0.7rem] text-mld-muted">{copy.direction}</span>
        <div className="grid grid-cols-3 gap-1">
          {DIRECTIONS.map((direction) => (
            <button
              key={direction}
              type="button"
              className={interactiveChipClass(repeat?.direction === direction, 'px-2')}
              aria-pressed={repeat?.direction === direction}
              aria-label={copy.repeatDirection(copy.directions[direction])}
              onClick={() => onRepeat({ ...value, direction })}
            >
              {copy.directions[direction]}
            </button>
          ))}
        </div>
      </fieldset>
      {repeat ? (
        <div className="flex flex-col gap-1 border-t-2 border-mld-border pt-2">
          <Stepper
            label={copy.count}
            short="N"
            value={repeat.count}
            step={1}
            min={1}
            max={8}
            onChange={(count) => onRepeat({ ...repeat, count })}
          />
          <Stepper
            label={copy.gap}
            short="↔"
            value={repeat.gapSteps}
            step={1}
            min={0}
            max={16}
            onChange={(gapSteps) => onRepeat({ ...repeat, gapSteps })}
          />
        </div>
      ) : null}
    </Panel>
  )
}
