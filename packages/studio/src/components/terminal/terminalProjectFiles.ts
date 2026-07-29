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
  vite: '8.0.16',
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
 * Erro de colisão de nomes na árvore do modo profissional: o MESMO caminho é
 * usado como arquivo E como pasta (ex.: existe `src` arquivo e `src/main.ts`).
 * O `FileSystemTree` não pode ter os dois — falhamos alto em vez de sobrescrever
 * um pelo outro silenciosamente (o que perderia dados do aluno sem aviso).
 */
export class ProTreeCollisionError extends Error {
  constructor(public readonly path: string) {
    super(
      `Colisão de nomes na árvore do projeto: "${path}" é usado como arquivo e como pasta ao mesmo tempo.`,
    )
    this.name = 'ProTreeCollisionError'
  }
}

/**
 * Converte a árvore path-keyed do modo profissional no `FileSystemTree`
 * aninhado do @webcontainer/api. Cria as pastas-pai antes dos filhos e ignora
 * qualquer caminho com segmento `node_modules` (defesa em profundidade).
 *
 * Lança `ProTreeCollisionError` quando um mesmo caminho aparece como arquivo e
 * como pasta — antes esse caso sobrescrevia silenciosamente um nó pelo outro.
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
    let prefix = ''
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i] as string
      prefix = prefix ? `${prefix}/${seg}` : seg
      const entry = cursor[seg]
      if (entry && !('directory' in entry)) {
        // Um arquivo já ocupa este segmento, mas o caminho atual exige que seja
        // uma pasta-pai — colisão (ex.: `src` arquivo + `src/main.ts`).
        throw new ProTreeCollisionError(prefix)
      }
      const dir = entry ?? { directory: {} }
      cursor[seg] = dir
      cursor = (dir as DirectoryNode).directory
    }
    const leaf = segments[segments.length - 1] as string
    const existing = cursor[leaf]
    if (node.kind === 'file') {
      if (existing && 'directory' in existing) {
        // Já criamos uma pasta com este nome (algum filho a declarou) e agora
        // o mesmo caminho aparece como arquivo — colisão.
        throw new ProTreeCollisionError(path)
      }
      cursor[leaf] = { file: { contents: node.content } }
    } else if (existing && !('directory' in existing)) {
      // O caminho é declarado como pasta, mas já há um arquivo aqui — colisão.
      throw new ProTreeCollisionError(path)
    } else if (!existing) {
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
