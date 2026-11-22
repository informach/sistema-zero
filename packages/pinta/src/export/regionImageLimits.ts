import { PINTA_IMAGE_WORLD_LIMITS } from '@sistemazero/core/studio/pinta-image'
import { PINTA_STUDIO_LEGACY_LIMITS } from '@sistemazero/core/studio/pinta-limits'

/** The existing PNG-5 target budget, shared by its writer and encoded-image reader. */
export const PINTA_REGION_IMAGE_PNG_LIMITS = Object.freeze({
  dimension: PINTA_IMAGE_WORLD_LIMITS.dimension,
  imagePixels: PINTA_IMAGE_WORLD_LIMITS.imagePixels,
  totalImagePixels: PINTA_IMAGE_WORLD_LIMITS.totalImagePixels,
  imageBytes: 16 * 1024 * 1024,
  dataUrlChars: PINTA_STUDIO_LEGACY_LIMITS.imageChars,
})
