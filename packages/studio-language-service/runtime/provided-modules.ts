import { lstat, mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import type { PythonLanguageSnapshot } from '@sistemazero/core/studio/python-language'
import { createPythonLanguageBootstrap } from '@sistemazero/core/studio/python-language-bootstrap'
import { renderPythonProvidedModuleStub } from '@sistemazero/core/studio/python-provided-modules-render'

export type ProvidedModuleRoot = Readonly<{ importName: string; path: string }>

/** Mirrors CPython's regular-module/package precedence; a namespace alone does not shadow. */
export function visibleProvidedModuleRoots(
  roots: readonly ProvidedModuleRoot[],
  snapshot: PythonLanguageSnapshot,
  entrypoint: string,
) {
  const prefix = entrypoint.includes('/')
    ? `${entrypoint.slice(0, entrypoint.lastIndexOf('/'))}/`
    : ''
  return roots
    .filter(
      ({ importName }) =>
        ![
          `${prefix}${importName}.py`,
          `${prefix}${importName}.pyi`,
          `${prefix}${importName}/__init__.py`,
          `${prefix}${importName}/__init__.pyi`,
        ].some((path) => Object.hasOwn(snapshot.files, path)),
    )
    .map(({ path }) => path)
}

/** Writes only release-derived declarations into an exclusively owned directory, never author files. */
export async function materializePythonProvidedModules(
  raw: unknown,
  parent: string,
  signal: AbortSignal,
) {
  const bootstrap = await createPythonLanguageBootstrap(raw)
  signal.throwIfAborted()
  const modules = bootstrap.runtimeRelease?.manifest.python?.providedModules ?? []
  if (!modules.length) return { roots: [] as readonly ProvidedModuleRoot[], async dispose() {} }
  const info = await lstat(parent)
  if (!info.isDirectory() || info.isSymbolicLink())
    throw new Error('Invalid language metadata parent')
  const base = await realpath(parent)
  signal.throwIfAborted()
  const owned = await mkdtemp(resolve(base, '.python-language-modules-'))
  const child = relative(base, owned)
  if (!child || isAbsolute(child) || child.startsWith(`..${sep}`))
    throw new Error('Invalid language metadata directory')
  const roots: ProvidedModuleRoot[] = []
  const dispose = () => rm(owned, { recursive: true, force: true })
  try {
    for (const module of modules) {
      signal.throwIfAborted()
      const { importName } = module.descriptor
      const root = resolve(owned, importName)
      const target = resolve(root, importName, '__init__.pyi')
      await mkdir(dirname(target), { recursive: true, mode: 0o700 })
      signal.throwIfAborted()
      await writeFile(target, renderPythonProvidedModuleStub(module.descriptor), {
        flag: 'wx',
        mode: 0o600,
        signal,
      })
      roots.push(Object.freeze({ importName, path: root }))
    }
    signal.throwIfAborted()
    return { roots: Object.freeze(roots), dispose }
  } catch (error) {
    await dispose()
    throw error
  }
}
