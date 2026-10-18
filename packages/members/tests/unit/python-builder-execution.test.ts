import { expect, test } from 'bun:test'
import { sha256Hex } from '@sistemazero/core/creations'
import {
  applyStudioProChange,
  createStudioProRevision,
  studioProDigest,
} from '@sistemazero/core/studio/pro-revision'
import { STUDIO_PYTHON_MATERIAL_LIMITS } from '@sistemazero/core/studio/python-material-policy'
import { prepareStudioPythonProExecution } from '@sistemazero/core/studio/python-pro-execution'
import { preparePythonProExecutionSnapshot } from '@sistemazero/studio/server-python-snapshot'
import { capturePythonProRevisionPayload } from '../../../studio/src/state/pythonProRevision'
import { PNG } from '../fakes/gallery-python-source'
import { authoringFixture } from '../fakes/studio-authoring-policy'

async function fixture(extensionIds: string[] = []) {
  const { project } = await authoringFixture('python', 'pro')
  if (project.programmingLanguage !== 'python' || project.kind !== 'pro')
    throw new Error('Expected Python Pro')
  // Contract fixtures only. These synthetic extensions do not grant a host capability.
  project.installedExtensions = extensionIds.map((id) => ({
    id,
    version: '1.0.0',
    installedAt: 1792281600000,
  }))
  project.tree['src/main.py'] = {
    kind: 'file',
    content: 'from helper import n\nprint("ação", n)\n',
  }
  project.tree.empty = { kind: 'dir' }
  project.assets = [
    {
      id: 'drawing',
      name: 'heroi',
      kind: 'image',
      source: 'upload',
      proPath: 'dist/sprite.png',
      dataUrl: PNG,
    },
  ]
  const expected = await preparePythonProExecutionSnapshot(project)
  return { expected, ...(await capturePythonProRevisionPayload(project)) }
}

test('server builder materialization has the exact editor execution identity and owns its bytes', async () => {
  const f = await fixture(),
    controller = new AbortController()
  const pending = prepareStudioPythonProExecution(f.base, f.binaries, controller.signal)
  // Caller-owned objects may change while the real asynchronous hashes are pending.
  f.base.files['src/main.py'] = 'print("altered")'
  Object.values(f.binaries)[0]!.base64 = Buffer.from('altered').toString('base64')
  const prepared = await pending
  expect(prepared.metadata).toEqual({
    ...f.expected,
    files: f.expected.files.map(({ bytes, ...file }) => ({
      ...file,
      byteLength: bytes.byteLength,
    })),
  })
  expect(prepared.base.hash).not.toBe(prepared.metadata.revision)
  for (const file of f.expected.files) {
    const borrowed = await prepared.read(file.path, controller.signal)
    expect(borrowed).toEqual(file.bytes)
    borrowed.fill(0)
    expect(await prepared.read(file.path, controller.signal)).toEqual(file.bytes)
  }
  const missing = await prepared.read('../private.py', controller.signal).then(
    () => null,
    (error: Error) => error.message,
  )
  expect(missing).toContain('não pertence')
  controller.abort(new DOMException('Closed project', 'AbortError'))
  const retired = await prepared.read('src/main.py', new AbortController().signal).then(
    () => null,
    (error: Error) => error.name,
  )
  expect(retired).toBe('AbortError')
})

test.each([
  'missing',
  'extra',
  'hash',
  'bytes',
  'encoding',
] as const)('builder execution rejects %s binary material', async (mode) => {
  const f = await fixture(),
    path = Object.keys(f.binaries)[0]!,
    binary = f.binaries[path]!
  if (mode === 'missing') delete f.binaries[path]
  else if (mode === 'extra') f.binaries['assets/extra.png'] = { ...binary }
  else if (mode === 'hash') binary.sha256 = 'f'.repeat(64)
  else if (mode === 'bytes') binary.base64 = Buffer.from('altered').toString('base64')
  else binary.base64 = 'not base64!'
  const result = await prepareStudioPythonProExecution(f.base, f.binaries).then(
    () => null,
    (error: Error) => error.message,
  )
  expect(typeof result).toBe('string')
})

test.each([
  ['a-extension', 'z-extension'],
  ['z-extension', 'a-extension'],
])('CAS, execution and inverse preserve extension order %s then %s', async (first, second) => {
  const f = await fixture([first, second])
  const prepared = await prepareStudioPythonProExecution(f.base, f.binaries)
  expect(prepared.metadata.configuration.extensions).toEqual(f.expected.configuration.extensions)
  expect(prepared.metadata.revision).toBe(f.expected.revision)
  const applied = await applyStudioProChange(f.base, {
    baseHash: f.base.hash,
    summary: 'Alterar número',
    patches: [
      {
        path: 'src/helper.py',
        before: await studioProDigest(f.base.files['src/helper.py']!),
        content: 'n = 123\n',
      },
    ],
  })
  expect(applied.revision.configuration.extensions).toEqual(f.base.configuration.extensions)
  const undone = await applyStudioProChange(applied.revision, applied.inverse)
  expect(undone.revision).toEqual(f.base)
  expect(
    (await prepareStudioPythonProExecution(undone.revision, f.binaries)).metadata.revision,
  ).toBe(f.expected.revision)
})

test('pre-aborted builder materialization cannot admit a source revision', async () => {
  const f = await fixture(),
    controller = new AbortController()
  controller.abort(new DOMException('Cancelled', 'AbortError'))
  const result = await prepareStudioPythonProExecution(f.base, f.binaries, controller.signal).then(
    () => null,
    (error: Error) => error.name,
  )
  expect(result).toBe('AbortError')
})

test('builder materialization keeps external packages unavailable even with a self-consistent CAS and lock hash', async () => {
  const f = await fixture(),
    requirements = 'pygame-ce==2.5.5\n'
  const configuration = structuredClone(f.base.configuration)
  if (configuration.programmingLanguage !== 'python') throw new Error('Expected Python')
  configuration.python.dependencyLock.requirementsSha256 = await sha256Hex(requirements)
  const base = await createStudioProRevision({
    ...f.base,
    configuration,
    files: { ...f.base.files, 'requirements.txt': requirements },
  })
  const result = await prepareStudioPythonProExecution(base, f.binaries).then(
    () => null,
    (error: Error) => error.message,
  )
  expect(result).toContain('ainda não instala pacotes externos')
})

test('oversized binary declarations are refused before decoding or hashing their bytes', async () => {
  const f = await fixture(),
    path = Object.keys(f.binaries)[0]!
  f.binaries[path]!.base64 = 'A'.repeat(
    Math.ceil((STUDIO_PYTHON_MATERIAL_LIMITS.snapshotBytes + 1) / 3) * 4,
  )
  const result = await prepareStudioPythonProExecution(f.base, f.binaries).then(
    () => null,
    (error: Error) => error.message,
  )
  expect(result).toContain('excedem a cota')
})

test('withdrawal while real revision hashing is pending cannot return an execution package', async () => {
  const f = await fixture(),
    controller = new AbortController()
  const pending = prepareStudioPythonProExecution(f.base, f.binaries, controller.signal)
  controller.abort(new DOMException('Closed project', 'AbortError'))
  const result = await pending.then(
    () => null,
    (error: Error) => error.name,
  )
  expect(result).toBe('AbortError')
})
