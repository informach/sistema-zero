/**
 * Um card da galeria: o nome e o selo do tipo em cima, a miniatura (o botão grande que abre a
 * criação) e as três ações embaixo. Memoizado: a galeria não tem teto de criações, e cada card
 * só re-renderiza quando o SEU asset muda.
 *
 * ⭐ 11/09/2026: o cartão das telas-modelo, o MESMO da galeria "Meus Jogos" do Estúdio e do
 * Pinta (`.sz-tool-card`: branco, cantos de 20px, sem borda aparente e sem o pulo do hover),
 * com o nome no Baloo extra-negrito e a miniatura na caixa cinza-clara (`.sz-tool-cover`). A
 * borda na cor do TIPO saiu: o tipo fica no selo ao lado do nome (e no nome acessível).
 */
import type { JSX } from 'react'
import { memo } from 'react'
import type { MoldaAssetSummary } from '../../core/assetSummary'
import { COPY } from '../../core/copy'
import type { GalleryPreviews } from '../../state/galleryPreviews'
import { IconButton } from '../ui/Button'
import { Copy, Pencil, Trash2 } from '../ui/icons'
import { KindChip } from './kinds'
import { ProgressiveThumb } from './ProgressiveThumb'

export interface AssetCardProps {
  asset: MoldaAssetSummary
  previews: GalleryPreviews
  onOpen: (id: string) => void
  onRename: (asset: MoldaAssetSummary) => void
  onDuplicate: (asset: MoldaAssetSummary) => void
  onRemove: (asset: MoldaAssetSummary) => void
}

export const AssetCard = memo(function AssetCard({
  asset,
  previews,
  onOpen,
  onRename,
  onDuplicate,
  onRemove,
}: AssetCardProps): JSX.Element {
  const kindTitle = COPY.kinds[asset.kind].title
  return (
    <li className="mld-gallery-card sz-tool-card gap-2.5 p-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="sz-tool-card-title min-w-0 flex-1 truncate" title={asset.name}>
          {asset.name}
        </span>
        <KindChip kind={asset.kind} className="shrink-0" />
      </div>
      <button
        type="button"
        onClick={() => onOpen(asset.id)}
        aria-label={COPY.a11y.assetCard(asset.name, kindTitle)}
        className="sz-tool-cover aspect-[4/3] w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mld-accent"
      >
        <ProgressiveThumb summary={asset} previews={previews} />
      </button>
      <div className="flex items-center justify-between gap-1">
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
