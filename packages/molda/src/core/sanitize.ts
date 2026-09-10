/**
 * `sanitizeMoldaAsset(raw)` é o PORTÃO ÚNICO por onde entra qualquer registro
 * vindo do disco, do backup, da nuvem ou de outro realm. Nunca lança: devolve
 * `null` quando o registro não é uma criação, e conserta o que dá para
 * consertar (peça inválida cai SEM derrubar o asset; pele com tamanho divergente
 * é re-amostrada; índice fora da paleta vira 0; gêmeo órfão perde o vínculo).
 *
 * Compatibilidade/reparo do formato 1 apenas. Formatos seguintes têm parser próprio;
 * nunca arredondar ou descartar seus dados através deste sanitizer legado.
 */
import { partTriangleCount } from '../model/geometry'
import {
  isMeshFaceKey,
  isMeshVertexKey,
  meshBox,
  normalizeMesh,
  roundMesh,
  translateMesh,
} from '../model/mesh'
import { faceSkinSize, partFaces } from '../model/shapes'
import { clampSkinIndices, isSkinBlank, resampleSkin } from '../model/skinOps'
import { bakeTwins, syncTwins } from '../model/twins'
import { DEFAULT_SKY_PRESET, sanitizeSkyParams, skyPreset } from '../sky/params'
import { normalizeHex } from './color'
import { checkMoldaDocumentVersion } from './documentVersion'
import { isMoldaAssetId } from './id'
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
  type MoldaMesh,
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
  if (!isMoldaAssetId(raw.id)) {
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

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step
}

const GRID_MIN: Vec3 = [-MOLDA_LIMITS.gridHalf, 0, -MOLDA_LIMITS.gridHalf]
const GRID_MAX: Vec3 = [MOLDA_LIMITS.gridHalf, MOLDA_LIMITS.gridHeight, MOLDA_LIMITS.gridHalf]

/**
 * `from`/`to` na grade: posição em 1/16, tamanho no `sizeStep`, `from < to` por
 * eixo e lado ≤ `maxPartSize`. Uma caixa que não cabe é EMPURRADA para dentro
 * (nunca descartada só por estar na borda). O `sizeStep` é o encaixe da ação;
 * o sanitize usa meio bloco, o menor tamanho persistido aceito.
 */
export function normalizeBox(from: Vec3, to: Vec3, sizeStep: number): { from: Vec3; to: Vec3 } {
  const a: Vec3 = [0, 0, 0]
  const b: Vec3 = [0, 0, 0]
  for (let i = 0; i < 3; i += 1) {
    const min = GRID_MIN[i] as number
    const max = GRID_MAX[i] as number
    let lo = roundToStep(
      Math.min(from[i] as number, to[i] as number),
      MOLDA_LIMITS.positionPrecision,
    )
    const rawSize = Math.abs((to[i] as number) - (from[i] as number))
    const size = Math.min(
      Math.max(roundToStep(rawSize, sizeStep), sizeStep),
      MOLDA_LIMITS.maxPartSize,
    )
    let hi = lo + size
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
    if (hi - lo < sizeStep) hi = Math.min(max, lo + sizeStep)
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
    Math.min(Math.max(roundToStep(raw[0], MOLDA_LIMITS.positionPrecision), from[0]), to[0]),
    Math.min(Math.max(roundToStep(raw[1], MOLDA_LIMITS.positionPrecision), from[1]), to[1]),
    Math.min(Math.max(roundToStep(raw[2], MOLDA_LIMITS.positionPrecision), from[2]), to[2]),
  ]
}

/**
 * A malha vinda de fora: vértices finitos (na precisão do disco), faces de 3 ou 4
 * chaves que existem, chaves no padrão; a face quebrada cai sem derrubar a malha e
 * os tetos por peça valem. `null` sem face nenhuma.
 */
export function sanitizeMesh(raw: unknown): MoldaMesh | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (!r.vertices || typeof r.vertices !== 'object' || !r.faces || typeof r.faces !== 'object') {
    return null
  }
  const vertices: Record<string, Vec3> = {}
  let vertexCount = 0
  for (const [key, value] of Object.entries(r.vertices as Record<string, unknown>)) {
    if (vertexCount >= MOLDA_LIMITS.maxMeshVertices) break
    if (!isMeshVertexKey(key)) continue
    const v = vec3(value)
    if (!v) continue
    vertices[key] = v
    vertexCount += 1
  }
  const faces: MoldaMesh['faces'] = {}
  let faceCount = 0
  for (const [key, value] of Object.entries(r.faces as Record<string, unknown>)) {
    if (faceCount >= MOLDA_LIMITS.maxMeshFaces) break
    if (!isMeshFaceKey(key) || !value || typeof value !== 'object') continue
    const cycle = (value as { v?: unknown }).v
    if (!Array.isArray(cycle) || cycle.length < 3 || cycle.length > 4) continue
    if (!cycle.every((k) => typeof k === 'string' && k in vertices)) continue
    faces[key] = { v: cycle as string[] }
    faceCount += 1
  }
  const looseEdges: Array<readonly [string, string]> = []
  if (Array.isArray(r.looseEdges)) {
    for (const value of r.looseEdges) {
      if (looseEdges.length >= MOLDA_LIMITS.maxMeshLooseEdges) break
      if (!Array.isArray(value) || value.length !== 2) continue
      const [a, b] = value
      if (typeof a !== 'string' || typeof b !== 'string' || !(a in vertices) || !(b in vertices)) {
        continue
      }
      looseEdges.push([a, b])
    }
  }
  const mesh = normalizeMesh(roundMesh({ vertices, faces, looseEdges }))
  return Object.keys(mesh.faces).length > 0 || (mesh.looseEdges?.length ?? 0) > 0 ? mesh : null
}

/**
 * Cabe na grade? A malha é EMPURRADA para dentro quando dá (como a caixa em
 * `normalizeBox`); maior que a grade ou que `maxPartSize` num eixo, cai.
 */
function fitMeshToGrid(mesh: MoldaMesh): { mesh: MoldaMesh; from: Vec3; to: Vec3 } | null {
  const box = meshBox(mesh)
  if (!box) return null
  const shift: Vec3 = [0, 0, 0]
  for (let i = 0; i < 3; i += 1) {
    const size = (box.to[i] as number) - (box.from[i] as number)
    const min = GRID_MIN[i] as number
    const max = GRID_MAX[i] as number
    if (size > MOLDA_LIMITS.maxPartSize || size > max - min) return null
    if ((box.to[i] as number) > max) shift[i] = max - (box.to[i] as number)
    if ((box.from[i] as number) + (shift[i] as number) < min) {
      shift[i] = min - (box.from[i] as number)
    }
  }
  const moved = shift.some((value) => value !== 0) ? translateMesh(mesh, shift) : mesh
  const fitted = meshBox(moved)
  if (!fitted) return null
  return { mesh: moved, from: fitted.from, to: fitted.to }
}

function sanitizePart(
  raw: unknown,
  texelsPerUnit: number,
  colors: readonly string[],
  fallbackName: string,
): MoldaPart | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (!isMoldaAssetId(r.id)) return null
  if (!isShapeId(r.shape)) return null
  let box: { from: Vec3; to: Vec3 }
  let mesh: MoldaMesh | undefined
  if (r.shape === 'mesh') {
    // `from`/`to` são derivados da malha: a caixa gravada é ignorada de propósito.
    const sanitized = sanitizeMesh(r.mesh)
    if (!sanitized) return null
    const fitted = fitMeshToGrid(sanitized)
    if (!fitted) return null
    mesh = fitted.mesh
    box = { from: fitted.from, to: fitted.to }
  } else {
    const from = vec3(r.from)
    const to = vec3(r.to)
    if (!from || !to) return null
    box = normalizeBox(from, to, 0.5)
  }
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
  if (mesh) part.mesh = mesh
  if (r.locked === true) part.locked = true
  if (r.hidden === true) part.hidden = true
  if (isMoldaAssetId(r.mirrorOf) && r.mirrorOf !== r.id) {
    part.mirrorOf = r.mirrorOf
  }
  const rawFaces =
    r.faces && typeof r.faces === 'object' ? (r.faces as Record<string, unknown>) : {}
  for (const face of partFaces(part)) {
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
  let triangles = 0
  for (const rawPart of rawParts) {
    if (parts.length >= MOLDA_LIMITS.maxParts) break
    const part = sanitizePart(rawPart, texelsPerUnit, colors, `peca ${parts.length + 1}`)
    if (!part || seen.has(part.id)) continue
    // Orçamento de TRIÂNGULOS do modelo (a malha é quem pode estourar): a peça que
    // passa do teto cai, as anteriores ficam.
    const count = partTriangleCount(part)
    if (triangles + count > MOLDA_LIMITS.maxTriangles) continue
    triangles += count
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
  const version = checkMoldaDocumentVersion(raw)
  if (version.status !== 'supported' || version.version !== 1) return null
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
