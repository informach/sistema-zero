import { COPY } from '../../core/copy'
import type { RegionMapSetAsset, RegionTilemapAsset } from '../../core/project'
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
}: {
  open: boolean
  asset: RegionTilemapAsset | RegionMapSetAsset
  onClose: () => void
}) {
  const { gallery } = usePintaApp(),
    { showToast } = useToast()
  if (!open) return null
  const catalog = gallery.getState().assets
  async function download() {
    const { collectAssetBundle } = await import('../../export/assetJson')
    const { pintaWorkshopBackup } = await import('../../export/workshopDocument')
    const byId = new Map(catalog.map((item) => [item.id, item]))
    byId.set(asset.id, asset)
    const source = collectAssetBundle(asset, byId, new Map())
    const json = source && (await pintaWorkshopBackup(source))
    if (!json) {
      showToast(COPY.exportDialog.editableMissingTileset)
      return
    }
    triggerDownload(new Blob([json], { type: 'application/json' }), asset.name + '.pinta.json')
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
