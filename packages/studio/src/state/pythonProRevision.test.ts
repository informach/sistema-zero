import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import {
  applyStudioProChange,
  parseStudioProRevision,
  studioProDigest,
} from '@sistemazero/core/studio/pro-revision'
import { documentFixture } from './fixtures/projectDocuments'
import { refinePythonProProjectDocument } from './pythonProProjectValidation'
import {
  capturePythonProRevision,
  capturePythonProRevisionPayload,
  PythonProRevisionUnavailableError,
} from './pythonProRevision'

function project() {
  const source = documentFixture('python', 'pro')
  if (source.programmingLanguage !== 'python' || source.kind !== 'pro') throw new Error('Fixture')
  return {
    ...source,
    assets: [
      {
        id: 'hero',
        name: 'hero',
        kind: 'image' as const,
        source: 'upload' as const,
        dataUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
        proPath: 'hero.gif',
      },
    ],
  }
}

describe('Python Pro projection into the shared revision protocol', () => {
  test('captures source/configuration and exact binary bytes through JSON transport', async () => {
    const source = project()
    const { base, binaries } = await capturePythonProRevisionPayload(source)
    expect(base.version).toBe(2)
    expect(base.configuration.programmingLanguage).toBe('python')
    expect(base.configuration).toEqual({
      programmingLanguage: 'python',
      runtime: source.runtime,
      python: source.python,
      extensions: [],
    })
    expect(Object.keys(base.files).sort()).toEqual([
      'requirements.txt',
      'src/helper.py',
      'src/main.py',
    ])
    expect(base.directories).toEqual(['src'])
    expect('devScript' in base).toBe(false)
    expect(await parseStudioProRevision(JSON.parse(JSON.stringify(base)))).toEqual(base)
    const bytes = Buffer.from(binaries['hero.gif']!.base64, 'base64')
    expect(bytes).toEqual(Buffer.from(source.assets[0]!.dataUrl.split(',')[1]!, 'base64'))
    expect(binaries['hero.gif']!.sha256).toBe(createHash('sha256').update(bytes).digest('hex'))
    expect(base.assetFiles['hero.gif']).toBe(binaries['hero.gif']!.sha256)
    expect(base.assets).not.toContain('data:')
    expect((await capturePythonProRevision(source)).hash).toBe(base.hash)
  })

  test('source changes use the same inverse and reject stale bases', async () => {
    const source = project()
    const base = await capturePythonProRevision(source)
    const change = {
      baseHash: base.hash,
      summary: 'Alterar número',
      patches: [
        {
          path: 'src/helper.py',
          before: await studioProDigest(base.files['src/helper.py']!),
          content: 'n = 100\r\n',
        },
      ],
    }
    const applied = await applyStudioProChange(base, change)
    expect(applied.revision.files['src/helper.py']).toBe('n = 100\r\n')
    expect((await applyStudioProChange(applied.revision, applied.inverse)).revision).toEqual(base)
    await expect(applyStudioProChange(applied.revision, change)).rejects.toThrow()
  })

  test('a runtime-only change invalidates equality even with identical source', async () => {
    const source = project()
    const before = await capturePythonProRevision(source)
    source.runtime.releaseId = 'test-2'
    source.runtime.manifestSha256 = 'b'.repeat(64)
    source.python.dependencyLock.runtimeManifestSha256 = source.runtime.manifestSha256
    const after = await capturePythonProRevision(source)
    expect(after.files).toEqual(before.files)
    expect(after.hash).not.toBe(before.hash)
  })

  test('later input mutations cannot change the captured revision', async () => {
    const source = project()
    const expected = await capturePythonProRevision(structuredClone(source))
    const pending = capturePythonProRevision(source)
    source.tree['src/main.py'] = { kind: 'file', content: 'print("changed")' }
    source.assets[0]!.name = 'changed'
    source.runtime.releaseId = 'changed'
    expect(await pending).toEqual(expected)
  })

  test('manifest quota limits the operation without truncating or preventing document reading', async () => {
    const source = project()
    const asset = source.assets[0]!
    const large = {
      ...source,
      assets: Array.from({ length: 100 }, (_, index) => ({
        ...asset,
        id: `id-${index}`,
        name: `hero-${index}`,
        proPath: `hero-${index}.gif`,
        license: { name: 'MIT', attribution: 'x'.repeat(600) },
      })),
    }
    const before = JSON.stringify(large)
    await expect(capturePythonProRevision(large)).rejects.toThrow(PythonProRevisionUnavailableError)
    expect((await refinePythonProProjectDocument(large)).assets?.length).toBe(100)
    expect(JSON.stringify(large)).toBe(before)
  })
})
