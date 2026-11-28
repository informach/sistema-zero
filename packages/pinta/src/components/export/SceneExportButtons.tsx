import { type JSX, useState } from 'react'
import type { PintaWorkshopAsset } from '../../core/assetMemory'
import { COPY } from '../../core/copy'
import type { RegionTilemapAsset, TilemapAsset } from '../../core/project'
import type { WorkshopProjectedMap } from '../../core/projectedDocument'
import { triggerDownload } from '../../export/download'
import { usePintaApp } from '../appContext'
import { Button } from '../ui/Button'
import { useToast } from '../ui/Toast'

type Props =
  | { map: TilemapAsset; inventory?: never }
  | { map: RegionTilemapAsset | WorkshopProjectedMap; inventory: readonly PintaWorkshopAsset[] }

export function SceneExportButtons(props: Props): JSX.Element {
  const { map } = props
  const { gallery } = usePintaApp(),
    { showToast } = useToast(),
    [busy, setBusy] = useState(false)
  const download = async (target: 'tiled' | 'phaser' | 'pygame' | 'godot'): Promise<void> => {
    setBusy(true)
    try {
      const { buildScenePackage, scenePackageBlob } = await import('../../export/scenePackage')
      const catalog = [
        ...(props.inventory ?? gallery.getState().assets).filter((asset) => asset.id !== map.id),
        map,
      ]
      const files = await buildScenePackage(map, catalog, target)
      triggerDownload(await scenePackageBlob(files), `${map.name}-${target}.zip`)
      showToast(COPY.scene.oPacoteDoCenarioEstaPronto)
    } catch (e) {
      showToast(e instanceof Error ? e.message : COPY.scene.naoFoiPossivelPrepararOPacote)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-pin-border pt-3">
      <p className="text-sm font-bold text-pin-text">{COPY.scene.levarOCenarioCompleto}</p>
      {(['tiled', 'phaser', 'pygame', 'godot'] as const).map((target) => (
        <Button
          key={target}
          variant="barOutline"
          disabled={busy}
          onClick={() => void download(target)}
        >
          {busy
            ? COPY.scene.preparando
            : {
                tiled: COPY.scene.tiledJSONTMXETSX,
                phaser: COPY.scene.jogoPhaser,
                pygame: COPY.scene.projetoPygame,
                godot: COPY.scene.projetoGodot,
              }[target]}
        </Button>
      ))}
    </div>
  )
}
