import { describe, expect, test } from 'bun:test'
import { StudioProjectDocumentSchema } from '@sistemazero/core/studio/project-document'
import { createEmptyProject } from '../core/project'
import { assertProjectContentPreserved, ProjectDocumentError } from '../core/projectDocument'
import { documentFixture } from './fixtures/projectDocuments'
import { refineJavaScriptProjectDocument } from './javaScriptProjectValidation'
import { installLocalRevision, readLocalRevision } from './projectStorageRevision'
import { sanitizeStoredProject } from './projectValidation'

function javascriptDocument(kind: 'classic' | 'pro') {
  const envelope = documentFixture('javascript', kind)
  const document = StudioProjectDocumentSchema.parse({
    ...envelope,
    ...createEmptyProject(envelope.id, 'Meu jogo'),
    formatVersion: 3,
    mode: kind === 'pro' ? 'code' : 'bridge',
    files: {
      'index.html': '<canvas></canvas>',
      'style.css': 'canvas { background: black }',
      'script.js': '// Código atual: não repetir a migração histórica\nSZGame2D.playJump();',
    },
    extraFiles: [{ name: 'helpers.ts', language: 'typescript', content: 'export const n = 2' }],
    assets: [
      {
        id: 'som',
        kind: 'audio',
        name: 'som',
        dataUrl: 'data:audio/wav;base64,AAAA',
        source: 'library',
        libId: 'meu-som',
        libOrigin: 'pinta',
        libRevision: 3,
      },
    ],
    coverAssetName: 'tela-inicial',
  })
  if (document.programmingLanguage !== 'javascript') throw new Error('Invalid JavaScript fixture')
  return document
}

describe('version 3 JavaScript semantic adapter', () => {
  for (const kind of ['classic', 'pro'] as const)
    test(`preserves ${kind} source, payload and environment without historical conversion`, () => {
      const source = javascriptDocument(kind)
      installLocalRevision(source, 'test-reader')
      const before = JSON.stringify(source)
      const project = refineJavaScriptProjectDocument(source)
      expect(project.programmingLanguage).toBe('javascript')
      expect(project.kind).toBe(kind)
      expect(StudioProjectDocumentSchema.parse(project)).toEqual(
        StudioProjectDocumentSchema.parse(source),
      )
      expect(project.runtime).not.toBe(source.runtime)
      expect(project.assets).not.toBe(source.assets)
      expect(project.files).not.toBe(source.files)
      expect(project.ir).not.toBe(source.ir)
      expect(readLocalRevision(project)).toBe(readLocalRevision(source))
      expect(JSON.stringify(source)).toBe(before)
    })

  test('authoritative bridge text invalidates stale derived IR and blocks only', () => {
    const source = {
      ...javascriptDocument('classic'),
      bridgeCodeAhead: true,
      ir: { unknownFutureIR: true },
      blocksState: { blocks: { languageVersion: 0, blocks: [{ type: 'future-block' }] } },
    }
    const project = refineJavaScriptProjectDocument(source)
    expect(project.ir).toBeNull()
    expect(project.blocksState).toBeNull()
    expect(project.bridgeCodeAhead).toBe(true)
    expect(project.files).toEqual(source.files)
    expect(project.runtime).toEqual(source.runtime)
    expect(project.projectTools).toContain('future-block')
  })

  test('refuses lossy IR, blocks, extensions and assets, preserving the input', () => {
    for (const change of [
      { ir: { unknownFutureIR: true } },
      { blocksState: { blocks: { languageVersion: 0, blocks: [{ type: 'future-block' }] } } },
      { installedExtensions: [{ id: 'future-extension', version: '1.0.0', installedAt: 1 }] },
      { assets: [{ id: 'bad', kind: 'audio', name: 'bad', dataUrl: 'invalid' }] },
    ]) {
      const source = { ...javascriptDocument('classic'), ...change }
      const before = JSON.stringify(source)
      expect(() => refineJavaScriptProjectDocument(source)).toThrow(ProjectDocumentError)
      expect(JSON.stringify(source)).toBe(before)
    }
  })

  test('refuses a Pro tree that would lose a file, instead of opening it as Classic', () => {
    const source = {
      ...javascriptDocument('pro'),
      tree: { 'node_modules/hidden.js': { kind: 'file', content: 'important source' } },
    }
    expect(() => refineJavaScriptProjectDocument(source)).toThrow()
    expect(source.tree['node_modules/hidden.js'].content).toBe('important source')
  })

  test('rejects Python, legacy, future and unknown-root documents explicitly', () => {
    expect(() => refineJavaScriptProjectDocument(documentFixture('python', 'classic'))).toThrow(
      'adaptador de projetos Python',
    )
    expect(() => refineJavaScriptProjectDocument(createEmptyProject('old', 'Old'))).toThrow()
    expect(() =>
      refineJavaScriptProjectDocument({ ...javascriptDocument('classic'), formatVersion: 4 }),
    ).toThrow()
    expect(() =>
      refineJavaScriptProjectDocument({ ...javascriptDocument('classic'), futureContent: 'keep' }),
    ).toThrow()
  })

  test('an internal requested id never inherits another document lineage', () => {
    const source = installLocalRevision(javascriptDocument('classic'), 'test-reader')
    const project = refineJavaScriptProjectDocument(source, { requestedId: 'different-id' })
    expect(project.id).toBe('different-id')
    expect(readLocalRevision(project)).toBeUndefined()
  })

  test('every valid v3 id survives reading without minting a new creation', () => {
    for (const id of ['a'.repeat(128), 'custom-project', 'project_123']) {
      const source = installLocalRevision({ ...javascriptDocument('classic'), id }, 'test-reader')
      const project = refineJavaScriptProjectDocument(source)
      expect(project.id).toBe(id)
      expect(readLocalRevision(project)).toBe(readLocalRevision(source))
    }
    for (const requestedId of ['', 'a'.repeat(129), 'custom.project', 'espaço do aluno']) {
      expect(() =>
        refineJavaScriptProjectDocument({ ...javascriptDocument('classic'), id: requestedId }),
      ).toThrow()
      expect(() =>
        refineJavaScriptProjectDocument(javascriptDocument('classic'), { requestedId }),
      ).toThrow()
    }
  })

  test('legacy readers cannot silently discard new environment configuration', () => {
    for (const field of [
      { programmingLanguage: 'python' },
      { runtime: { profileId: 'python-test' } },
      { python: { entrypoint: 'main.py' } },
    ])
      expect(() =>
        sanitizeStoredProject({ ...createEmptyProject('legacy', 'Old'), ...field }),
      ).toThrow('integralmente')
  })

  test('the preservation guard covers configuration in every document variant', () => {
    const source = documentFixture('python', 'pro')
    expect(() => assertProjectContentPreserved(source, source)).not.toThrow()
    expect(() =>
      assertProjectContentPreserved(source, { ...source, runtime: { profileId: 'different' } }),
    ).toThrow('runtime')
    expect(() => assertProjectContentPreserved(source, { ...source, python: undefined })).toThrow(
      'python',
    )
  })
})
