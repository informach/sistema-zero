import { useMemo } from 'react'
import { COPY } from '../../../core/copy'
import { importSceneMaterialImage } from '../../../scene/appearanceCommands'
import type { MoldaSceneDocument } from '../../../scene/document'
import { sceneRasterPreview } from '../../../scene/imageImport'
import type { SceneMaterialImageKind } from '../../../scene/materialImages'
import { requireScene } from '../../../scene/validation'
import { Button } from '../../ui/Button'
import { SceneImagePreview } from './SceneImagePreview'
import { SceneRasterFileInput } from './SceneRasterFileInput'
import { useSceneRasterFile } from './useSceneRasterFile'

export function SceneImageImport({
  source,
  materialId,
  imageKind = 'color',
  disabled,
  apply,
}: {
  source: MoldaSceneDocument
  materialId: string
  imageKind?: SceneMaterialImageKind
  disabled: boolean
  apply(command: (source: MoldaSceneDocument) => MoldaSceneDocument): MoldaSceneDocument | null
}) {
  const file = useSceneRasterFile(source)
  const { clear } = file
  const preview = useMemo(
    () => (file.data ? sceneRasterPreview(file.data.raster, file.data.name) : null),
    [file.data],
  )
  const copy = COPY.scene
  return (
    <section
      className="space-y-2 rounded-lg border border-mld-border p-2"
      aria-label={copy.imageImportTitle}
    >
      <h4 className="text-sm font-bold">{copy.imageImportTitle}</h4>
      <p className="text-xs text-mld-muted">{copy.imageImportHint}</p>
      {imageKind !== 'color' && (
        <p className="text-xs text-mld-muted">
          {copy.materialMapImport(copy.materialImageKinds[imageKind])}
        </p>
      )}
      <SceneRasterFileInput
        name="sceneImageFile"
        disabled={disabled || file.busy}
        onChoose={(selected) => {
          void file.choose(selected)
        }}
      />
      {file.busy && (
        <p role="status" className="text-xs">
          {copy.imageImportBusy}
        </p>
      )}
      {file.error && (
        <p role="alert" className="text-sm text-mld-danger">
          {copy.imageImportErrors[file.error]}
        </p>
      )}
      {preview && (
        <div className="space-y-2">
          <p className="break-words text-sm">
            {preview.name} · {preview.width} × {preview.height}
          </p>
          <div role="img" aria-label={copy.imageImportPreview}>
            <SceneImagePreview image={preview} palette={[]} base={[0, 0, 0, 0]} />
          </div>
          <p className="text-xs text-mld-muted">{copy.imageImportConfirmHint}</p>
          <Button
            className="w-full text-sm"
            disabled={disabled}
            onClick={() => {
              const data = file.data
              if (!data) return
              const result = apply((current) => {
                requireScene(current === source, 'revision', copy.imageImportStale)
                return importSceneMaterialImage(
                  current,
                  materialId,
                  imageKind,
                  data.name,
                  data.raster,
                )
              })
              if (result) clear()
            }}
          >
            {copy.imageImportConfirm}
          </Button>
        </div>
      )}
      {(file.busy || file.data || file.error) && (
        <Button className="w-full text-sm" onClick={clear}>
          {copy.imageImportCancel}
        </Button>
      )}
    </section>
  )
}
