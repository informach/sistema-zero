import { COPY } from '../../../core/copy'
import { SceneBevel } from './SceneBevel'
import { ComponentButton } from './SceneComponentPanel'
import type { SceneComponentToolsProps } from './SceneComponentTools'
import { ScenePathForm } from './ScenePathForm'
import { ScenePlaneCut } from './ScenePlaneCut'

/** Existing precision controls stay reachable without occupying the initial panel. */
export function SceneComponentAdvanced(props: SceneComponentToolsProps) {
  const { selection, blocked, softMovement, weld, weldPoints, visualCut, cutPlane } = props
  const copy = COPY.scene
  return (
    <fieldset disabled={blocked} className="mld-component-stack">
      <legend className="sr-only">Mais ajustes da malha</legend>
      {selection?.mode === 'vertex' && (
        <>
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
              <label className="mld-component-field">
                {copy.softMovementReach}
                <input
                  type="number"
                  name="softMovementReach"
                  step="any"
                  min="0"
                  value={softMovement.reach}
                  aria-invalid={!softMovement.valid}
                  onChange={(event) => softMovement.setReach(event.target.value)}
                />
              </label>
              {!softMovement.valid && (
                <p role="status" className="text-sm text-mld-danger">
                  {copy.softMovementInvalid}
                </p>
              )}
            </>
          )}
          {weld && (
            <>
              <ComponentButton disabled={!weld.points || !!weld.blockedReason} onClick={weldPoints}>
                {copy.weldPoints}
              </ComponentButton>
              <p className="mld-component-description">
                {weld.blockedReason ??
                  (weld.points
                    ? copy.weldImpact(weld.points, weld.groups, weld.faces, weld.looseEdges)
                    : copy.weldEmpty)}
              </p>
            </>
          )}
        </>
      )}
      {selection?.mode === 'edge' && (
        <>
          <SceneBevel count={selection.ids.length} onApply={props.bevel} />
          <h4 className="font-bold">{copy.pathCreateTitle}</h4>
          <ScenePathForm
            settings={{ radius: 0.1, around: 8, endCaps: true }}
            points={props.pathPointCount}
            action={copy.pathCreate}
            onApply={props.createPath}
          />
        </>
      )}
      {visualCut}
      <details>
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-bold">
          Divisão por valores
        </summary>
        <ScenePlaneCut onApply={cutPlane} />
      </details>
    </fieldset>
  )
}
