/**
 * As PEÇAS de um mapa com várias peças: o tileset padrão do mapa + os que as
 * camadas escolheram. Os renderizadores recebem `MapTilesets` — UM tileset (o
 * jeito antigo, que continua valendo para todo mapa de peças únicas) ou a lista
 * — e resolvem por aqui qual tileset desenha cada camada.
 *
 * Regra única: um tileset que não casa com o padrão (outro estilo ou outro
 * tamanho de peça, `isCompatibleMapTileset`) ou que não está na lista fica
 * `null`, e as camadas dele simplesmente não aparecem — nunca são desenhadas com
 * as peças erradas.
 */
import { withMapResourceVersions } from '../core/mapResourceVersions'
import {
  type AnyTilesetAsset,
  isCompatibleMapTileset,
  isTilesetKind,
  type PintaAsset,
  type TilemapAsset,
  type TilemapCells,
  tilemapTilesetIds,
} from '../core/project'
import type { DrawableTile } from './tilemapOps'

export type MapTilesets = AnyTilesetAsset | readonly AnyTilesetAsset[]

function listOf(source: MapTilesets): readonly AnyTilesetAsset[] {
  return Array.isArray(source) ? source : [source as AnyTilesetAsset]
}

function withVersionedTilesets(
  map: TilemapAsset<TilemapCells>,
  source: MapTilesets,
): readonly AnyTilesetAsset[] {
  const list = listOf(source)
  if (!map.resources?.length) return list
  const byId = new Map(list.map((tileset) => [tileset.id, tileset]))
  for (const version of map.resources)
    if (isTilesetKind(version.asset)) byId.set(version.asset.id, version.asset)
  return [...byId.values()]
}

/**
 * O tileset PADRÃO é o de mesmo id. Só o contrato denso conserva o fallback
 * histórico para quem passou uma folha sem conferir o id; regiões o recusam.
 */
export function primaryMapTileset(
  tilemap: TilemapAsset<TilemapCells>,
  source: MapTilesets,
): AnyTilesetAsset | null {
  const list = withVersionedTilesets(tilemap, source)
  return (
    list.find((tileset) => tileset.id === tilemap.tilesetId) ??
    ('origin' in tilemap ? null : (list[0] ?? null))
  )
}

/**
 * Um tileset (ou `null`) para cada id de `tilemapTilesetIds(tilemap)`, na mesma
 * ordem — é o índice que `flattenWithTilesets` grava em `sources`.
 */
export function resolveMapTilesets(
  tilemap: TilemapAsset<TilemapCells>,
  source: MapTilesets,
): Array<AnyTilesetAsset | null> {
  const list = withVersionedTilesets(tilemap, source)
  const primary = primaryMapTileset(tilemap, list)
  return tilemapTilesetIds(tilemap).map((id, index) => {
    if (index === 0) return primary
    const found = list.find((tileset) => tileset.id === id) ?? null
    return found && primary && isCompatibleMapTileset(primary, found) ? found : null
  })
}

/**
 * O filtro do achatado (`flattenWithTilesets`/`topTileAt`) para os tilesets RESOLVIDOS
 * (`resolveMapTilesets`, alinhados a `tilemapTilesetIds`): só vence a célula a peça que um
 * tileset achado tem. É o que faz o Pinta mostrar o mesmo que o atlas do pygame.
 */
export function drawableMapTile(
  tilemap: TilemapAsset<TilemapCells>,
  resolved: ReadonlyArray<AnyTilesetAsset | null>,
): DrawableTile {
  const byId = new Map<string, AnyTilesetAsset>()
  tilemapTilesetIds(tilemap).forEach((id, index) => {
    const tileset = resolved[index]
    if (tileset) byId.set(id, tileset)
  })
  return drawableIn(byId)
}

/** O mesmo filtro a partir de um mapa id → tileset (as peças que o editor achou). */
export function drawableIn(tilesets: ReadonlyMap<string, AnyTilesetAsset>): DrawableTile {
  return (tilesetId, tile) => {
    const tileset = tilesets.get(tilesetId)
    return tileset !== undefined && tile < tileset.tiles.length
  }
}

/**
 * As peças do mapa achadas na galeria, o PADRÃO primeiro e só as compatíveis.
 * Lista vazia = o mapa não tem as peças padrão (o chamador mostra "peças
 * sumiram", como sempre).
 */
export function collectMapTilesets(
  tilemap: TilemapAsset<TilemapCells>,
  findAsset: (id: string) => PintaAsset | null | undefined,
): AnyTilesetAsset[] {
  const find = withMapResourceVersions(tilemap, (id) => findAsset(id) ?? null)
  return collectTilesetsByIds(tilemapTilesetIds(tilemap), find)
}

/**
 * O mesmo, a partir da lista de ids (`tilemapTilesetIds`, a padrão primeiro) —
 * para quem memoiza pela LISTA de ids e não pelo mapa, que muda a cada pincelada.
 */
export function collectTilesetsByIds(
  ids: readonly string[],
  findAsset: (id: string) => PintaAsset | null | undefined,
): AnyTilesetAsset[] {
  const [primaryId, ...others] = ids
  const primary = primaryId ? findAsset(primaryId) : null
  if (!primary || !isTilesetKind(primary)) return []
  const out: AnyTilesetAsset[] = [primary]
  for (const id of others) {
    const found = findAsset(id)
    if (found && isTilesetKind(found) && isCompatibleMapTileset(primary, found)) out.push(found)
  }
  return out
}

/** `collectMapTilesets` sobre uma lista de assets (galeria, backup, pacote). */
export function collectMapTilesetsFrom(
  tilemap: TilemapAsset<TilemapCells>,
  assets: readonly PintaAsset[],
): AnyTilesetAsset[] {
  const byId = new Map(assets.map((asset) => [asset.id, asset]))
  return collectMapTilesets(tilemap, (id) => byId.get(id))
}
