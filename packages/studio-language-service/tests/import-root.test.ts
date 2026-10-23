import { expect, it } from 'bun:test'
import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { parsePythonLanguageCommand } from '@sistemazero/core/studio/python-language'
import { PythonLanguageSession } from '../runtime/pyright'

async function fixture(entrypoint: string, files: Record<string, string>) {
  const root = resolve(
    import.meta.dirname,
    '../../../.cache/studio-language-tests',
    crypto.randomUUID(),
  )
  await mkdir(root, { recursive: true })
  const session = new PythonLanguageSession({
    providedModules: [],
    root,
    nodePath: Bun.which('node')!,
    serverPath: createRequire(import.meta.url).resolve('pyright/langserver.index.js'),
  })
  let sequence = 0
  const send = (input: object) =>
    session.handle(
      parsePythonLanguageCommand({ version: 1, id: `r${++sequence}`, ...input }),
      AbortSignal.timeout(15_000),
    )
  const synced = await send({
    kind: 'sync',
    entrypoint,
    baseRevision: 0,
    revision: 1,
    changes: Object.entries(files).map(([path, source]) => ({ path, source, version: 1 })),
  })
  expect(synced.kind).toBe('synced')
  return {
    session,
    send,
    query(method: string, path: string, offset?: number) {
      return send({
        kind: 'query',
        method,
        path,
        revision: 1,
        documentVersion: 1,
        ...(offset === undefined ? {} : { offset }),
        ...(method === 'renameSymbol' ? { name: 'new_value' } : {}),
      })
    },
  }
}

it('resolves and renames through the executable directory, including imports inside packages', async () => {
  for (const path of ['src/main.py', 'src/pkg/child.py']) {
    const source = 'from helper import value\nprint(value)\n'
    const test = await fixture('src/main.py', {
      'src/main.py': path === 'src/main.py' ? source : 'import pkg.child\n',
      'src/pkg/__init__.py': '',
      'helper.py': 'value = "ROOT"\n',
      'src/helper.py': 'value = "SRC"\n',
      'src/pkg/helper.py': 'value = "SIBLING"\n',
      [path]: source,
    })
    try {
      const definition = await test.query('definitions', path, source.indexOf('value'))
      expect(definition.kind).toBe('result')
      if (definition.kind !== 'result' || definition.method !== 'definitions')
        throw new Error('Expected definition')
      expect(definition.result.map((item) => item.path)).toEqual(['src/helper.py'])
      const renamed = await test.query('renameSymbol', path, source.indexOf('value'))
      if (renamed.kind !== 'result' || renamed.method !== 'renameSymbol')
        throw new Error('Expected rename')
      expect([...new Set(renamed.result.map((item) => item.path))].sort()).toEqual(
        ['src/helper.py', path].sort(),
      )
      const wrongRoot = await test.send({
        kind: 'sync',
        entrypoint: 'main.py',
        baseRevision: 1,
        revision: 2,
        changes: [],
      })
      expect(wrongRoot).toMatchObject({ kind: 'error', code: 'stale-document' })
      const preserved = await test.query('definitions', path, source.indexOf('value'))
      expect(preserved).toMatchObject({ kind: 'result', result: definition.result })
    } finally {
      test.session.dispose()
    }
  }
})

it('does not resolve an absolute import through a file above the executable directory', async () => {
  const test = await fixture('src/main.py', {
    'src/main.py': 'from helper import value\nprint(value)\n',
    'helper.py': 'value=42\n',
  })
  try {
    const result = await test.query('diagnostics', 'src/main.py')
    if (result.kind !== 'result' || result.method !== 'diagnostics')
      throw new Error('Expected diagnostics')
    expect(result.result.some((item) => item.code === 'reportMissingImports')).toBe(true)
    const definition = await test.query('definitions', 'src/main.py', 20)
    expect(definition).toMatchObject({ kind: 'result', result: [] })
  } finally {
    test.session.dispose()
  }
})

it('reconfigures the executable directory in the same language session and keeps parent files outside import resolution', async () => {
  const source = 'from helper import value\nprint(value)\n'
  const f = await fixture('src/main.py', {
    'src/main.py': source,
    'src/helper.py': 'value="SRC"\n',
    'other/game.py': source,
    'other/helper.py': 'value="OTHER"\n',
    'helper.py': 'value="ROOT"\n',
  })
  try {
    const before = await f.query('definitions', 'src/main.py', source.indexOf('value'))
    expect(before).toMatchObject({ kind: 'result', result: [{ path: 'src/helper.py' }] })
    expect(
      await f.send({
        kind: 'sync',
        entrypoint: 'other/game.py',
        baseRevision: 1,
        revision: 2,
        changes: [],
      }),
    ).toMatchObject({ kind: 'synced', revision: 2 })
    const after = await f.send({
      kind: 'query',
      method: 'definitions',
      path: 'other/game.py',
      revision: 2,
      documentVersion: 1,
      offset: source.indexOf('value'),
    })
    expect(after).toMatchObject({ kind: 'result', result: [{ path: 'other/helper.py' }] })
    expect(
      await f.send({
        kind: 'sync',
        entrypoint: 'other/play.py',
        baseRevision: 2,
        revision: 3,
        changes: [
          { path: 'other/game.py', source: null, version: 2 },
          { path: 'other/play.py', source, version: 1 },
          { path: 'other/helper.py', source: null, version: 2 },
        ],
      }),
    ).toMatchObject({ kind: 'synced', revision: 3 })
    const missing = await f.send({
      kind: 'query',
      method: 'diagnostics',
      path: 'other/play.py',
      revision: 3,
      documentVersion: 1,
    })
    if (missing.kind !== 'result' || missing.method !== 'diagnostics')
      throw new Error('Expected diagnostics')
    expect(missing.result.some((item) => item.code === 'reportMissingImports')).toBe(true)
    expect(
      await f.send({
        kind: 'query',
        method: 'definitions',
        path: 'other/play.py',
        revision: 3,
        documentVersion: 1,
        offset: source.indexOf('value'),
      }),
    ).toMatchObject({ kind: 'result', result: [] })
  } finally {
    f.session.dispose()
  }
})
