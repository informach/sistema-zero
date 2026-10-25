import { dataUrlHeadBytes, isGlbV2, PROJECT_ASSET_LIMITS } from './projectAssets'

/**
 * O que um modelo `.glb` traz por dentro, lido SÓ do cabeçalho (sem three, sem
 * GLTFLoader): os nomes das animações, se tem ossos e se a pintura se mexe.
 *
 * Serve ao seletor de animação dos blocos 3D e aos selos da aba "Modelos 3D".
 * Decodifica apenas o prefixo do base64 que cobre o cabeçalho GLB (12 bytes), o
 * cabeçalho do chunk 0 (8 bytes) e o JSON — o binário (geometria, imagens) nunca
 * é tocado.
 */
export interface GlbSummary {
  /** Nomes dos clipes, na ordem do arquivo; clipe sem nome vira `animation_<i>` (regra do GLTFLoader). */
  readonly clips: readonly string[]
  /** Tem `skins` (peças com ossos). */
  readonly skinned: boolean
  /** Algum material traz a pintura que se mexe do Molda (`extras.molda.flipbook.contract === 1`). */
  readonly animatedPaint: boolean
}

/** Teto do chunk JSON lido (bytes). Acima disso o resumo é `null`. */
export const GLB_SUMMARY_MAX_JSON_BYTES = 4 * 1024 * 1024
/** Teto de clipes por modelo. Acima disso o resumo é `null`. */
export const GLB_SUMMARY_MAX_CLIPS = 64
/**
 * Cabe o projeto inteiro: a aba "Modelos 3D" lê TODOS os modelos a cada render, e um LRU menor
 * que o número de modelos esvaziava o cache inteiro a cada volta (com 33 modelos, 0 acertos).
 */
const CACHE_LIMIT = PROJECT_ASSET_LIMITS.maxAssetsCount
const GLB_HEADER_BYTES = 12
const CHUNK_HEADER_BYTES = 8
/** `JSON` em uint32 LE. */
const CHUNK_TYPE_JSON = 0x4e4f534a

const cache = new Map<string, GlbSummary | null>()

/** FNV-1a de 32 bits sobre um trecho curto (só para a chave do cache). */
function shortHash(text: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

/**
 * Chave estável: id do asset (quando houver) + tamanho + hash do cabeçalho e do chunk JSON
 * INTEIRO (o tamanho dele sai dos 20 primeiros bytes) + hash do fim do base64 (o binário).
 * ⚠️ Era só o começo (512 chars): renomear um clipe no Molda para um nome do MESMO tamanho
 * (o id não muda no `updateAssetImage`) devolvia os clipes velhos, porque "animations" mora
 * no byte ~6500 do JSON. O JSON é o que o resumo lê, então é ele que entra no hash.
 */
function cacheKey(dataUrl: string, id: string | undefined): string {
  const comma = dataUrl.indexOf(',')
  const head = dataUrlHeadBytes(dataUrl, GLB_HEADER_BYTES + CHUNK_HEADER_BYTES)
  const declared =
    head && head.length >= GLB_HEADER_BYTES + 4 ? readUint32(head, GLB_HEADER_BYTES) : 0
  const jsonBytes = Math.min(declared, GLB_SUMMARY_MAX_JSON_BYTES)
  const jsonChars = Math.ceil((GLB_HEADER_BYTES + CHUNK_HEADER_BYTES + jsonBytes) / 3) * 4
  const json = dataUrl.slice(0, comma + 1 + jsonChars)
  const tail = dataUrl.slice(-128)
  return `${id ?? ''}|${dataUrl.length}|${shortHash(json)}|${shortHash(tail)}`
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] ?? 0) |
      ((bytes[offset + 1] ?? 0) << 8) |
      ((bytes[offset + 2] ?? 0) << 16) |
      ((bytes[offset + 3] ?? 0) << 24)) >>>
    0
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasAnimatedPaint(materials: unknown): boolean {
  if (!Array.isArray(materials)) return false
  return materials.some((material) => {
    if (!isRecord(material) || !isRecord(material.extras)) return false
    const molda = material.extras.molda
    if (!isRecord(molda) || !isRecord(molda.flipbook)) return false
    return molda.flipbook.contract === 1
  })
}

function clipNames(animations: unknown): string[] | null {
  if (animations === undefined) return []
  if (!Array.isArray(animations)) return null
  if (animations.length > GLB_SUMMARY_MAX_CLIPS) return null
  const names: string[] = []
  animations.forEach((animation, index) => {
    const raw = isRecord(animation) ? animation.name : undefined
    // GLTFLoader: `animationDef.name ? animationDef.name : 'animation_' + index`.
    // O nome INTEIRO: é o valor que vai ao bloco e que o runtime procura no modelo (cortar
    // aqui fazia o "tocar a animação" pedir um clipe que não existe). Quem encurta é o RÓTULO
    // do seletor (`FieldModelClipPicker`).
    const name = typeof raw === 'string' && raw !== '' ? raw : `animation_${index}`
    if (!names.includes(name)) names.push(name)
  })
  return names
}

function summarize(dataUrl: string): GlbSummary | null {
  const head = dataUrlHeadBytes(dataUrl, GLB_HEADER_BYTES + CHUNK_HEADER_BYTES)
  if (!head || head.length < GLB_HEADER_BYTES + CHUNK_HEADER_BYTES || !isGlbV2(head)) return null
  const jsonLength = readUint32(head, GLB_HEADER_BYTES)
  const chunkType = readUint32(head, GLB_HEADER_BYTES + 4)
  if (chunkType !== CHUNK_TYPE_JSON) return null
  if (jsonLength === 0 || jsonLength > GLB_SUMMARY_MAX_JSON_BYTES) return null
  const start = GLB_HEADER_BYTES + CHUNK_HEADER_BYTES
  const bytes = dataUrlHeadBytes(dataUrl, start + jsonLength)
  if (!bytes || bytes.length < start + jsonLength) return null
  let gltf: unknown
  try {
    gltf = JSON.parse(new TextDecoder().decode(bytes.subarray(start, start + jsonLength)))
  } catch {
    return null
  }
  if (!isRecord(gltf)) return null
  const clips = clipNames(gltf.animations)
  if (!clips) return null
  // Congelado: o mesmo objeto sai do cache para todos os chamadores.
  return Object.freeze({
    clips: Object.freeze(clips),
    skinned: Array.isArray(gltf.skins) && gltf.skins.length > 0,
    animatedPaint: hasAnimatedPaint(gltf.materials),
  })
}

/**
 * Resumo do `.glb` em data URL, ou `null` quando não é um GLB 2.0 legível dentro
 * dos tetos (JSON ≤ 4 MB, ≤ 64 clipes). Cache LRU do tamanho do teto de assets: o seletor e a
 * aba chamam isto a cada abertura sem decodificar de novo.
 *
 * @param id identificador estável do asset (opcional; entra na chave do cache).
 */
export function readGlbSummary(dataUrl: string, id?: string): GlbSummary | null {
  if (typeof dataUrl !== 'string' || dataUrl === '') return null
  const key = cacheKey(dataUrl, id)
  if (cache.has(key)) {
    const hit = cache.get(key) ?? null
    cache.delete(key)
    cache.set(key, hit)
    return hit
  }
  const summary = summarize(dataUrl)
  cache.set(key, summary)
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  return summary
}

/** Só para testes: esvazia o cache e diz quantas entradas ele tinha. */
export function clearGlbSummaryCache(): number {
  const size = cache.size
  cache.clear()
  return size
}

/** Só para testes: tamanho atual do cache. */
export function glbSummaryCacheSize(): number {
  return cache.size
}
