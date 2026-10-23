import { expect, test } from 'bun:test'
import type { LessonDraftDocument } from './authoring'
import {
  LEARNING_IMPORT_BODY_MAX_BYTES,
  LEARNING_MANIFEST_SOURCE_MAX_BYTES,
  learningImportBodyBytes,
  projectLessonManifestDraft,
  remapStudioExampleContent,
} from './authoring-manifest-projection'
import { isLearningManifest } from './index'

const blockId = '11111111-1111-4111-8111-111111111111'
const sectionId = '22222222-2222-4222-8222-222222222222'
const exampleId = '33333333-3333-4333-8333-333333333333'
const project = {
  formatVersion: 2,
  id: 'same-project',
  kind: 'classic',
  name: 'Meu jogo',
  files: { 'index.html': '', 'style.css': '', 'script.js': 'console.log("criação")' },
  installedExtensions: [],
}
const document = (): LessonDraftDocument => ({
  title: 'Criar',
  slug: 'meu-jogo',
  estimatedMinutes: null,
  blocks: [
    {
      id: blockId,
      content: {
        kind: 'studio',
        initialProject: project,
        projectExamples: {
          version: 1,
          examples: { [exampleId]: project },
          sections: { [sectionId]: { solutionExampleId: exampleId } },
        },
      },
    },
  ],
  sections: [
    {
      id: sectionId,
      title: 'Criar',
      objective: '',
      intent: 'application',
      blockIds: [blockId],
      workspaceBlockId: blockId,
      externalTool: null,
      pendingMedia: [],
      completion: { version: 1, blockIds: [] },
    },
  ],
  attachments: [],
  plannedVideos: [],
})

test('private examples use the portable section key while project and example identities stay unchanged', () => {
  const { manifest } = projectLessonManifestDraft(document(), 'meu-curso')
  expect(isLearningManifest(manifest)).toBe(true)
  expect(manifest.blocks[0]).toMatchObject({
    key: 'estudio-11111111',
    content: {
      projectExamples: {
        version: 1,
        examples: { [exampleId]: { id: 'same-project' } },
        sections: { 'secao-22222222': { solutionExampleId: exampleId } },
      },
    },
  })
  const renamed = document()
  if (!renamed.sections[0]) throw new Error('Expected the part')
  renamed.sections[0].title = 'Outro título'
  expect(projectLessonManifestDraft(renamed, 'meu-curso').manifest.blocks[0]).toEqual(
    manifest.blocks[0],
  )
})

test('size preflight accepts draft WIP without pretending the manifest is publishable', () => {
  const draft = document()
  if (!draft.sections[0]) throw new Error('Expected the part')
  delete draft.sections[0].completion
  const { manifest } = projectLessonManifestDraft(draft, 'meu-curso')
  expect(isLearningManifest(manifest)).toBe(false)
  expect(learningImportBodyBytes(manifest)).toBeGreaterThan(0)
})

test('transport bytes match the actual UTF-8 request including mode, CAS and operation', async () => {
  const { manifest } = projectLessonManifestDraft(document(), 'curso-criacao')
  const expectedFingerprint = '44444444-4444-4444-8444-444444444444'
  const operationId = '55555555-5555-4555-8555-555555555555'
  const request = new Request('https://example.test/import-learning', {
    method: 'POST',
    body: JSON.stringify({
      document: manifest,
      mode: 'preserve',
      expectedFingerprint,
      operationId,
    }),
  })
  expect(learningImportBodyBytes(manifest, 'preserve', expectedFingerprint, operationId)).toBe(
    (await request.arrayBuffer()).byteLength,
  )
  expect(learningImportBodyBytes(manifest, 'preserve')).toBe(
    learningImportBodyBytes(manifest, 'replace') + 1,
  )
})

test('a naked document below 2 MiB may still exceed the real import transport limit', () => {
  const nearLimit = { source: 'x'.repeat(LEARNING_IMPORT_BODY_MAX_BYTES - 40) }
  expect(new TextEncoder().encode(JSON.stringify(nearLimit)).byteLength).toBeLessThan(
    LEARNING_IMPORT_BODY_MAX_BYTES,
  )
  expect(learningImportBodyBytes(nearLimit)).toBeGreaterThan(LEARNING_IMPORT_BODY_MAX_BYTES)
})

test('formatted valid source above the old file cutoff still fits the real request', () => {
  const { manifest } = projectLessonManifestDraft(document(), 'curso-criacao')
  const formatted = JSON.stringify(manifest, null, 2) + '\n'.repeat(1_800_001)
  const sourceBytes = new TextEncoder().encode(formatted).byteLength
  expect(sourceBytes).toBeGreaterThan(1_800_000)
  expect(sourceBytes).toBeLessThan(LEARNING_MANIFEST_SOURCE_MAX_BYTES)
  const parsed: unknown = JSON.parse(formatted)
  expect(isLearningManifest(parsed)).toBe(true)
  expect(learningImportBodyBytes(parsed)).toBeLessThan(LEARNING_IMPORT_BODY_MAX_BYTES)
})

test('moving a required material maps its block reference without changing the item identity', () => {
  const draft = document()
  const materialId = '66666666-6666-4666-8666-666666666666'
  draft.blocks.push({
    id: materialId,
    content: {
      kind: 'materials',
      items: [
        {
          id: 'caderno',
          kind: 'file',
          label: 'Caderno',
          attachmentId: '77777777-7777-4777-8777-777777777777',
        },
      ],
    },
  })
  const section = draft.sections[0]
  if (!section) throw new Error('Expected the part')
  section.blockIds.push(materialId)
  section.completion = {
    version: 1,
    blockIds: [materialId],
    materialItems: [{ blockId: materialId, itemIds: ['caderno'] }],
  }
  expect(projectLessonManifestDraft(draft, 'meu-curso').manifest.sections[0]).toMatchObject({
    completion: {
      blockIds: ['materiais-66666666'],
      materialItems: [{ blockId: 'materiais-66666666', itemIds: ['caderno'] }],
    },
  })
})

test('a missing section binding or colliding stable keys is an explicit error', () => {
  const missing = document()
  missing.sections = []
  expect(() => projectLessonManifestDraft(missing, 'meu-curso')).toThrow('parte')
  const collision = document()
  collision.blocks.push({
    id: '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    content: { kind: 'studio', initialProject: project },
  })
  expect(() => projectLessonManifestDraft(collision, 'meu-curso')).toThrow('mesma chave')
})

test('cloning retargets private part associations and preserves independent project/snapshot identities', () => {
  const original = document().blocks[0]?.content
  if (!original) throw new Error('Expected a workspace')
  const targetSection = '88888888-8888-4888-8888-888888888888'
  const copied = remapStudioExampleContent(original, (id) =>
    id === sectionId ? targetSection : undefined,
  )
  expect(copied).toMatchObject({
    projectExamples: {
      examples: { [exampleId]: { id: 'same-project' } },
      sections: { [targetSection]: { solutionExampleId: exampleId } },
    },
  })
  expect(original).toMatchObject({
    projectExamples: { sections: { [sectionId]: { solutionExampleId: exampleId } } },
  })
  expect(() => remapStudioExampleContent(original, () => undefined)).toThrow('parte')
})
