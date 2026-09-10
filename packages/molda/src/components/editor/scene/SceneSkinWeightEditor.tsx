import { useEffect, useMemo, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import {
  SCENE_SKIN_LIMITS,
  type SceneSkinBinding,
  type SceneSkinInfluence,
} from '../../../scene/skin'
import { SceneValidationError } from '../../../scene/validation'
import { Button } from '../../ui/Button'
import {
  editSceneSkinWeightDraftRow,
  normalizeSceneSkinWeightDraft,
  readSceneSkinWeightDraft,
  type SceneSkinWeightDraftRow,
  sceneSkinWeightDraft,
  sceneSkinWeightDraftRow,
} from './sceneSkinWeightDraft'

export interface SceneSkinWeightEditorProps {
  sourceKey: string
  skin: SceneSkinBinding
  vertexIds: readonly string[]
  joints: readonly { id: string; name: string }[]
  disabled: boolean
  onApply(mix: SceneSkinInfluence[]): boolean
}
interface Review {
  mix: SceneSkinInfluence[]
  accepted: boolean
}

/** The parent keys this draft by source revision and selected point IDs. No live editor preview. */
export function SceneSkinWeightEditor({
  skin,
  vertexIds,
  joints,
  disabled,
  onApply,
}: SceneSkinWeightEditorProps) {
  const original = useMemo(() => sceneSkinWeightDraft(skin, vertexIds), [skin, vertexIds]),
    [rows, setRows] = useState(original.rows),
    [review, setReview] = useState<Review | null>(null),
    [message, setMessage] = useState<string | null>(null),
    pending = useRef<Review | null>(null),
    active = useRef(false),
    restoreFocus = useRef(false),
    title = useRef<HTMLHeadingElement>(null),
    reviewing = review !== null,
    copy = COPY.scene.skinWeights

  useEffect(() => {
    active.current = true
    const interrupt = () => {
      pending.current = null
      setReview(null)
      setRows(original.rows)
      setMessage(copy.interrupted)
    }
    const hidden = () => {
      if (document.hidden) interrupt()
    }
    window.addEventListener('blur', interrupt)
    document.addEventListener('visibilitychange', hidden)
    document.addEventListener('webglcontextlost', interrupt, true)
    return () => {
      active.current = false
      pending.current = null
      window.removeEventListener('blur', interrupt)
      document.removeEventListener('visibilitychange', hidden)
      document.removeEventListener('webglcontextlost', interrupt, true)
    }
  }, [original, copy.interrupted])
  useEffect(() => {
    if (!disabled) return
    pending.current = null
    setReview(null)
    setRows(original.rows)
  }, [disabled, original])
  useEffect(() => {
    if (reviewing) title.current?.focus()
  }, [reviewing])

  function cancelReview() {
    restoreFocus.current = true
    pending.current = null
    setReview(null)
  }

  function change(next: SceneSkinWeightDraftRow[]) {
    if (!active.current || disabled) return
    pending.current = null
    setReview(null)
    setRows(next)
    setMessage(null)
  }
  function report(error: unknown) {
    setMessage(error instanceof SceneValidationError ? error.message : copy.failed)
  }
  function normalize(equal: boolean) {
    try {
      change(normalizeSceneSkinWeightDraft(rows, equal))
    } catch (error) {
      report(error)
    }
  }
  function prepare() {
    if (!active.current || disabled || !vertexIds.length || document.hidden) return
    try {
      const next: Review = { mix: readSceneSkinWeightDraft(rows), accepted: false }
      pending.current = next
      setReview(next)
      setMessage(null)
    } catch (error) {
      report(error)
    }
  }
  function confirm() {
    if (
      !active.current ||
      disabled ||
      !review ||
      pending.current !== review ||
      document.hidden ||
      (original.mixed && !review.accepted)
    )
      return
    pending.current = null
    setReview(null)
    if (!onApply(review.mix)) setMessage(copy.changed)
  }

  if (!vertexIds.length) return <p className="text-sm text-mld-muted">{copy.choosePoints}</p>
  return (
    <section
      aria-label={copy.title}
      className="space-y-3"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && pending.current) {
          event.preventDefault()
          cancelReview()
        }
      }}
    >
      <p className="text-sm text-mld-muted">{original.mixed ? copy.mixed : copy.same}</p>
      <fieldset disabled={disabled} className="space-y-2">
        <legend className="text-sm font-bold">{copy.chooseJoints}</legend>
        <p className="text-xs text-mld-muted">{copy.limit}</p>
        <div className="max-h-44 overflow-y-auto rounded-lg border border-mld-border">
          {joints.map((joint) => {
            const checked = rows.some((row) => row.jointId === joint.id)
            return (
              <label
                key={joint.id}
                className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  name="weight-joints"
                  value={joint.id}
                  checked={checked}
                  disabled={!checked && rows.length >= SCENE_SKIN_LIMITS.influences}
                  onChange={() =>
                    change(
                      checked
                        ? rows.filter((row) => row.jointId !== joint.id)
                        : rows.length < SCENE_SKIN_LIMITS.influences
                          ? [...rows, sceneSkinWeightDraftRow(joint.id, rows.length ? 0 : 1)]
                          : rows,
                    )
                  }
                  className="size-5 shrink-0 accent-mld-accent"
                />
                <span className="break-words">{joint.name}</span>
              </label>
            )
          })}
        </div>
        {rows.map((row, i) => (
          <label key={row.jointId} className="flex flex-col gap-1 text-sm">
            {copy.percent(joints.find((joint) => joint.id === row.jointId)?.name ?? row.jointId)}
            <input
              name={`weight-${row.jointId}`}
              type="number"
              min="0"
              max="100"
              step="any"
              value={row.text}
              aria-invalid={row.value === null}
              onChange={(event) =>
                change(
                  rows.map((entry, index) =>
                    index === i ? editSceneSkinWeightDraftRow(entry, event.target.value) : entry,
                  ),
                )
              }
              className="min-h-11 w-full rounded-lg border border-mld-border bg-mld-bg px-3 text-mld-text focus-visible:outline-2 focus-visible:outline-mld-accent"
            />
          </label>
        ))}
        <p className="text-xs text-mld-muted">{copy.displayHint}</p>
        <div className="flex flex-col gap-2">
          <Button className="text-sm" disabled={!rows.length} onClick={() => normalize(false)}>
            {copy.normalize}
          </Button>
          <Button className="text-sm" disabled={!rows.length} onClick={() => normalize(true)}>
            {copy.equal}
          </Button>
          <Button className="text-sm" onClick={() => change(original.rows)}>
            {copy.reset}
          </Button>
          {!review && (
            <Button
              ref={(element) => {
                if (element && restoreFocus.current) {
                  restoreFocus.current = false
                  element.focus()
                }
              }}
              className="text-sm"
              disabled={!rows.length}
              onClick={prepare}
            >
              {copy.review}
            </Button>
          )}
        </div>
      </fieldset>
      {message && (
        <p role="alert" className="text-sm text-mld-danger">
          {message}
        </p>
      )}
      {review && (
        <div className="space-y-3 rounded-xl border border-mld-border bg-mld-bg p-3">
          <h4 ref={title} tabIndex={-1} className="text-sm font-bold">
            {copy.reviewing}
          </h4>
          <p className="text-sm">{copy.impact(vertexIds.length)}</p>
          {original.mixed && (
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
              <input
                name="accept-mixed-weights"
                type="checkbox"
                checked={review.accepted}
                className="size-5 shrink-0 accent-mld-accent"
                onChange={(event) => {
                  if (pending.current !== review) return
                  const next = { ...review, accepted: event.target.checked }
                  pending.current = next
                  setReview(next)
                }}
              />
              {copy.acceptMixed}
            </label>
          )}
          <p className="text-xs text-mld-muted">{copy.undo}</p>
          <Button
            className="w-full text-sm"
            variant="primary"
            disabled={disabled || (original.mixed && !review.accepted)}
            onClick={confirm}
          >
            {copy.apply}
          </Button>
          <Button className="w-full text-sm" onClick={cancelReview}>
            {copy.cancel}
          </Button>
        </div>
      )}
    </section>
  )
}
