/**
 * A "cara" de um asset: o que a miniatura da galeria mostra dele.
 *
 * Mora aqui, fora do `AssetCard`, porque não é só do card: o seletor
 * "Trazer um desenho" do editor de vetor insere EXATAMENTE o que a miniatura
 * mostra (é o que torna o seletor WYSIWYG), e o caminho de inserção precisa
 * destes dois em teste PURO, sem React.
 */
import { flattenCels } from '../pixel/layers'
import { type VectorShape, visibleShapes } from '../vector/model'
import type { PintaAsset, PintaBitmap } from './project'

/** Bitmap "cara" do asset para a miniatura (null = sem prévia raster). */
export function thumbnailBitmap(asset: PintaAsset): PintaBitmap | null {
  switch (asset.kind) {
    // Miniatura mostra o desenho VISÍVEL (camadas achatadas).
    case 'pixel-sprite': {
      const cels = asset.animations[0]?.frames[0]
      return cels ? flattenCels(cels, asset.layers) : null
    }
    case 'pixel-background':
      return flattenCels(asset.cels, asset.layers)
    case 'tileset':
      return asset.tiles[0] ?? null
    default:
      return null
  }
}

/** Documento vetorial "cara" do asset para a miniatura SVG (null = não vetor). */
export function thumbnailShapes(
  asset: PintaAsset,
): { width: number; height: number; shapes: VectorShape[] } | null {
  switch (asset.kind) {
    case 'vector-background':
      return { width: asset.width, height: asset.height, shapes: visibleShapes(asset.shapes) }
    case 'vector-sprite': {
      const frame = asset.animations[0]?.frames[0]
      if (!frame) return null
      return { width: asset.frameWidth, height: asset.frameHeight, shapes: visibleShapes(frame) }
    }
    case 'vector-tileset': {
      const tile = asset.tiles[0]
      if (!tile) return null
      return { width: asset.tileSize, height: asset.tileSize, shapes: visibleShapes(tile) }
    }
    default:
      return null
  }
}
