import { expect, it } from 'bun:test'
import { mkdir, readdir, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { parsePythonLanguageCommand } from '@sistemazero/core/studio/python-language'
import { PythonLanguageSession } from '../runtime/pyright'

it('admits an empty entrypoint and rejects deleting it atomically without a replacement', async () => {
  const root = resolve(
    import.meta.dirname,
    '../../../.cache/studio-language-tests',
    crypto.randomUUID(),
  )
  await mkdir(root, { recursive: true })
  const session = new PythonLanguageSession({
    root,
    serverPath: createRequire(import.meta.url).resolve('pyright/langserver.index.js'),
    nodePath: Bun.which('node')!,
  })
  let sequence = 0
  const send = (input: object) =>
    session.handle(
      parsePythonLanguageCommand({ version: 1, id: `empty${++sequence}`, ...input }),
      AbortSignal.timeout(15_000),
    )
  const symbols = () =>
    send({
      kind: 'query',
      revision: 1,
      path: 'main.py',
      documentVersion: 1,
      method: 'symbols',
    })
  try {
    expect(
      await send({
        kind: 'sync',
        entrypoint: 'main.py',
        baseRevision: 0,
        revision: 1,
        changes: [{ path: 'main.py', version: 1, source: '' }],
      }),
    ).toMatchObject({ kind: 'synced', revision: 1 })
    expect(await symbols()).toMatchObject({ kind: 'result', result: [] })
    expect(
      await send({
        kind: 'sync',
        entrypoint: 'main.py',
        baseRevision: 1,
        revision: 2,
        changes: [{ path: 'main.py', version: 2, source: null }],
      }),
    ).toMatchObject({ kind: 'error', code: 'stale-document' })
    expect(await readFile(resolve(root, 'main.py'), 'utf8')).toBe('')
    expect(await symbols()).toMatchObject({ kind: 'result', result: [] })
  } finally {
    session.dispose()
  }
})

it('analyzes actual Pyright snapshots, imports, Turtle, edits and stale versions without running source', async () => {
  const root = resolve(
    import.meta.dirname,
    '../../../.cache/studio-language-tests',
    crypto.randomUUID(),
  )
  await mkdir(root, { recursive: true })
  const session = new PythonLanguageSession({
    root,
    serverPath: createRequire(import.meta.url).resolve('pyright/langserver.index.js'),
    nodePath: Bun.which('node')!,
  })
  let sequence = 0
  const send = (input: object) =>
    session.handle(
      parsePythonLanguageCommand({ version: 1, id: `r${++sequence}`, ...input }),
      AbortSignal.timeout(15_000),
    )
  const source =
    'from helper import somar\nimport turtle\npontos = somar(1, 2)\ntartaruga = turtle.Turtle()\ntartaruga.\n'
  const query = (method: string, offset?: number, name?: string) =>
    send({
      kind: 'query',
      revision: 1,
      path: 'main.py',
      documentVersion: 1,
      method,
      ...(offset === undefined ? {} : { offset }),
      ...(name ? { name } : {}),
    })
  try {
    expect(
      await send({
        kind: 'sync',
        entrypoint: 'main.py',
        baseRevision: 0,
        revision: 1,
        changes: [
          { path: 'main.py', version: 1, source },
          {
            path: 'helper.py',
            version: 1,
            source: 'def somar(a: int, b: int) -> int:\n    return a + b\n',
          },
          {
            path: 'sitecustomize.py',
            version: 1,
            source: 'raise RuntimeError("must not execute")\n',
          },
        ],
      }),
    ).toMatchObject({ kind: 'synced', revision: 1 })
    const completion = await query('completions', source.lastIndexOf('.') + 1)
    expect(completion.kind).toBe('result')
    if (completion.kind === 'result' && completion.method === 'completions')
      expect(completion.result.some((item) => item.name === 'forward')).toBe(true)
    const hover = await query('hover', source.indexOf('somar(1'))
    expect(hover.kind).toBe('result')
    if (hover.kind === 'result' && hover.method === 'hover')
      expect(hover.result?.text).toContain('somar')
    const definitions = await query('definitions', source.indexOf('somar(1'))
    expect(definitions).toMatchObject({
      kind: 'result',
      result: [{ path: 'helper.py', span: { start: 4, length: 5 } }],
    })
    const rename = await query('renameSymbol', source.indexOf('somar(1'), 'adicionar')
    expect(rename.kind).toBe('result')
    if (rename.kind === 'result' && rename.method === 'renameSymbol') {
      expect(rename.result.map((item) => item.path).sort()).toEqual([
        'helper.py',
        'main.py',
        'main.py',
      ])
      expect(rename.result.every((item) => item.text === 'adicionar')).toBe(true)
    }
    expect(await query('symbols')).toMatchObject({ kind: 'result' })
    const diagnostics = await query('diagnostics')
    expect(diagnostics.kind).toBe('result')
    if (diagnostics.kind === 'result' && diagnostics.method === 'diagnostics')
      expect(diagnostics.result.some((item) => item.severity === 'error')).toBe(true)
    const projectDiagnostics = await query('projectDiagnostics')
    expect(projectDiagnostics.kind).toBe('result')
    if (
      projectDiagnostics.kind === 'result' &&
      projectDiagnostics.method === 'projectDiagnostics'
    ) {
      expect(
        projectDiagnostics.result.some(
          (item) => item.path === 'main.py' && item.severity === 'error',
        ),
      ).toBe(true)
      expect(projectDiagnostics.result.length).toBeLessThanOrEqual(100)
    }
    expect(await query('references', source.indexOf('somar(1'))).toMatchObject({ kind: 'result' })
    expect(await query('signatureHelp', source.indexOf('1, 2') + 3)).toMatchObject({
      kind: 'result',
    })
    expect(
      await send({
        kind: 'sync',
        entrypoint: 'main.py',
        baseRevision: 1,
        revision: 2,
        changes: [{ path: 'main.py', source: 'print(1)\n', version: 2 }],
      }),
    ).toMatchObject({ kind: 'synced' })
    expect(await query('symbols')).toMatchObject({ kind: 'error', code: 'stale-document' })
    expect(await readFile(resolve(root, 'main.py'), 'utf8')).toBe('print(1)\n')
    expect((await readdir(root)).sort()).toEqual(['helper.py', 'main.py', 'sitecustomize.py'])
    expect(
      await send({
        kind: 'sync',
        entrypoint: 'main.py/child.py',
        baseRevision: 2,
        revision: 3,
        changes: [
          { path: 'main.py/child.py', version: 1, source: 'x = 3\n' },
          { path: 'main.py', version: 3, source: null },
        ],
      }),
    ).toMatchObject({ kind: 'synced' })
    expect(await readFile(resolve(root, 'main.py/child.py'), 'utf8')).toBe('x = 3\n')
    expect(
      await send({
        kind: 'sync',
        entrypoint: 'main.py',
        baseRevision: 3,
        revision: 4,
        changes: [
          { path: 'main.py', version: 4, source: 'x = 4\n' },
          { path: 'main.py/child.py', version: 2, source: null },
        ],
      }),
    ).toMatchObject({ kind: 'synced' })
    expect(await readFile(resolve(root, 'main.py'), 'utf8')).toBe('x = 4\n')
  } finally {
    session.dispose()
  }
}, 60_000)
