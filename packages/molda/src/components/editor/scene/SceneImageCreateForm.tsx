import { COPY } from '../../../core/copy'
import { createSceneMaterialImage } from '../../../scene/appearanceCommands'
import { SCENE_LIMITS } from '../../../scene/limits'
import type { SceneMaterialImageKind } from '../../../scene/materialImages'
import { Button } from '../../ui/Button'
import { SCENE_APPEARANCE_FIELD as field, type SceneAppearanceApply } from './sceneAppearanceForm'
export function SceneImageCreateForm({
  materialId,
  imageKind,
  apply,
}: {
  materialId: string
  imageKind: SceneMaterialImageKind
  apply: SceneAppearanceApply
}) {
  const copy = COPY.scene
  return (
    <details>
      <summary className="min-h-11 cursor-pointer py-3 text-sm">{copy.imageCreate}</summary>
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault()
          const data = new FormData(e.currentTarget)
          const encoding = imageKind === 'color' ? data.get('encoding') : 'rgba'
          if (encoding !== 'indexed' && encoding !== 'rgba') return
          apply((source) =>
            createSceneMaterialImage(source, materialId, {
              kind: imageKind,
              name: String(data.get('imageName')),
              width: Number(data.get('width')),
              height: Number(data.get('height')),
              encoding,
            }),
          )
        }}
      >
        <p className="text-xs text-mld-muted">{copy.imageCreateHint}</p>
        <label className="block space-y-1 text-sm">
          <span>{copy.imageName}</span>
          <input
            name="imageName"
            required
            maxLength={128}
            defaultValue={
              imageKind === 'color' ? copy.imageDefaultName : copy.materialImageKinds[imageKind]
            }
            className={field}
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(['width', 'height'] as const).map((name) => (
            <label key={name} className="space-y-1 text-sm">
              <span>{copy.imageDimensions[name]}</span>
              <input
                name={name}
                type="number"
                min={1}
                max={SCENE_LIMITS.imageSide}
                required
                defaultValue={32}
                className={field}
              />
            </label>
          ))}
        </div>
        {imageKind === 'color' ? (
          <label className="block space-y-1 text-sm">
            <span>{copy.imageEncoding}</span>
            <select name="encoding" defaultValue="indexed" className={field}>
              <option value="indexed">{copy.imageEncodings.indexed}</option>
              <option value="rgba">{copy.imageEncodings.rgba}</option>
            </select>
          </label>
        ) : (
          <p className="text-xs text-mld-muted">{copy.materialMapRgba}</p>
        )}
        <Button type="submit" className="w-full text-sm">
          {copy.imageCreateApply}
        </Button>
      </form>
    </details>
  )
}
