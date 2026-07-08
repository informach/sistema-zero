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
  /** Por ora só imagem; o modelo já prevê `'audio'` numa fase futura. */
  kind: 'image'
  /** `data:image/...;base64,...` — validado: precisa começar com `data:image/`. */
  dataUrl: string
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
/** Orçamento total de assets do projeto (~8 MB de binário inflado em base64). */
const MAX_ASSETS_TOTAL_CHARS = 11_200_000
/** Teto de quantidade de assets por projeto (defesa anti-DoS no load). */
const MAX_ASSETS_COUNT = 128
/** Tetos do metadado (anti-DoS; o metadado NÃO conta na cota de `dataUrl`). */
const MAX_SPRITE_ANIMS = 32
const MAX_TILESET_SOLID = 64
const MAX_ANIM_NAME_CHARS = 48

const ASSET_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/
const ASSET_DATA_URL_PREFIX = 'data:image/'

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
export function sanitizeTilesetMeta(raw: unknown): ProjectTilesetMeta | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const r = raw as Record<string, unknown>
  const tileSize = toPositiveInt(r.tileSize)
  if (tileSize === null) return undefined
  const solidSet = new Set<number>()
  for (const value of Array.isArray(r.solid) ? r.solid : []) {
    if (solidSet.size >= MAX_TILESET_SOLID) break
    const n = toNonNegativeInt(value)
    if (n !== null) solidSet.add(n)
  }
  return { tileSize, solid: [...solidSet].sort((a, b) => a - b) }
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

/** `data:` URL de imagem dentro do teto de tamanho. Recusa qualquer outro esquema. */
export function isValidAssetDataUrl(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith(ASSET_DATA_URL_PREFIX) &&
    value.length <= MAX_ASSET_DATA_URL_CHARS
  )
}

/**
 * Valida/normaliza `assets` vindos de um Project não confiável (disco, host,
 * import). Descarta asset com `dataUrl` inválido (não-`data:image/`) ou nome
 * inválido em vez de quebrar; deduplica por nome e respeita o orçamento total e o
 * teto de quantidade. Retorna sempre um array (vazio se nada válido).
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
    if (a.kind !== 'image') continue
    if (!isValidAssetDataUrl(a.dataUrl)) continue
    const name = typeof a.name === 'string' ? normalizeAssetName(a.name) : null
    if (!name || seenNames.has(name)) continue
    if (totalChars + a.dataUrl.length > MAX_ASSETS_TOTAL_CHARS) continue
    const source: ProjectAsset['source'] = a.source === 'library' ? 'library' : 'upload'
    const asset: ProjectAsset = {
      id: typeof a.id === 'string' && a.id.trim() ? a.id.slice(0, 64) : name,
      name,
      kind: 'image',
      dataUrl: a.dataUrl,
      source,
    }
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

/** Limites públicos dos assets — a UI lê para validar upload e mostrar avisos. */
export const PROJECT_ASSET_LIMITS = {
  maxAssetDataUrlChars: MAX_ASSET_DATA_URL_CHARS,
  maxAssetsTotalChars: MAX_ASSETS_TOTAL_CHARS,
  maxAssetsCount: MAX_ASSETS_COUNT,
  maxAssetNameChars: MAX_ASSET_NAME_CHARS,
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
    // Projeto novo já nasce com os 3 blocos-CONTAINER vazios na tela (como o
    // `on start` do MakeCode): a criança coloca HTML dentro da 🧱 Estrutura, CSS
    // na 🎨 Aparência e o passo a passo no ⚙️ Comportamento. Shape = o que
    // buildWorkspaceStateFromIR produz para IR vazio (frames sem CHILDREN); os
    // tipos espelham FRAME_BLOCKS em blockly/blocks/frames.ts.
    blocksState: {
      blocks: {
        languageVersion: 0,
        blocks: [
          { type: 'sz_frame_structure', x: 32, y: 32 },
          { type: 'sz_frame_appearance', x: 452, y: 32 },
          { type: 'sz_frame_behavior', x: 872, y: 32 },
        ],
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
