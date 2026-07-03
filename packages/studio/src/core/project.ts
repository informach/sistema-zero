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

const ASSET_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/
const ASSET_DATA_URL_PREFIX = 'data:image/'

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
