import type { DirectoryNode, FileSystemTree } from '@webcontainer/api'
import {
  type ExtraFile,
  isReservedProjectFileName,
  normalizeExtraFileName,
  type ProjectFiles,
  type ProjectTree,
} from '#core'

export const WEB_CONTAINER_PACKAGE_DEPENDENCIES = {
  '@vitejs/plugin-react': '6.0.2',
  vite: '8.0.14',
  typescript: '5.9.3',
} as const

export interface TerminalProjectSnapshot {
  id: string | null
  name: string
  files: ProjectFiles | null
  extraFiles: ExtraFile[]
  /** Modo profissional (árvore real). Ausente = projeto classic. */
  kind?: 'pro'
  tree?: ProjectTree
}

/**
 * Converte a árvore path-keyed do modo profissional no `FileSystemTree`
 * aninhado do @webcontainer/api. Cria as pastas-pai antes dos filhos e ignora
 * qualquer caminho com segmento `node_modules` (defesa em profundidade).
 */
export function proTreeToFileSystemTree(tree: ProjectTree): FileSystemTree {
  const root: FileSystemTree = {}
  const paths = Object.keys(tree).sort((a, b) => a.split('/').length - b.split('/').length)
  for (const path of paths) {
    const node = tree[path]
    if (!node) continue
    const segments = path.split('/')
    if (segments.includes('node_modules')) continue
    let cursor = root
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i] as string
      let entry = cursor[seg]
      if (!entry || !('directory' in entry)) {
        entry = { directory: {} }
        cursor[seg] = entry
      }
      cursor = (entry as DirectoryNode).directory
    }
    const leaf = segments[segments.length - 1] as string
    if (node.kind === 'file') {
      cursor[leaf] = { file: { contents: node.content } }
    } else if (!cursor[leaf]) {
      cursor[leaf] = { directory: {} }
    }
  }
  return root
}

/** Conteúdo plano (path → texto) só dos ARQUIVOS da árvore — base do diff de sync. */
function proTreeFileContents(tree: ProjectTree): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [path, node] of Object.entries(tree)) {
    if (node.kind === 'file' && !path.split('/').includes('node_modules')) out[path] = node.content
  }
  return out
}

export function buildTerminalFileTree(project: TerminalProjectSnapshot): FileSystemTree {
  if (project.kind === 'pro' && project.tree) return proTreeToFileSystemTree(project.tree)
  return Object.fromEntries(
    Object.entries(buildTerminalFileContents(project)).map(([name, contents]) => [
      name,
      { file: { contents } },
    ]),
  )
}

export function buildTerminalFileContents(
  project: TerminalProjectSnapshot,
): Record<string, string> {
  if (project.kind === 'pro' && project.tree) return proTreeFileContents(project.tree)
  const name = project.name.trim() || 'sz-project'
  const contents: Record<string, string> = {
    'package.json': JSON.stringify(
      {
        name: slugifyPackageName(name),
        type: 'module',
        packageManager: 'pnpm@9.12.0',
        scripts: { start: 'vite --host 0.0.0.0' },
        dependencies: WEB_CONTAINER_PACKAGE_DEPENDENCIES,
        devDependencies: {},
      },
      null,
      2,
    ),
    'index.html': project.files?.['index.html'] ?? '',
    'style.css': project.files?.['style.css'] ?? '',
    'script.js': project.files?.['script.js'] ?? '',
  }

  for (const extra of project.extraFiles) {
    const safeName = normalizeExtraFileName(extra.name)
    if (safeName && !isReservedProjectFileName(safeName)) {
      contents[safeName] = extra.content
    }
  }

  return contents
}

function slugifyPackageName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'sz-project'
}
