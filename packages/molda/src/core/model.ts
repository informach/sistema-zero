/**
 * O modelo de dados do Molda — três criações numa união discriminada por `kind`:
 *
 * - **Modelo** (`model`): peças (cubo, rampa, cilindro, bola) numa grade inteira,
 *   cada uma com cor base e, por face, uma PELE opcional (bitmap indexado). Sai
 *   como `.glb` para o Estúdio.
 * - **Textura** (`texture`): uma folha quadrada indexada, "sem emenda". Sai como
 *   `.png` (asset `image`).
 * - **Céu** (`sky`): só parâmetros; o `.hdr` nasce no export.
 *
 * Índice 0 dos bitmaps: na TEXTURA é transparente (como no Pinta); na PELE de
 * uma face significa "usa a cor base da peça" (uma face nunca é transparente).
 */

import { DEFAULT_SKY_PRESET, type SkyParams, type SkyPresetId, skyPreset } from '../sky/params'
import { newId } from './id'
import { MOLDA_LIMITS, type TexelsPerUnit, type TextureSize } from './limits'
import { DEFAULT_PALETTE_ID, type PaletteId } from './palette'

export const MOLDA_ASSET_KINDS = ['model', 'texture', 'sky'] as const
export type MoldaAssetKind = (typeof MOLDA_ASSET_KINDS)[number]

export function isMoldaAssetKind(value: unknown): value is MoldaAssetKind {
  return typeof value === 'string' && (MOLDA_ASSET_KINDS as readonly string[]).includes(value)
}

export type Vec3 = [number, number, number]

/** Bitmap indexado, row-major, 1 byte por texel. */
export interface MoldaSkin {
  width: number
  height: number
  data: Uint8Array
}

export const SHAPE_IDS = ['box', 'wedge', 'cylinder', 'sphere'] as const
export type ShapeId = (typeof SHAPE_IDS)[number]

export function isShapeId(value: unknown): value is ShapeId {
  return typeof value === 'string' && (SHAPE_IDS as readonly string[]).includes(value)
}

export const FACE_IDS = [
  'px',
  'nx',
  'py',
  'ny',
  'pz',
  'nz',
  'slope',
  'side',
  'top',
  'bottom',
  'around',
] as const
export type FaceId = (typeof FACE_IDS)[number]

export const SNAPS = [1, 0.5] as const
export type MoldaSnap = (typeof SNAPS)[number]

export function isSnap(value: unknown): value is MoldaSnap {
  return value === 1 || value === 0.5
}

export interface MoldaPart {
  id: string
  /** Texto livre curto (não atravessa o Estúdio). */
  name: string
  shape: ShapeId
  /** Cantos da caixa, múltiplos do snap; `from < to` em cada eixo. */
  from: Vec3
  to: Vec3
  /** Pivô da rotação, dentro da caixa; ausente = o centro. */
  origin?: Vec3
  /** Graus, múltiplos de 15, em [0, 360). */
  rotation: Vec3
  /** Índice de paleta ≥ 1: a cor base das faces sem pele. */
  color: number
  /** Pele por face; ausente = só a cor base. */
  faces: Partial<Record<FaceId, MoldaSkin>>
  /** Gêmeo do espelho de modelagem: geometria e pele DERIVADAS da peça fonte. */
  mirrorOf?: string
}

export type MoldaAssetPaletteId = PaletteId | 'custom'

export interface MoldaCustomPalette {
  name: string
  /** 16 posições; `''` = slot vazio (preservado para os índices não deslocarem). */
  colors: readonly string[]
}

export interface MoldaAssetBase {
  id: string
  /** kebab-case: é o nome que os blocos do Estúdio referenciam. */
  name: string
  createdAt: number
  updatedAt: number
  /**
   * Miniatura PRONTA (data URL de imagem, ≤ `MOLDA_LIMITS.maxThumbChars`): o
   * modelo precisa de WebGL para ser desenhado, então o editor guarda a foto
   * junto do asset; a galeria e a nuvem só leem.
   */
  thumb?: string
}

export interface MoldaPaletteFields {
  paletteId: MoldaAssetPaletteId
  customPalette?: MoldaCustomPalette
  /** Cores extras (índices ≥ 16), até 48. Chave OMITIDA quando vazia. */
  extraColors?: string[]
}

export interface MoldaModelAsset extends MoldaAssetBase, MoldaPaletteFields {
  kind: 'model'
  texelsPerUnit: TexelsPerUnit
  snap: MoldaSnap
  mirrorX: boolean
  parts: MoldaPart[]
}

export interface MoldaTextureAsset extends MoldaAssetBase, MoldaPaletteFields {
  kind: 'texture'
  size: TextureSize
  /** `size × size`; índice 0 = transparente. */
  bitmap: MoldaSkin
  seamless: boolean
}

export interface MoldaSkyAsset extends MoldaAssetBase {
  kind: 'sky'
  params: SkyParams
}

export type MoldaAsset = MoldaModelAsset | MoldaTextureAsset | MoldaSkyAsset

// ── Fábricas ────────────────────────────────────────────────────────────────

export function createSkin(width: number, height: number): MoldaSkin {
  return { width, height, data: new Uint8Array(width * height) }
}

export function createPart(input: {
  name: string
  shape?: ShapeId
  from: Vec3
  to: Vec3
  color: number
  rotation?: Vec3
  id?: string
}): MoldaPart {
  return {
    id: input.id ?? newId(),
    name: input.name,
    shape: input.shape ?? 'box',
    from: [...input.from],
    to: [...input.to],
    rotation: input.rotation ? [...input.rotation] : [0, 0, 0],
    color: input.color,
    faces: {},
  }
}

/** Índice da cor de fábrica da primeira peça (o azul da arcade). */
const STARTER_COLOR = 8

export function createModelAsset(input: {
  name: string
  texelsPerUnit?: TexelsPerUnit
  snap?: MoldaSnap
  paletteId?: PaletteId
  /** `false` = nasce sem peça nenhuma (modelos prontos montam as suas). */
  starter?: boolean
  now?: number
}): MoldaModelAsset {
  const now = input.now ?? Date.now()
  return {
    id: newId(),
    kind: 'model',
    name: input.name,
    createdAt: now,
    updatedAt: now,
    paletteId: input.paletteId ?? DEFAULT_PALETTE_ID,
    texelsPerUnit: input.texelsPerUnit ?? 4,
    snap: input.snap ?? 1,
    mirrorX: false,
    // Uma caixa no centro do chão: a criança abre o editor e já tem algo para
    // mover, pintar e duplicar (uma cena vazia é uma tela em branco que assusta).
    parts:
      input.starter === false
        ? []
        : [createPart({ name: 'caixa', from: [-1, 0, -1], to: [1, 2, 1], color: STARTER_COLOR })],
  }
}

export function createTextureAsset(input: {
  name: string
  size: TextureSize
  paletteId?: PaletteId
  now?: number
}): MoldaTextureAsset {
  const now = input.now ?? Date.now()
  return {
    id: newId(),
    kind: 'texture',
    name: input.name,
    createdAt: now,
    updatedAt: now,
    paletteId: input.paletteId ?? DEFAULT_PALETTE_ID,
    size: input.size,
    bitmap: createSkin(input.size, input.size),
    seamless: true,
  }
}

export function createSkyAsset(input: {
  name: string
  preset?: SkyPresetId
  now?: number
}): MoldaSkyAsset {
  const now = input.now ?? Date.now()
  return {
    id: newId(),
    kind: 'sky',
    name: input.name,
    createdAt: now,
    updatedAt: now,
    params: skyPreset(input.preset ?? DEFAULT_SKY_PRESET),
  }
}

/** O que o "Criar novo" entrega (o nome já vem normalizado pela galeria). */
export type NewAssetInput =
  | { kind: 'model'; name: string; texelsPerUnit?: TexelsPerUnit }
  | { kind: 'texture'; name: string; size: TextureSize }
  | { kind: 'sky'; name: string; preset?: SkyPresetId }

export function createAsset(input: NewAssetInput, name: string): MoldaAsset {
  switch (input.kind) {
    case 'model':
      return createModelAsset({
        name,
        ...(input.texelsPerUnit ? { texelsPerUnit: input.texelsPerUnit } : {}),
      })
    case 'texture':
      return createTextureAsset({ name, size: input.size })
    case 'sky':
      return createSkyAsset({ name, ...(input.preset ? { preset: input.preset } : {}) })
  }
}

// ── Leituras de paleta ──────────────────────────────────────────────────────

export function hasPalette(asset: MoldaAsset): asset is MoldaModelAsset | MoldaTextureAsset {
  return asset.kind === 'model' || asset.kind === 'texture'
}

/** Só para conferir a forma de um registro desconhecido (borda/wire). */
export function isMoldaAssetLike(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return typeof record.id === 'string' && isMoldaAssetKind(record.kind)
}

export { MOLDA_LIMITS }
