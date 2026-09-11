import { useState } from 'react'
import { COPY } from '../../../core/copy'
import type { SceneAnimationPresetOptions } from '../../../scene/animationPresets'
import { Button } from '../../ui/Button'
import { Sparkles } from '../../ui/icons'
import { sceneAnimationFormNumber } from './sceneAnimationForm'
import { SCENE_APPEARANCE_FIELD as field } from './sceneAppearanceForm'
import { useSceneAnimationPreset } from './useSceneAnimationPreset'
import type { useSceneWorkshop } from './useSceneWorkshop'

export function SceneAnimationPresets({
  workshop,
}: {
  workshop: ReturnType<typeof useSceneWorkshop>
}) {
  const preview = useSceneAnimationPreset(workshop)
  const [kind, setKind] = useState<SceneAnimationPresetOptions['kind']>('bounce')
  const [open, setOpen] = useState(false)
  const copy = COPY.scene
  return (
    // Na barra da aba (a tela-modelo do Animar): a pílula amarela no fim da barra, e o formulário
    // num painel que DESCE sobre o palco, sem empurrar a oficina para baixo.
    <details
      className="relative"
      onToggle={(event) => {
        setOpen(event.currentTarget.open)
        if (!event.currentTarget.open) preview.cancel()
      }}
    >
      <summary className="sz-tool-pill mld-pill-sun list-none text-sm [&::-webkit-details-marker]:hidden">
        <Sparkles aria-hidden="true" />
        {copy.animationPresetTitle}
      </summary>
      {open && (
        <div className="mld-drop top-full right-0 mt-2 max-h-[70vh] w-[min(32rem,calc(100vw-1.5rem))] space-y-3 overflow-y-auto p-3">
          <p className="text-xs text-mld-muted">{copy.animationPresetHint}</p>
          <form
            className="space-y-3"
            onChange={preview.cancel}
            onSubmit={(event) => {
              event.preventDefault()
              const data = new FormData(event.currentTarget)
              try {
                preview.prepare({
                  kind,
                  name: String(data.get('name') ?? ''),
                  axis: data.get('axis') as SceneAnimationPresetOptions['axis'],
                  duration: sceneAnimationFormNumber(data, 'duration'),
                  amount: sceneAnimationFormNumber(data, 'amount'),
                })
              } catch (error) {
                workshop.animation.reportError(error)
              }
            }}
          >
            <label className="block space-y-1 text-xs">
              <span>{copy.animationPresetKind}</span>
              <select
                name="presetKind"
                value={kind}
                onChange={(event) => setKind(event.target.value as typeof kind)}
                className={field}
              >
                {(['bounce', 'sway', 'spin'] as const).map((kind) => (
                  <option key={kind} value={kind}>
                    {copy.animationPresetNames[kind]}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs text-mld-muted">{copy.animationPresetHints[kind]}</p>
            <div key={kind} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <label className="space-y-1 text-xs">
                <span>{copy.animationName}</span>
                <input
                  name="name"
                  defaultValue={copy.animationPresetNames[kind]}
                  maxLength={48}
                  required
                  className={field}
                />
              </label>
              <label className="space-y-1 text-xs">
                <span>{copy.animationDuration}</span>
                <input
                  name="duration"
                  type="number"
                  min={Number.MIN_VALUE}
                  max={600}
                  step="any"
                  defaultValue="2"
                  required
                  className={field}
                />
              </label>
              <label className="space-y-1 text-xs">
                <span>
                  {kind === 'bounce'
                    ? copy.animationPresetDistance
                    : kind === 'sway'
                      ? copy.animationPresetAngle
                      : copy.animationPresetTurns}
                </span>
                <input
                  name="amount"
                  type="number"
                  min={kind === 'bounce' ? -1000 : kind === 'sway' ? -90 : -10}
                  max={kind === 'bounce' ? 1000 : kind === 'sway' ? 90 : 10}
                  step={kind === 'spin' ? 1 : 'any'}
                  defaultValue={kind === 'sway' ? 25 : 1}
                  required
                  className={field}
                />
              </label>
              <label className="space-y-1 text-xs">
                <span>{copy.animationPresetAxis}</span>
                <select name="axis" defaultValue={kind === 'sway' ? 'z' : 'y'} className={field}>
                  {(['x', 'y', 'z'] as const).map((axis) => (
                    <option key={axis} value={axis}>
                      {copy.animationPoseAxes[axis]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <Button type="submit" disabled={!workshop.selected.length} className="text-sm">
              {copy.animationPresetPrepare}
            </Button>
          </form>
          {preview.active && (
            <div className="space-y-2 rounded-lg border border-mld-accent p-3">
              <p role="status" className="text-sm">
                {copy.animationPresetReady}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  disabled={!preview.canConfirm}
                  className="text-sm"
                  onClick={() => preview.confirm()}
                >
                  {copy.animationPresetConfirm}
                </Button>
                <Button className="text-sm" onClick={preview.cancel}>
                  {copy.animationPresetCancel}
                </Button>
              </div>
            </div>
          )}
          {preview.error && (
            <p role="alert" className="text-sm text-mld-danger">
              {preview.error}
            </p>
          )}
        </div>
      )}
    </details>
  )
}
