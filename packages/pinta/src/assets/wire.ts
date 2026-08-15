import { type PintaAsset, type PintaBitmap, sanitizePintaAsset } from '../core/project'

/**
 * Representação JSON-safe usada nas bordas HTTP e no jsonb.
 *
 * `JSON.stringify` transforma typed arrays em objetos com chaves numéricas, que o
 * sanitizador rejeita. Na representação de transporte eles viram arrays simples;
 * `pintaAssetFromWire` restaura e valida os tipos canônicos na outra ponta.
 */
export function pintaAssetToWire(asset: PintaAsset): unknown {
  switch (asset.kind) {
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
        layers: asset.layers.map((layer) => ({ ...layer, cells: Array.from(layer.cells) })),
      }
    case 'vector-sprite':
    case 'vector-background':
    case 'vector-tileset':
      return { ...asset }
  }
}

/** Valida dados não confiáveis e devolve o asset canônico, com typed arrays restaurados. */
export function pintaAssetFromWire(raw: unknown): PintaAsset | null {
  return sanitizePintaAsset(raw)
}

function bitmapToWire(bitmap: PintaBitmap): Omit<PintaBitmap, 'data'> & { data: number[] } {
  return { ...bitmap, data: Array.from(bitmap.data) }
}
