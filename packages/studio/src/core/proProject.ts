import type { StudioProAssistanceMeta as ProAssistanceMeta } from '@sistemazero/core/studio/project-pro-metadata'
import type { Project } from './project'
import { CURRENT_PROJECT_FORMAT_VERSION } from './projectDocument'

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

export type ProNode = StudioProjectTree[string]
export type ProFileNode = Extract<ProNode, { kind: 'file' }>
export type ProDirNode = Extract<ProNode, { kind: 'dir' }>

/**
 * Árvore path-keyed: chaves = caminhos POSIX relativos SEM barra inicial. Toda
 * pasta intermediária aparece explicitamente como `ProDirNode` (ex.: `src`
 * antes de `src/main.ts`).
 */
export type ProjectTree = StudioProjectTree

export type ProjectKind = 'classic' | 'pro'

export type {
  StudioProAssistanceDecision as ProAssistanceDecision,
  StudioProAssistanceMeta as ProAssistanceMeta,
  StudioProAssistanceQuestion as ProAssistanceQuestion,
} from '@sistemazero/core/studio/project-pro-metadata'

export interface ProProjectMeta {
  /** Reference only; the server independently verifies publication ownership. */
  publication?: { playId: string }
  assistance?: ProAssistanceMeta
  /** Original preserved before conversion; active ID remains bound to Pensa/cloud. */
  origin?: { projectId: string; revision: number }
  /** Script npm a rodar no dev-server (ex.: 'dev'). */
  devScript: string
  /** id do template de origem. */
  templateId: string
}

export { normalizeProPath } from './proPaths'

export function inferProLanguage(path: string): ProFileLanguage {
  const lower = path.toLowerCase()
  if (lower.endsWith('.tsx')) return 'tsx'
  if (lower.endsWith('.jsx')) return 'jsx'
  if (/\.(?:ts|mts|cts)$/.test(lower)) return 'typescript'
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
    formatVersion: CURRENT_PROJECT_FORMAT_VERSION,
    projectTools: [],
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

import type { StudioProjectTree } from '@sistemazero/core/studio/project-document'
