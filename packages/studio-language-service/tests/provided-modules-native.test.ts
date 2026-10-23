import { expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { parsePythonLanguageCommand } from '@sistemazero/core/studio/python-language'
import { providedPythonRelease } from '../../core/tests/fixtures/python-provided-release'
import { materializePythonProvidedModules } from '../runtime/provided-modules'
import { PythonLanguageSession } from '../runtime/pyright'

test('official Pyright types release modules and updates regular-module/package precedence without executing Python', async () => {
  const parent = await mkdtemp(resolve(tmpdir(), 'sz-language-native-'))
  const root = resolve(parent, 'project')
  await mkdir(root)
  const modules = await materializePythonProvidedModules(
    { protocolVersion: 1, runtimeRelease: await providedPythonRelease() },
    parent,
    new AbortController().signal,
  )
  const session = new PythonLanguageSession({
    root,
    nodePath: Bun.which('node')!,
    serverPath: createRequire(import.meta.url).resolve('pyright/langserver.index.js'),
    providedModules: modules.roots,
  })
  let revision = 0,
    sequence = 0,
    entrypoint = 'src/main.py',
    source = ''
  const versions = new Map<string, number>()
  const send = (payload: object) =>
    session.handle(
      parsePythonLanguageCommand({ version: 1, id: `m${++sequence}`, ...payload }),
      AbortSignal.timeout(15_000),
    )
  const sync = async (
    nextSource: string,
    changes: Record<string, string | null> = {},
    nextEntry = entrypoint,
  ) => {
    const baseRevision = revision++
    entrypoint = nextEntry
    source = nextSource
    expect(
      await send({
        kind: 'sync',
        entrypoint,
        baseRevision,
        revision,
        changes: Object.entries({ ...changes, [entrypoint]: source }).map(([path, source]) => {
          const version = (versions.get(path) ?? 0) + 1
          versions.set(path, version)
          return { path, source, version }
        }),
      }),
    ).toMatchObject({ kind: 'synced', revision })
  }
  const query = (method: string, offset?: number) =>
    send({
      kind: 'query',
      method,
      path: entrypoint,
      revision,
      documentVersion: versions.get(entrypoint),
      ...(offset === undefined ? {} : { offset }),
    })
  const diagnostics = async () => {
    const result = await query('diagnostics')
    if (result.kind !== 'result' || result.method !== 'diagnostics')
      throw new Error('Expected diagnostics')
    return result.result
  }
  const provided =
    'from sz_audio import play as tocar\nimport math\nvalues: list[int] = [1, 2]\nroot: float = math.sqrt(4)\nvoice: int = tocar("click.wav", volume=0.5)\nprint(len(values), root, voice)\n'
  const author = 'from sz_audio import play as tocar\nvalue: str = tocar(1)\n'
  const implementation = 'def play(path: int) -> str:\n    return "AUTHOR"\n'
  try {
    await sync(provided)
    expect(await diagnostics()).toEqual([])
    const hover = await query('hover', source.indexOf('tocar("'))
    expect(hover).toMatchObject({ kind: 'result', method: 'hover' })
    if (hover.kind === 'result' && hover.method === 'hover')
      expect(hover.result?.text).toContain('path: str')
    expect(await query('definitions', source.indexOf('tocar("'))).toMatchObject({
      kind: 'result',
      result: [],
    })
    const signature = await query('signatureHelp', source.indexOf('volume=') + 2)
    expect(signature).toMatchObject({ kind: 'result', method: 'signatureHelp' })
    await sync(author, { 'src/sz_audio.py': implementation })
    expect(await diagnostics()).toEqual([])
    expect(await query('definitions', source.indexOf('tocar(1'))).toMatchObject({
      kind: 'result',
      result: [{ path: 'src/sz_audio.py' }],
    })
    await sync(provided, { 'src/sz_audio.py': null, 'src/sz_audio/child.py': '' })
    expect(await diagnostics()).toEqual([])
    await sync(author, { 'src/sz_audio/__init__.py': implementation })
    expect(await diagnostics()).toEqual([])
    expect(await query('definitions', source.indexOf('tocar(1'))).toMatchObject({
      kind: 'result',
      result: [{ path: 'src/sz_audio/__init__.py' }],
    })
    await sync(provided.replace('"click.wav"', '123'), { 'src/sz_audio/__init__.py': null })
    const invalid = await diagnostics()
    expect(invalid).toHaveLength(1)
    expect(invalid[0]!.code).toBe('reportArgumentType')
    await sync(provided, { 'src/sz_audio/__init__.py': implementation }, 'other/main.py')
    expect(await diagnostics()).toEqual([])
    await sync(author, { 'other/sz_audio.pyi': 'def play(path: int) -> str: ...\n' })
    // A standalone author stub supplies typing, not an executable Python implementation.
    expect(await diagnostics()).toMatchObject([
      { code: 'reportMissingModuleSource', severity: 'warning' },
    ])
    expect(await query('definitions', source.indexOf('tocar(1'))).toMatchObject({
      kind: 'result',
      result: [{ path: 'other/sz_audio.pyi' }],
    })
    await sync(provided, { 'other/sz_audio.pyi': null })
    expect(await diagnostics()).toEqual([])
  } finally {
    session.dispose()
    await modules.dispose()
    await rm(parent, { recursive: true, force: true })
  }
}, 45_000)
