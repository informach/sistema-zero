import { describe, expect, it } from 'bun:test'
import {
  applyPythonLanguagePatch,
  assertPythonLanguageQueryCurrent,
  isPythonLanguageSourcePath,
  type PythonLanguageSnapshot,
  parsePythonLanguageCommand,
} from './python-language'

const base: PythonLanguageSnapshot = { revision: 0, files: {} }
const sync = (changes: unknown[], baseRevision = 0) => {
  const command = parsePythonLanguageCommand({
    version: 1,
    id: 'request',
    kind: 'sync',
    entrypoint: 'main.py',
    baseRevision,
    revision: baseRevision + 1,
    changes,
  })
  if (command.kind !== 'sync') throw new Error('Expected sync')
  return command
}
describe('Python language boundary', () => {
  it('requires an executable portable Python entrypoint, never a server path or config', () => {
    for (const entrypoint of [
      undefined,
      '',
      '../main.py',
      '/main.py',
      'helper.pyi',
      '.venv/main.py',
      'pyrightconfig.json',
    ])
      expect(() => parsePythonLanguageCommand({ ...sync([]), entrypoint })).toThrow()
    expect(parsePythonLanguageCommand({ ...sync([]), entrypoint: 'src/main.py' })).toMatchObject({
      entrypoint: 'src/main.py',
    })
  })
  it('accepts inert source hooks and excludes configuration, executables and package caches', () => {
    for (const path of ['main.py', 'pkg/__init__.py', 'stubs/turtle.pyi', 'sitecustomize.py'])
      expect(isPythonLanguageSourcePath(path)).toBe(true)
    for (const path of [
      '.pnp.cjs',
      'pyrightconfig.json',
      'pyproject.toml',
      'python',
      '.venv/x.py',
      'a/../x.py',
      '/x.py',
      'a\\x.py',
      'x.py:stream',
      'venv/a.pyi',
    ])
      expect(isPythonLanguageSourcePath(path)).toBe(false)
    expect(() =>
      parsePythonLanguageCommand({
        version: 1,
        id: 'x',
        kind: 'query',
        method: 'workspace/executeCommand',
      }),
    ).toThrow()
    expect(() =>
      parsePythonLanguageCommand({ ...sync([]), pythonPath: '/author/python' }),
    ).toThrow()
    expect(() => sync([{ path: 'main.py', version: 1, source: '', config: {} }])).toThrow()
  })
  it('publishes only complete valid candidates and rejects stale revisions and recreated versions', () => {
    const first = applyPythonLanguagePatch(
      base,
      new Map(),
      sync([{ path: 'main.py', version: 1, source: 'x = 1\n' }]),
    )
    expect(base.files).toEqual({})
    const removed = applyPythonLanguagePatch(
      first.snapshot,
      first.versions,
      sync([{ path: 'main.py', version: 2, source: null }], 1),
    )
    expect(removed.snapshot.files).toEqual({})
    expect(() =>
      applyPythonLanguagePatch(
        removed.snapshot,
        removed.versions,
        sync([{ path: 'main.py', version: 1, source: 'old' }], 2),
      ),
    ).toThrow('versão')
    expect(() => applyPythonLanguagePatch(first.snapshot, first.versions, sync([]))).toThrow(
      'revisão',
    )
    const restored = applyPythonLanguagePatch(
      removed.snapshot,
      removed.versions,
      sync([{ path: 'main.py', version: 3, source: 'new' }], 2),
    )
    expect(restored.snapshot.files['main.py']!.source).toBe('new')
    expect(first.snapshot.files['main.py']!.source).toBe('x = 1\n')
  })
  it('checks aggregate limits and path collisions before publishing', () => {
    expect(() => sync([{ path: 'a.py', source: 'é'.repeat(600_000), version: 1 }])).toThrow(
      'limite',
    )
    expect(() =>
      sync([
        { path: 'a.py', source: '', version: 1 },
        { path: 'A.py', source: '', version: 1 },
      ]),
    ).toThrow()
    const first = applyPythonLanguagePatch(
      base,
      new Map(),
      sync([{ path: 'a.py', source: '', version: 1 }]),
    )
    expect(() =>
      applyPythonLanguagePatch(
        first.snapshot,
        first.versions,
        sync([{ path: 'A.py', source: '', version: 1 }], 1),
      ),
    ).toThrow()
    expect(() =>
      applyPythonLanguagePatch(
        first.snapshot,
        first.versions,
        sync([{ path: 'a.py/child.py', source: '', version: 1 }], 1),
      ),
    ).toThrow()
    expect(() =>
      applyPythonLanguagePatch(
        base,
        new Map(),
        sync(
          Array.from({ length: 51 }, (_, index) => ({
            path: `f${index}.py`,
            version: 1,
            source: '',
          })),
        ),
      ),
    ).toThrow('limite')
    for (const newline of ['\n', '\r\n', '\r']) {
      expect(() =>
        applyPythonLanguagePatch(
          base,
          new Map(),
          sync([{ path: 'main.py', source: `x=1${newline}`.repeat(20_000), version: 1 }]),
        ),
      ).not.toThrow()
      expect(() =>
        applyPythonLanguagePatch(
          base,
          new Map(),
          sync([{ path: 'main.py', source: `x=1${newline}`.repeat(20_001), version: 1 }]),
        ),
      ).toThrow('limite')
    }
  })
  it('rejects stale query versions and offsets splitting Unicode or CRLF', () => {
    const snapshot = { revision: 1, files: { 'main.py': { version: 1, source: '🐢\r\nx' } } }
    const query = (offset: number) => {
      const value = parsePythonLanguageCommand({
        version: 1,
        id: 'q',
        kind: 'query',
        revision: 1,
        path: 'main.py',
        documentVersion: 1,
        method: 'hover',
        offset,
      })
      if (value.kind !== 'query') throw new Error('Expected query')
      return value
    }
    for (const offset of [0, 2, 4, 5])
      expect(() => assertPythonLanguageQueryCurrent(snapshot, query(offset))).not.toThrow()
    for (const offset of [1, 3, 6])
      expect(() => assertPythonLanguageQueryCurrent(snapshot, query(offset))).toThrow()
    expect(() => assertPythonLanguageQueryCurrent({ ...snapshot, revision: 2 }, query(0))).toThrow(
      'mudou',
    )
    expect(() => parsePythonLanguageCommand({ ...query(0), method: 'symbols' })).toThrow()
    expect(() => parsePythonLanguageCommand({ ...query(0), method: 'renameSymbol' })).toThrow()
  })
})
