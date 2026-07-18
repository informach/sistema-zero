import type { SZIR } from '#ir'
import type { IDEMode } from './modes'
import type { ProjectKind, ProjectTree, ProProjectMeta } from './proProject'

export interface ProjectFiles {
  'index.html': string
  'style.css': string
  'script.js': string
}

export type ExtraFileLanguage = 'html' | 'css' | 'javascript' | 'typescript'

export interface ExtraFile {
  /** Nome do arquivo com extensão (ex.: `utils.js`, `cores.css`). Único no projeto. */
  name: string
  language: ExtraFileLanguage
  content: string
}

export interface InstalledExtension {
  id: string
  version: string
  installedAt: number
}

/** Uma animação nomeada de uma spritesheet (vinda do Pinta). */
export interface ProjectSpriteAnim {
  /** Nome escolhido no Pinta (ex.: `andar`, `pular`) — o rótulo do seletor. */
  name: string
  /** Índices row-major na folha INTEIRA (os mesmos que o runtime do Jogo 2D usa). */
  from: number
  to: number
  fps: number
  loop: boolean
}

/** Metadados de SPRITESHEET de um asset: geometria do quadro + animações nomeadas. */
export interface ProjectSpriteMeta {
  frameW: number
  frameH: number
  animations: ProjectSpriteAnim[]
}

/** Metadados de TILESET de um asset: tamanho do tile + tiles sólidos (colisão). */
export interface ProjectTilesetMeta {
  tileSize: number
  /** Índices de tile SÓLIDOS — subconjunto ordenado/deduplicado (colisão do mapa). */
  solid: number[]
  /**
   * Índices de tile PLATAFORMA (one-way: pisa por cima, atravessa por baixo).
   * OMITIDO quando vazio (payload antigo sem plataforma fica byte-idêntico).
   */
  platform?: number[]
}

/**
 * Folha de peças EMBUTIDA no metadado de MAPA — auto-contida de propósito: a
 * criança pode nunca ter enviado o tileset separado, e referência por nome a
 * outro asset quebraria com rename/exclusão.
 */
export interface ProjectTilemapTilesetMeta {
  /** `data:image/...` da folha de peças (teto próprio, menor que o do asset). */
  dataUrl: string
  width: number
  height: number
}

/**
 * Metadados de MAPA DE TILES de um asset (vindos do Pinta ou do fatiador de
 * upload): a grade jogável + a folha de peças embutida. Alimenta o bloco
 * "Criar mapa do meu desenho" — e, ao contrário de `sprite`/`tileset`, VAI ao
 * preview (via `__SZGAME_ASSET_META`), porque o runtime monta o mapa com ele.
 * O `dataUrl` do PRÓPRIO asset segue sendo o PNG achatado do mapa (miniatura).
 */
export interface ProjectTilemapMeta {
  /** Tamanho do tile na ARTE, em px (o runtime encaixa na tela sozinho). */
  tileSize: number
  cols: number
  rows: number
  /** MESMO formato do bloco clássico: células por espaço, linhas por `;`, `.` = vazio. */
  grid: string
  /** Índices de tile sólidos (colisão), deduplicados/ordenados. */
  solid: number[]
  /**
   * Índices de tile PLATAFORMA (one-way). OMITIDO quando vazio (retrocompat
   * byte-idêntica com payloads antigos sem plataforma).
   */
  platform?: number[]
  tileset: ProjectTilemapTilesetMeta
}

/**
 * Asset embutido no projeto (Fase "Studio rico"). Imagens (e, no futuro, áudio)
 * que o aluno envia do computador ou escolhe da biblioteca. Guardadas como `data:`
 * URL — autossuficientes, offline, sem servidor; passam na CSP do preview
 * (`img-src data:`) e exportam no ZIP. Campo `Project.assets?` é OPCIONAL
 * (retrocompatível: projetos legados não têm).
 */
export interface ProjectAsset {
  /** Estável (gerado no browser). Fallback de saneamento: o próprio `name`. */
  id: string
  /** Nome único amigável, kebab-case, referenciado pelos blocos (ex.: `heroi`). */
  name: string
  /**
   * Imagem (desenho/sprite), áudio (som/música importado) ou binário 3D:
   * `model3d` (modelo GLB) / `environment3d` (céu HDR). Os 3D são carregados
   * pelo runtime do Jogo 3D Avançado via `.parse()` (nunca por fetch — a rede
   * é bloqueada no preview).
   */
  kind: 'image' | 'audio' | 'model3d' | 'environment3d'
  /**
   * `data:image/...;base64,...` (imagem), `data:audio/...;base64,...` (áudio) ou
   * `data:model|image/...;base64,...` (3D) — validado: o prefixo precisa casar
   * com o `kind` (ver `isValidAssetDataUrl`).
   */
  dataUrl: string
  /**
   * Nome do arquivo original (ex.: `nave.glb`). Só nos assets 3D, onde a
   * EXTENSÃO é sinal de tipo: `isValidAssetDataUrl` cruza extensão × MIME ×
   * assinatura binária, então um `.glb` com bytes de HDR é recusado.
   */
  originalFileName?: string
  width?: number
  height?: number
  source: 'upload' | 'library'
  /** Quando veio da biblioteca embutida (starter pack). */
  libId?: string
  /**
   * Metadados de SPRITESHEET vindos do Pinta (animações nomeadas com faixa de
   * quadros/fps). Alimenta o SELETOR de animação por nome no bloco "Animar sprite"
   * (sem ele a criança digita from/to à mão — fallback). Opcional: asset legado /
   * de upload / sem metadado não tem. NÃO vai ao preview (só o `dataUrl` roda).
   */
  sprite?: ProjectSpriteMeta
  /** Metadados de TILESET vindos do Pinta (tamanho + tiles sólidos) — seletor de sólidos. */
  tileset?: ProjectTilesetMeta
  /**
   * Metadados de MAPA DE TILES (grade + folha embutida). Diferente dos outros
   * metas, ESTE vai ao preview (`__SZGAME_ASSET_META`) — o bloco "Criar mapa do
   * meu desenho" monta o mapa inteiro a partir dele em runtime.
   */
  tilemap?: ProjectTilemapMeta
}

/** Teto defensivo de nome (a UI já normaliza; aqui é só anti-lixo). */
const MAX_ASSET_NAME_CHARS = 48
/**
 * Teto do `dataUrl` de UM asset (chars do data: URL). ~800 mil chars ≈ 580 KB de
 * binário após o inflar do base64 (a UI faz downscale/compressão antes; isto é a
 * cerca anti-inchaço do save/quota). Subido ~2x (2026-06) p/ projetos maiores.
 * ⚠️ Manter em sincronia com STUDIO_MAX_ASSET_CHARS do Pinta
 * (packages/pinta/src/components/editor/EditorScreen.tsx) — a ponte "Usar no
 * Estúdio" valida lá primeiro para dar a mensagem gentil; mudar aqui sem lá
 * faria o Pinta recusar o que o Estúdio aceitaria (ou vice-versa).
 */
const MAX_ASSET_DATA_URL_CHARS = 800_000
/**
 * Teto do `dataUrl` de UM asset de ÁUDIO (som/música importado). ~7 mi chars ≈
 * 5 MB de binário — cobre efeitos curtos E uma música inteira. Bem maior que o
 * de imagem porque áudio não tem downscale (o arquivo entra como veio). Áudio
 * não passa pelo Pinta, então não há sincronia a manter.
 */
const MAX_AUDIO_DATA_URL_CHARS = 7_000_000
/**
 * Teto do `dataUrl` de UM binário 3D (modelo GLB / céu HDR). ~7 mi chars ≈ 5 MB,
 * o mesmo do áudio: um GLB de criança (poucos milhares de tris, textura embutida
 * pequena) cabe folgado, e o teto de IMAGEM (~580 KB) mataria qualquer modelo de
 * verdade. Com o orçamento total de ~24 MB dá p/ ~4 modelos por projeto.
 */
const MAX_MODEL3D_DATA_URL_CHARS = 7_000_000
/** Orçamento total de assets do projeto (~24 MB de binário inflado em base64;
 * subido de ~8 MB em 2026-07 p/ caber sons importados de até ~5 MB). */
const MAX_ASSETS_TOTAL_CHARS = 33_000_000
/** Teto de quantidade de assets por projeto (defesa anti-DoS no load). */
const MAX_ASSETS_COUNT = 128
/** Tetos do metadado (anti-DoS; o metadado NÃO conta na cota de `dataUrl`). */
const MAX_SPRITE_ANIMS = 32
const MAX_TILESET_SOLID = 64
const MAX_ANIM_NAME_CHARS = 48
/**
 * Tetos do metadado de MAPA. A folha embutida tem teto PRÓPRIO (menor que o do
 * asset): a folha máxima real do Pinta (64 peças × 32 px) fica bem abaixo;
 * 180k chars ≈ 131 KB de binário dá folga p/ vetor rasterizado.
 * ⚠️ Manter em sincronia com STUDIO_MAX_TILEMAP_SHEET_CHARS do Pinta
 * (packages/pinta/src/components/editor/EditorScreen.tsx — valida antes p/ dar
 * a mensagem gentil).
 */
const MAX_TILEMAP_SHEET_CHARS = 180_000
/** Grade 100×100 do Pinta ≈ 30–40k chars; 60k = folga. */
const MAX_TILEMAP_GRID_CHARS = 60_000
/** Colunas/linhas do mapa (o Pinta capa em 100). */
const MAX_TILEMAP_DIM = 128

const ASSET_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/
const ASSET_DATA_URL_PREFIX = 'data:image/'
const AUDIO_DATA_URL_PREFIX = 'data:audio/'
/**
 * Assets 3D: cada kind tem MIME, extensão e ASSINATURA binária próprios, e os
 * três precisam concordar (ver `isValidAssetDataUrl`). Um `.glb` com bytes de
 * HDR — ou um GLB versão 1, que o three não abre — é recusado na porta.
 * ⚠️ KTX2/Draco ficam de FORA de propósito: o transcoder é WebAssembly e a CSP
 * do preview não tem `wasm-unsafe-eval` (decisão de segurança infantil), então
 * seriam assets que VALIDAM mas nunca CARREGAM.
 */
const ASSET_3D_SPECS = {
  model3d: { mime: 'data:model/gltf-binary', ext: '.glb' },
  environment3d: { mime: 'data:image/vnd.radiance', ext: '.hdr' },
} as const

type Asset3DKind = keyof typeof ASSET_3D_SPECS

function isAsset3DKind(value: unknown): value is Asset3DKind {
  return value === 'model3d' || value === 'environment3d'
}

/** Decodifica só o COMEÇO do base64 (o header basta p/ a assinatura). */
function dataUrlHeadBytes(value: string, count: number): Uint8Array | null {
  const comma = value.indexOf(',')
  if (comma < 0) return null
  // 4 chars de base64 = 3 bytes; pega com folga e corta depois.
  const chunk = value.slice(comma + 1, comma + 1 + Math.ceil(count / 3) * 4 + 4)
  try {
    const bin = atob(chunk)
    const n = Math.min(count, bin.length)
    const out = new Uint8Array(n)
    for (let i = 0; i < n; i++) out[i] = bin.charCodeAt(i)
    return out
  } catch {
    return null
  }
}

function startsWithBytes(bytes: Uint8Array, sig: readonly number[]): boolean {
  if (bytes.length < sig.length) return false
  for (let i = 0; i < sig.length; i++) if (bytes[i] !== sig[i]) return false
  return true
}

/** `glTF` + versão 2 em uint32 LE. Versão 1 é recusada (o three não abre). */
function isGlbV2(bytes: Uint8Array): boolean {
  if (!startsWithBytes(bytes, [0x67, 0x6c, 0x54, 0x46])) return false
  if (bytes.length < 8) return false
  const b0 = bytes[4] ?? 0
  const b1 = bytes[5] ?? 0
  const b2 = bytes[6] ?? 0
  const b3 = bytes[7] ?? 0
  return (b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)) === 2
}

/** `#?RADIANCE` (assinatura do .hdr). */
function isRadianceHdr(bytes: Uint8Array): boolean {
  return startsWithBytes(bytes, [0x23, 0x3f, 0x52, 0x41, 0x44, 0x49, 0x41, 0x4e, 0x43, 0x45])
}

function hasValid3DSignature(kind: Asset3DKind, value: string): boolean {
  const bytes = dataUrlHeadBytes(value, 16)
  if (!bytes) return false
  return kind === 'model3d' ? isGlbV2(bytes) : isRadianceHdr(bytes)
}

function toPositiveInt(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : null
}
function toNonNegativeInt(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : null
}

/**
 * Valida/normaliza os metadados de SPRITESHEET de um asset (vindos do Pinta ou de
 * um Project não confiável). Metadado inválido → `undefined` (o asset NUNCA cai por
 * causa dele; o seletor cai no fallback manual). Exportado p/ o Studio ser o dono
 * do formato — a biblioteca pessoal reusa este mesmo portão.
 */
export function sanitizeSpriteMeta(raw: unknown): ProjectSpriteMeta | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const r = raw as Record<string, unknown>
  const frameW = toPositiveInt(r.frameW)
  const frameH = toPositiveInt(r.frameH)
  if (frameW === null || frameH === null || !Array.isArray(r.animations)) return undefined
  const animations: ProjectSpriteAnim[] = []
  const seen = new Set<string>()
  for (const item of r.animations) {
    if (animations.length >= MAX_SPRITE_ANIMS) break
    if (!item || typeof item !== 'object') continue
    const a = item as Record<string, unknown>
    const name = typeof a.name === 'string' ? a.name.trim().slice(0, MAX_ANIM_NAME_CHARS) : ''
    if (!name || seen.has(name)) continue
    const from = toNonNegativeInt(a.from)
    const to = toNonNegativeInt(a.to)
    const fps = toPositiveInt(a.fps)
    if (from === null || to === null || fps === null || to < from) continue
    seen.add(name)
    animations.push({ name, from, to, fps, loop: a.loop === true })
  }
  if (animations.length === 0) return undefined
  return { frameW, frameH, animations }
}

/**
 * Valida/normaliza os metadados de TILESET de um asset. `undefined` se não houver
 * tamanho de tile válido; `solid` vazio é VÁLIDO (tileset sem colisão). Índices
 * deduplicados/ordenados, capados. Exportado (a biblioteca pessoal reusa).
 */
/** Índices não-negativos, deduplicados, capados (dedupe opcional contra `exclude`). */
function sanitizeTileIndexList(raw: unknown, exclude?: Set<number>): number[] {
  const set = new Set<number>()
  for (const value of Array.isArray(raw) ? raw : []) {
    if (set.size >= MAX_TILESET_SOLID) break
    const n = toNonNegativeInt(value)
    if (n !== null && !exclude?.has(n)) set.add(n)
  }
  return [...set].sort((a, b) => a - b)
}

export function sanitizeTilesetMeta(raw: unknown): ProjectTilesetMeta | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const r = raw as Record<string, unknown>
  const tileSize = toPositiveInt(r.tileSize)
  if (tileSize === null) return undefined
  const solid = sanitizeTileIndexList(r.solid)
  // Plataforma exclui os já-sólidos (sólido vence) e some quando vazia.
  const platform = sanitizeTileIndexList(r.platform, new Set(solid))
  return { tileSize, solid, ...(platform.length ? { platform } : {}) }
}

/**
 * Valida/normaliza os metadados de MAPA DE TILES. Tudo-ou-nada: sem grade OU sem
 * folha embutida válida → `undefined` (o asset segue vivo como imagem comum; o
 * bloco "Criar mapa do meu desenho" simplesmente não o lista). NÃO valida a
 * consistência grade×cols×rows — o `parseGrid` do runtime é tolerante por
 * construção. Exportado (biblioteca pessoal e projectStore reusam).
 */
export function sanitizeTilemapMeta(raw: unknown): ProjectTilemapMeta | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const r = raw as Record<string, unknown>
  const tileSize = toPositiveInt(r.tileSize)
  const cols = toPositiveInt(r.cols)
  const rows = toPositiveInt(r.rows)
  if (tileSize === null || cols === null || rows === null) return undefined
  if (cols > MAX_TILEMAP_DIM || rows > MAX_TILEMAP_DIM) return undefined
  const grid = typeof r.grid === 'string' ? r.grid.trim() : ''
  if (!grid || grid.length > MAX_TILEMAP_GRID_CHARS) return undefined
  const ts = r.tileset
  if (!ts || typeof ts !== 'object' || Array.isArray(ts)) return undefined
  const t = ts as Record<string, unknown>
  const sheetUrl = t.dataUrl
  if (
    typeof sheetUrl !== 'string' ||
    !sheetUrl.startsWith(ASSET_DATA_URL_PREFIX) ||
    sheetUrl.length > MAX_TILEMAP_SHEET_CHARS
  ) {
    return undefined
  }
  const sheetW = toPositiveInt(t.width)
  const sheetH = toPositiveInt(t.height)
  if (sheetW === null || sheetH === null) return undefined
  const solid = sanitizeTileIndexList(r.solid)
  const platform = sanitizeTileIndexList(r.platform, new Set(solid))
  return {
    tileSize,
    cols,
    rows,
    grid,
    solid,
    ...(platform.length ? { platform } : {}),
    tileset: { dataUrl: sheetUrl, width: sheetW, height: sheetH },
  }
}

/**
 * Normaliza um nome de asset para kebab-case ASCII, único e referenciável pelos
 * blocos: minúsculas, sem acento, espaços/underscores → hífen, sem barra. `null`
 * se sobrar vazio ou exceder o teto. (`herói do mar` → `heroi-do-mar`.)
 */
export function normalizeAssetName(input: string): string | null {
  const trimmed = input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove diacríticos (herói → heroi)
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!trimmed || trimmed.length > MAX_ASSET_NAME_CHARS) return null
  return ASSET_NAME_PATTERN.test(trimmed) ? trimmed : null
}

/**
 * `data:` URL de imagem, áudio ou binário 3D dentro do teto do seu tipo. Recusa
 * qualquer outro esquema. `kind` opcional: `'image'`/`'audio'` exige aquele
 * prefixo; ausente aceita imagem OU áudio (cada um no seu teto).
 *
 * Para os kinds 3D (`model3d`/`environment3d`) a validação é TRI-MODAL e o
 * `fileName` é OBRIGATÓRIO: extensão × MIME × assinatura binária precisam
 * concordar. É o que impede um `.glb` com bytes de HDR — ou um GLB versão 1,
 * que o three não abre — de entrar no projeto e só explodir no runtime.
 */
export function isValidAssetDataUrl(
  value: unknown,
  kind?: 'image' | 'audio' | Asset3DKind,
  fileName?: string,
): value is string {
  if (typeof value !== 'string') return false
  if (isAsset3DKind(kind)) {
    const spec = ASSET_3D_SPECS[kind]
    if (value.length > MAX_MODEL3D_DATA_URL_CHARS) return false
    if (!value.startsWith(`${spec.mime};`) && !value.startsWith(`${spec.mime},`)) return false
    if (typeof fileName !== 'string' || !fileName.toLowerCase().endsWith(spec.ext)) return false
    return hasValid3DSignature(kind, value)
  }
  const isImage = value.startsWith(ASSET_DATA_URL_PREFIX)
  const isAudio = value.startsWith(AUDIO_DATA_URL_PREFIX)
  if (kind === 'image') return isImage && value.length <= MAX_ASSET_DATA_URL_CHARS
  if (kind === 'audio') return isAudio && value.length <= MAX_AUDIO_DATA_URL_CHARS
  if (isImage) return value.length <= MAX_ASSET_DATA_URL_CHARS
  if (isAudio) return value.length <= MAX_AUDIO_DATA_URL_CHARS
  return false
}

/**
 * Valida/normaliza `assets` vindos de um Project não confiável (disco, host,
 * import). Descarta asset com `dataUrl` inválido (prefixo `data:image/`/`data:audio/`
 * que não casa com o `kind`, ou fora do teto) ou nome inválido em vez de quebrar;
 * deduplica por nome e respeita o orçamento total e o teto de quantidade. Retorna
 * sempre um array (vazio se nada válido).
 */
export function sanitizeProjectAssets(raw: unknown): ProjectAsset[] {
  if (!Array.isArray(raw)) return []
  const out: ProjectAsset[] = []
  const seenNames = new Set<string>()
  let totalChars = 0
  for (const item of raw) {
    if (out.length >= MAX_ASSETS_COUNT) break
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const a = item as Record<string, unknown>
    if (a.kind !== 'image' && a.kind !== 'audio' && !isAsset3DKind(a.kind)) continue
    const kind: ProjectAsset['kind'] = a.kind
    // 3D: a validação cruza extensão × MIME × assinatura, então o nome do
    // arquivo original faz parte do contrato (sem ele o asset é descartado).
    const fileName = typeof a.originalFileName === 'string' ? a.originalFileName : undefined
    if (!isValidAssetDataUrl(a.dataUrl, kind, fileName)) continue
    const name = typeof a.name === 'string' ? normalizeAssetName(a.name) : null
    if (!name || seenNames.has(name)) continue
    if (totalChars + a.dataUrl.length > MAX_ASSETS_TOTAL_CHARS) continue
    const source: ProjectAsset['source'] = a.source === 'library' ? 'library' : 'upload'
    const asset: ProjectAsset = {
      id: typeof a.id === 'string' && a.id.trim() ? a.id.slice(0, 64) : name,
      name,
      kind,
      dataUrl: a.dataUrl,
      source,
    }
    if (fileName && isAsset3DKind(kind)) asset.originalFileName = fileName.slice(0, 128)
    if (typeof a.width === 'number' && Number.isFinite(a.width) && a.width > 0) {
      asset.width = Math.floor(a.width)
    }
    if (typeof a.height === 'number' && Number.isFinite(a.height) && a.height > 0) {
      asset.height = Math.floor(a.height)
    }
    if (source === 'library' && typeof a.libId === 'string' && a.libId.trim()) {
      asset.libId = a.libId.slice(0, 128)
    }
    // Metadado do Pinta (animações/tiles) — opcional; inválido é DESCARTADO sem
    // derrubar o asset. Não entra na cota de `dataUrl` (tetos próprios por campo).
    const sprite = sanitizeSpriteMeta(a.sprite)
    if (sprite) asset.sprite = sprite
    const tileset = sanitizeTilesetMeta(a.tileset)
    if (tileset) asset.tileset = tileset
    const tilemap = sanitizeTilemapMeta(a.tilemap)
    if (tilemap) asset.tilemap = tilemap
    seenNames.add(name)
    totalChars += a.dataUrl.length
    out.push(asset)
  }
  return out
}

/**
 * Manifesto `nome → dataUrl` consumido pelo preview (semeado em
 * `window.__SZGAME_ASSETS`) e pelo runtime do game-2d. Tolerante: ignora entradas
 * malformadas. Reusado pelos 3 call sites de `buildPreviewDoc` + o PreviewIframe.
 */
export function assetManifest(
  assets: readonly ProjectAsset[] | undefined | null,
): Record<string, string> {
  const out: Record<string, string> = {}
  if (!assets) return out
  for (const a of assets) {
    if (a && a.kind === 'image' && typeof a.name === 'string' && typeof a.dataUrl === 'string') {
      out[a.name] = a.dataUrl
    }
  }
  return out
}

/**
 * Manifesto `nome → dataUrl` só dos assets de ÁUDIO — irmão do `assetManifest`,
 * semeado no preview em `window.__SZGAME_SOUNDS` (separado das imagens). O runtime
 * toca com `new Audio(dataUrl)` (a CSP libera `media-src data:`).
 */
export function soundManifest(
  assets: readonly ProjectAsset[] | undefined | null,
): Record<string, string> {
  const out: Record<string, string> = {}
  if (!assets) return out
  for (const a of assets) {
    if (a && a.kind === 'audio' && typeof a.name === 'string' && typeof a.dataUrl === 'string') {
      out[a.name] = a.dataUrl
    }
  }
  return out
}

/** Uma entrada do manifesto 3D: o binário + o tipo e o nome de arquivo confiáveis. */
export interface Asset3DManifestEntry {
  kind: Asset3DKind
  dataUrl: string
  fileName: string
}

/**
 * Manifesto `nome → { kind, dataUrl, fileName }` só dos binários 3D (modelo GLB /
 * céu HDR) — irmão do `assetManifest`/`soundManifest`, semeado no preview em
 * `window.__SZGAME_ASSETS_3D`. Leva o `kind` e o `fileName` junto porque o runtime
 * precisa escolher o loader certo (GLTFLoader × RGBELoader), e ambos são
 * carregados por `.parse()` de um ArrayBuffer — NUNCA por fetch (a rede é
 * bloqueada no preview).
 */
export function asset3DManifest(
  assets: readonly ProjectAsset[] | undefined | null,
): Record<string, Asset3DManifestEntry> {
  const out: Record<string, Asset3DManifestEntry> = {}
  if (!assets) return out
  for (const a of assets) {
    if (!a || !isAsset3DKind(a.kind)) continue
    if (typeof a.name !== 'string' || typeof a.dataUrl !== 'string') continue
    if (typeof a.originalFileName !== 'string') continue
    out[a.name] = { kind: a.kind, dataUrl: a.dataUrl, fileName: a.originalFileName }
  }
  return out
}

/**
 * Manifesto `nome → metadados de preview` — irmão do `assetManifest`, mas só com
 * o que o RUNTIME precisa (hoje: `tilemap`). Semeado em `window.__SZGAME_ASSET_META`
 * pelos mesmos call sites. Só entra asset com meta presente (objeto vazio = nada
 * a injetar; o assetsBridge emite saída byte-idêntica à de antes).
 */
export function assetMetaManifest(
  assets: readonly ProjectAsset[] | undefined | null,
): Record<string, { tilemap: ProjectTilemapMeta }> {
  const out: Record<string, { tilemap: ProjectTilemapMeta }> = {}
  if (!assets) return out
  for (const a of assets) {
    if (a && a.kind === 'image' && typeof a.name === 'string' && a.tilemap) {
      out[a.name] = { tilemap: a.tilemap }
    }
  }
  return out
}

/** Limites públicos dos assets — a UI lê para validar upload e mostrar avisos. */
export const PROJECT_ASSET_LIMITS = {
  maxAssetDataUrlChars: MAX_ASSET_DATA_URL_CHARS,
  maxAudioDataUrlChars: MAX_AUDIO_DATA_URL_CHARS,
  maxModel3DDataUrlChars: MAX_MODEL3D_DATA_URL_CHARS,
  maxAssetsTotalChars: MAX_ASSETS_TOTAL_CHARS,
  maxAssetsCount: MAX_ASSETS_COUNT,
  maxAssetNameChars: MAX_ASSET_NAME_CHARS,
  maxTilemapSheetChars: MAX_TILEMAP_SHEET_CHARS,
  maxTilemapGridChars: MAX_TILEMAP_GRID_CHARS,
  maxTilemapDim: MAX_TILEMAP_DIM,
} as const

export interface Project {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  mode: IDEMode
  files: ProjectFiles
  /** Arquivos extras criados pelo aluno (Fase 3). Os 3 canônicos seguem em `files`. */
  extraFiles?: ExtraFile[]
  /** Assets embutidos (imagens/sprites) — opcional/retrocompatível. */
  assets?: ProjectAsset[]
  ir: SZIR | null
  blocksState: unknown | null
  installedExtensions: InstalledExtension[]
  /** Discriminante do modo. Ausente/undefined = 'classic'. */
  kind?: ProjectKind
  /** Só quando `kind: 'pro'`: árvore de arquivos real (path-keyed). */
  tree?: ProjectTree
  /** Só quando `kind: 'pro'`: metadados do dev-server. */
  proMeta?: ProProjectMeta
}

export const FILE_NAMES = ['index.html', 'style.css', 'script.js'] as const
export type FileName = (typeof FILE_NAMES)[number]

/** Conjunto de nomes protegidos (canônicos) — não podem ser renomeados nem deletados. */
export const CANONICAL_FILES: ReadonlySet<string> = new Set(FILE_NAMES)

const EXTRA_FILE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(?:html|css|mjs|js|tsx|ts|jsx)$/i

export function inferExtraLanguage(fileName: string): ExtraFileLanguage | null {
  if (/\.html?$/i.test(fileName)) return 'html'
  if (/\.css$/i.test(fileName)) return 'css'
  // .ts/.tsx → typescript (transpilado por Sucrase no preview do modo Código).
  if (/\.tsx?$/i.test(fileName)) return 'typescript'
  if (/\.(?:m?js|jsx)$/i.test(fileName)) return 'javascript'
  return null
}

export function normalizeExtraFileName(input: string): string | null {
  const trimmed = input
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')
  if (!trimmed || trimmed.includes('/')) return null
  if (trimmed === '.' || trimmed === '..' || trimmed.includes('..')) return null
  if (!EXTRA_FILE_NAME_PATTERN.test(trimmed)) return null
  return trimmed
}

export function isReservedProjectFileName(fileName: string): boolean {
  return FILE_NAMES.some((name) => name.toLowerCase() === fileName.toLowerCase())
}

export function createEmptyProject(id: string, name: string): Project {
  const now = Date.now()
  return {
    id,
    name,
    createdAt: now,
    updatedAt: now,
    mode: 'blocks',
    files: {
      'index.html': defaultHTML(name),
      'style.css': defaultCSS(),
      'script.js': defaultJS(),
    },
    extraFiles: [],
    assets: [],
    ir: { html: [], css: [], js: [], extensions: [] },
    // Projeto novo nasce EM BRANCO (sem os blocos-CONTAINER 🧱 Estrutura / 🎨
    // Aparência / ⚙️ Comportamento). A criança arrasta as "🗂️ Áreas do projeto"
    // da paleta quando quiser começar. ⚠️ blocksState VAZIO (não `null`): a
    // migração `normalizeBlocksStateToFrames` só embrulha em frames quando há
    // blocos SOLTOS — com a lista vazia ela não re-adiciona os frames.
    blocksState: {
      blocks: {
        languageVersion: 0,
        blocks: [],
      },
    },
    installedExtensions: [],
  }
}

function defaultHTML(name: string): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(name)}</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <script src="script.js"></script>
  </body>
</html>
`
}

function defaultCSS(): string {
  return ''
}

function defaultJS(): string {
  return ''
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
