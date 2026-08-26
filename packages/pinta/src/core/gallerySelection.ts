import { isTilesetKind, type PintaAsset } from './project'

/**
 * Expande a seleção do PACK com as dependências: um mapa selecionado leva o
 * TILESET dele junto (decisão da dona — sem a peça o mapa é recusado no
 * restauro; mesma régua do `assetBundleToJson`). Devolve os assets na ordem da
 * galeria com os tilesets PRIMEIRO (precedente do bundle; o `importAssets` já
 * religa por id em qualquer ordem — aqui é consistência, não contrato).
 *
 * Mapa cujo tileset não existe mais na galeria entra MESMO ASSIM — paridade com
 * o "Baixar tudo", que também não o filtra (o restauro avisa e pula o mapa).
 */
export interface ExpandedSelection {
  assets: PintaAsset[]
  /** Tilesets incluídos SEM estarem na seleção (a UI avisa por toast). */
  autoIncludedTilesetIds: string[]
}

export function expandSelection(
  assets: readonly PintaAsset[],
  selectedIds: ReadonlySet<string>,
): ExpandedSelection {
  const wanted = new Set<string>()
  const autoIncluded: string[] = []
  for (const asset of assets) {
    if (selectedIds.has(asset.id)) wanted.add(asset.id)
  }
  for (const asset of assets) {
    if (asset.kind !== 'tilemap' || !wanted.has(asset.id)) continue
    if (wanted.has(asset.tilesetId)) continue
    const tileset = assets.find((c) => isTilesetKind(c) && c.id === asset.tilesetId)
    if (tileset) {
      wanted.add(tileset.id)
      autoIncluded.push(tileset.id)
    }
  }
  const picked = assets.filter((asset) => wanted.has(asset.id))
  const tilesets = picked.filter((asset) => isTilesetKind(asset))
  const rest = picked.filter((asset) => !isTilesetKind(asset))
  return { assets: [...tilesets, ...rest], autoIncludedTilesetIds: autoIncluded }
}
