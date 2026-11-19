import { memo, useMemo } from 'react'
import type { ProjectAsset } from '#core'
import { lerAssetDeCena3D } from '../../core/scene3d/referencias'
import { useT } from '../../studio/i18n'
import { AssetNameInput, AssetRow, type AssetsTabCommon, DeleteAssetButton } from './tabs/common'

/** A scene is a manifest, not an image or a GLB to parse in the thumbnail renderer. */
export const Scene3DAssetRow = memo(function Scene3DAssetRow({
  asset,
  onRename,
  onDelete,
}: { asset: ProjectAsset } & AssetsTabCommon) {
  const t = useT(),
    dados = useMemo(() => lerAssetDeCena3D(asset), [asset])
  return (
    <AssetRow>
      <span aria-hidden className="text-2xl">
        🏝️
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <AssetNameInput asset={asset} what="o cenário" onRename={onRename} className="min-w-0" />
        <p className="text-xs text-sz-fg-soft">
          {dados.cena.nome} · {t('moldaScenes.revision', { n: dados.cena.fonte.revisao })}
        </p>
        {asset.cena3dPython && (
          <code className="break-all text-xs text-sz-fg-soft">
            from {asset.cena3dPython.modulo.split('/').at(-1)?.slice(0, -3)} import carregar
          </code>
        )}
      </div>
      <DeleteAssetButton asset={asset} onDelete={onDelete} />
    </AssetRow>
  )
})
