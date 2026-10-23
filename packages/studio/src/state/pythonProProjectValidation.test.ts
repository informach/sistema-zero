import { describe, expect, test } from 'bun:test'
import { sha256Hex } from '@sistemazero/core/creations'
import { createStudioProRevision } from '@sistemazero/core/studio/pro-revision'
import { StudioProjectDocumentSchema } from '@sistemazero/core/studio/project-document'
import { ProjectDocumentError, ProjectTooLargeError } from '../core/projectDocument'
import { preparePythonProExecutionSnapshot } from '../runtime/python/snapshot'
import { documentFixture } from './fixtures/projectDocuments'
import { installLocalRevision, readLocalRevision } from './projectStorageRevision'
import { refinePythonProProjectDocument } from './pythonProProjectValidation'

function sourceProject() {
  const document = documentFixture('python', 'pro')
  if (document.programmingLanguage !== 'python' || document.kind !== 'pro')
    throw new Error('Invalid Python fixture')
  return {
    ...document,
    assets: [
      {
        id: 'hero',
        name: 'hero',
        kind: 'image' as const,
        dataUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
        source: 'library' as const,
        libId: 'personal:pinta-original',
        libOrigin: 'pinta' as const,
        libRevision: 3,
        proPath: 'hero.gif',
        license: { name: 'MIT', attribution: 'Test author' },
      },
    ],
  }
}

describe('Python Pro semantic document reader', () => {
  test('preserves modules, metadata, media paths, runtime and local lineage', async () => {
    const source = installLocalRevision(sourceProject(), 'python-reader')
    const before = JSON.stringify(source)
    const project = await refinePythonProProjectDocument(source)
    expect(StudioProjectDocumentSchema.parse(project)).toEqual(
      StudioProjectDocumentSchema.parse(source),
    )
    expect(readLocalRevision(project)).toBe(readLocalRevision(source))
    expect(project.tree).not.toBe(source.tree)
    expect(project.assets).not.toBe(source.assets)
    expect(project.python).not.toBe(source.python)
    expect(project.assets?.[0]?.proPath).toBe('hero.gif')
    expect('files' in project).toBe(false)
    expect('extraFiles' in project).toBe(false)
    expect('devScript' in project.proMeta).toBe(false)
    expect(JSON.stringify(source)).toBe(before)
  })

  test('captures source, dependency lock and identity before returning to the caller', async () => {
    const source = installLocalRevision(sourceProject(), 'python-reader')
    const stamp = readLocalRevision(source)
    const before = JSON.stringify(source)
    const pending = refinePythonProProjectDocument(source)
    source.id = 'different'
    source.tree['src/main.py'] = { kind: 'file', content: 'raise RuntimeError("changed")' }
    source.python.dependencyLock.requirementsSha256 = 'f'.repeat(64)
    source.assets[0]!.proPath = 'elsewhere.gif'
    const project = await pending
    expect(StudioProjectDocumentSchema.parse(project)).toEqual(JSON.parse(before))
    expect(readLocalRevision(project)).toBe(stamp)
  })

  test('opens syntax errors as editable source without interpreting the program', async () => {
    const source = sourceProject()
    source.tree['src/main.py'] = { kind: 'file', content: 'def unfinished(\n' }
    expect((await refinePythonProProjectDocument(source)).tree['src/main.py']).toEqual(
      source.tree['src/main.py'],
    )
  })

  test('preserves requirements being edited and the previous dependency lock', async () => {
    const source = sourceProject()
    source.tree['requirements.txt'] = { kind: 'file', content: '# Sem dependências externas\r\n' }
    expect((await refinePythonProProjectDocument(source)).tree).toEqual(source.tree)
    await expect(preparePythonProExecutionSnapshot(source)).rejects.toThrow('requirements.txt')
    source.python.dependencyLock.requirementsSha256 = await sha256Hex(
      source.tree['requirements.txt'].content,
    )
    expect((await refinePythonProProjectDocument(source)).tree).toEqual(source.tree)
    expect(
      (await preparePythonProExecutionSnapshot(source)).files.map((file) => file.path),
    ).toContain('requirements.txt')
  })

  test('rejects malformed or lossy material paths without moving imported images', async () => {
    for (const path of [
      '../hero.gif',
      'assets/CON.png',
      'main.py',
      '.private/hero.gif',
      'constructor/hero.gif',
    ]) {
      const source = sourceProject()
      source.assets[0]!.proPath = path
      await expect(refinePythonProProjectDocument(source)).rejects.toThrow(ProjectDocumentError)
      expect(source.assets[0]!.proPath).toBe(path)
    }
    const source = sourceProject()
    source.assets[0]!.dataUrl = 'invalid image'
    await expect(refinePythonProProjectDocument(source)).rejects.toThrow('assets')
  })

  test('shares portable path rules with the source revision boundary', async () => {
    for (const directory of ['constructor', 'prototype', '__proto__', 'CONSTRUCTOR']) {
      const source = sourceProject()
      source.tree[directory] = { kind: 'dir' }
      source.tree[`${directory}/helper.py`] = { kind: 'file', content: 'n = 1' }
      await expect(refinePythonProProjectDocument(source)).rejects.toThrow()
    }
    const source = sourceProject()
    source.tree['constructor.py'] = { kind: 'file', content: 'n = 1' }
    expect((await refinePythonProProjectDocument(source)).tree['constructor.py']).toEqual(
      source.tree['constructor.py'],
    )
  })

  test('rejects media/source collisions, including implicit directory case', async () => {
    const source = sourceProject()
    source.tree['hero.gif'] = { kind: 'file', content: 'Do not overwrite this text file' }
    await expect(refinePythonProProjectDocument(source)).rejects.toThrow('conflitantes')
    delete source.tree['hero.gif']
    source.assets[0]!.proPath = 'SRC/hero.gif'
    await expect(refinePythonProProjectDocument(source)).rejects.toThrow('conflitantes')
    source.assets[0]!.proPath = 'src/hero.gif'
    expect((await refinePythonProProjectDocument(source)).assets?.[0]?.proPath).toBe('src/hero.gif')
  })

  test('bounds source sizes and directory counts before any runtime is loaded', async () => {
    const source = sourceProject()
    source.tree['src/main.py'] = { kind: 'file', content: '#'.repeat(256_001) }
    await expect(refinePythonProProjectDocument(source)).rejects.toThrow(ProjectTooLargeError)
    source.tree['src/main.py'] = { kind: 'file', content: 'print(42)' }
    for (let n = 0; n < 161; n++) source.tree[`dir${n}`] = { kind: 'dir' }
    await expect(refinePythonProProjectDocument(source)).rejects.toThrow(ProjectTooLargeError)
  })

  test('refuses another language or visual variant instead of coercing it to Pro', async () => {
    await expect(
      refinePythonProProjectDocument(documentFixture('javascript', 'pro')),
    ).rejects.toThrow('Python Pro')
    await expect(
      refinePythonProProjectDocument(documentFixture('python', 'classic')),
    ).rejects.toThrow('Python Pro')
    const source = sourceProject()
    await expect(
      refinePythonProProjectDocument({ ...source, ir: { future: true } }),
    ).rejects.toThrow()
  })

  test('an explicit internal id replacement is bounded and does not copy another lineage', async () => {
    const source = installLocalRevision(sourceProject(), 'python-reader')
    const project = await refinePythonProProjectDocument(source, { requestedId: 'new-id' })
    expect(project.id).toBe('new-id')
    expect(readLocalRevision(project)).toBeUndefined()
    await expect(refinePythonProProjectDocument(source, { requestedId: '' })).rejects.toThrow()
  })

  test('reader and revision share the existing platform identity limits', async () => {
    for (const [id, templateId, valid] of [
      ['a'.repeat(128), 't'.repeat(80), true],
      ['custom_project-1', 'python-blank', true],
      ['a'.repeat(129), 'python-blank', false],
      ['custom.project', 'python-blank', false],
      ['project', 'custom.template', false],
      ['project', 'Modelo Python', false],
    ] as const) {
      const source = sourceProject()
      source.id = id
      source.proMeta.templateId = templateId
      source.assets = []
      const revision = () =>
        createStudioProRevision({
          version: 2,
          projectId: source.id,
          templateId: source.proMeta.templateId,
          files: Object.fromEntries(
            Object.entries(source.tree).flatMap(([path, node]) =>
              node.kind === 'file' ? [[path, node.content]] : [],
            ),
          ),
          directories: ['src'],
          assets: '{}',
          assetFiles: {},
          configuration: {
            programmingLanguage: 'python',
            runtime: source.runtime,
            extensions: [],
            python: source.python,
          },
        })
      if (valid) {
        const project = await refinePythonProProjectDocument(source)
        const captured = await revision()
        expect(project.id).toBe(captured.projectId)
        expect(project.proMeta.templateId).toBe(captured.templateId)
      } else {
        const before = JSON.stringify(source)
        await expect(refinePythonProProjectDocument(source)).rejects.toThrow()
        await expect(revision()).rejects.toThrow()
        expect(JSON.stringify(source)).toBe(before)
      }
    }
  })
})
