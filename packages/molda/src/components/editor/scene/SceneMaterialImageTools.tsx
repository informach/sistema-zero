import { COPY } from '../../../core/copy'
import { patchSceneMaterial } from '../../../scene/appearanceCommands'
import type { SceneImage, SceneMaterial } from '../../../scene/document'
import {
  SCENE_MATERIAL_IMAGE_FIELDS,
  type SceneMaterialImageKind,
} from '../../../scene/materialImages'
import { Button } from '../../ui/Button'
import { SceneImageCreateForm } from './SceneImageCreateForm'
import { SCENE_APPEARANCE_FIELD as field, type SceneAppearanceApply } from './sceneAppearanceForm'

export function SceneMaterialImageTools({
  material,
  images,
  imageKind,
  disabled,
  apply,
}: {
  material: SceneMaterial
  images: readonly SceneImage[]
  imageKind: SceneMaterialImageKind
  disabled: boolean
  apply: SceneAppearanceApply
}) {
  const copy = COPY.scene
  const binding = SCENE_MATERIAL_IMAGE_FIELDS[imageKind]
  return (
    <fieldset disabled={disabled} className="space-y-3">
      <legend className="text-sm font-bold">{copy.materialImageKinds[imageKind]}</legend>
      {imageKind !== 'color' && (
        <p className="text-xs text-mld-muted">{copy.materialMapHints[imageKind]}</p>
      )}
      <label className="block space-y-1 text-sm">
        <span>{imageKind === 'color' ? copy.materialImage : copy.materialMapImage}</span>
        <select
          name={binding}
          value={material[binding] ?? ''}
          className={field}
          onChange={(event) =>
            apply((source) =>
              patchSceneMaterial(source, material.id, { [binding]: event.target.value || null }),
            )
          }
        >
          <option value="">{copy.materialNoImage}</option>
          {images
            .filter((image) => imageKind === 'color' || image.encoding === 'rgba')
            .map((image) => (
              <option key={image.id} value={image.id}>
                {image.name} ({image.width} × {image.height})
              </option>
            ))}
        </select>
      </label>
      {imageKind === 'normal' && (
        <form
          key={`${material.id}:${material.normalStrength}:${material.normalFlipY}`}
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault()
            const data = new FormData(event.currentTarget)
            apply((source) =>
              patchSceneMaterial(source, material.id, {
                normalStrength: Number(data.get('normalStrength')),
                normalFlipY: data.get('normalFlipY') === 'on',
              }),
            )
          }}
        >
          <label className="block space-y-1 text-sm">
            <span>{copy.materialNormalStrength}</span>
            <input
              name="normalStrength"
              type="number"
              required
              min={0}
              max={4}
              step="any"
              defaultValue={material.normalStrength ?? 1}
              className={field}
            />
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              name="normalFlipY"
              type="checkbox"
              defaultChecked={material.normalFlipY ?? false}
              className="size-5 accent-mld-accent"
            />
            {copy.materialNormalFlipY}
          </label>
          <Button type="submit" className="w-full text-sm">
            {copy.materialNormalApply}
          </Button>
        </form>
      )}
      {(imageKind === 'roughness' || imageKind === 'metalness') && (
        <p className="text-xs text-mld-muted">{copy.materialMapFactor(material[imageKind])}</p>
      )}
      <SceneImageCreateForm materialId={material.id} imageKind={imageKind} apply={apply} />
    </fieldset>
  )
}
