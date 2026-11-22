import { type JSX, useState } from 'react'
import type { PintaMemoryAsset } from '../../core/assetMemory'
import { COPY } from '../../core/copy'
import type { RegionTilemapAsset, TilemapAsset } from '../../core/project'
import { triggerDownload } from '../../export/download'
import { usePintaApp } from '../appContext'
import { Button } from '../ui/Button'
import { useToast } from '../ui/Toast'

type Props =
  | { map: TilemapAsset; inventory?: never }
  | { map: RegionTilemapAsset; inventory: readonly PintaMemoryAsset[] }

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
      const { pintaWorkshopBody, isLegacyWorkshopAsset } = await import('../../core/workshopAsset')
      const { sceneMapClosure } = await import('../../core/sceneMapClosure')
      const body = pintaWorkshopBody(map)
      if (body.kind !== 'tilemap') throw Error(COPY.scene.naoFoiPossivelPrepararOPacote)
      const closure = sceneMapClosure(body, catalog.map(pintaWorkshopBody))
      let files: Awaited<ReturnType<typeof buildScenePackage>>
      if (!('origin' in body) && closure.assets.every(isLegacyWorkshopAsset)) {
        files = await buildScenePackage(body, closure.assets, target)
      } else {
        const prepared =
          'origin' in body
            ? { ok: true as const, map: body }
            : (await import('../../tiles/regionMap')).prepareMapRegions(body)
        if (!prepared.ok) throw Error(COPY.scene.naoFoiPossivelPrepararOPacote)
        files = await buildScenePackage(prepared.map, closure.assets, target)
      }
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
