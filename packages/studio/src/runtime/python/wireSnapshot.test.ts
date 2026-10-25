import { expect, test } from 'bun:test'
import { documentFixture } from '../../state/fixtures/projectDocuments'
import { preparePythonExecutionSnapshot } from './snapshot'
import { readPythonWireSnapshot } from './wireSnapshot'

async function snapshot() {
  const project = documentFixture('python', 'pro')
  if (project.programmingLanguage !== 'python') throw new Error('Python fixture required')
  project.assets = []
  delete project.coverAssetName
  project.installedExtensions = [{ id: 'python-turtle', version: '1.0.0', installedAt: 1 }]
  return preparePythonExecutionSnapshot(project)
}

test('the worker boundary preserves the exact source, identity and ordered extension references', async () => {
  const input = await snapshot()
  input.configuration.extensions = [
    { id: 'python-turtle', version: '1.0.0' },
    { id: 'another-extension', version: '2.0.0-rc.1+build' },
  ]
  const parsed = readPythonWireSnapshot(input)
  expect(parsed).toEqual(input)
  expect(parsed.configuration.extensions).not.toBe(input.configuration.extensions)
  expect(parsed.configuration.extensions[0]).not.toBe(input.configuration.extensions[0])
  expect(parsed.files.map((file) => [...file.bytes])).toEqual(
    input.files.map((file) => [...file.bytes]),
  )
})

test('the worker boundary rejects malformed or expanded extension references before execution', async () => {
  const input = await snapshot()
  for (const extension of [
    null,
    'python-turtle',
    {},
    { id: 'python-turtle' },
    { id: '../turtle', version: '1.0.0' },
    { id: 'python-turtle', version: '^1.0.0' },
    { id: 'python-turtle', version: '1.0.0', url: 'https://untrusted.test/code.py' },
    { id: 'python-turtle', version: '1.0.0', installedAt: 1 },
    { id: 'python-turtle', version: '1'.repeat(65) },
  ]) {
    expect(() =>
      readPythonWireSnapshot({
        ...input,
        configuration: { ...input.configuration, extensions: [extension] },
      }),
    ).toThrow()
  }
})

test('saved files cross the worker boundary apart from the program and within their limits', async () => {
  const input = await snapshot()
  const placar = new TextEncoder().encode('Ana;30') as Uint8Array<ArrayBuffer>
  const parsed = readPythonWireSnapshot({
    ...input,
    saved: [{ path: 'placar.txt', bytes: placar }],
  })
  expect(parsed.saved?.map((file) => [file.path, [...file.bytes]])).toEqual([
    ['placar.txt', [...placar]],
  ])
  expect(parsed.revision).toBe(input.revision)
  expect(readPythonWireSnapshot(input).saved).toBeUndefined()
  for (const saved of [
    'placar.txt',
    [{ path: '../placar.txt', bytes: placar }],
    [{ path: 'placar.txt', bytes: 'Ana;30' }],
    Array.from({ length: 17 }, (_, index) => ({ path: `f${index}.txt`, bytes: placar })),
    Array.from({ length: 5 }, (_, index) => ({
      path: `f${index}.bin`,
      bytes: new Uint8Array(64 * 1024),
    })),
  ])
    expect(() => readPythonWireSnapshot({ ...input, saved })).toThrow()
})
