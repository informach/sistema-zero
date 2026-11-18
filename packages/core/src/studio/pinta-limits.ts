/** Limites do contrato legado, usados pelo produtor e pelo consumidor. Não ampliam blocos publicados. */
export const PINTA_STUDIO_LEGACY_LIMITS = {
  imageChars: 800_000,
  sheetChars: 180_000,
  gridChars: 60_000,
  dimension: 128,
  tiles: 64,
} as const
