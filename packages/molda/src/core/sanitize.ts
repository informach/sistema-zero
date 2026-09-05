/**
 * `sanitizeMoldaAsset(raw)` é o PORTÃO ÚNICO por onde entra qualquer registro
 * vindo do disco, do backup, da nuvem ou de outro realm. Nunca lança: devolve
 * `null` quando o registro não é uma criação, e conserta o que dá para
 * consertar (peça inválida cai SEM derrubar o asset; pele com tamanho divergente
 * é re-amostrada; índice fora da paleta vira 0; gêmeo órfão perde o vínculo).
 *
 * ⚠️ Toda migração de formato mora AQUI (lazy, no load), nunca em massa.
 */
import { FACES_BY_SHAPE, faceSkinSize } from '../model/shapes'
import { clampSkinIndices, isSkinBlank, resampleSkin } from '../model/skinOps'
import { bakeTwins, syncTwins } from '../model/twins'
import { DEFAULT_SKY_PRESET, sanitizeSkyParams, skyPreset } from '../sky/params'
import { normalizeHex } from './color'
import { clampInt, isTexelsPerUnit, isTextureSize, MOLDA_LIMITS } from './limits'
import {
  type FaceId,
  isMoldaAssetKind,
  isShapeId,
  isSnap,
  type MoldaAsset,
  type MoldaAssetBase,
  type MoldaAssetPaletteId,
  type MoldaCustomPalette,
  type MoldaModelAsset,
  type MoldaPaletteFields,
  type MoldaPart,
  type MoldaSkin,
  type MoldaSkyAsset,
  type MoldaTextureAsset,
  type Vec3,
} from './model'
import { normalizeAssetName, normalizePartName } from './names'
import {
  DEFAULT_PALETTE_ID,
  firstPaintableIndex,
  getPalette,
  isPaletteId,
  PALETTE_SIZE,
  RESERVED_INDEX,
} from './palette'
import { base64ToBytes } from './skinCodec'

const MAX_ID_CHARS = 64
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

// ── Paleta ──────────────────────────────────────────────────────────────────

/**
 * Cores extras vindas do disco/import: cada uma normalizada, deduplicada e
 * cortada no teto. `undefined` (não `[]`) quando não há nenhuma válida.
 */
export function sanitizeExtraColors(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of raw) {
    if (typeof value !== 'string') continue
    const hex = normalizeHex(value)
    if (!hex || seen.has(hex)) continue
    seen.add(hex)
    out.push(hex)
    if (out.length >= MOLDA_LIMITS.maxExtraColors) break
  }
  return out.length > 0 ? out : undefined
}

/**
 * Paleta personalizada: 16 posições com os SLOTS PRESERVADOS (`''` = vazio;
 * compactar deslocaria os índices pintados), `[0]` sempre reservado. `null`
 * quando não sobra cor pintável.
 */
export function sanitizeCustomPalette(raw: unknown): MoldaCustomPalette | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (!Array.isArray(r.colors)) return null
  const colors: string[] = []
  let painted = 0
  for (let i = 0; i < PALETTE_SIZE; i += 1) {
    if (i === RESERVED_INDEX) {
      colors.push('')
      continue
    }
    const hex = typeof r.colors[i] === 'string' ? normalizeHex(r.colors[i] as string) : null
    if (hex) {
      colors.push(hex)
      painted += 1
    } else {
      colors.push('')
    }
  }
  if (painted === 0) return null
  const name =
    typeof r.name === 'string' && r.name.trim()
      ? r.name.trim().slice(0, MOLDA_LIMITS.maxNameChars)
      : 'Minha paleta'
  return { name, colors }
}

function sanitizePaletteFields(record: Record<string, unknown>): MoldaPaletteFields {
  const extraColors = sanitizeExtraColors(record.extraColors)
  const extra = extraColors ? { extraColors } : {}
  if (record.paletteId === 'custom') {
    const customPalette = sanitizeCustomPalette(record.customPalette)
    if (customPalette) return { paletteId: 'custom', customPalette, ...extra }
    return { paletteId: DEFAULT_PALETTE_ID, ...extra }
  }
  const paletteId: MoldaAssetPaletteId = isPaletteId(record.paletteId)
    ? record.paletteId
    : DEFAULT_PALETTE_ID
  return { paletteId, ...extra }
}

/** As cores EFETIVAS de uma criação com paleta (base ou custom + extras). */
export function resolvePaletteColors(fields: MoldaPaletteFields): readonly string[] {
  const base =
    fields.paletteId === 'custom' && fields.customPalette
      ? fields.customPalette.colors
      : getPalette(fields.paletteId).colors
  return fields.extraColors && fields.extraColors.length > 0
    ? [...base, ...fields.extraColors]
    : base
}

// ── Peles ───────────────────────────────────────────────────────────────────

function isFinitePositiveInt(value: unknown, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= max
}

/**
 * Uma pele vinda de fora. Aceita `data` como Uint8Array (structured clone),
 * array simples (JSON/outro realm) ou base64 (backup/nuvem). Tamanho máximo
 * generoso (128): peles legadas maiores que o teto atual são re-amostradas
 * pelo chamador, não descartadas.
 */
export function sanitizeSkin(raw: unknown, maxSide = 128): MoldaSkin | null {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as Record<string, unknown>
  if (!isFinitePositiveInt(b.width, maxSide) || !isFinitePositiveInt(b.height, maxSide)) return null
  const expected = b.width * b.height
  let data: Uint8Array | null = null
  if (b.data instanceof Uint8Array) {
    if (b.data.length !== expected) return null
    data = b.data
  } else if (
    Array.isArray(b.data) &&
    b.data.length === expected &&
    b.data.every((value) => typeof value === 'number' && Number.isFinite(value))
  ) {
    data = Uint8Array.from(b.data)
  } else if (typeof b.data === 'string') {
    const maxEncodedLength = Math.ceil(expected / 3) * 4
    if (b.data.length > maxEncodedLength) return null
    data = base64ToBytes(b.data)
  }
  if (!data || data.length !== expected) return null
  return { width: b.width, height: b.height, data }
}

// ── Base ────────────────────────────────────────────────────────────────────

function sanitizeTimestamps(raw: Record<string, unknown>): {
  createdAt: number
  updatedAt: number
} {
  const createdAt =
    typeof raw.createdAt === 'number' && Number.isFinite(raw.createdAt) ? raw.createdAt : 0
  const updatedAt =
    typeof raw.updatedAt === 'number' && Number.isFinite(raw.updatedAt) ? raw.updatedAt : createdAt
  return { createdAt, updatedAt }
}

function sanitizeThumb(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  if (!raw.startsWith('data:image/') || raw.length > MOLDA_LIMITS.maxThumbChars) return undefined
  return raw
}

function sanitizeBase(raw: Record<string, unknown>): MoldaAssetBase | null {
  if (typeof raw.id !== 'string' || !ID_PATTERN.test(raw.id) || raw.id.length > MAX_ID_CHARS) {
    return null
  }
  const name = typeof raw.name === 'string' ? normalizeAssetName(raw.name) : null
  if (!name) return null
  const thumb = sanitizeThumb(raw.thumb)
  return { id: raw.id, name, ...sanitizeTimestamps(raw), ...(thumb ? { thumb } : {}) }
}

// ── Peças ───────────────────────────────────────────────────────────────────

function vec3(raw: unknown): Vec3 | null {
  if (!Array.isArray(raw) || raw.length !== 3) return null
  const [x, y, z] = raw
  if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') return null
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null
  return [x, y, z]
}

function roundToSnap(value: number, snap: number): number {
  return Math.round(value / snap) * snap
}

const GRID_MIN: Vec3 = [-MOLDA_LIMITS.gridHalf, 0, -MOLDA_LIMITS.gridHalf]
const GRID_MAX: Vec3 = [MOLDA_LIMITS.gridHalf, MOLDA_LIMITS.gridHeight, MOLDA_LIMITS.gridHalf]

/**
 * `from`/`to` na grade: arredondados ao snap, dentro da grade, `from < to` por
 * eixo e lado ≤ `maxPartSize`. Uma caixa que não cabe é EMPURRADA para dentro
 * (nunca descartada só por estar na borda).
 */
export function normalizeBox(from: Vec3, to: Vec3, snap: number): { from: Vec3; to: Vec3 } {
  const a: Vec3 = [0, 0, 0]
  const b: Vec3 = [0, 0, 0]
  for (let i = 0; i < 3; i += 1) {
    const min = GRID_MIN[i] as number
    const max = GRID_MAX[i] as number
    let lo = roundToSnap(Math.min(from[i] as number, to[i] as number), snap)
    let hi = roundToSnap(Math.max(from[i] as number, to[i] as number), snap)
    if (hi - lo < snap) hi = lo + snap
    if (hi - lo > MOLDA_LIMITS.maxPartSize) hi = lo + MOLDA_LIMITS.maxPartSize
    if (hi > max) {
      const shift = hi - max
      hi -= shift
      lo -= shift
    }
    if (lo < min) {
      const shift = min - lo
      lo += shift
      hi = Math.min(max, hi + shift)
    }
    if (hi - lo < snap) hi = Math.min(max, lo + snap)
    a[i] = lo
    b[i] = hi
  }
  return { from: a, to: b }
}

export function normalizeRotation(raw: Vec3 | null): Vec3 {
  if (!raw) return [0, 0, 0]
  const step = (r: number): number => (((Math.round(r / 15) * 15) % 360) + 360) % 360
  return [step(raw[0]), step(raw[1]), step(raw[2])]
}

function clampOrigin(raw: Vec3 | null, from: Vec3, to: Vec3): Vec3 | undefined {
  if (!raw) return undefined
  return [
    Math.min(Math.max(raw[0], from[0]), to[0]),
    Math.min(Math.max(raw[1], from[1]), to[1]),
    Math.min(Math.max(raw[2], from[2]), to[2]),
  ]
}

function sanitizePart(
  raw: unknown,
  snap: number,
  texelsPerUnit: number,
  colors: readonly string[],
  fallbackName: string,
): MoldaPart | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || !ID_PATTERN.test(r.id)) return null
  if (!isShapeId(r.shape)) return null
  const from = vec3(r.from)
  const to = vec3(r.to)
  if (!from || !to) return null
  const box = normalizeBox(from, to, snap)
  const origin = clampOrigin(vec3(r.origin), box.from, box.to)
  const color =
    typeof r.color === 'number' &&
    Number.isInteger(r.color) &&
    r.color > RESERVED_INDEX &&
    r.color < colors.length &&
    colors[r.color]
      ? r.color
      : firstPaintableIndex(colors)
  const part: MoldaPart = {
    id: r.id,
    name: normalizePartName(r.name, fallbackName),
    shape: r.shape,
    from: box.from,
    to: box.to,
    rotation: normalizeRotation(vec3(r.rotation)),
    color,
    faces: {},
  }
  if (origin) part.origin = origin
  if (typeof r.mirrorOf === 'string' && ID_PATTERN.test(r.mirrorOf) && r.mirrorOf !== r.id) {
    part.mirrorOf = r.mirrorOf
  }
  const rawFaces =
    r.faces && typeof r.faces === 'object' ? (r.faces as Record<string, unknown>) : {}
  for (const face of FACES_BY_SHAPE[part.shape]) {
    if (!(face in rawFaces)) continue
    let skin = sanitizeSkin(rawFaces[face])
    if (!skin) continue
    const size = faceSkinSize(part, face, texelsPerUnit)
    if (!size) continue
    skin = resampleSkin(skin, size.width, size.height)
    skin = clampSkinIndices(skin, colors.length)
    if (isSkinBlank(skin)) continue
    part.faces[face as FaceId] = skin
  }
  return part
}

function sanitizeModel(raw: Record<string, unknown>, base: MoldaAssetBase): MoldaModelAsset {
  const palette = sanitizePaletteFields(raw)
  const colors = resolvePaletteColors(palette)
  const texelsPerUnit = isTexelsPerUnit(raw.texelsPerUnit) ? raw.texelsPerUnit : 4
  const snap = isSnap(raw.snap) ? raw.snap : 1
  const mirrorX = raw.mirrorX === true
  const seen = new Set<string>()
  const parts: MoldaPart[] = []
  const rawParts = Array.isArray(raw.parts) ? raw.parts : []
  for (const rawPart of rawParts) {
    if (parts.length >= MOLDA_LIMITS.maxParts) break
    const part = sanitizePart(rawPart, snap, texelsPerUnit, colors, `peca ${parts.length + 1}`)
    if (!part || seen.has(part.id)) continue
    seen.add(part.id)
    parts.push(part)
  }
  // Gêmeo só vale apontando para uma peça que EXISTE e que não é gêmea. Mesmo
  // com o espelho desligado o vínculo é mantido até `bakeTwins`: assim a pele
  // derivada é copiada antes de a peça virar independente.
  const sources = new Set(parts.filter((p) => !p.mirrorOf).map((p) => p.id))
  for (const part of parts) {
    if (part.mirrorOf && !sources.has(part.mirrorOf)) delete part.mirrorOf
  }
  const model: MoldaModelAsset = {
    ...base,
    kind: 'model',
    ...palette,
    texelsPerUnit,
    snap,
    mirrorX,
    parts,
  }
  return mirrorX ? syncTwins(model) : bakeTwins(model)
}

function sanitizeTexture(
  raw: Record<string, unknown>,
  base: MoldaAssetBase,
): MoldaTextureAsset | null {
  const palette = sanitizePaletteFields(raw)
  const colors = resolvePaletteColors(palette)
  const size = isTextureSize(raw.size) ? raw.size : null
  if (!size) return null
  let bitmap = sanitizeSkin(raw.bitmap)
  if (!bitmap) return null
  bitmap = clampSkinIndices(resampleSkin(bitmap, size, size), colors.length)
  return {
    ...base,
    kind: 'texture',
    ...palette,
    size,
    bitmap,
    seamless: raw.seamless !== false,
  }
}

function sanitizeSky(raw: Record<string, unknown>, base: MoldaAssetBase): MoldaSkyAsset {
  return {
    ...base,
    kind: 'sky',
    params: sanitizeSkyParams(raw.params) ?? skyPreset(DEFAULT_SKY_PRESET),
  }
}

/** O portão único. Nunca lança; `null` = não é uma criação legível. */
export function sanitizeMoldaAsset(raw: unknown): MoldaAsset | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  if (!isMoldaAssetKind(record.kind)) return null
  const base = sanitizeBase(record)
  if (!base) return null
  switch (record.kind) {
    case 'model':
      return sanitizeModel(record, base)
    case 'texture':
      return sanitizeTexture(record, base)
    case 'sky':
      return sanitizeSky(record, base)
    default:
      return null
  }
}

export { clampInt }
