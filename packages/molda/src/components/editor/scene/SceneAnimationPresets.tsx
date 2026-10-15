import { useId, useState } from 'react'
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
  const panelId = useId()
  const copy = COPY.scene
  return (
    // Prévia e parâmetros permanecem no painel direito, sem cobrir o palco.
    <section className="relative" aria-label={copy.animationPresetTitle}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        // Quebra em duas linhas no painel estreito em vez de cortar o nome.
        className="sz-tool-pill mld-pill-sun w-full py-2 text-sm leading-tight whitespace-normal"
        onClick={() => {
          if (open) workshop.requestTransition(() => setOpen(false))
          else setOpen(true)
        }}
      >
        <Sparkles aria-hidden="true" />
        {copy.animationPresetTitle}
      </button>
      {open && (
        <div
          id={panelId}
          className="mt-2 space-y-3 rounded-xl border border-mld-border bg-mld-bg p-2"
        >
          <p className="text-xs text-mld-muted">{copy.animationPresetHint}</p>
          <div className="flex flex-wrap gap-2">
            {(['bounce', 'sway', 'spin'] as const).map((kind) => (
              <Button
                key={kind}
                disabled={workshop.animationTarget === 'piece' && workshop.selected.length !== 1}
                onClick={() =>
                  workshop.requestTransition(() => {
                    setKind(kind)
                    preview.prepare({
                      kind,
                      name: copy.animationPresetNames[kind],
                      axis: kind === 'sway' ? 'z' : 'y',
                      duration: 2,
                      amount: kind === 'sway' ? 25 : 1,
                    })
                    if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
                      workshop.animation.play()
                  })
                }
              >
                {copy.animationPresetNames[kind]}
              </Button>
            ))}
          </div>
          <details>
            <summary className="min-h-11 cursor-pointer py-3 text-sm font-bold">
              Ajustar movimento
            </summary>
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault()
                const data = new FormData(event.currentTarget)
                try {
                  const options: SceneAnimationPresetOptions = {
                    kind,
                    name: String(data.get('name') ?? ''),
                    axis: data.get('axis') as SceneAnimationPresetOptions['axis'],
                    duration: sceneAnimationFormNumber(data, 'duration'),
                    amount: sceneAnimationFormNumber(data, 'amount'),
                  }
                  workshop.requestTransition(() => preview.prepare(options))
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
              <div key={kind} className="grid gap-2">
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
              <Button
                type="submit"
                disabled={workshop.animationTarget === 'piece' && workshop.selected.length !== 1}
                className="text-sm"
              >
                {copy.animationPresetPrepare}
              </Button>
            </form>
          </details>
          {preview.active && (
            <div className="space-y-2 rounded-lg border border-mld-accent p-3">
              <p role="status" className="text-sm">
                {copy.animationPresetReady}
              </p>
              <div className="grid grid-cols-2 gap-1">
                <Button className="px-2 text-xs" onClick={() => preview.adjust(1.25, 'duration')}>
                  Mais devagar
                </Button>
                <Button className="px-2 text-xs" onClick={() => preview.adjust(0.8, 'duration')}>
                  Mais rápido
                </Button>
                {preview.kind !== 'spin' && (
                  <>
                    <Button className="px-2 text-xs" onClick={() => preview.adjust(0.8, 'amount')}>
                      Menos intenso
                    </Button>
                    <Button className="px-2 text-xs" onClick={() => preview.adjust(1.25, 'amount')}>
                      Mais intenso
                    </Button>
                  </>
                )}
              </div>
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
    </section>
  )
}
