import { type JSX, useState } from 'react'
import { COPY } from '../../core/copy'
import type { PintaAsset, TilemapAsset } from '../../core/project'
import { triggerDownload } from '../../export/download'
import { usePintaApp } from '../appContext'
import { Button } from '../ui/Button'
import { useToast } from '../ui/Toast'
export function SceneExportButtons({ map }: { map: TilemapAsset }): JSX.Element {
  const { gallery } = usePintaApp(),
    { showToast } = useToast(),
    [busy, setBusy] = useState(false)
  const download = async (target: 'tiled' | 'phaser' | 'pygame' | 'godot'): Promise<void> => {
    setBusy(true)
    try {
      const { buildScenePackage, scenePackageBlob } = await import('../../export/scenePackage')
      const assets: PintaAsset[] = [
        ...gallery.getState().assets.filter((a) => a.id !== map.id),
        map,
      ]
      triggerDownload(
        await scenePackageBlob(await buildScenePackage(map, assets, target)),
        `${map.name}-${target}.zip`,
      )
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
