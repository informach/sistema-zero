import type { PintaWorkshopAsset } from '../../core/assetMemory'
import { COPY } from '../../core/copy'
import type { RegionMapSetAsset, RegionTilemapAsset } from '../../core/project'
import type { WorkshopProjectedMap } from '../../core/projectedDocument'
import { triggerDownload } from '../../export/download'
import { usePintaApp } from '../appContext'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { useToast } from '../ui/Toast'
import { SceneExportButtons } from './SceneExportButtons'
export function WorkshopMapDownload({
  open,
  asset,
  onClose,
  catalog: snapshot,
}: {
  open: boolean
  asset: RegionTilemapAsset | RegionMapSetAsset | WorkshopProjectedMap
  onClose: () => void
  catalog?: readonly PintaWorkshopAsset[]
}) {
  const { gallery } = usePintaApp(),
    { showToast } = useToast()
  if (!open) return null
  const catalog = snapshot ?? gallery.getState().assets
  async function download() {
    const { workshopAssetBundleToJson } = await import('../../export/workshopDocument')
    const result = await workshopAssetBundleToJson(asset, catalog)
    if (!result.ok) {
      showToast(
        result.reason === 'missing-dependency'
          ? COPY.exportDialog.editableMissingTileset
          : COPY.exportDialog.editableFailed,
      )
      return
    }
    triggerDownload(
      new Blob([result.json], { type: 'application/json' }),
      `${asset.name}.pinta.json`,
    )
  }
  return (
    <Dialog open onClose={onClose} title={COPY.exportDialog.title}>
      <Button variant="barOutline" onClick={() => void download()}>
        {COPY.editor.download} .pinta.json
      </Button>
      {asset.kind === 'tilemap' ? <SceneExportButtons map={asset} inventory={catalog} /> : null}
    </Dialog>
  )
}
