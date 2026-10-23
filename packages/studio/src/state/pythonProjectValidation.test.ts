import { expect, test } from 'bun:test'
import { sha256Hex } from '@sistemazero/core/creations'
import { StudioProjectDocumentSchema } from '@sistemazero/core/studio/project-document'
import { preparePythonExecutionSnapshot } from '../runtime/python/snapshot'
import { documentFixture } from './fixtures/projectDocuments'
import { installLocalRevision, readLocalRevision } from './projectStorageRevision'
import { refinePythonClassicProjectDocument } from './pythonProjectValidation'
import { preparePythonPromotion } from './pythonPromotion'

function classic() {
  const project = documentFixture('python', 'classic')
  if (project.programmingLanguage !== 'python' || project.kind !== 'classic')
    throw new Error('fixture')
  project.files = {
    'main.py': '# 🐢 intacto\r\nfrom desenhos.helper import mensagem\r\nprint(mensagem)\r\n',
    'desenhos/helper.py': 'mensagem = "ação"\r\n',
    'requirements.txt': '',
  }
  project.ir = { untrustedDerivedCache: 'print("must never run")' }
  project.blocksState = { unknownDerivedState: true }
  project.assets = [
    {
      id: 'hero',
      name: 'hero',
      kind: 'image',
      source: 'library',
      proPath: 'hero.gif',
      dataUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
      libOrigin: 'pinta',
      libId: 'personal:hero',
      libRevision: 1,
      license: { name: 'CC0' },
    },
  ]
  return project
}

test('Classic preserves source, syntax errors, opaque caches and local revision without trusting visual data', async () => {
  const source = installLocalRevision(classic(), 'reader')
  const expected = structuredClone(source)
  const pending = refinePythonClassicProjectDocument(source)
  source.files['main.py'] = 'changed'
  const parsed = await pending
  expect(StudioProjectDocumentSchema.parse(parsed)).toEqual(
    StudioProjectDocumentSchema.parse(expected),
  )
  expect(readLocalRevision(parsed)).toBe(readLocalRevision(source))
  expect(parsed.ir).not.toBe(source.ir)
  const snapshot = await preparePythonExecutionSnapshot(parsed)
  expect(
    new TextDecoder().decode(snapshot.files.find((file) => file.path === 'main.py')!.bytes),
  ).toBe(expected.files['main.py']!)
  expect(
    snapshot.files.some((file) => new TextDecoder().decode(file.bytes).includes('must never run')),
  ).toBe(false)
  source.files['main.py'] = 'def unfinished(\r\n'
  expect((await refinePythonClassicProjectDocument(source)).files['main.py']).toBe(
    source.files['main.py'],
  )
})

test('Classic checks paths, media collisions, source quotas and dependency lock before runtime preparation', async () => {
  for (const files of [
    { 'main.py': '', 'MAIN.py': '' },
    { 'main.py': '', desenhos: '', 'desenhos/helper.py': '' },
    { 'main.py': '', '../helper.py': '' },
    { 'main.py': '#'.repeat(256_001) },
    { 'main.py': '', 'hero.gif': 'source must not disappear' },
  ])
    await expect(refinePythonClassicProjectDocument({ ...classic(), files })).rejects.toThrow()
  const source = classic()
  source.files['requirements.txt'] = '# vazio\r\n'
  expect((await refinePythonClassicProjectDocument(source)).files).toEqual(source.files)
  await expect(preparePythonExecutionSnapshot(source)).rejects.toThrow('requirements.txt')
  source.python.dependencyLock.requirementsSha256 = await sha256Hex(
    source.files['requirements.txt'],
  )
  expect((await refinePythonClassicProjectDocument(source)).files).toEqual(source.files)
  await expect(
    refinePythonClassicProjectDocument(documentFixture('python', 'pro')),
  ).rejects.toThrow('Clássico')
  await expect(
    refinePythonClassicProjectDocument(documentFixture('javascript', 'classic')),
  ).rejects.toThrow('Clássico')
})

test('opaque Python visual caches never enter the JavaScript block validator or override source', async () => {
  for (const blocksState of [
    {
      blocks: {
        blocks: [
          { type: 'sz_frame_future', inputs: { PYTHON: { block: { type: 'unknown_python' } } } },
        ],
      },
    },
    {
      blocks: {
        blocks: [
          { type: 'sz_py_print', id: 'same' },
          { type: 'sz_py_print', id: 'same' },
        ],
      },
    },
  ]) {
    const source = { ...classic(), blocksState }
    const parsed = await refinePythonClassicProjectDocument(source)
    expect(parsed.blocksState).toEqual(blocksState)
    expect(parsed.blocksState).not.toBe(blocksState)
    const snapshot = await preparePythonExecutionSnapshot(parsed)
    expect(
      new TextDecoder().decode(snapshot.files.find((file) => file.path === 'main.py')!.bytes),
    ).toBe(source.files['main.py']!)
  }
})

test('promotion preserves a separate original and produces identical execution files and revision', async () => {
  const source = installLocalRevision(classic(), 'promotion')
  const before = JSON.stringify(source)
  const pending = preparePythonPromotion(source, { originalId: 'original-copy', now: 500 })
  source.files['main.py'] = 'changed while preparing'
  const { original, converted } = await pending
  const captured = JSON.parse(before)
  expect(original.files).toEqual(captured.files)
  expect(original.ir).toEqual(captured.ir)
  expect(original.blocksState).toEqual(captured.blocksState)
  expect(original.id).toBe('original-copy')
  expect(readLocalRevision(original)).toBeUndefined()
  expect(converted.id).toBe(captured.id)
  expect(converted.kind).toBe('pro')
  expect(converted.mode).toBe('code')
  expect(converted.tree.desenhos).toEqual({ kind: 'dir' })
  expect(converted.tree['main.py']).toEqual({ kind: 'file', content: captured.files['main.py'] })
  expect(converted.assets).toEqual(captured.assets)
  expect(converted.assets).not.toBe(original.assets)
  expect(converted.python).toEqual(captured.python)
  expect(converted.proMeta.origin).toEqual({ projectId: original.id, revision: captured.updatedAt })
  expect('files' in converted).toBe(false)
  expect('devScript' in converted.proMeta).toBe(false)
  const classicRun = await preparePythonExecutionSnapshot(captured)
  const proRun = await preparePythonExecutionSnapshot(converted)
  expect(proRun).toEqual(classicRun)
  expect(proRun.directories).toEqual(['desenhos'])
  await expect(
    preparePythonPromotion(classic(), { originalId: source.id, now: 500 }),
  ).rejects.toThrow('identidade')
})
