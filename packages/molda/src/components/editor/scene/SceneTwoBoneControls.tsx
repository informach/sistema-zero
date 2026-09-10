import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { COPY } from '../../../core/copy'
import type { Vec3 } from '../../../core/model'
import { setSceneBendLimit } from '../../../scene/bendLimitCommands'
import type { ModelSceneNode } from '../../../scene/document'
import { evaluateSceneNodeFlags } from '../../../scene/evaluate'
import { selectSceneSubtrees } from '../../../scene/graph'
import { number, requireScene, SceneValidationError } from '../../../scene/validation'
import { Button } from '../../ui/Button'
import { SceneBendLimitControls } from './SceneBendLimitControls'
import { SCENE_APPEARANCE_FIELD as field } from './sceneAppearanceForm'
import { useSceneTwoBonePreview } from './useSceneTwoBonePreview'
import type { useSceneWorkshop } from './useSceneWorkshop'

type Props = { workshop: ReturnType<typeof useSceneWorkshop>; clipId: string; time: number }
type Coordinates = [string, string, string]
const AXES = [0, 1, 2] as const

export function SceneTwoBoneControls({ workshop, clipId, time }: Props) {
  const tip = workshop.primary,
    scene = workshop.index.scene,
    middle = tip?.parentId ? scene.nodes.get(tip.parentId) : null,
    root = middle?.parentId ? scene.nodes.get(middle.parentId) : null
  if (!tip || tip.kind === 'mesh') return null
  if (!middle || !root || middle.kind === 'mesh' || root.kind === 'mesh')
    return <p className="text-xs text-mld-muted">{COPY.scene.twoBone.pick}</p>
  return <TwoBoneForm workshop={workshop} clipId={clipId} time={time} nodes={[root, middle, tip]} />
}

function TwoBoneForm({
  workshop,
  clipId,
  time,
  nodes,
}: Props & { nodes: [ModelSceneNode, ModelSceneNode, ModelSceneNode] }) {
  const copy = COPY.scene.twoBone,
    chain = nodes.map((node) => node.id) as [string, string, string],
    preview = useSceneTwoBonePreview(workshop, chain, clipId, time),
    pose = workshop.animation.getSnapshot().pose,
    initial = (id: string): [string, string, string] => {
      const matrix = pose?.worldMatrices.get(id)
      return matrix ? [String(matrix[12]), String(matrix[13]), String(matrix[14])] : ['', '', '']
    }
  const [target, setTarget] = useState(() => initial(chain[2])),
    [hint, setHint] = useState(() => initial(chain[1])),
    [step, setStep] = useState('0.25'),
    [useHint, setUseHint] = useState(false),
    [open, setOpen] = useState(false),
    [limitEditing, setLimitEditing] = useState(false),
    [error, setError] = useState<string | null>(null)
  const reach = useSyncExternalStore(
    workshop.animationPose.subscribe,
    () =>
      workshop.animationPose.getSnapshot().dragging
        ? null
        : workshop.animationPose.getSnapshot().reach,
    () => null,
  )
  const dragging = useSyncExternalStore(
    workshop.animationPose.subscribe,
    () => workshop.animationPose.getSnapshot().dragging,
    () => false,
  )
  const settledTarget = useSyncExternalStore(
    workshop.animationPose.subscribe,
    () =>
      workshop.animationPose.getSnapshot().dragging
        ? null
        : (workshop.animationPose.getSnapshot().pose?.twoBoneGuide?.target ?? null),
    () => null,
  )
  useEffect(() => {
    if (settledTarget)
      setTarget((before) => {
        const next = settledTarget.map(String) as Coordinates
        return next.every((value, i) => value === before[i]) ? before : next
      })
  }, [settledTarget])
  const rootId = chain[0],
    scene = workshop.index.scene
  const locked = useMemo(() => {
    const flags = evaluateSceneNodeFlags(scene)
    return [...selectSceneSubtrees(scene, [rootId]).covered].some((id) => flags.get(id)?.locked)
  }, [scene, rootId])
  function invalidate() {
    preview.invalidate()
    setError(null)
  }
  function report(error: unknown) {
    preview.invalidate()
    setError(error instanceof SceneValidationError ? error.message : COPY.scene.animationPoseFailed)
  }
  const read = (values: readonly string[]): Vec3 =>
    values.map((value) => {
      requireScene(value.trim() !== '', 'target', COPY.scene.invalidNumber)
      return number(Number(value), 'target')
    }) as Vec3
  function show(next = target) {
    if (dragging || limitEditing) return
    try {
      setError(null)
      preview.preview(read(next), useHint ? read(hint) : undefined)
    } catch (error) {
      report(error)
    }
  }
  function nudge(axis: 0 | 1 | 2, direction: -1 | 1) {
    if (dragging || limitEditing) return
    try {
      const values = read(target),
        distance = number(Number(step), 'step', Number.MIN_VALUE),
        before = values[axis]
      values[axis] = number(before + distance * direction, 'target')
      requireScene(values[axis] !== before, 'target', copy.precision)
      const next = values.map(String) as [string, string, string]
      setTarget(next)
      show(next)
    } catch (error) {
      report(error)
    }
  }
  return (
    <details
      className="rounded-lg border border-mld-border px-2"
      onToggle={(event) => {
        setOpen(event.currentTarget.open)
        if (!event.currentTarget.open) preview.cancel()
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return
        event.preventDefault()
        preview.cancel()
        event.currentTarget.open = false
        event.currentTarget.querySelector('summary')?.focus()
      }}
    >
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold">
        {copy.title}
      </summary>
      {open && (
        <div className="space-y-3 pb-3">
          <p className="text-sm text-mld-muted">{copy.hint}</p>
          <p className="text-xs text-mld-muted">{copy.guide}</p>
          <ol aria-label={copy.chain} className="space-y-1 text-sm">
            {nodes.map((node, i) => (
              <li key={node.id} className="flex flex-wrap gap-x-2">
                <span className="text-mld-muted">{copy.roles[i]}</span>
                <span className="font-bold">{node.name}</span>
              </li>
            ))}
          </ol>
          {locked && <p className="text-sm text-mld-warn">{COPY.scene.animationLocked}</p>}
          <SceneBendLimitControls
            value={nodes[1].kind === 'mesh' ? undefined : nodes[1].bendLimit}
            disabled={locked || dragging}
            dirty={limitEditing}
            onEditing={(editing) => {
              invalidate()
              setLimitEditing(editing)
            }}
            onApply={(limit) =>
              workshop.run((source) => {
                requireScene(source === workshop.document, 'source', COPY.scene.animationChanged)
                return setSceneBendLimit(source, chain[1], limit)
              }) !== null
            }
          />
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              show()
            }}
          >
            <fieldset disabled={locked || limitEditing || dragging} className="space-y-3">
              <legend className="sr-only">{copy.target}</legend>
              <label className="block space-y-1 text-xs">
                <span>{copy.step}</span>
                <input
                  name="twoBoneStep"
                  type="number"
                  min={Number.MIN_VALUE}
                  step="any"
                  required
                  className={field}
                  value={step}
                  onChange={(event) => {
                    invalidate()
                    setStep(event.target.value)
                  }}
                />
              </label>
              <div className="space-y-2">
                {AXES.map((axis) => (
                  <div key={axis} className="flex items-center gap-2">
                    <span className="mr-auto text-sm">
                      {COPY.scene.animationAxes.translation[axis]}
                    </span>
                    <Button
                      className="min-w-11 text-sm"
                      aria-label={copy.nudge(axis, -1)}
                      onClick={() => nudge(axis, -1)}
                    >
                      −
                    </Button>
                    <Button
                      className="min-w-11 text-sm"
                      aria-label={copy.nudge(axis, 1)}
                      onClick={() => nudge(axis, 1)}
                    >
                      +
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-mld-muted">{copy.world}</p>
              <details className="rounded-lg border border-mld-border px-2">
                <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold">
                  {copy.exact}
                </summary>
                <div className="space-y-3 pb-2">
                  <TwoBoneCoordinates
                    name="twoBoneTarget"
                    label={copy.target}
                    value={target}
                    onChange={(value) => {
                      invalidate()
                      setTarget(value)
                    }}
                  />
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input
                      name="twoBoneHintEnabled"
                      type="checkbox"
                      className="size-5 accent-mld-accent"
                      checked={useHint}
                      onChange={(event) => {
                        invalidate()
                        setUseHint(event.target.checked)
                      }}
                    />
                    {copy.useHint}
                  </label>
                  {useHint && (
                    <TwoBoneCoordinates
                      name="twoBoneHint"
                      label={copy.bend}
                      value={hint}
                      onChange={(value) => {
                        invalidate()
                        setHint(value)
                      }}
                    />
                  )}
                  <p className="text-xs text-mld-muted">{copy.bendHint}</p>
                </div>
              </details>
              <Button type="submit" className="w-full text-sm">
                {copy.preview}
              </Button>
            </fieldset>
          </form>
          {error && (
            <p role="alert" className="text-sm text-mld-danger">
              {error}
            </p>
          )}
          {reach && (
            <p role="status" className="text-sm text-mld-muted">
              {copy.reach[reach.status]} {copy.bends[reach.bend]}
            </p>
          )}
          <p className="text-xs text-mld-muted">{copy.record}</p>
        </div>
      )}
    </details>
  )
}

function TwoBoneCoordinates({
  name,
  label,
  value,
  onChange,
}: {
  name: string
  label: string
  value: Coordinates
  onChange: (value: Coordinates) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {AXES.map((axis) => (
        <label key={axis} className="space-y-1 text-xs">
          <span>{['X', 'Y', 'Z'][axis]}</span>
          <input
            name={`${name}${axis}`}
            aria-label={COPY.scene.twoBone.axis(label, axis)}
            type="number"
            step="any"
            required
            className={field}
            value={value[axis]}
            onChange={(event) => {
              const next: Coordinates = [...value]
              next[axis] = event.target.value
              onChange(next)
            }}
          />
        </label>
      ))}
    </div>
  )
}
