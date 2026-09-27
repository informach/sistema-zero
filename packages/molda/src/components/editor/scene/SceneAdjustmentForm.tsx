import { COPY } from '../../../core/copy'
import type { Vec3 } from '../../../core/model'
import { SceneVectorForm } from './SceneVectorForm'
import type { SceneAdjustment } from './sceneAdjustment'

export function SceneAdjustmentForm({
  mode,
  disabled,
  onApply,
}: {
  mode: SceneAdjustment
  disabled: boolean
  onApply(values: Vec3): void
}) {
  const copy = COPY.scene
  return (
    <SceneVectorForm
      label={copy[mode]}
      hint={mode === 'pivot' ? copy.pivotHint : mode === 'scale' ? copy.scaleHint : copy.axesHint}
      values={mode === 'scale' ? [1, 1, 1] : [0, 0, 0]}
      disabled={disabled}
      min={mode === 'scale' ? Number.MIN_VALUE : undefined}
      onApply={onApply}
    />
  )
}
