import { mkdir, symlink, writeFile } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'

export const AUTHORITY_BASELINE = '567b93f95'

/** Real published reader/writer and its relative graph; no replacement legacy writer. */
export async function prepareAuthorityBaseline(root: string, temporary: string) {
  const extracted = join(temporary, 'baseline')
  const copied = new Set<string>()
  const sources = new Map<string, string | null>()
  function gitShow(path: string): string | null {
    if (sources.has(path)) return sources.get(path) ?? null
    const result = Bun.spawnSync(['git', 'show', `${AUTHORITY_BASELINE}:${path}`], {
      cwd: root,
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const source = result.exitCode === 0 ? result.stdout.toString() : null
    sources.set(path, source)
    return source
  }
  function relativeModule(parent: string, specifier: string): string {
    const path = relative(root, resolve(root, dirname(parent), specifier))
      .split(sep)
      .join('/')
    if (!path.startsWith('packages/pinta/src/')) throw new Error(`Fora do Pinta: ${path}`)
    const found = (
      extname(path)
        ? [path]
        : [`${path}.ts`, `${path}.tsx`, `${path}.json`, `${path}/index.ts`, `${path}/index.tsx`]
    ).find((candidate) => gitShow(candidate) !== null)
    if (!found) throw new Error(`Módulo ausente no baseline: ${path}`)
    return found
  }
  async function copyModule(path: string): Promise<void> {
    if (copied.has(path)) return
    copied.add(path)
    const source = gitShow(path)
    if (source === null) throw new Error(`git show falhou: ${path}`)
    const destination = resolve(extracted, path)
    if (!destination.startsWith(extracted + sep))
      throw new Error('Destino fora da pasta temporária')
    await mkdir(dirname(destination), { recursive: true })
    await writeFile(destination, source)
    for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)['"](\.[^'"]+)['"]/g))
      await copyModule(relativeModule(path, match[1]!))
  }
  await copyModule('packages/pinta/src/state/persistence.ts')
  await copyModule('packages/pinta/src/core/project.ts')
  await symlink(
    join(root, 'packages/pinta/node_modules'),
    join(extracted, 'packages/pinta/node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir',
  )
  return { extracted, count: copied.size }
}
