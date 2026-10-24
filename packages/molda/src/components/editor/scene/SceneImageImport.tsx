import { useMemo, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import { importSceneMaterialImage } from '../../../scene/appearanceCommands'
import type { MoldaSceneDocument } from '../../../scene/document'
import { sceneRasterPreview } from '../../../scene/imageImport'
import type { SceneMaterialImageKind } from '../../../scene/materialImages'
import { requireScene } from '../../../scene/validation'
import { Button } from '../../ui/Button'
import { Dialog } from '../../ui/Dialog'
import { SceneImagePreview } from './SceneImagePreview'
import { SceneRasterFileInput } from './SceneRasterFileInput'
import { useSceneRasterFile } from './useSceneRasterFile'

export function SceneImageImport({
  source,
  materialId,
  imageKind = 'color',
  disabled,
  apply,
  onImported,
}: {
  source: MoldaSceneDocument
  materialId: string
  imageKind?: SceneMaterialImageKind
  disabled: boolean
  apply(command: (source: MoldaSceneDocument) => MoldaSceneDocument): MoldaSceneDocument | null
  onImported?(document: MoldaSceneDocument): void
}) {
  const file = useSceneRasterFile(source)
  const { clear } = file
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const preview = useMemo(
    () => (file.data ? sceneRasterPreview(file.data.raster, file.data.name) : null),
    [file.data],
  )
  const copy = COPY.scene
  const close = () => {
    clear()
    setOpen(false)
  }
  return (
    <>
      <Button
        ref={trigger}
        className="w-full text-sm"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {copy.imageImportTitle}
      </Button>
      <Dialog open={open} onClose={close} title={copy.imageImportTitle} returnFocusTo={trigger}>
        <section
          className="space-y-2 rounded-lg border border-mld-border p-2"
          aria-label={copy.imageImportTitle}
        >
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
                  if (result) {
                    clear()
                    setOpen(false)
                    onImported?.(result)
                  }
                }}
              >
                {imageKind === 'color' ? copy.imageImportConfirm : 'Usar imagem no material'}
              </Button>
            </div>
          )}
          {(file.busy || file.data || file.error) && (
            <Button className="w-full text-sm" onClick={clear}>
              {copy.imageImportCancel}
            </Button>
          )}
        </section>
      </Dialog>
    </>
  )
}
