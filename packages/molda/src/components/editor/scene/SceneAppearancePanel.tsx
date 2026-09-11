import { useEffect, useMemo, useState } from 'react'
import { COPY } from '../../../core/copy'
import { resolvePaletteColors } from '../../../core/sanitize'
import { copySceneMaterialForNode } from '../../../scene/appearanceCommands'
import { sceneAppearanceUsage } from '../../../scene/appearanceUsage'
import { scenePalette } from '../../../scene/composite'
import type { MoldaSceneDocument } from '../../../scene/document'
import {
  SCENE_MATERIAL_IMAGE_FIELDS,
  SCENE_MATERIAL_IMAGE_KINDS,
  type SceneMaterialImageKind,
  sceneMaterialImageBase,
} from '../../../scene/materialImages'
import { requireScene } from '../../../scene/validation'
import { Button } from '../../ui/Button'
import { SceneFlipbookTools } from './SceneFlipbookTools'
import { SceneImageAtlasTools } from './SceneImageAtlasTools'
import { SceneImageImport } from './SceneImageImport'
import { SceneImageLayers } from './SceneImageLayers'
import { SceneMaterialImageTools } from './SceneMaterialImageTools'
import { SceneMaterialSettings } from './SceneMaterialSettings'
import { SCENE_APPEARANCE_FIELD as field } from './sceneAppearanceForm'
import type { useSceneWorkshop } from './useSceneWorkshop'

export function SceneAppearancePanel({
  workshop,
}: {
  workshop: ReturnType<typeof useSceneWorkshop>
}) {
  const { document, primary } = workshop
  const { paletteId, customPalette, extraColors } = document
  const copy = COPY.scene
  const imageTask = workshop.paint.imageTask
  const cancelTask = imageTask.cancel
  useEffect(() => () => cancelTask(), [cancelTask])
  const [materialId, setMaterialId] = useState<string | null>(null)
  const [imageKind, setImageKind] = useState<SceneMaterialImageKind>('color')
  const usage = useMemo(() => sceneAppearanceUsage(document), [document])
  const ids = primary ? [...(usage.byNode.get(primary.id) ?? [])] : []
  const material = usage.index.materials.get(
    materialId && ids.includes(materialId) ? materialId : (ids[0] ?? ''),
  )
  const imageId = material?.[SCENE_MATERIAL_IMAGE_FIELDS[imageKind]]
  const image = imageId ? usage.index.images.get(imageId) : undefined
  const colors = useMemo(
    () =>
      resolvePaletteColors({ paletteId, customPalette, extraColors }).map((hex, index) => ({
        hex,
        index,
      })),
    [paletteId, customPalette, extraColors],
  )
  const palette = useMemo(
    () => scenePalette({ paletteId, customPalette, extraColors }),
    [paletteId, customPalette, extraColors],
  )
  if (!material || primary?.kind !== 'mesh') return null
  const users = usage.materials.get(material.id) ?? []
  const imageUsers = image ? [...(usage.images.get(image.id) ?? [])] : []
  const lockedMaterial = users.some((id) => usage.flags.get(id)?.locked)
  const lockedImage = imageUsers.some((id) => usage.flags.get(id)?.locked)
  function apply(command: (source: MoldaSceneDocument) => MoldaSceneDocument) {
    return workshop.run((source) => {
      requireScene(
        source.id === document.id &&
          source.materials.find((m) => m.id === material!.id) === material &&
          (!image || source.images.find((i) => i.id === image.id) === image),
        'material',
        'A pintura mudou. Confira o material novamente antes de ajustar.',
      )
      return command(source)
    })
  }
  return (
    <div className="space-y-4">
      <SceneImageAtlasTools
        workshop={workshop}
        nodeId={primary.id}
        disabled={!!usage.flags.get(primary.id)?.locked || imageTask.busy}
      />
      {/* O aviso de trabalho em andamento (e o cancelar) fica na coluna da aba Pintar. */}
      <label className="block space-y-1 text-sm">
        <span>{copy.materialChoose}</span>
        <select
          name="sceneMaterial"
          value={material.id}
          className={field}
          onChange={(e) => {
            cancelTask()
            workshop.flipbook.setImage(null)
            setMaterialId(e.target.value)
          }}
        >
          {ids.map((id, i) => (
            <option key={id} value={id}>
              {copy.materialEntry(usage.index.materials.get(id)!.name, i + 1)}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-mld-muted">
        {copy.materialShared(users.length, imageUsers.length)}
      </p>
      {(lockedMaterial || lockedImage) && (
        <p role="status" className="text-xs text-mld-muted">
          {copy.materialLocked}
        </p>
      )}
      <Button
        className="w-full text-sm"
        disabled={usage.flags.get(primary.id)?.locked}
        onClick={() => {
          const next = apply((source) => copySceneMaterialForNode(source, primary.id, material.id))
          if (next) {
            setMaterialId(next.materials.at(-1)!.id)
          }
        }}
      >
        {copy.materialCopy}
      </Button>
      <SceneMaterialSettings
        material={material}
        colors={colors}
        lockedMaterial={lockedMaterial}
        apply={apply}
      />
      <label className="block space-y-1 text-sm">
        <span>{copy.materialImageKind}</span>
        <select
          name="materialImageKind"
          value={imageKind}
          className={field}
          onChange={(event) => {
            const next = SCENE_MATERIAL_IMAGE_KINDS.find((kind) => kind === event.target.value)
            if (!next) return
            cancelTask()
            workshop.paint.close()
            workshop.flipbook.setImage(null)
            setImageKind(next)
          }}
        >
          {SCENE_MATERIAL_IMAGE_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {copy.materialImageKinds[kind]}
            </option>
          ))}
        </select>
      </label>
      <SceneMaterialImageTools
        key={`${material.id}:${imageKind}`}
        material={material}
        images={document.images}
        imageKind={imageKind}
        disabled={lockedMaterial || imageTask.busy}
        apply={apply}
      />
      <SceneImageImport
        key={`import:${material.id}:${imageKind}`}
        source={document}
        materialId={material.id}
        imageKind={imageKind}
        disabled={lockedMaterial || imageTask.busy}
        apply={apply}
      />
      {image && (
        <SceneFlipbookTools
          key={`flipbook:${image.id}:${imageKind}`}
          image={image}
          palette={palette}
          base={sceneMaterialImageBase(material, palette, imageKind)}
          player={workshop.flipbook}
          locked={lockedImage}
          busy={imageTask.busy}
          apply={apply}
          beforeChange={workshop.cancelGesture}
        />
      )}
      {image && (
        <SceneImageLayers
          key={`${image.id}:${imageKind}`}
          image={image}
          palette={palette}
          base={sceneMaterialImageBase(material, palette, imageKind)}
          lockedImage={lockedImage}
          apply={apply}
          busy={imageTask.busy}
          onConvert={() => {
            void imageTask.run(document, image.id, { kind: 'rgba' })
          }}
          onPaint={(layerId) =>
            workshop.openPaint({
              nodeId: primary.id,
              materialId: material.id,
              imageId: image.id,
              layerId,
              imageKind,
            })
          }
        />
      )}
    </div>
  )
}
