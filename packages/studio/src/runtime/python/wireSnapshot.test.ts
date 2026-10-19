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
