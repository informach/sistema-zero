/**
 * O que o editor de mapa LÊ: o mapa aberto, a galeria (com os desenhos ligados ainda não
 * salvos por cima) e as peças do mapa.
 */
import { useMemo } from 'react'
import {
  type AnyTilesetAsset,
  isCompatibleMapTileset,
  isTilesetKind,
  type PintaAsset,
  type TilemapAsset,
  tilemapTilesetIds,
} from '../../../core/project'
import { collectTilesetsByIds } from '../../../tiles/mapTilesets'
import { usePintaGallery } from '../../appContext'
import { useEditor } from '../editorContext'

export interface MapModel {
  asset: PintaAsset
  tilemap: TilemapAsset | null
  galleryAssets: PintaAsset[]
  /** As peças do mapa (a padrão primeiro, só as compatíveis). */
  mapTilesets: AnyTilesetAsset[]
  tilesetById: Map<string, AnyTilesetAsset>
  /** As peças PADRÃO do mapa: tamanho da casa, estilo e o que a ponte leva. */
  baseTileset: AnyTilesetAsset | null
  /** Conjuntos de peças que uma camada pode escolher (mesmo estilo e tamanho de peça). */
  layerTilesetChoices: AnyTilesetAsset[]
}

export function useMapModel(): MapModel {
  const asset = useEditor((state) => state.asset)
  const savedGalleryAssets = usePintaGallery((state) => state.assets)
  const linkedAssets = useEditor((state) => state.linkedAssets)
  const resources =
    asset.kind === 'tilemap'
      ? asset.resources
      : asset.kind === 'map-set'
        ? asset.map.resources
        : undefined
  const galleryAssets = useMemo(() => {
    const byId = new Map(savedGalleryAssets.map((a) => [a.id, a]))
    for (const a of linkedAssets ?? []) byId.set(a.id, a)
    for (const version of resources ?? []) byId.set(version.asset.id, version.asset)
    return [...byId.values()]
  }, [savedGalleryAssets, linkedAssets, resources])
  const tilemap = asset.kind === 'tilemap' ? asset : null
  // Memoizadas pela LISTA de ids: o mapa muda a cada pincelada, as peças que ele usa quase nunca.
  const tilesetKey = tilemap ? tilemapTilesetIds(tilemap).join('\n') : ''
  const mapTilesets = useMemo(() => {
    if (!tilesetKey) return []
    const byId = new Map(galleryAssets.map((a) => [a.id, a]))
    return collectTilesetsByIds(tilesetKey.split('\n'), (id) => byId.get(id))
  }, [tilesetKey, galleryAssets])
  const tilesetById = useMemo(() => new Map(mapTilesets.map((t) => [t.id, t])), [mapTilesets])
  const baseTileset = mapTilesets[0] ?? null
  const layerTilesetChoices = useMemo(
    () =>
      baseTileset
        ? galleryAssets.filter(
            (a): a is AnyTilesetAsset => isTilesetKind(a) && isCompatibleMapTileset(baseTileset, a),
          )
        : [],
    [galleryAssets, baseTileset],
  )
  return {
    asset,
    tilemap,
    galleryAssets,
    mapTilesets,
    tilesetById,
    baseTileset,
    layerTilesetChoices,
  }
}
