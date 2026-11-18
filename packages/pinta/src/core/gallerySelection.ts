import { isTilesetKind, type PintaAsset, pintaAssetDependencyIds } from './project'

/**
 * Expande a seleção do PACK com as dependências visuais e propriedades tipadas, inclusive as
 * transitivas (mesma fonte de `assetBundleToJson`). A fila é limitada à galeria recebida e cada
 * id entra uma vez, mesmo em ciclos. Devolve os assets na ordem da
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
  const byId = new Map(assets.map((asset) => [asset.id, asset]))
  const autoIncluded: string[] = []
  for (const asset of assets) {
    if (selectedIds.has(asset.id)) wanted.add(asset.id)
  }
  const queue = assets.filter((a) => wanted.has(a.id))
  for (const asset of queue) {
    for (const dependencyId of pintaAssetDependencyIds(asset)) {
      if (wanted.has(dependencyId)) continue
      const dependency = byId.get(dependencyId)
      if (dependency) {
        wanted.add(dependency.id)
        if (isTilesetKind(dependency)) autoIncluded.push(dependency.id)
        queue.push(dependency)
      }
    }
  }
  const picked = assets.filter((asset) => wanted.has(asset.id))
  const tilesets = picked.filter((asset) => isTilesetKind(asset))
  const rest = picked.filter((asset) => !isTilesetKind(asset))
  return { assets: [...tilesets, ...rest], autoIncludedTilesetIds: autoIncluded }
}
