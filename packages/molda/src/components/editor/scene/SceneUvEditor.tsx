import { useMemo, useState } from 'react'
import { COPY } from '../../../core/copy'
import type { SceneMeshGeometry } from '../../../scene/document'
import { indexMeshUv } from '../../../scene/meshUv'
import type { MeshUvOperation } from '../../../scene/meshUvOperations'
import { Button } from '../../ui/Button'
import { SceneUvAutoPreview } from './SceneUvAutoPreview'
import { SceneUvCanvas } from './SceneUvCanvas'
import { SceneUvCornerEditor, type SceneUvCornerSettings } from './SceneUvCornerEditor'

const inputClass =
  'min-h-11 w-full rounded-lg border border-mld-border bg-mld-bg px-2 text-mld-text focus-visible:outline-2 focus-visible:outline-mld-accent'

export function SceneUvEditor({
  mesh,
  sourceKey,
  blocked,
  ids,
  onSelect,
  onChoose,
  onApply,
  onApplyPrepared,
}: {
  mesh: SceneMeshGeometry
  sourceKey: string
  blocked: boolean
  ids: readonly string[]
  onSelect(id: string, additive: boolean): void
  onChoose(ids: readonly string[]): void
  onApply(operation: MeshUvOperation): void
  onApplyPrepared(mesh: SceneMeshGeometry): void
}) {
  const copy = COPY.scene
  const index = useMemo(() => indexMeshUv(mesh), [mesh])
  const [projection, setProjection] = useState<'xy' | 'xz' | 'yz' | 'face'>('xy')
  const [reorganize, setReorganize] = useState(false)
  const [padding, setPadding] = useState('0.02')
  const [savedCorner, setCorner] = useState<SceneUvCornerSettings>({
    enabled: false,
    index: 0,
    step: '0.01',
  })
  const faceId = ids.at(-1),
    face = faceId ? mesh.faces[faceId] : undefined
  const corner = {
    ...savedCorner,
    index: Math.max(0, Math.min(savedCorner.index, (face?.corners.length ?? 1) - 1)),
  }
  const step = Number(corner.step)
  const control =
    corner.enabled && face && faceId && Number.isFinite(step) && step > 0
      ? {
          faceId,
          sourceKey,
          corner: corner.index,
          step,
          onChoose: (index: number) => setCorner({ ...corner, index }),
          onApply: (index: number, uv: [number, number]) =>
            onApply({ kind: 'corner', faceId, corner: index, uv }),
        }
      : undefined
  const margin = Number(padding)
  const validMargin =
    padding.trim() !== '' && Number.isFinite(margin) && margin >= 0 && margin <= 0.25
  return (
    <div className="space-y-3">
      <p className="text-xs text-mld-muted">{copy.uvHint}</p>
      <SceneUvCanvas mesh={mesh} ids={ids} onSelect={onSelect} corner={control} />
      <p className="text-xs text-mld-muted">{copy.uvCanvasHint}</p>
      <label className="block space-y-1 text-sm">
        <span>{copy.uvFace}</span>
        <select
          name="uvFace"
          value={ids.at(-1) ?? ''}
          className={inputClass}
          onChange={(e) => {
            if (e.target.value) onSelect(e.target.value, false)
          }}
        >
          <option value="">{copy.uvChooseFace}</option>
          {Object.keys(mesh.faces).map((id, i) => (
            <option key={id} value={id}>
              {copy.uvFaceNumber(i + 1)}
            </option>
          ))}
        </select>
      </label>
      <p role="status" className="text-xs text-mld-muted">
        {copy.uvIslands(index.islands.length, index.seams.length)}
      </p>
      <SceneUvCornerEditor
        mesh={mesh}
        ids={ids}
        state={corner}
        onChange={setCorner}
        onApply={onApply}
      />
      <Button
        className="w-full text-sm"
        disabled={!ids.length}
        onClick={() => {
          const islands = new Set(ids.map((id) => index.byFace.get(id)))
          onChoose(index.islands.flatMap((group, i) => (islands.has(i) ? group : [])))
        }}
      >
        {copy.uvSelectIslands}
      </Button>
      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          const read = (name: string) => {
            const raw = data.get(name)
            return typeof raw === 'string' && raw.trim() ? Number(raw) : NaN
          }
          const values = ['u', 'v', 'sizeU', 'sizeV', 'angle'].map(read)
          if (!values.every(Number.isFinite)) return
          onApply({
            kind: 'transform',
            offset: [values[0]!, values[1]!],
            scale: [values[2]!, values[3]!],
            degrees: values[4]!,
          })
        }}
      >
        <fieldset disabled={!ids.length} className="space-y-2">
          <legend className="text-sm font-bold">{copy.uvTransform}</legend>
          <div className="grid grid-cols-2 gap-2">
            {(['u', 'v', 'sizeU', 'sizeV', 'angle'] as const).map((name) => (
              <label key={name} className="space-y-1 text-sm">
                <span>{copy.uvFields[name]}</span>
                <input
                  name={name}
                  type="number"
                  step="any"
                  required
                  defaultValue={name.startsWith('size') ? 1 : 0}
                  className={inputClass}
                />
              </label>
            ))}
          </div>
          <p className="text-xs text-mld-muted">{copy.uvTransformHint}</p>
          <Button type="submit" className="w-full text-sm">
            {copy.uvApplyTransform}
          </Button>
          <div className="flex gap-2">
            {(['u', 'v'] as const).map((axis) => (
              <Button
                key={axis}
                className="flex-1 text-sm"
                onClick={() =>
                  onApply({
                    kind: 'transform',
                    offset: [0, 0],
                    scale: axis === 'u' ? [-1, 1] : [1, -1],
                    degrees: 0,
                  })
                }
              >
                {copy.uvFlip[axis]}
              </Button>
            ))}
          </div>
        </fieldset>
      </form>
      <details onToggle={(event) => setReorganize(event.currentTarget.open)}>
        <summary className="min-h-11 cursor-pointer py-3 text-sm">{copy.uvReorganize}</summary>
        {reorganize && (
          <div className="space-y-3">
            <SceneUvAutoPreview
              mesh={mesh}
              sourceKey={sourceKey}
              disabled={blocked}
              ids={ids}
              onApply={onApplyPrepared}
            />
            <p className="text-xs text-mld-muted">{copy.uvReorganizeHint}</p>
            <label className="block space-y-1 text-sm">
              <span>{copy.uvProjection}</span>
              <select
                name="uvProjection"
                value={projection}
                className={inputClass}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === 'xy' || value === 'xz' || value === 'yz' || value === 'face')
                    setProjection(value)
                }}
              >
                {(['xy', 'xz', 'yz', 'face'] as const).map((plane) => (
                  <option key={plane} value={plane}>
                    {copy.uvProjections[plane]}
                  </option>
                ))}
              </select>
            </label>
            <Button
              className="w-full text-sm"
              disabled={!ids.length}
              onClick={() => onApply({ kind: 'project', plane: projection })}
            >
              {copy.uvProject}
            </Button>
            <label className="block space-y-1 text-sm">
              <span>{copy.uvMargin}</span>
              <input
                name="uvPadding"
                type="number"
                min={0}
                max={0.25}
                step="any"
                value={padding}
                aria-invalid={!validMargin}
                className={inputClass}
                onChange={(e) => setPadding(e.target.value)}
              />
            </label>
            <p className="text-xs text-mld-muted">{copy.uvPackHint}</p>
            <Button
              className="w-full text-sm"
              disabled={!ids.length || !validMargin}
              onClick={() => onApply({ kind: 'pack', padding: margin })}
            >
              {copy.uvPack}
            </Button>
          </div>
        )}
      </details>
    </div>
  )
}
