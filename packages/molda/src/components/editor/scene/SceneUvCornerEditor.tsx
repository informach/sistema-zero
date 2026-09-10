import { useMemo } from 'react'
import { COPY } from '../../../core/copy'
import type { SceneMeshGeometry } from '../../../scene/document'
import { prepareMeshUvStitch } from '../../../scene/meshUvCorners'
import type { MeshUvOperation } from '../../../scene/meshUvOperations'
import { Button } from '../../ui/Button'
import { SCENE_APPEARANCE_FIELD as field } from './sceneAppearanceForm'

export interface SceneUvCornerSettings {
  enabled: boolean
  index: number
  step: string
}
export function SceneUvCornerEditor({
  mesh,
  ids,
  state,
  onChange,
  onApply,
}: {
  mesh: SceneMeshGeometry
  ids: readonly string[]
  state: SceneUvCornerSettings
  onChange(state: SceneUvCornerSettings): void
  onApply(operation: MeshUvOperation): void
}) {
  const faceId = ids.at(-1),
    face = faceId ? mesh.faces[faceId] : undefined
  const { index } = state
  const corner = face?.corners[index]
  const stitch = useMemo(
    () =>
      faceId && mesh.faces[faceId]?.corners[index]
        ? prepareMeshUvStitch(mesh, ids, faceId, index)
        : null,
    [mesh, ids, faceId, index],
  )
  if (!faceId || !face || !corner) return null
  const copy = COPY.scene
  const step = Number(state.step)
  const validStep = state.step.trim() !== '' && Number.isFinite(step) && step > 0
  return (
    <section
      className="space-y-2 rounded-lg border border-mld-border p-2"
      aria-label={copy.uvCorners}
    >
      <h4 className="text-sm font-bold">{copy.uvCorners}</h4>
      <p className="text-xs text-mld-muted">{copy.uvCornerHint}</p>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          name="uvCornerEditing"
          type="checkbox"
          checked={state.enabled}
          className="size-5 accent-mld-accent"
          onChange={(event) => onChange({ ...state, enabled: event.target.checked })}
        />
        {copy.uvCornerEnable}
      </label>
      <label className="block space-y-1 text-sm">
        <span>{copy.uvCornerChoose}</span>
        <select
          name="uvCorner"
          value={index}
          className={field}
          onChange={(event) => onChange({ ...state, index: Number(event.target.value) })}
        >
          {face.corners.map((corner, i) => (
            <option key={corner.vertexId} value={i}>
              {copy.uvCornerNumber(i + 1)}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1 text-sm">
        <span>{copy.uvCornerStep}</span>
        <input
          name="uvCornerStep"
          type="number"
          step="any"
          value={state.step}
          aria-invalid={!validStep}
          className={field}
          onChange={(event) => onChange({ ...state, step: event.target.value })}
        />
      </label>
      <form
        key={`${mesh.id}:${faceId}:${index}:${corner.uv.join(':')}`}
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          const read = (key: string) => {
            const raw = data.get(key)
            return typeof raw === 'string' && raw.trim() ? Number(raw) : NaN
          }
          const u = read('uvCornerU'),
            v = read('uvCornerV')
          if (Number.isFinite(u) && Number.isFinite(v))
            onApply({ kind: 'corner', faceId, corner: index, uv: [u, v] })
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          {(['U', 'V'] as const).map((axis, i) => (
            <label key={axis} className="space-y-1 text-sm">
              <span>{copy.uvCornerAxis(axis)}</span>
              <input
                name={`uvCorner${axis}`}
                type="number"
                step="any"
                required
                defaultValue={corner.uv[i]}
                className={field}
              />
            </label>
          ))}
        </div>
        <Button type="submit" className="w-full text-sm">
          {copy.uvCornerApply}
        </Button>
      </form>
      <p className="text-xs text-mld-muted">{copy.uvStitchHint}</p>
      <Button
        className="w-full text-sm"
        disabled={!stitch || !!stitch.blockedReason || !stitch.changedCorners}
        onClick={() => onApply({ kind: 'stitch', faceId, corner: index })}
      >
        {copy.uvStitch}
      </Button>
      {stitch?.blockedReason && <p className="text-xs text-mld-muted">{stitch.blockedReason}</p>}
    </section>
  )
}
