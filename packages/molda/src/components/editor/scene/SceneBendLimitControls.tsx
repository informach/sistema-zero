import { useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import { readSceneBendLimit, type SceneBendLimit } from '../../../scene/bendLimit'
import { requireScene, SceneValidationError } from '../../../scene/validation'
import { Button } from '../../ui/Button'
import { SCENE_APPEARANCE_FIELD as field } from './sceneAppearanceForm'

export function SceneBendLimitControls({
  value,
  disabled,
  dirty,
  onEditing,
  onApply,
}: {
  value: SceneBendLimit | undefined
  disabled: boolean
  dirty: boolean
  onEditing: (editing: boolean) => void
  onApply: (value: SceneBendLimit | null) => boolean
}) {
  const copy = COPY.scene.bendLimit,
    form = useRef<HTMLFormElement>(null),
    [error, setError] = useState<string | null>(null)
  return (
    <details className="rounded-lg border border-mld-border px-2">
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold">
        {copy.title}
      </summary>
      <form
        ref={form}
        className="space-y-3 pb-3"
        onChange={() => {
          if (disabled) return
          setError(null)
          onEditing(true)
        }}
        onSubmit={(event) => {
          event.preventDefault()
          if (disabled) return
          try {
            const data = new FormData(event.currentTarget),
              read = (name: string) => {
                const value = data.get(name)
                requireScene(
                  typeof value === 'string' && value.trim() !== '',
                  name,
                  COPY.scene.invalidNumber,
                )
                return Number(value)
              },
              value = readSceneBendLimit({ min: read('bendMin'), max: read('bendMax') })
            if (onApply(value)) {
              onEditing(false)
              setError(null)
            }
          } catch (error) {
            setError(
              error instanceof SceneValidationError ? error.message : COPY.scene.commandFailed,
            )
          }
        }}
      >
        <p className="text-xs text-mld-muted">{copy.hint}</p>
        <p className="text-sm">{value ? copy.saved(value.min, value.max) : copy.unlimited}</p>
        <fieldset disabled={disabled} className="space-y-3">
          <legend className="sr-only">{copy.title}</legend>
          <div className="grid grid-cols-2 gap-2">
            {(['min', 'max'] as const).map((kind) => (
              <label key={kind} className="space-y-1 text-xs">
                <span>{copy[kind]}</span>
                <input
                  name={kind === 'min' ? 'bendMin' : 'bendMax'}
                  type="number"
                  min={0}
                  max={180}
                  step="any"
                  required
                  className={field}
                  defaultValue={value?.[kind] ?? (kind === 'min' ? 0 : 180)}
                />
              </label>
            ))}
          </div>
          <p className="text-xs text-mld-muted">{copy.scope}</p>
          <Button className="w-full text-sm" type="submit">
            {copy.save}
          </Button>
          <Button
            className="w-full text-sm"
            disabled={!value}
            onClick={() => {
              if (onApply(null)) onEditing(false)
            }}
          >
            {copy.remove}
          </Button>
          {dirty && (
            <Button
              className="w-full text-sm"
              onClick={() => {
                form.current?.reset()
                setError(null)
                onEditing(false)
              }}
            >
              {copy.cancel}
            </Button>
          )}
        </fieldset>
        {dirty && (
          <p role="status" className="text-xs text-mld-warn">
            {copy.dirty}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-mld-danger">
            {error}
          </p>
        )}
      </form>
    </details>
  )
}
