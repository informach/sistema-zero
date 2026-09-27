import { COPY } from '../../../core/copy'
import { patchSceneMaterial } from '../../../scene/appearanceCommands'
import type { SceneMaterial } from '../../../scene/document'
import { Button } from '../../ui/Button'
import { SceneMaterialMaskSettings } from './SceneMaterialMaskSettings'
import { SCENE_APPEARANCE_FIELD as field, type SceneAppearanceApply } from './sceneAppearanceForm'
export function SceneMaterialSettings({
  material,
  colors,
  lockedMaterial,
  apply,
}: {
  material: SceneMaterial
  colors: readonly { index: number; hex: string }[]
  lockedMaterial: boolean
  apply: SceneAppearanceApply
}) {
  const copy = COPY.scene
  return (
    <fieldset disabled={lockedMaterial} className="space-y-3">
      <legend className="text-sm font-bold">{copy.materialFinish}</legend>
      {/* Fosco, Brilhante e Metal moram no Modelar, na peça (`ScenePieceFinish`). */}
      <p className="text-xs text-mld-muted">{copy.materialFinishHint}</p>
      <form
        key={`${material.id}-${material.roughness}-${material.metalness}-${material.doubleSided}-${material.name}`}
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault()
          const data = new FormData(e.currentTarget)
          apply((source) =>
            patchSceneMaterial(source, material.id, {
              name: String(data.get('materialName')),
              roughness: Number(data.get('roughness')),
              metalness: Number(data.get('metalness')),
              doubleSided: data.get('doubleSided') === 'on',
            }),
          )
        }}
      >
        <label className="block space-y-1 text-sm">
          <span>{copy.materialName}</span>
          <input
            name="materialName"
            maxLength={128}
            required
            defaultValue={material.name}
            className={field}
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(['roughness', 'metalness'] as const).map((name) => (
            <label key={name} className="space-y-1 text-sm">
              <span>{copy.materialFields[name]}</span>
              <input
                name={name}
                type="number"
                min={0}
                max={1}
                step="any"
                required
                defaultValue={material[name]}
                className={field}
              />
            </label>
          ))}
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            name="doubleSided"
            type="checkbox"
            defaultChecked={material.doubleSided}
            className="size-5 accent-mld-accent"
          />
          {copy.materialDoubleSided}
        </label>
        <Button type="submit" className="w-full text-sm">
          {copy.materialApply}
        </Button>
      </form>
      <SceneMaterialMaskSettings material={material} apply={apply} />
      <form
        key={`${material.id}-${JSON.stringify(material.baseColor)}`}
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault()
          const value = new FormData(e.currentTarget).get('baseColor')
          if (value !== null && value !== '')
            apply((source) =>
              patchSceneMaterial(source, material.id, {
                baseColor: { kind: 'palette', index: Number(value) },
              }),
            )
        }}
      >
        <label className="block space-y-1 text-sm">
          <span>{copy.materialBase}</span>
          <select
            name="baseColor"
            defaultValue={material.baseColor.kind === 'palette' ? material.baseColor.index : ''}
            className={field}
          >
            <option value="">{copy.materialKeepColor}</option>
            {colors.flatMap(({ hex, index }) =>
              index > 0 && hex
                ? [
                    <option key={index} value={index}>
                      {copy.materialColor(index, hex)}
                    </option>,
                  ]
                : [],
            )}
          </select>
        </label>
        <p className="text-xs text-mld-muted">{copy.materialBaseHint}</p>
        <Button type="submit" className="w-full text-sm">
          {copy.materialApplyColor}
        </Button>
      </form>
    </fieldset>
  )
}
