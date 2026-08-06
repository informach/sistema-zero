/**
 * Tamanho PERSONALIZADO dos wizards (Criar novo + Trazer uma foto): helpers
 * PUROS que traduzem os campos digitados na MESMA `sizeKey` string que o
 * `buildInput` já desserializa ("300x200" / "96" / "50x40") — o modelo, o
 * store e as fábricas ficam intocados (elas já clampam por conta própria).
 * Peças/tilesets ficam FORA de propósito: `createTilesetAsset` só aceita a
 * whitelist TILE_SIZES (fora dela cai para 16 em silêncio).
 */
import { PINTA_LIMITS, type PintaAssetKind } from '../../core/project'

export const CUSTOM_SIZE_KEY = 'custom'

export type CustomFieldId = 'width' | 'height' | 'frame' | 'cols' | 'rows'

export interface CustomSizeSpec {
  fields: readonly CustomFieldId[]
  min: number
  max: number
}

/** Valores CRUS digitados (strings) — a validação acontece em parseCustomInt. */
export type CustomSizeValues = Readonly<Record<CustomFieldId, string>>

export const EMPTY_CUSTOM_VALUES: CustomSizeValues = {
  width: '',
  height: '',
  frame: '',
  cols: '',
  rows: '',
}

/**
 * Faixas MOSTRADAS à criança (as fábricas mantêm os clamps delas). Piso 16 nos
 * cenários por sensatez kid (1×1 é uma armadilha); personagens/mapa usam os
 * limites reais do modelo.
 */
export function customSizeSpecFor(kind: PintaAssetKind): CustomSizeSpec | null {
  switch (kind) {
    case 'pixel-background':
      return { fields: ['width', 'height'], min: 16, max: PINTA_LIMITS.maxBitmapSize }
    case 'vector-background':
      // 2048 = o clamp literal de createVectorBackgroundAsset (projectConfig.ts).
      return { fields: ['width', 'height'], min: 16, max: 2048 }
    case 'pixel-sprite':
    case 'vector-sprite':
      return { fields: ['frame'], min: PINTA_LIMITS.minFrameSize, max: PINTA_LIMITS.maxFrameSize }
    case 'tilemap':
      return { fields: ['cols', 'rows'], min: 1, max: PINTA_LIMITS.maxTilemapCols }
    case 'tileset':
    case 'vector-tileset':
      return null
  }
}

/** Inteiro estrito dentro da faixa; `''`, '12abc', decimais e negativos → null. */
export function parseCustomInt(raw: string, min: number, max: number): number | null {
  const text = raw.trim()
  if (!/^\d+$/.test(text)) return null
  const value = Number(text)
  if (!Number.isFinite(value) || value < min || value > max) return null
  return value
}

/**
 * Monta a `sizeKey` no formato que o `buildInput` do wizard já lê. Qualquer
 * campo inválido → null (o Avançar desabilita).
 */
export function buildCustomSizeKey(kind: PintaAssetKind, values: CustomSizeValues): string | null {
  const spec = customSizeSpecFor(kind)
  if (!spec) return null
  const parsed = spec.fields.map((field) => parseCustomInt(values[field], spec.min, spec.max))
  if (parsed.some((value) => value === null)) return null
  if (spec.fields.length === 1) return String(parsed[0])
  return `${parsed[0]}x${parsed[1]}`
}

/**
 * Pré-preenche os campos a partir do preset selecionado no momento do toque
 * ("160x120" → largura 160, altura 120) — o formulário abre já válido.
 */
export function seedCustomValues(kind: PintaAssetKind, presetKey: string): CustomSizeValues {
  const spec = customSizeSpecFor(kind)
  if (!spec) return EMPTY_CUSTOM_VALUES
  const parts = presetKey.split('x')
  const seeded: Record<CustomFieldId, string> = { ...EMPTY_CUSTOM_VALUES }
  spec.fields.forEach((field, index) => {
    const part = parts[index] ?? ''
    seeded[field] = /^\d+$/.test(part) ? part : ''
  })
  return seeded
}
