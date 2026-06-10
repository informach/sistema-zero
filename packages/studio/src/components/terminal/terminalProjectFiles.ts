import type { FileSystemTree } from '@webcontainer/api'
import {
  type ExtraFile,
  isReservedProjectFileName,
  normalizeExtraFileName,
  type ProjectFiles,
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
}

export function buildTerminalFileTree(project: TerminalProjectSnapshot): FileSystemTree {
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
