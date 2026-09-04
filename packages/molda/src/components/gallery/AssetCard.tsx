/**
 * Um card da galeria: miniatura + nome + selo do tipo (o botão grande abre a
 * criação) e a linha de ações embaixo. Memoizado: a galeria não tem teto de
 * criações, e cada card só re-renderiza quando o SEU asset muda.
 */
import type { CSSProperties, JSX } from 'react'
import { memo } from 'react'
import { COPY } from '../../core/copy'
import type { MoldaAsset } from '../../core/model'
import { IconButton } from '../ui/Button'
import { Copy, Pencil, Trash2 } from '../ui/icons'
import { KIND_BORDER_VAR, KindChip } from './kinds'
import { ModelThumb, SkyThumb, TextureThumb } from './thumbs'

export interface AssetCardProps {
  asset: MoldaAsset
  onOpen: (id: string) => void
  onRename: (asset: MoldaAsset) => void
  onDuplicate: (asset: MoldaAsset) => void
  onRemove: (asset: MoldaAsset) => void
}

function Thumb({ asset }: { asset: MoldaAsset }): JSX.Element {
  switch (asset.kind) {
    case 'model':
      return <ModelThumb asset={asset} />
    case 'texture':
      return <TextureThumb asset={asset} />
    case 'sky':
      return <SkyThumb params={asset.params} />
  }
}

export const AssetCard = memo(function AssetCard({
  asset,
  onOpen,
  onRename,
  onDuplicate,
  onRemove,
}: AssetCardProps): JSX.Element {
  const kindTitle = COPY.kinds[asset.kind].title
  const style = { '--mld-panel-border': KIND_BORDER_VAR[asset.kind] } as CSSProperties
  return (
    <li className="mld-gallery-card mld-panel mld-pop flex flex-col overflow-hidden" style={style}>
      <button
        type="button"
        onClick={() => onOpen(asset.id)}
        aria-label={COPY.a11y.assetCard(asset.name, kindTitle)}
        className="flex flex-1 flex-col text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-mld-accent"
      >
        <div className="aspect-[4/3] w-full overflow-hidden bg-mld-bg">
          <Thumb asset={asset} />
        </div>
        <div className="flex flex-col items-start gap-1 px-3 pt-2 pb-1">
          <span className="w-full truncate text-base font-bold text-mld-text">{asset.name}</span>
          <KindChip kind={asset.kind} />
        </div>
      </button>
      <div className="flex items-center justify-end gap-0.5 px-1 pb-1">
        <IconButton
          aria-label={`${COPY.gallery.rename} ${asset.name}`}
          onClick={() => onRename(asset)}
        >
          <Pencil aria-hidden="true" className="size-4" />
        </IconButton>
        <IconButton
          aria-label={`${COPY.gallery.duplicate} ${asset.name}`}
          onClick={() => onDuplicate(asset)}
        >
          <Copy aria-hidden="true" className="size-4" />
        </IconButton>
        <IconButton
          aria-label={`${COPY.gallery.remove} ${asset.name}`}
          onClick={() => onRemove(asset)}
          className="hover:text-mld-danger"
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </IconButton>
      </div>
    </li>
  )
})
