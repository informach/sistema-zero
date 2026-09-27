import { useMemo } from 'react'
import { COPY } from '../../../core/copy'
import { sceneRasterPreview } from '../../../scene/imageImport'
import { Button } from '../../ui/Button'
import { SceneImagePreview } from './SceneImagePreview'
import { useSceneImageAtlas } from './useSceneImageAtlas'
import type { useSceneWorkshop } from './useSceneWorkshop'

export function SceneImageAtlasTools({
  workshop,
  nodeId,
  disabled,
}: {
  workshop: ReturnType<typeof useSceneWorkshop>
  nodeId: string
  disabled: boolean
}) {
  const atlas = useSceneImageAtlas(workshop.editor, nodeId, workshop.cancelGesture)
  const copy = COPY.scene
  const preview = useMemo(
    () =>
      atlas.session?.raster ? sceneRasterPreview(atlas.session.raster, copy.atlasTitle) : null,
    [atlas.session],
  )
  return (
    <section
      aria-label={copy.atlasTitle}
      className="space-y-2 rounded-lg border border-mld-border p-2"
    >
      <h4 className="text-sm font-bold">{copy.atlasTitle}</h4>
      <p className="text-xs text-mld-muted">{copy.atlasHint}</p>
      {!atlas.session && (
        <Button
          className="w-full text-sm"
          disabled={disabled}
          onClick={() => {
            void atlas.prepare()
          }}
        >
          {copy.atlasPrepare}
        </Button>
      )}
      {atlas.busy && (
        <p role="status" className="text-sm">
          {copy.atlasBusy}
        </p>
      )}
      {atlas.error && (
        <p role="alert" className="text-sm text-mld-danger">
          {atlas.error}
        </p>
      )}
      {preview && atlas.session && (
        <div className="space-y-2">
          <p className="text-sm">
            {copy.atlasSummary(atlas.session.plan.images.length, preview.width, preview.height)}
          </p>
          <div role="img" aria-label={copy.atlasPreview}>
            <SceneImagePreview image={preview} palette={[]} base={[0, 0, 0, 0]} />
          </div>
          <p className="text-xs text-mld-muted">{copy.atlasConfirmHint}</p>
          <Button className="w-full text-sm" disabled={disabled} onClick={atlas.confirm}>
            {copy.atlasConfirm}
          </Button>
        </div>
      )}
      {(atlas.session || atlas.error) && (
        <Button className="w-full text-sm" onClick={atlas.cancel}>
          {copy.atlasCancel}
        </Button>
      )}
    </section>
  )
}
