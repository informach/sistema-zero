import type { SZIR } from '#ir'
import type { IDEMode } from './modes'

export interface ProjectFiles {
  'index.html': string
  'style.css': string
  'script.js': string
}

export type ExtraFileLanguage = 'html' | 'css' | 'javascript'

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

export interface Project {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  mode: IDEMode
  files: ProjectFiles
  /** Arquivos extras criados pelo aluno (Fase 3). Os 3 canônicos seguem em `files`. */
  extraFiles?: ExtraFile[]
  ir: SZIR | null
  blocksState: unknown | null
  installedExtensions: InstalledExtension[]
}

export const FILE_NAMES = ['index.html', 'style.css', 'script.js'] as const
export type FileName = (typeof FILE_NAMES)[number]

/** Conjunto de nomes protegidos (canônicos) — não podem ser renomeados nem deletados. */
export const CANONICAL_FILES: ReadonlySet<string> = new Set(FILE_NAMES)

const EXTRA_FILE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(?:html|css|mjs|js)$/i

export function inferExtraLanguage(fileName: string): ExtraFileLanguage | null {
  if (/\.html?$/i.test(fileName)) return 'html'
  if (/\.css$/i.test(fileName)) return 'css'
  if (/\.m?js$/i.test(fileName)) return 'javascript'
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
    ir: { html: [], css: [], js: [], extensions: [] },
    blocksState: null,
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
