import { useMemo } from 'react'
import { COPY } from '../../../core/copy'
import type { ModelSceneNode } from '../../../scene/document'
import type { SceneSkinBinding } from '../../../scene/skin'
import { SCENE_SKIN_WEIGHT_COLORS } from '../../../scene/skinWeightColors'

/** Complements exact numeric controls; the active brush explicitly identifies its color preview. */
export function SceneSkinWeightMapControls({
  skin,
  nodes,
  jointId,
  onChange,
  painting = false,
}: {
  skin: SceneSkinBinding
  nodes: readonly ModelSceneNode[]
  jointId: string | null
  onChange(jointId: string | null): void
  painting?: boolean
}) {
  const names = useMemo(() => new Map(nodes.map((node) => [node.id, node.name])), [nodes]),
    copy = COPY.scene.weightMap
  return (
    <fieldset className="pointer-events-auto space-y-2 rounded-xl border border-mld-border bg-mld-surface/95 px-3 pt-2 pb-3 shadow-sm">
      <legend className="sr-only">{copy.title}</legend>
      <label className="flex flex-wrap items-center gap-2 text-sm font-bold">
        {copy.title}
        <select
          name="skin-weight-map"
          value={jointId ?? ''}
          onChange={(event) => onChange(event.target.value || null)}
          className="min-h-11 min-w-0 max-w-full rounded-lg border border-mld-border bg-mld-bg px-3 text-mld-text focus-visible:outline-2 focus-visible:outline-mld-accent"
        >
          <option value="">{copy.off}</option>
          {skin.joints.map((joint) => (
            <option key={joint.nodeId} value={joint.nodeId}>
              {names.get(joint.nodeId) ?? joint.nodeId}
            </option>
          ))}
        </select>
      </label>
      {jointId && (
        <>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-mld-text">
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="size-4 rounded-sm border border-mld-border"
                style={{ backgroundColor: SCENE_SKIN_WEIGHT_COLORS.zero }}
              />
              {copy.zero}
            </span>
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="size-4 rounded-sm border border-mld-border"
                style={{ backgroundColor: SCENE_SKIN_WEIGHT_COLORS.full }}
              />
              {copy.full}
            </span>
          </div>
          <p className="text-xs text-mld-muted">
            {painting ? COPY.scene.skinPaint.previewHint : copy.hint}
          </p>
          <p className="text-xs text-mld-muted">{copy.exact}</p>
        </>
      )}
    </fieldset>
  )
}
