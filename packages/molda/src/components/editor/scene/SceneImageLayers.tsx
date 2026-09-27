import { useState } from 'react'
import { COPY } from '../../../core/copy'
import type { SceneRgba } from '../../../scene/composite'
import type { SceneImage } from '../../../scene/document'
import { editSceneImageLayers } from '../../../scene/imageLayerCommands'
import { SCENE_LIMITS } from '../../../scene/limits'
import { Button } from '../../ui/Button'
import { SceneImagePreview } from './SceneImagePreview'
import { SCENE_APPEARANCE_FIELD as field, type SceneAppearanceApply } from './sceneAppearanceForm'
export function SceneImageLayers({
  image,
  palette,
  base,
  lockedImage,
  apply,
  onPaint,
  onConvert,
  busy,
}: {
  image: SceneImage
  palette: readonly SceneRgba[]
  base: SceneRgba
  lockedImage: boolean
  apply: SceneAppearanceApply
  onPaint(layerId: string): void
  onConvert(): void
  busy: boolean
}) {
  const copy = COPY.scene
  const [layerId, setLayerId] = useState<string | null>(null)
  const layer = image.layers.find((entry) => entry.id === layerId) ?? image.layers.at(-1)
  if (!layer) return null
  return (
    <fieldset disabled={lockedImage || busy} className="space-y-3">
      <legend className="text-sm font-bold">{copy.imageLayers}</legend>
      <SceneImagePreview image={image} palette={palette} base={base} />
      <p className="text-xs text-mld-muted">
        {copy.imageInfo(
          image.width,
          image.height,
          image.layers.length,
          image.encoding === 'indexed',
        )}
      </p>
      <label className="block space-y-1 text-sm">
        <span>{copy.imageLayerChoose}</span>
        <select
          name="imageLayer"
          value={layer.id}
          className={field}
          onChange={(e) => setLayerId(e.target.value)}
        >
          {[...image.layers].reverse().map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name}
            </option>
          ))}
        </select>
      </label>
      <Button
        className="w-full text-sm"
        disabled={!layer.visible || layer.opacity === 0}
        onClick={() => onPaint(layer.id)}
      >
        {copy.paintLayer}
      </Button>
      <form
        key={`${layer.id}-${layer.name}-${layer.opacity}-${layer.visible}`}
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault()
          const data = new FormData(e.currentTarget)
          apply((source) => {
            let next = editSceneImageLayers(source, image.id, {
              kind: 'rename',
              layerId: layer.id,
              name: String(data.get('layerName')),
            })
            next = editSceneImageLayers(next, image.id, {
              kind: 'opacity',
              layerId: layer.id,
              value: Number(data.get('opacity')),
            })
            return editSceneImageLayers(next, image.id, {
              kind: 'visible',
              layerId: layer.id,
              value: data.get('layerVisible') === 'on',
            })
          })
        }}
      >
        <label className="block space-y-1 text-sm">
          <span>{copy.imageLayerName}</span>
          <input
            name="layerName"
            maxLength={128}
            required
            defaultValue={layer.name}
            className={field}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>{copy.imageOpacity}</span>
          <input
            name="opacity"
            type="number"
            min={0}
            max={1}
            step="any"
            required
            defaultValue={layer.opacity}
            className={field}
          />
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            name="layerVisible"
            type="checkbox"
            defaultChecked={layer.visible}
            className="size-5 accent-mld-accent"
          />
          {copy.imageLayerVisible}
        </label>
        <Button type="submit" className="w-full text-sm">
          {copy.imageLayerApply}
        </Button>
      </form>
      <div className="flex gap-2">
        {([-1, 1] as const).map((direction) => (
          <Button
            key={direction}
            className="flex-1 text-sm"
            disabled={image.layers[direction < 0 ? 0 : image.layers.length - 1]?.id === layer.id}
            onClick={() =>
              apply((source) =>
                editSceneImageLayers(source, image.id, {
                  kind: 'move',
                  layerId: layer.id,
                  direction,
                }),
              )
            }
          >
            {direction < 0 ? copy.imageLayerDown : copy.imageLayerUp}
          </Button>
        ))}
      </div>
      <Button
        className="w-full text-sm"
        disabled={image.layers.length >= SCENE_LIMITS.layersPerImage}
        onClick={() => {
          const next = apply((source) =>
            editSceneImageLayers(source, image.id, { kind: 'add', name: copy.imageNewLayer }),
          )
          if (next) setLayerId(next.images.find((i) => i.id === image.id)!.layers.at(-1)!.id)
        }}
      >
        {copy.imageLayerAdd}
      </Button>
      <Button
        className="w-full text-sm"
        disabled={image.layers.length >= SCENE_LIMITS.layersPerImage}
        onClick={() =>
          apply((source) =>
            editSceneImageLayers(source, image.id, { kind: 'duplicate', layerId: layer.id }),
          )
        }
      >
        {copy.imageLayerDuplicate}
      </Button>
      <Button
        className="w-full text-sm"
        variant="danger"
        disabled={image.layers.length === 1}
        onClick={() =>
          apply((source) =>
            editSceneImageLayers(source, image.id, { kind: 'remove', layerId: layer.id }),
          )
        }
      >
        {copy.imageLayerRemove}
      </Button>
      {image.encoding === 'indexed' && (
        <>
          <p className="text-xs text-mld-muted">{copy.imageRgbaHint}</p>
          <Button className="w-full text-sm" onClick={onConvert}>
            {copy.imageRgba}
          </Button>
        </>
      )}
    </fieldset>
  )
}
