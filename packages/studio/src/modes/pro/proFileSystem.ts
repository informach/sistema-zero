import type { DirEnt } from '@webcontainer/api'
import { normalizeProPath, type ProjectTree } from '#core'
import { fileSystemErrorCode } from '../../components/terminal/fileSystemError'
import { isStudioTutorSensitivePath } from '../../studio/tutorSafety'
import { sameProNode } from './reconcileProTree'

export interface ProFileSystem {
  readdir(path: string): Promise<string[]>
  readdir(path: string, options: { withFileTypes: true }): Promise<DirEnt<string>[]>
  readFile(path: string, encoding: 'utf-8'): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  mkdir(path: string, options: { recursive: true }): Promise<string | undefined>
  rm(path: string, options: { force: true; recursive: boolean }): Promise<void>
}
const IGNORED =
  /(?:^|\/)(?:node_modules|\.git|dist|build|coverage|\.vite|\.vite-cache|\.cache|\.npm|\.next)(?:\/|$)/
const TEXT_FILE = /\.(?:[cm]?[jt]sx?|json|webmanifest|html|css|svg|txt|md)$/i
const TEXT_NAME = /^(?:\.gitignore|\.npmignore|\.prettierignore|LICENSE|NOTICE)$/i

export function ignoredProFsPath(path: string): boolean {
  return IGNORED.test(path) || isStudioTutorSensitivePath(path)
}

export class ProFsChangedError extends Error {
  constructor(path: string) {
    super(`O terminal alterou ${path} durante a sincronização. Tentando novamente.`)
  }
}

function checkActive(active: () => boolean) {
  if (!active()) throw new DOMException('Sincronização cancelada.', 'AbortError')
}

/** Bounded directory walk; unchanged file contents reuse the last observed disk snapshot. */
export async function readProFileSystem(
  fs: ProFileSystem,
  options: {
    cached?: ProjectTree
    changed?: ReadonlySet<string>
    active?: () => boolean
    ignore?: (path: string) => boolean
  } = {},
): Promise<{ tree: ProjectTree; unsupported: string[] }> {
  const active = options.active ?? (() => true)
  const tree: ProjectTree = {}
  const unsupported: string[] = []
  const directories = ['.']
  const files: string[] = []
  let count = 0
  while (directories.length) {
    checkActive(active)
    const dir = directories.shift()!
    const entries = await fs.readdir(dir, { withFileTypes: true })
    checkActive(active)
    for (const entry of entries) {
      const path = dir === '.' ? entry.name : `${dir}/${entry.name}`
      if (ignoredProFsPath(path) || options.ignore?.(path)) continue
      if (++count > 5000 || path.split('/').length > 32)
        throw new Error('A árvore do terminal ultrapassou o limite do projeto.')
      if (
        !normalizeProPath(path) ||
        (!entry.isDirectory() &&
          (!entry.isFile() || (!TEXT_FILE.test(path) && !TEXT_NAME.test(entry.name))))
      ) {
        unsupported.push(path)
        continue
      }
      if (entry.isDirectory()) {
        tree[path] = { kind: 'dir' }
        directories.push(path)
      } else files.push(path)
    }
  }
  let total = 0
  let index = 0
  const changed = options.changed
  const mustRead = (path: string) =>
    !changed ||
    [...changed].some((dirty) => dirty === '*' || dirty === path || path.startsWith(`${dirty}/`))
  await Promise.all(
    Array.from({ length: Math.min(8, files.length) }, async () => {
      while (index < files.length) {
        checkActive(active)
        const path = files[index++]!
        const cached = options.cached?.[path]
        const content =
          cached?.kind === 'file' && !mustRead(path)
            ? cached.content
            : await fs.readFile(path, 'utf-8')
        checkActive(active)
        total += content.length
        if (content.length > 2_000_000 || total > 8_000_000)
          throw new Error('Os arquivos do terminal ultrapassaram o limite do projeto.')
        if (content.includes('\0'))
          throw new Error(
            `O arquivo ${path} contém dados binários e precisa ser importado pela biblioteca.`,
          )
        tree[path] = { kind: 'file', content }
      }
    }),
  )
  return { tree, unsupported }
}

function missing(error: unknown): boolean {
  return fileSystemErrorCode(error) === 'ENOENT'
}

/** Rechecks changed files before writing; never recursively deletes a nonempty directory. */
export async function writeProFileSystem(
  fs: ProFileSystem,
  before: ProjectTree,
  after: ProjectTree,
  active: () => boolean,
): Promise<void> {
  const assertFile = async (path: string) => {
    checkActive(active)
    const expected = before[path]
    let current: string | undefined
    try {
      current = await fs.readFile(path, 'utf-8')
    } catch (error) {
      if (!missing(error)) throw error
    }
    checkActive(active)
    if (current !== (expected?.kind === 'file' ? expected.content : undefined))
      throw new ProFsChangedError(path)
  }
  const removals = Object.keys(before)
    .filter((path) => !after[path] || after[path]?.kind !== before[path]?.kind)
    .sort((a, b) => b.split('/').length - a.split('/').length)
  for (const path of removals) {
    checkActive(active)
    if (before[path]?.kind === 'file') await assertFile(path)
    else {
      const remaining = await fs.readdir(path)
      // Untracked assets/secrets must survive directory renames/removals.
      if (remaining.length) {
        if (after[path]?.kind === 'file')
          throw new Error(
            `A pasta ${path} contém arquivos fora do projeto e não pode virar um arquivo.`,
          )
        continue
      }
    }
    checkActive(active)
    await fs.rm(path, { force: true, recursive: before[path]?.kind === 'dir' })
  }
  const directories = Object.keys(after)
    .filter((path) => after[path]?.kind === 'dir' && before[path]?.kind !== 'dir')
    .sort((a, b) => a.split('/').length - b.split('/').length)
  for (const path of directories) {
    checkActive(active)
    await fs.mkdir(path, { recursive: true })
  }
  for (const [path, node] of Object.entries(after)) {
    if (node.kind !== 'file' || sameProNode(before[path], node)) continue
    if (before[path]?.kind !== 'dir') await assertFile(path)
    checkActive(active)
    await fs.writeFile(path, node.content)
  }
}
