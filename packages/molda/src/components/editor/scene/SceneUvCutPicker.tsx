import { useMemo, useState } from 'react'
import { COPY } from '../../../core/copy'
import type { SceneMeshGeometry } from '../../../scene/document'
import { meshEdgeKey } from '../../../scene/meshTopology'
import { Button } from '../../ui/Button'
import { SceneUvCanvas } from './SceneUvCanvas'
import { SCENE_APPEARANCE_FIELD as field } from './sceneAppearanceForm'

/** Session-only cut focus: no changes to the workshop's face selection or authorial UV. */
export function SceneUvCutPicker({
  mesh,
  ids,
  cuts,
  onChange,
}: {
  mesh: SceneMeshGeometry
  ids: readonly string[]
  cuts: readonly string[]
  onChange(cuts: readonly string[]): void
}) {
  const [slot, setSlot] = useState('1')
  const [corner, setCorner] = useState(0)
  const position = Number(slot) - 1
  const valid =
    slot.trim() !== '' && Number.isInteger(position) && position >= 0 && position < ids.length
  const faceId = valid ? ids[position] : undefined
  const face = faceId ? mesh.faces[faceId] : undefined
  const index = Math.min(corner, (face?.corners.length ?? 1) - 1)
  const key = face
    ? meshEdgeKey(
        face.corners[index]!.vertexId,
        face.corners[(index + 1) % face.corners.length]!.vertexId,
      )
    : null
  const marked = key !== null && cuts.includes(key)
  const view = useMemo(
    () => ({ ...mesh, faces: Object.fromEntries(ids.map((id) => [id, mesh.faces[id]!])) }),
    [mesh, ids],
  )
  const copy = COPY.scene
  return (
    <div className="space-y-2">
      <p className="text-xs text-mld-muted">{copy.uvCutHint}</p>
      <SceneUvCanvas
        mesh={view}
        ids={faceId ? [faceId] : []}
        label={copy.uvCutCanvas}
        controlLabel={copy.uvCutCanvasControl}
        activeEdge={faceId ? { faceId, corner: index } : undefined}
        onSelect={(id) => {
          setSlot(String(ids.indexOf(id) + 1))
          setCorner(0)
        }}
      />
      <label className="block space-y-1 text-sm">
        <span>{copy.uvCutFace}</span>
        <input
          name="uvCutFace"
          type="number"
          min={1}
          max={ids.length}
          step={1}
          className={field}
          value={slot}
          aria-invalid={!valid}
          onChange={(event) => {
            setSlot(event.target.value)
            setCorner(0)
          }}
        />
      </label>
      <p className="text-xs text-mld-muted">{copy.uvCutFaceHint(ids.length)}</p>
      <label className="block space-y-1 text-sm">
        <span>{copy.uvCutEdge}</span>
        <select
          name="uvCutEdge"
          value={index}
          disabled={!face}
          className={field}
          onChange={(event) => {
            const value = Number(event.target.value)
            if (Number.isInteger(value) && value >= 0 && value < (face?.corners.length ?? 0))
              setCorner(value)
          }}
        >
          {face?.corners.map((entry, i) => (
            <option key={entry.vertexId} value={i}>
              {copy.uvCutEdgeNumber(i + 1, ((i + 1) % face.corners.length) + 1)}
            </option>
          ))}
        </select>
      </label>
      <Button
        className="w-full text-sm"
        disabled={!key}
        aria-pressed={marked}
        variant={marked ? 'primary' : 'outline'}
        onClick={() => {
          if (key) onChange(marked ? cuts.filter((cut) => cut !== key) : [...cuts, key])
        }}
      >
        {copy.uvCutToggle}
      </Button>
      <Button className="w-full text-sm" disabled={!cuts.length} onClick={() => onChange([])}>
        {copy.uvCutClear}
      </Button>
    </div>
  )
}
