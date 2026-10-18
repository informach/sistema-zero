import { expect, it } from 'bun:test'
import type { PythonProjectDocument } from '../../core/editableProject'
import { pythonEnvironmentFixture } from '../../state/fixtures/pythonEnvironment'
import { createPythonFileOperations } from './fileOperations'
import type { PythonAnalysisIdentity, PythonParsedDocument } from './types'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((yes) => {
    resolve = yes
  })
  return { promise, resolve }
}

/** The parser transport is controlled here to exercise ownership; native/browser proofs parse real code. */
async function fixture() {
  const setup = await pythonEnvironmentFixture('pro')
  if (setup.project.kind !== 'pro') throw new Error('Expected Pro')
  const project = {
    ...setup.project,
    tree: { 'main.py': { kind: 'file' as const, content: 'pass\n' } },
    python: { ...setup.project.python, entrypoint: 'main.py' },
  }
  let current: PythonProjectDocument | null = project,
    epoch = 1,
    mounts = 0,
    disposed = 0
  const requested = deferred<{ identity: PythonAnalysisIdentity; source: string }>()
  const response = deferred<PythonParsedDocument>()
  setup.environment.resolvePythonAnalysis = async () => ({
    url: 'https://parser.test/analysis.html',
    allowedOrigins: ['https://parser.test'],
  })
  const operations = createPythonFileOperations({
    project: () => current,
    environment: () => setup.environment,
    writerEpoch: () => epoch,
    mountFrame() {
      mounts++
      return { frame: document.createElement('iframe'), release() {} }
    },
    prepareSession: async () => ({
      closed: false,
      parse(identity, source) {
        requested.resolve({ identity, source })
        return response.promise
      },
      render: async () => {
        throw new Error('Unexpected render')
      },
      dispose() {
        disposed++
      },
    }),
  })
  const reply = (request: { identity: PythonAnalysisIdentity; source: string }) =>
    response.resolve({
      ...request,
      language: 'python',
      version: 1,
      tree: { kind: 'Module', fields: { body: [{ kind: 'Pass', fields: {} }], type_ignores: [] } },
      tokens: [],
      diagnostics: [],
    })
  return {
    project,
    operations,
    requested: requested.promise,
    reply,
    counts: () => ({ mounts, disposed }),
    replace() {
      current = { ...project }
    },
    revoke() {
      epoch++
    },
  }
}

it('keeps parsing lazy, rejects quotas before boot and leaves the document unchanged', async () => {
  const test = await fixture()
  expect(test.counts()).toEqual({ mounts: 0, disposed: 0 })
  const oversized = {
    ...test.project.tree,
    'huge.py': { kind: 'file' as const, content: 'x'.repeat(1024 * 1024 + 1) },
  }
  await expect(test.operations.rename(oversized, 'main.py', 'game.py')).rejects.toThrow()
  expect(test.counts().mounts).toBe(0)
  const result = test.operations.rename(test.project.tree, 'main.py', 'game.py')
  test.reply(await test.requested)
  expect(await result).toEqual([])
  expect(Object.keys(test.project.tree)).toEqual(['main.py'])
  test.operations.dispose()
  expect(test.counts()).toEqual({ mounts: 1, disposed: 1 })
})

it('rejects late parsing after project replacement, writer revocation or disposal', async () => {
  for (const change of ['replace', 'revoke', 'dispose'] as const) {
    const test = await fixture()
    const outcome = test.operations
      .rename(test.project.tree, 'main.py', 'game.py')
      .catch((error: unknown) => error)
    const request = await test.requested
    if (change === 'dispose') test.operations.dispose()
    else test[change]()
    test.reply(request)
    const error = await outcome
    expect(error).toBeInstanceOf(DOMException)
    if (!(error instanceof DOMException)) throw new Error('Expected cancellation')
    expect(error.name).toBe('AbortError')
    expect(Object.keys(test.project.tree)).toEqual(['main.py'])
    test.operations.dispose()
  }
})
