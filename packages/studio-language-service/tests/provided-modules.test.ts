import { expect, test } from 'bun:test'
import { mkdtemp, readdir, readFile, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { renderPythonProvidedModuleStub } from '@sistemazero/core/studio/python-provided-modules-render'
import {
  currentPythonRelease,
  providedPythonRelease,
} from '../../core/tests/fixtures/python-provided-release'
import {
  materializePythonProvidedModules,
  visibleProvidedModuleRoots,
} from '../runtime/provided-modules'

test('writes exact verified declarations outside the author snapshot and cleans only its owned tree', async () => {
  const parent = await mkdtemp(resolve(tmpdir(), 'sz-language-module-'))
  try {
    const runtimeRelease = await providedPythonRelease()
    const modules = await materializePythonProvidedModules(
      { protocolVersion: 1, runtimeRelease },
      parent,
      new AbortController().signal,
    )
    expect(modules.roots).toHaveLength(1)
    expect(await readFile(resolve(modules.roots[0]!.path, 'sz_audio/__init__.pyi'), 'utf8')).toBe(
      renderPythonProvidedModuleStub(
        runtimeRelease.manifest.python!.providedModules![0]!.descriptor,
      ),
    )
    await modules.dispose()
    expect(await readdir(parent)).toEqual([])
    const empty = await materializePythonProvidedModules(
      { protocolVersion: 1, runtimeRelease: await currentPythonRelease() },
      parent,
      new AbortController().signal,
    )
    expect(empty.roots).toEqual([])
    expect(await readdir(parent)).toEqual([])
  } finally {
    await rm(parent, { recursive: true, force: true })
  }
})

test('rejects forged metadata, cancellation and symlink parent before materialization', async () => {
  const parent = await mkdtemp(resolve(tmpdir(), 'sz-language-module-'))
  const runtimeRelease = await providedPythonRelease()
  try {
    await expect(
      materializePythonProvidedModules(
        { protocolVersion: 1 },
        parent,
        new AbortController().signal,
      ),
    ).rejects.toThrow()
    expect(await readdir(parent)).toEqual([])
    await expect(
      materializePythonProvidedModules(
        {
          protocolVersion: 1,
          runtimeRelease: { ...runtimeRelease, manifestSha256: '0'.repeat(64) },
        },
        parent,
        new AbortController().signal,
      ),
    ).rejects.toThrow()
    await expect(
      materializePythonProvidedModules(
        { protocolVersion: 1, runtimeRelease },
        parent,
        AbortSignal.abort(),
      ),
    ).rejects.toThrow()
    expect(await readdir(parent)).toEqual([])
    const link = resolve(parent, 'link')
    await symlink(parent, link, 'junction')
    await expect(
      materializePythonProvidedModules(
        { protocolVersion: 1, runtimeRelease },
        link,
        new AbortController().signal,
      ),
    ).rejects.toThrow('parent')
    expect(await readdir(parent)).toEqual(['link'])
  } finally {
    await rm(parent, { recursive: true, force: true })
  }
})

test('author regular packages/modules shadow per entry root while namespaces do not', () => {
  const roots = [
    { importName: 'sz_audio', path: '/private/audio' },
    { importName: 'other', path: '/private/other' },
  ]
  const snapshot = (paths: string[]) => ({
    revision: 1,
    files: Object.fromEntries(paths.map((path) => [path, { version: 1, source: '' }])),
  })
  for (const path of [
    'sz_audio.py',
    'sz_audio.pyi',
    'sz_audio/__init__.py',
    'sz_audio/__init__.pyi',
  ]) {
    expect(visibleProvidedModuleRoots(roots, snapshot([`src/${path}`]), 'src/main.py')).toEqual([
      '/private/other',
    ])
    expect(visibleProvidedModuleRoots(roots, snapshot([path]), 'src/main.py')).toEqual([
      '/private/audio',
      '/private/other',
    ])
  }
  expect(
    visibleProvidedModuleRoots(roots, snapshot(['src/sz_audio/child.py']), 'src/main.py'),
  ).toEqual(['/private/audio', '/private/other'])
  expect(visibleProvidedModuleRoots(roots, snapshot([]), 'main.py')).toEqual([
    '/private/audio',
    '/private/other',
  ])
})
