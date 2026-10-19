import { expect, test } from 'bun:test'
import { defaultLessonSection, type LessonDraftDocument } from '@sistemazero/core/learning'
import type { LessonWithContent } from '../../src/domain/course/course'
import { publishedLessonRevisions } from '../../src/domain/learning/published-lesson-revisions'
import {
  migratedStudioExampleId,
  planStudioExamplesMigration,
} from '../../src/domain/learning/studio-examples-migration'

const blockId = '11111111-1111-4111-8111-111111111111'
const sectionId = '22222222-2222-4222-8222-222222222222'
const project = {
  formatVersion: 2,
  id: 'same-project',
  kind: 'classic',
  name: 'Solução',
  files: { 'index.html': '', 'style.css': '', 'script.js': 'console.log("criação")' },
  installedExtensions: [],
}
function fixture() {
  const lesson: LessonWithContent = {
    id: '33333333-3333-4333-8333-333333333333',
    moduleId: 'module',
    courseId: 'course',
    title: 'Criar',
    slug: 'criar',
    sortOrder: 0,
    estimatedMinutes: null,
    isPublished: true,
    blocks: [
      {
        id: blockId,
        lessonId: '33333333-3333-4333-8333-333333333333',
        kind: 'studio',
        sortOrder: 0,
        contentRevision: 'unchanged-child-revision',
        content: { kind: 'studio', initialProject: project, solutionProject: project },
      },
    ],
    attachments: [],
  }
  const sections = [
    { ...defaultLessonSection(sectionId, 'Criar', [blockId]), workspaceBlockId: blockId },
  ]
  const document: LessonDraftDocument = {
    title: lesson.title,
    slug: lesson.slug,
    estimatedMinutes: null,
    blocks: lesson.blocks.map((block) => ({ id: block.id, content: { ...block.content } })),
    sections,
    attachments: [],
    plannedVideos: [],
  }
  const baseline = publishedLessonRevisions(lesson, sections).current
  return {
    lesson,
    sections,
    courseSlug: 'curso-criar',
    draft: { publishedRevision: baseline, document, previousDocument: structuredClone(document) },
  }
}

test('migration converts published, draft and undo without changing the child revision or originals', () => {
  const source = fixture()
  const plan = planStudioExamplesMigration(source)
  expect(plan.kind).toBe('convert')
  expect(plan.counts).toEqual({ published: 1, draft: 1, previous: 1 })
  expect(plan.afterRevision).not.toBe(plan.beforeRevision)
  expect(plan.publishedBlocks[0]?.contentRevision).toBe('unchanged-child-revision')
  expect(JSON.stringify(plan.publishedBlocks)).not.toContain('solutionProject')
  expect(JSON.stringify(plan.draftDocument)).not.toContain('solutionProject')
  expect(JSON.stringify(plan.previousDocument)).not.toContain('solutionProject')
  expect(source.lesson.blocks[0]?.content).toHaveProperty('solutionProject')
  expect(source.draft.previousDocument.blocks[0]?.content).toHaveProperty('solutionProject')
  expect(plan.associations.published[0]?.exampleId).toBe(plan.associations.draft[0]?.exampleId)
})

test('unexpected published baselines remain a real conflict rather than being silently aligned', () => {
  const source = fixture()
  source.draft.publishedRevision = 'another-author-or-another-publication'
  const plan = planStudioExamplesMigration(source)
  expect(plan.kind).toBe('conflict')
  expect(source.draft.publishedRevision).toBe('another-author-or-another-publication')
})

test('conversion is idempotent and different snapshots of the same project get different immutable IDs', () => {
  const source = fixture()
  const first = planStudioExamplesMigration(source)
  if (!first.draftDocument) throw new Error('Expected converted draft')
  const second = planStudioExamplesMigration({
    ...source,
    lesson: { ...source.lesson, blocks: first.publishedBlocks },
    draft: {
      publishedRevision: first.afterRevision,
      document: first.draftDocument,
      previousDocument: first.previousDocument,
    },
  })
  expect(second.kind).toBe('current')
  expect(second.counts).toEqual({ published: 0, draft: 0, previous: 0 })
  expect(migratedStudioExampleId(source.lesson.id, blockId, project)).not.toBe(
    migratedStudioExampleId(source.lesson.id, blockId, { ...project, name: 'Outro checkpoint' }),
  )
})

test('orphaned or oversize legacy data is blocked intact instead of truncated', () => {
  const source = fixture()
  expect(() => planStudioExamplesMigration({ ...source, sections: [] })).toThrow('parte')
  const block = source.lesson.blocks[0]
  if (block?.content.kind !== 'studio') throw new Error('Expected Studio')
  block.content.solutionProject = {
    ...project,
    files: { ...project.files, 'script.js': 'x'.repeat(1_500_001) },
  }
  expect(() => planStudioExamplesMigration(source)).toThrow()
  expect(block.content.solutionProject).toBeDefined()
})
