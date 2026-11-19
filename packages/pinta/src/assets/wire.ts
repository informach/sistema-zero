import {
  isTileLayer,
  type PintaAsset,
  type PintaBitmap,
  sanitizePintaAsset,
  type TilemapAsset,
  type TilemapTileLayer,
  withPintaSchemaStamp,
} from '../core/project'
import { packCells } from '../tiles/cellCodec'

/**
 * Representação JSON-safe usada nas bordas HTTP e no jsonb.
 *
 * `JSON.stringify` transforma typed arrays em objetos com chaves numéricas, que o
 * sanitizador rejeita. Na representação de transporte eles viram arrays simples;
 * `pintaAssetFromWire` restaura e valida os tipos canônicos na outra ponta.
 */
export function pintaAssetToWire(input: PintaAsset): unknown {
  // O carimbo `schema` sai sempre certo para o conteúdo: é ele que faz um código mais antigo
  // recusar o desenho em vez de cortar o que não conhece.
  const asset = withPintaSchemaStamp(input)
  switch (asset.kind) {
    case 'map-set':
      return { ...asset, map: pintaAssetToWire(asset.map) }
    case 'pixel-sprite':
      return {
        ...asset,
        animations: asset.animations.map((animation) => ({
          ...animation,
          frames: animation.frames.map((frame) => frame.map(bitmapToWire)),
        })),
      }
    case 'pixel-background':
      return { ...asset, cels: asset.cels.map(bitmapToWire) }
    case 'tileset':
      return { ...asset, tiles: asset.tiles.map(bitmapToWire) }
    case 'tilemap':
      return {
        ...asset,
        ...(asset.resources
          ? {
              resources: asset.resources.map((version) => ({
                ...version,
                asset: pintaAssetToWire(version.asset),
              })),
            }
          : {}),
        // Camada de objetos já é JSON puro (números, textos, sim/não).
        layers: asset.layers.map((layer) =>
          isTileLayer(layer) ? tileLayerToWire(layer, asset) : { ...layer },
        ),
      }
    case 'vector-sprite':
    case 'vector-background':
    case 'vector-tileset':
      return { ...asset }
  }
}

/** Mapas até este tamanho levam as células como lista de números, como sempre foi. */
const PLAIN_CELLS_MAX_SIDE = 128

/**
 * Uma camada de peças pronta para virar JSON. É o ÚNICO lugar que decide como as células
 * viajam: lista de números nos mapas de até 128 × 128 (o texto de um mapa que já existia não
 * muda), compactadas (`cellsPacked`) nos maiores.
 */
export function tileLayerToWire(
  layer: TilemapTileLayer,
  map: Pick<TilemapAsset, 'cols' | 'rows'>,
): Record<string, unknown> {
  if (map.cols <= PLAIN_CELLS_MAX_SIDE && map.rows <= PLAIN_CELLS_MAX_SIDE)
    return { ...layer, cells: Array.from(layer.cells) }
  const { cells, ...rest } = layer
  return { ...rest, cellsPacked: packCells(cells) }
}

/** Valida dados não confiáveis e devolve o asset canônico, com typed arrays restaurados. */
export function pintaAssetFromWire(raw: unknown): PintaAsset | null {
  return sanitizePintaAsset(raw)
}

function bitmapToWire(bitmap: PintaBitmap): Omit<PintaBitmap, 'data'> & { data: number[] } {
  return { ...bitmap, data: Array.from(bitmap.data) }
}
