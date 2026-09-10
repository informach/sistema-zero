import { useId, useState } from 'react'
import { COPY } from '../../../core/copy'
import { Button } from '../../ui/Button'

export function SceneBevel({ count, onApply }: { count: number; onApply(depth: number): void }) {
  const prefix = useId()
  const [draft, setDraft] = useState('0.1')
  const depth = Number(draft)
  const valid = draft.trim() !== '' && Number.isFinite(depth) && depth > 0
  return (
    <details>
      <summary className="min-h-11 cursor-pointer py-3 text-sm">{COPY.scene.bevel}</summary>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          if (valid && count > 0) onApply(depth)
        }}
      >
        <p id={`${prefix}-hint`} className="text-xs text-mld-muted">
          {COPY.scene.bevelHint}
        </p>
        <label className="block space-y-1 text-sm">
          <span>{COPY.scene.bevelDepth}</span>
          <input
            name="bevelDepth"
            type="number"
            required
            min={Number.MIN_VALUE}
            step="any"
            value={draft}
            aria-invalid={!valid}
            aria-describedby={`${prefix}-hint`}
            onChange={(event) => setDraft(event.target.value)}
            className="min-h-11 w-full rounded-lg border border-mld-border bg-mld-bg px-3 text-mld-text focus-visible:outline-2 focus-visible:outline-mld-accent"
          />
        </label>
        <Button type="submit" disabled={!valid || count < 1} className="w-full text-sm">
          {COPY.scene.applyBevel}
        </Button>
      </form>
    </details>
  )
}
