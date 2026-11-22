import { PINTA_IMAGE_WORLD_LIMITS } from './pinta-image'
import { PINTA_STUDIO_LEGACY_LIMITS } from './pinta-limits'

/** The existing PNG-5 target budget, shared by its writer and encoded-image reader. */
export const PINTA_REGION_IMAGE_PNG_LIMITS = Object.freeze({
  dimension: PINTA_IMAGE_WORLD_LIMITS.dimension,
  imagePixels: PINTA_IMAGE_WORLD_LIMITS.imagePixels,
  totalImagePixels: PINTA_IMAGE_WORLD_LIMITS.totalImagePixels,
  imageBytes: 16 * 1024 * 1024,
  dataUrlChars: PINTA_STUDIO_LEGACY_LIMITS.imageChars,
})

export const WORLD_BUDGET_MESSAGE =
  'Este cenário ficou grande demais para este ambiente. Diminua a escala ou use desenhos menores.'

export interface PintaRegionImageMetadataBudget {
  metadataBytes: number
  indexBytes: number
}
export interface PintaRegionWorldBudget extends PintaRegionImageMetadataBudget {
  imagePixels: number
}

export const PINTA_REGION_WORLD_BUDGET: Readonly<PintaRegionWorldBudget> = Object.freeze({
  metadataBytes: PINTA_IMAGE_WORLD_LIMITS.metadataBytes,
  indexBytes: PINTA_IMAGE_WORLD_LIMITS.cells * Int16Array.BYTES_PER_ELEMENT,
  imagePixels: PINTA_IMAGE_WORLD_LIMITS.totalImagePixels,
})

export function validPintaRegionImageMetadataBudget(
  budget: PintaRegionImageMetadataBudget,
): boolean {
  return (['metadataBytes', 'indexBytes'] as const).every(
    (key) =>
      Number.isSafeInteger(budget[key]) &&
      budget[key] >= 0 &&
      budget[key] <= PINTA_REGION_WORLD_BUDGET[key],
  )
}
