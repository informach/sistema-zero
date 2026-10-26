import { useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import { createSceneMaterialImage } from '../../../scene/appearanceCommands'
import type { MoldaSceneDocument } from '../../../scene/document'
import { SCENE_LIMITS } from '../../../scene/limits'
import type { SceneMaterialImageKind } from '../../../scene/materialImages'
import { Button } from '../../ui/Button'
import { Dialog } from '../../ui/Dialog'
import { SCENE_APPEARANCE_FIELD as field, type SceneAppearanceApply } from './sceneAppearanceForm'
export function SceneImageCreateForm({
  materialId,
  imageKind,
  initialWidth = 32,
  initialHeight = 32,
  apply,
  onCreated,
}: {
  materialId: string
  imageKind: SceneMaterialImageKind
  initialWidth?: number
  initialHeight?: number
  apply: SceneAppearanceApply
  onCreated?(document: MoldaSceneDocument): void
}) {
  const copy = COPY.scene
  const title = imageKind === 'color' ? copy.imageCreate : copy.imageCreateMap
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  return (
    <>
      <Button ref={trigger} className="w-full text-sm" onClick={() => setOpen(true)}>
        {title}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title} returnFocusTo={trigger}>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            const data = new FormData(e.currentTarget)
            const encoding = imageKind === 'color' ? data.get('encoding') : 'rgba'
            if (encoding !== 'indexed' && encoding !== 'rgba') return
            const next = apply((source) =>
              createSceneMaterialImage(source, materialId, {
                kind: imageKind,
                name: String(data.get('imageName')),
                width: Number(data.get('width')),
                height: Number(data.get('height')),
                encoding,
              }),
            )
            if (next) {
              setOpen(false)
              onCreated?.(next)
            }
          }}
        >
          <p className="text-xs text-mld-muted">
            {imageKind === 'color' ? copy.imageCreateHint : copy.materialMapRgba}
          </p>
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
          <details className="rounded-lg border border-mld-border px-3">
            <summary className="min-h-11 cursor-pointer py-3 text-sm font-bold">
              Tamanho e cores da textura
            </summary>
            <div className="space-y-3 pb-3">
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
                      defaultValue={name === 'width' ? initialWidth : initialHeight}
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
              ) : null}
            </div>
          </details>
          <Button type="submit" className="w-full text-sm">
            {imageKind === 'color' ? copy.imageCreateApply : copy.imageCreateMap}
          </Button>
        </form>
      </Dialog>
    </>
  )
}
