import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import { Button } from '../../ui/Button'
import { SceneBevel } from './SceneBevel'
import { SceneFacePreview } from './SceneFacePreview'
import { SceneMeshCheck } from './SceneMeshCheck'
import { ScenePathForm } from './ScenePathForm'
import { ScenePlaneCut } from './ScenePlaneCut'
import { SceneSkinWeightTools } from './SceneSkinWeightTools'
import type { useSceneComponents } from './useSceneComponents'
import type { SceneFacePreviewTool } from './useSceneFacePreview'

const SceneUvEditor = lazy(() =>
  import('./SceneUvEditor').then((module) => ({ default: module.SceneUvEditor })),
)

function SceneUvTools(props: NonNullable<ReturnType<typeof useSceneComponents>['uv']>) {
  const [open, setOpen] = useState(false)
  return (
    <details onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="min-h-11 cursor-pointer py-3 text-sm font-bold">
        {COPY.scene.uvTitle}
      </summary>
      {open && (
        <Suspense fallback={<p role="status">{COPY.scene.uvLoading}</p>}>
          <SceneUvEditor {...props} />
        </Suspense>
      )}
    </details>
  )
}

export type SceneComponentToolsProps = Pick<
  ReturnType<typeof useSceneComponents>,
  | 'selection'
  | 'choose'
  | 'apply'
  | 'preview'
  | 'beginPreview'
  | 'transform'
  | 'setMode'
  | 'splitEdges'
  | 'cutRing'
  | 'cutPlane'
  | 'bevel'
  | 'createPath'
  | 'blocked'
  | 'check'
  | 'uv'
  | 'dissolveEdges'
  | 'connectPoints'
  | 'weld'
  | 'weldPoints'
  | 'softMovement'
  | 'remove'
  | 'removal'
  | 'weights'
>

/** Contextual controls only; topology and history are owned by the scene commands. */
export function SceneComponentTools({
  selection,
  choose,
  apply,
  preview,
  beginPreview,
  transform,
  setMode,
  splitEdges,
  cutRing,
  cutPlane,
  bevel,
  createPath,
  blocked,
  check,
  uv,
  dissolveEdges,
  connectPoints,
  weld,
  weldPoints,
  softMovement,
  remove,
  removal,
  weights,
}: SceneComponentToolsProps) {
  const triggers = useRef<Partial<Record<SceneFacePreviewTool, HTMLButtonElement | null>>>({})
  const previous = useRef(preview.tool)
  useEffect(() => {
    if (!preview.tool && previous.current) triggers.current[previous.current]?.focus()
    previous.current = preview.tool
  }, [preview.tool])
  const copy = COPY.scene
  if (!selection) return null
  const count = selection.ids.length
  const isFace = selection.mode === 'face'
  const title = copy.componentTitles[selection.mode]
  return (
    <section aria-label={title} className="space-y-3 border-t border-mld-border pt-3">
      <h3 className="mld-display text-lg">{title}</h3>
      <fieldset disabled={blocked} className="space-y-2">
        <legend className="text-sm">{copy.componentModeLabel}</legend>
        <div className="flex flex-wrap gap-1">
          {(['vertex', 'edge', 'face'] as const).map((mode) => (
            <Button
              key={mode}
              variant="ghost"
              className="flex-1 px-2 text-sm"
              aria-pressed={selection.mode === mode}
              onClick={() => setMode(mode)}
            >
              {copy.componentModes[mode]}
            </Button>
          ))}
        </div>
        <p className="text-xs text-mld-muted">{copy.componentModeHint}</p>
      </fieldset>
      <p role="status" className="text-sm text-mld-muted">
        {selection.mode === 'face'
          ? copy.faceCount(count)
          : copy.componentCounts[selection.mode](count)}
      </p>
      {preview.error && (
        <p role="alert" className="text-sm text-mld-danger">
          {preview.error}
        </p>
      )}
      {preview.tool && (
        <SceneFacePreview
          key={preview.tool}
          tool={preview.tool}
          busy={preview.busy}
          update={preview.update}
          confirm={preview.confirm}
          cancel={preview.cancel}
        />
      )}
      {transform.error && (
        <p role="alert" className="text-sm text-mld-danger">
          {transform.error}
        </p>
      )}
      <p className="text-xs text-mld-muted">
        {isFace ? copy.faceTransformHint : copy.componentTransformHint}
      </p>
      <SceneMeshCheck check={check} />
      <fieldset disabled={blocked} className="space-y-3">
        <legend className="sr-only">{title}</legend>
        {uv && <SceneUvTools {...uv} />}
        {weights && <SceneSkinWeightTools {...weights} />}
        {selection.mode === 'vertex' && (
          <div className="space-y-2">
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="softMovementEnabled"
                checked={softMovement.enabled}
                onChange={(event) => softMovement.setEnabled(event.target.checked)}
                className="size-5 accent-mld-accent"
              />
              {copy.softMovement}
            </label>
            {softMovement.enabled && (
              <>
                <label className="flex flex-col gap-1 text-sm">
                  {copy.softMovementReach}
                  <input
                    type="number"
                    name="softMovementReach"
                    step="any"
                    min="0"
                    value={softMovement.reach}
                    aria-invalid={!softMovement.valid}
                    onChange={(event) => softMovement.setReach(event.target.value)}
                    className="min-h-11 w-full rounded-lg border border-mld-border bg-mld-bg px-3 text-mld-text focus-visible:outline-2 focus-visible:outline-mld-accent"
                  />
                </label>
                <p className="text-xs text-mld-muted">{copy.softMovementHint}</p>
                {!softMovement.valid && (
                  <p role="status" className="text-xs text-mld-danger">
                    {copy.softMovementInvalid}
                  </p>
                )}
              </>
            )}
          </div>
        )}
        {selection.mode === 'vertex' && weld && (
          <div className="space-y-1">
            <Button
              className="w-full text-sm"
              disabled={!weld.points || !!weld.blockedReason}
              onClick={weldPoints}
            >
              {copy.weldPoints}
            </Button>
            <p className="text-xs text-mld-muted">{copy.weldPointsHint}</p>
            <p className="text-xs text-mld-muted">
              {weld.blockedReason ??
                (weld.points
                  ? copy.weldImpact(weld.points, weld.groups, weld.faces, weld.looseEdges)
                  : copy.weldEmpty)}
            </p>
          </div>
        )}
        {selection.mode === 'vertex' &&
          (['cut', 'line'] as const).map((action) => (
            <div key={action} className="space-y-1">
              <Button
                className="w-full text-sm"
                disabled={count !== 2}
                onClick={() => connectPoints(action)}
              >
                {copy.connectPoints[action]}
              </Button>
              <p className="text-xs text-mld-muted">{copy.connectPointsHints[action]}</p>
            </div>
          ))}
        {selection.mode === 'edge' && (
          <div className="space-y-1">
            <Button className="w-full text-sm" disabled={!count} onClick={splitEdges}>
              {copy.splitEdges}
            </Button>
            <p className="text-xs text-mld-muted">{copy.splitEdgesHint}</p>
            <Button className="w-full text-sm" disabled={count !== 1} onClick={cutRing}>
              {copy.cutRing}
            </Button>
            <p className="text-xs text-mld-muted">{copy.cutRingHint}</p>
            <Button className="w-full text-sm" disabled={!count} onClick={dissolveEdges}>
              {copy.dissolveEdges}
            </Button>
            <p className="text-xs text-mld-muted">{copy.dissolveEdgesHint}</p>
          </div>
        )}
        {isFace && (
          <div className="flex flex-col gap-2">
            {(['extrude', 'inset', 'thickness', 'subdivide'] as const).map((tool) => (
              <Button
                key={tool}
                ref={(element) => {
                  triggers.current[tool] = element
                }}
                className="text-sm"
                disabled={!count}
                onClick={() => beginPreview(tool)}
              >
                {copy.facePreview[tool]}
              </Button>
            ))}
          </div>
        )}
        {selection.mode === 'edge' && <SceneBevel count={count} onApply={bevel} />}
        {selection.mode === 'edge' && (
          <details>
            <summary className="min-h-11 cursor-pointer py-3 text-sm">
              {copy.pathCreateTitle}
            </summary>
            <p className="mb-3 text-xs text-mld-muted">{copy.pathCreateHint}</p>
            <ScenePathForm
              settings={{ radius: 0.1, around: 8, endCaps: true }}
              points={count + 1}
              action={copy.pathCreate}
              onApply={createPath}
            />
          </details>
        )}
        <ScenePlaneCut onApply={cutPlane} />
        <div className="flex flex-col gap-2">
          <Button className="text-sm" onClick={() => choose('all')}>
            {selection.mode === 'face' ? copy.faceAll : copy.componentAll[selection.mode]}
          </Button>
          <Button className="text-sm" disabled={!count} onClick={() => choose('none')}>
            {isFace ? copy.faceNone : copy.componentNone}
          </Button>
          <Button className="text-sm" disabled={!count} onClick={() => choose('connected')}>
            {isFace ? copy.faceConnected : copy.componentConnected}
          </Button>
        </div>
        <details>
          <summary className="min-h-11 cursor-pointer py-3 text-sm">
            {copy.componentMoreSelection}
          </summary>
          <div className="space-y-3">
            {(
              [
                'grow',
                'shrink',
                'invert',
                ...(selection.mode === 'edge' ? (['ring', 'loop'] as const) : []),
              ] as const
            ).map((action) => (
              <div key={action} className="space-y-1">
                <Button
                  className="w-full text-sm"
                  disabled={action !== 'invert' && !count}
                  onClick={() => choose(action)}
                >
                  {copy.componentSelectionActions[action]}
                </Button>
                <p className="text-xs text-mld-muted">{copy.componentSelectionHints[action]}</p>
              </div>
            ))}
          </div>
        </details>
        {isFace &&
          (['merge', 'detach', 'triangulate', 'flip', 'remove'] as const).map((action) => (
            <div key={action} className="space-y-1">
              <Button
                className="w-full text-sm"
                disabled={action === 'merge' ? count < 2 : !count}
                onClick={() => apply(action)}
              >
                {copy.faceActions[action]}
              </Button>
              <p className="text-xs text-mld-muted">{copy.faceActionHints[action]}</p>
            </div>
          ))}
        {selection.mode !== 'face' && removal && (
          <div className="space-y-1">
            <Button className="w-full text-sm" disabled={!count} onClick={remove}>
              {copy.componentRemove[selection.mode]}
            </Button>
            <p className="text-xs text-mld-muted">
              {copy.componentRemovalImpact(removal.faces, removal.looseEdges)}
            </p>
          </div>
        )}
      </fieldset>
    </section>
  )
}
