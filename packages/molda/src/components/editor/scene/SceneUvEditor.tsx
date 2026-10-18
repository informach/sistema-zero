import { type ComponentProps, type ReactNode, useMemo, useState } from 'react'
import { COPY } from '../../../core/copy'
import type { SceneMeshGeometry, Vec2 } from '../../../scene/document'
import { indexMeshUv, mapMeshUv, meshUvBounds } from '../../../scene/meshUv'
import { editMeshUv, type MeshUvOperation } from '../../../scene/meshUvOperations'
import { prepareUvRotation } from '../../../scene/uvRotation'
import { Button, ToolButton } from '../../ui/Button'
import { FlipHorizontal2, FlipVertical2, Lock, LockOpen, Magnet, RotateCw } from '../../ui/icons'
import { SceneToolbarMenu } from './SceneToolbarMenu'
import { SceneUvAutoPreview } from './SceneUvAutoPreview'
import { SceneUvCanvas, type SceneUvTexture } from './SceneUvCanvas'
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
  texture,
  visibleIds,
  mixedImages = false,
  compact = false,
  renderCanvas,
  extraActions,
}: {
  mesh: SceneMeshGeometry
  sourceKey: string
  blocked: boolean
  ids: readonly string[]
  onSelect(id: string, additive: boolean): void
  onChoose(ids: readonly string[]): void
  onApply(operation: MeshUvOperation): void
  onApplyPrepared(mesh: SceneMeshGeometry): void
  texture?: SceneUvTexture
  visibleIds?: string[]
  mixedImages?: boolean
  compact?: boolean
  renderCanvas?(props: ComponentProps<typeof SceneUvCanvas>): ReactNode
  extraActions?: ReactNode
}) {
  const copy = COPY.scene
  const index = useMemo(() => indexMeshUv(mesh), [mesh])
  const [projection, setProjection] = useState<'xy' | 'xz' | 'yz' | 'face'>('xy')
  const [reorganize, setReorganize] = useState(false)
  const [padding, setPadding] = useState('0.02')
  const [advanced, setAdvanced] = useState(false)
  const [snap, setSnap] = useState(true)
  const [proportional, setProportional] = useState(true)
  const [savedCorner, setCorner] = useState<SceneUvCornerSettings>({
    enabled: true,
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
  const pixelStep: Vec2 | undefined =
    snap && texture ? [1 / texture.image.width, 1 / texture.image.height] : undefined
  const control =
    !blocked &&
    !mixedImages &&
    corner.enabled &&
    face &&
    faceId &&
    Number.isFinite(step) &&
    step > 0
      ? {
          faceId,
          sourceKey,
          corner: corner.index,
          step,
          pixelStep,
          ids,
          onChoose: (index: number) => setCorner({ ...corner, index }),
          onApply: (index: number, uv: Vec2) => {
            const chosen = face.corners[index]!
            onApplyPrepared(
              mapMeshUv(mesh, ids, (before, id, i) => {
                const candidate = mesh.faces[id]!.corners[i]!
                return candidate.vertexId === chosen.vertexId &&
                  before.every((value, axis) => value === chosen.uv[axis])
                  ? uv
                  : before
              }),
            )
          },
          onMove: (offset: [number, number]) =>
            onApply({ kind: 'transform', offset, scale: [1, 1], degrees: 0 }),
          proportional,
          onScale: (scale: Vec2, origin: Vec2) =>
            onApplyPrepared(
              mapMeshUv(mesh, ids, (uv) => [
                origin[0] + (uv[0] - origin[0]) * scale[0],
                origin[1] + (uv[1] - origin[1]) * scale[1],
              ]),
            ),
          onRotate: (degrees: number) => {
            const { min, max } = meshUvBounds(mesh, ids)
            const origin: Vec2 = [min[0] / 2 + max[0] / 2, min[1] / 2 + max[1] / 2]
            const rotate = prepareUvRotation(
              degrees,
              origin,
              texture?.image ?? { width: 1, height: 1 },
            )
            onApplyPrepared(mapMeshUv(mesh, ids, rotate))
          },
        }
      : undefined
  const margin = Number(padding)
  const validMargin =
    padding.trim() !== '' && Number.isFinite(margin) && margin >= 0 && margin <= 0.25
  function turn() {
    if (!texture) {
      onApply({ kind: 'transform', offset: [0, 0], scale: [1, 1], degrees: 90 })
      return
    }
    const { width, height } = texture.image
    const metric = mapMeshUv(mesh, ids, (uv) => [uv[0] * width, uv[1] * height])
    const rotated = editMeshUv(metric, ids, {
      kind: 'transform',
      offset: [0, 0],
      scale: [1, 1],
      degrees: 90,
    })
    const { min } = meshUvBounds(rotated, ids)
    const offset: Vec2 = snap ? [Math.round(min[0]) - min[0], Math.round(min[1]) - min[1]] : [0, 0]
    onApplyPrepared(
      mapMeshUv(rotated, ids, (uv) => [(uv[0] + offset[0]) / width, (uv[1] + offset[1]) / height]),
    )
  }
  const advancedControls = (
    <details className="mld-disclosure" onToggle={(event) => setAdvanced(event.currentTarget.open)}>
      <summary>{copy.uvAdvanced}</summary>
      {advanced && (
        <div className="space-y-3 pb-2">
          <p className="text-xs text-mld-muted">{copy.uvHint}</p>
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
      )}
    </details>
  )
  return (
    <fieldset disabled={blocked} className={compact ? 'mld-sheet-uv' : 'min-w-0 space-y-3'}>
      {compact && (
        <div className="mld-uv-actions" role="toolbar" aria-label="Ajustar o mapa">
          <ToolButton
            icon={RotateCw}
            label={copy.uvRotateQuarter}
            disabled={!ids.length || mixedImages}
            onClick={turn}
          />
          {(['u', 'v'] as const).map((axis) => (
            <ToolButton
              key={axis}
              icon={axis === 'u' ? FlipHorizontal2 : FlipVertical2}
              label={copy.uvFlip[axis]}
              disabled={!ids.length || mixedImages}
              onClick={() =>
                onApply({
                  kind: 'transform',
                  offset: [0, 0],
                  scale: axis === 'u' ? [-1, 1] : [1, -1],
                  degrees: 0,
                })
              }
            />
          ))}
          <ToolButton
            icon={Magnet}
            label={copy.uvPixelSnap}
            active={snap}
            disabled={!texture}
            onClick={() => setSnap(!snap)}
          />
          <ToolButton
            icon={proportional ? Lock : LockOpen}
            label="Manter proporção"
            active={proportional}
            onClick={() => setProportional(!proportional)}
          />
          <SceneToolbarMenu label="Seleção e ajustes" iconOnly>
            <Button
              variant="ghost"
              size="compact"
              data-close-menu
              disabled={!ids.length || mixedImages}
              onClick={() => {
                const islands = new Set(ids.map((id) => index.byFace.get(id)))
                onChoose(index.islands.flatMap((group, i) => (islands.has(i) ? group : [])))
              }}
            >
              {copy.uvSelectIslands}
            </Button>
            <Button
              variant="ghost"
              size="compact"
              data-close-menu
              onClick={() => onChoose(visibleIds ?? Object.keys(mesh.faces))}
            >
              {copy.faceAll}
            </Button>
            <Button variant="ghost" size="compact" data-close-menu onClick={() => onChoose([])}>
              {copy.faceNone}
            </Button>
            {extraActions}
            {advancedControls}
          </SceneToolbarMenu>
        </div>
      )}
      {!compact && <p className="text-xs text-mld-muted">{copy.uvVisualHint}</p>}
      {renderCanvas ? (
        renderCanvas({ mesh, ids, onSelect, corner: control, texture, visibleIds })
      ) : (
        <SceneUvCanvas
          mesh={mesh}
          ids={ids}
          onSelect={onSelect}
          corner={control}
          texture={texture}
          visibleIds={visibleIds}
        />
      )}
      {(!texture || mixedImages) && (
        <p role="status" className="text-xs text-mld-muted">
          {mixedImages ? copy.uvMixedImages : copy.uvNoTexture}
        </p>
      )}
      {!compact && (
        <>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="uv-pixel-snap"
              checked={snap}
              disabled={!texture}
              className="size-5 accent-mld-accent"
              onChange={(event) => setSnap(event.target.checked)}
            />
            {copy.uvPixelSnap}
          </label>
          <Button
            className="w-full text-sm"
            disabled={!ids.length || mixedImages}
            onClick={() => {
              const islands = new Set(ids.map((id) => index.byFace.get(id)))
              onChoose(index.islands.flatMap((group, i) => (islands.has(i) ? group : [])))
            }}
          >
            {copy.uvSelectIslands}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button className="text-sm" disabled={!ids.length || mixedImages} onClick={turn}>
              {copy.uvRotateQuarter}
            </Button>
            {(['u', 'v'] as const).map((axis) => (
              <Button
                key={axis}
                className="text-sm"
                disabled={!ids.length || mixedImages}
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
          <p className="text-xs text-mld-muted">{copy.uvVisualNotice}</p>
        </>
      )}
      {!compact && advancedControls}
    </fieldset>
  )
}
