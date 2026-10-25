/**
 * Fixtures de bitmap como STRINGS legíveis: '.' = transparente (0), '1'–'9' =
 * índices 1–9, 'a'–'f' = 10–15 ('X' é apelido do 1). `rows()` faz o caminho
 * inverso para asserções por snapshot visual. A leitura delega ao parser dos
 * MODELOS PRONTOS (`templates/art.ts`) — uma implementação só.
 */
import {
  isTileLayer,
  type PintaBitmap,
  type TilemapAsset,
  type TilemapTileLayer,
} from '../core/project'
import { bitmapFromArt } from '../templates/art'

export const bmp = bitmapFromArt

function indexToChar(index: number): string {
  if (index === 0) return '.'
  if (index <= 9) return String.fromCharCode(48 + index)
  if (index <= 15) return String.fromCharCode(87 + index)
  return '?'
}

export function rows(bitmap: PintaBitmap): string[] {
  const out: string[] = []
  for (let y = 0; y < bitmap.height; y += 1) {
    let line = ''
    for (let x = 0; x < bitmap.width; x += 1) {
      line += indexToChar(bitmap.data[y * bitmap.width + x] ?? 0)
    }
    out.push(line)
  }
  return out
}

/** A camada de PEÇAS na posição (lança se for de objetos): os testes escrevem células nela. */
export function tileLayerAt(map: TilemapAsset, index = 0): TilemapTileLayer {
  const layer = map.layers[index]
  if (!layer || !isTileLayer(layer)) throw new Error(`camada de peças ${index} esperada`)
  return layer
}
