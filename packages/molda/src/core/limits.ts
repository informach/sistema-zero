/**
 * Tetos do pacote — fonte ÚNICA compartilhada por criação, edição, sanitize e
 * export (subir um teto sobe em todos os pontos, sem re-recorte ao reabrir).
 *
 * ⚠️ NÃO há teto de QUANTIDADE de criações na galeria (mesma decisão do Pinta,
 * "sem teto, igual o Estúdio"): o que limita é o orçamento local em bytes
 * (`maxGalleryBytes`) e, na nuvem, os tetos do members.
 */
export const MOLDA_LIMITS = {
  /** Peças por modelo. 128 peças = 1 malha no export, dentro dos orçamentos do runtime. */
  maxParts: 128,
  /** Maior lado de uma peça, em unidades da grade. */
  maxPartSize: 32,
  /** A grade: x e z em [-gridHalf, gridHalf]; y em [0, gridHeight] (o chão é y = 0). */
  gridHalf: 16,
  gridHeight: 32,
  /** Pele de uma face: texels por eixo. */
  minSkin: 4,
  maxSkin: 32,
  /** Texels por unidade da grade ("resolução da pele"). */
  texelsPerUnit: [2, 4, 8] as const,
  /** Lado máximo do atlas (potência de 2) no export. */
  atlasMax: 512,
  /** Lados possíveis de uma textura. */
  textureSizes: [16, 32, 64] as const,
  maxExtraColors: 48,
  maxNameChars: 48,
  maxPartNameChars: 24,
  /** Miniatura guardada no asset (data URL): o teto do `thumb` das creations do members. */
  maxThumbChars: 12_000,
  undoBudgetBytes: 16_000_000,
  /** Orçamento local da galeria (bytes crus dos assets no IndexedDB). */
  maxGalleryBytes: 96 * 1024 * 1024,
  /**
   * Espelhos dos tetos do Estúdio (`packages/studio/src/core/project.ts`):
   * `MAX_MODEL3D_DATA_URL_CHARS` (vale para `.glb` E `.hdr`) e
   * `MAX_ASSET_DATA_URL_CHARS` (imagem). Comentário recíproco lá.
   */
  studioMax3DChars: 7_000_000,
  studioMaxImageChars: 800_000,
} as const

export type TexelsPerUnit = (typeof MOLDA_LIMITS.texelsPerUnit)[number]
export type TextureSize = (typeof MOLDA_LIMITS.textureSizes)[number]

export function isTexelsPerUnit(value: unknown): value is TexelsPerUnit {
  return (MOLDA_LIMITS.texelsPerUnit as readonly number[]).includes(value as number)
}

export function isTextureSize(value: unknown): value is TextureSize {
  return (MOLDA_LIMITS.textureSizes as readonly number[]).includes(value as number)
}

export function clampInt(value: number, min: number, max: number): number {
  const rounded = Math.round(Number.isFinite(value) ? value : min)
  return Math.min(Math.max(rounded, min), max)
}

export function clampNumber(value: number, min: number, max: number): number {
  const finite = Number.isFinite(value) ? value : min
  return Math.min(Math.max(finite, min), max)
}
