import { useSyncExternalStore } from 'react'
import { COPY } from '../../../core/copy'
import type { SceneSkinPaintSettings } from '../../../scene/skinPaint'
import type { SceneSkinPaintSession } from '../../../state/sceneSkinPaintSession'
import { Button } from '../../ui/Button'

export type SceneSkinBrushMode = SceneSkinPaintSettings['mode'] | 'off'

/** Workshop strip: platform type/tokens, quiet borders, 4 px spacing and explicit text beside color. */
export function SceneSkinPaintControls({
  session,
  mode,
  radius,
  strength,
  enabled,
  onMode,
  onRadius,
  onStrength,
}: {
  session: SceneSkinPaintSession
  mode: SceneSkinBrushMode
  radius: string
  strength: number
  enabled: boolean
  onMode(mode: SceneSkinBrushMode): void
  onRadius(radius: string): void
  onStrength(strength: number): void
}) {
  const copy = COPY.scene.skinPaint,
    snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot),
    stats = snapshot.stats,
    validRadius = Number.isFinite(Number(radius)) && Number(radius) > 0
  return (
    <fieldset className="space-y-2 border-b border-mld-border bg-mld-surface px-3 py-2">
      <legend className="sr-only">{copy.title}</legend>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-mld-text">{copy.title}</span>
        {(['off', 'add', 'subtract'] as const).map((value) => (
          <Button
            key={value}
            variant={mode === value ? 'primary' : 'ghost'}
            className="text-sm"
            aria-pressed={mode === value}
            disabled={!enabled && value !== 'off'}
            onClick={() => onMode(value)}
          >
            {copy[value]}
          </Button>
        ))}
      </div>
      {mode !== 'off' && (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className="flex min-h-11 items-center gap-2 text-sm">
              {copy.radius}
              <input
                name="skinPaintRadius"
                type="number"
                min={Number.MIN_VALUE}
                step="any"
                value={radius}
                aria-invalid={!validRadius}
                onChange={(event) => onRadius(event.target.value)}
                className="min-h-11 w-24 rounded-lg border border-mld-border bg-mld-bg px-3 text-mld-text focus-visible:outline-2 focus-visible:outline-mld-accent"
              />
            </label>
            <div className="flex min-h-11 flex-wrap items-center gap-2 text-sm">
              <label className="flex min-h-11 items-center gap-2">
                {copy.strength}
                <input
                  name="skinPaintStrength"
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={strength}
                  onChange={(event) => onStrength(event.target.valueAsNumber)}
                  className="min-h-11 w-32 accent-mld-accent"
                />
              </label>
              <span className="w-10 text-right tabular-nums">{strength}%</span>
            </div>
          </div>
          {!validRadius && (
            <p role="alert" className="text-sm text-mld-danger">
              {copy.radiusInvalid}
            </p>
          )}
          <p className="text-xs text-mld-muted">{copy.reachHint}</p>
        </>
      )}
      <div
        role="status"
        aria-live={snapshot.phase === 'painting' ? 'off' : 'polite'}
        className="text-sm text-mld-muted"
      >
        {snapshot.phase === 'painting'
          ? copy.painting(stats?.changed ?? 0)
          : snapshot.phase === 'applied'
            ? copy.applied(stats?.changed ?? 0)
            : snapshot.phase === 'cancelled'
              ? copy.cancelled
              : null}
      </div>
      {(snapshot.phase === 'painting' || snapshot.phase === 'applied') &&
        stats &&
        (['influence-limit', 'no-recipient', 'precision'] as const).map(
          (reason) =>
            stats.refused[reason] > 0 && (
              <p key={reason} className="text-sm text-mld-warn">
                {copy.refusals[reason](stats.refused[reason])}
              </p>
            ),
        )}
      {snapshot.error && (
        <p role="alert" className="text-sm text-mld-danger">
          {snapshot.error}
        </p>
      )}
    </fieldset>
  )
}
