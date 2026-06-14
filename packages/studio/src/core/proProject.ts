import type { Project } from './project'

/**
 * Modelo do MODO PROFISSIONAL: árvore de arquivos real (pastas, .ts/.tsx,
 * package.json…) para projetos que rodam num dev-server (Vite) dentro do
 * WebContainer. Modelo PURO (sem React, sem @webcontainer/api) — `#core` fica
 * leve e isto é testável sem DOM.
 *
 * Um `Project` ganha `kind?: 'pro'` + `tree?` + `proMeta?` OPCIONAIS; os
 * projetos `classic` (com `files`/`extraFiles`) seguem intactos.
 */

export type ProFileLanguage =
  | 'typescript'
  | 'javascript'
  | 'tsx'
  | 'jsx'
  | 'json'
  | 'html'
  | 'css'
  | 'text'

export interface ProFileNode {
  kind: 'file'
  content: string
}
export interface ProDirNode {
  kind: 'dir'
}
export type ProNode = ProFileNode | ProDirNode

/**
 * Árvore path-keyed: chaves = caminhos POSIX relativos SEM barra inicial. Toda
 * pasta intermediária aparece explicitamente como `ProDirNode` (ex.: `src`
 * antes de `src/main.ts`).
 */
export type ProjectTree = Record<string, ProNode>

export type ProjectKind = 'classic' | 'pro'

export interface ProProjectMeta {
  /** Script npm a rodar no dev-server (ex.: 'dev'). */
  devScript: string
  /** id do template de origem. */
  templateId: string
}

/** Extensões de ARQUIVO aceitas na árvore profissional. */
const PRO_FILE_EXTENSIONS = new Set([
  'ts',
  'tsx',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'json',
  'html',
  'css',
  'svg',
  'txt',
  'md',
])

const SEGMENT_RE = /^[A-Za-z0-9._-]+$/

/**
 * Normaliza um caminho da árvore profissional. Aceita pastas e arquivos.
 * Rejeita (→ null): vazio, `..`/`.`, `node_modules` (anti-DoS), segmentos
 * inválidos. Com `expectFile`, exige extensão na allowlist.
 */
export function normalizeProPath(
  input: string,
  opts: { expectFile?: boolean } = {},
): string | null {
  if (typeof input !== 'string') return null
  const cleaned = input
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/+|\/+$/g, '')
  if (!cleaned) return null
  const segments = cleaned.split('/')
  for (const seg of segments) {
    if (!seg || seg === '.' || seg === '..') return null
    if (seg === 'node_modules') return null
    if (seg !== seg.trim()) return null
    if (!SEGMENT_RE.test(seg)) return null
  }
  if (opts.expectFile) {
    const last = segments[segments.length - 1] ?? ''
    const dot = last.lastIndexOf('.')
    const ext = dot >= 0 ? last.slice(dot + 1).toLowerCase() : ''
    if (!PRO_FILE_EXTENSIONS.has(ext)) return null
  }
  return segments.join('/')
}

export function inferProLanguage(path: string): ProFileLanguage {
  const lower = path.toLowerCase()
  if (lower.endsWith('.tsx')) return 'tsx'
  if (lower.endsWith('.jsx')) return 'jsx'
  if (lower.endsWith('.ts')) return 'typescript'
  if (lower.endsWith('.json')) return 'json'
  if (lower.endsWith('.html')) return 'html'
  if (lower.endsWith('.css')) return 'css'
  if (/\.(?:js|mjs|cjs)$/.test(lower)) return 'javascript'
  return 'text'
}

function nowSafe(): number {
  // Date.now() não está disponível em alguns contextos (workflows); aqui em
  // runtime do navegador sempre está. Fallback defensivo para 0.
  return typeof Date !== 'undefined' && typeof Date.now === 'function' ? Date.now() : 0
}

/** Slug para o campo `name` do package.json. */
export function slugifyProjectName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'sz-project'
}

/**
 * Monta um `Project` profissional a partir de uma `tree` já resolvida (do
 * template). Mantém `files` como `ProjectFiles` VÁLIDO-VAZIO (nunca usado em
 * pro) para não quebrar nada que assuma a forma classic.
 */
export function buildProProject(
  id: string,
  name: string,
  tree: ProjectTree,
  devScript: string,
  templateId: string,
): Project {
  const now = nowSafe()
  return {
    id,
    name,
    createdAt: now,
    updatedAt: now,
    mode: 'code',
    kind: 'pro',
    tree,
    proMeta: { devScript, templateId },
    files: { 'index.html': '', 'style.css': '', 'script.js': '' },
    extraFiles: [],
    ir: null,
    blocksState: null,
    installedExtensions: [],
  }
}
