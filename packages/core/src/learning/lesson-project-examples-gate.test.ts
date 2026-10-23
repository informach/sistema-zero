import { expect, test } from 'bun:test'
import type { LessonDraftDocument } from './authoring'
import { isLearningManifest } from './index'
import {
  lessonStudioExampleTransportIssues,
  lessonStudioProjectExampleIssues,
} from './lesson-project-examples-gate'

const sectionId = '11111111-1111-4111-8111-111111111111'
const blockId = '22222222-2222-4222-8222-222222222222'
const exampleId = '33333333-3333-4333-8333-333333333333'
const project = {
  formatVersion: 2,
  name: 'Meu jogo',
  kind: 'classic',
  files: { 'index.html': '', 'style.css': '', 'script.js': '' },
  installedExtensions: [],
}
const registry = {
  version: 1,
  examples: { [exampleId]: project },
  sections: { [sectionId]: { solutionExampleId: exampleId } },
}
const sections = [{ id: sectionId, workspaceBlockId: blockId }]
const studio = () => ({ kind: 'studio', initialProject: project, projectExamples: registry })
const issues = (content: unknown, parts = sections) =>
  lessonStudioProjectExampleIssues(parts, [{ id: blockId, content }])

test('the final document requires the existing part to use the owner workspace', () => {
  expect(issues(studio())).toEqual([])
  expect(issues(studio(), [])).not.toEqual([])
  expect(issues(studio(), [{ id: sectionId, workspaceBlockId: exampleId }])).not.toEqual([])
})

test('registries cannot be attached to another tool or a gallery', () => {
  expect(issues({ ...studio(), kind: 'pinta' })).not.toEqual([])
  expect(issues({ ...studio(), gallery: { minItems: 1, maxItems: 1 } })).not.toEqual([])
  expect(issues({ ...studio(), projectExamples: null })).not.toEqual([])
})

test('outer authoring accessors are rejected without invoking them', () => {
  let calls = 0
  for (const field of ['projectExamples', 'kind', 'gallery', 'initialProject']) {
    const content = studio()
    Object.defineProperty(content, field, {
      enumerable: true,
      get() {
        calls++
        return undefined
      },
    })
    expect(issues(content)).not.toEqual([])
  }
  expect(calls).toBe(0)
})

test('ordinary documents do not traverse or serialize projects when no registry exists', () => {
  let calls = 0
  const content = {
    kind: 'studio',
    get initialProject() {
      calls++
      throw new Error('unneeded')
    },
  }
  expect(issues(content)).toEqual([])
  expect(calls).toBe(0)
})

test('a portable registry must bind the actual manifest section keys', () => {
  const manifest = {
    version: 5,
    courseSlug: 'meu-curso',
    lessonSlug: 'meu-jogo',
    title: 'Meu jogo',
    blocks: [{ key: 'studio', content: { kind: 'studio', initialProject: project } }],
    sections: [
      {
        key: 'criar',
        title: 'Criar',
        objective: '',
        intent: 'application',
        blockKeys: ['studio'],
        workspaceKey: 'studio',
        externalTool: null,
        pendingMedia: [],
        completion: { version: 1, blockIds: [] },
      },
    ],
  }
  expect(isLearningManifest(manifest)).toBe(true)
  expect(
    isLearningManifest({
      ...manifest,
      blocks: [
        { key: 'studio', content: { ...manifest.blocks[0]?.content, projectExamples: registry } },
      ],
    }),
  ).toBe(false)
  expect(
    isLearningManifest({
      ...manifest,
      blocks: [
        {
          key: 'studio',
          content: {
            ...manifest.blocks[0]?.content,
            projectExamples: { ...registry, sections: { criar: { solutionExampleId: exampleId } } },
          },
        },
      ],
    }),
  ).toBe(true)
})

test('preflight measures the whole unfinished lesson, not just private snapshots', () => {
  const initial = { ...project, files: { ...project.files, 'script.js': 'x'.repeat(1_200_000) } }
  const example = { ...project, files: { ...project.files, 'script.js': 'y'.repeat(900_000) } }
  const privateRegistry = { ...registry, examples: { [exampleId]: example } }
  const draft: LessonDraftDocument = {
    title: 'Meu jogo',
    slug: 'meu-jogo',
    estimatedMinutes: null,
    blocks: [
      {
        id: blockId,
        content: { kind: 'studio', initialProject: initial, projectExamples: privateRegistry },
      },
    ],
    sections: [
      {
        ...sections[0]!,
        title: 'Criar',
        objective: '',
        intent: 'application',
        blockIds: [blockId],
        externalTool: null,
        pendingMedia: [],
      },
    ],
    attachments: [],
    plannedVideos: [],
  }
  expect(lessonStudioProjectExampleIssues(draft.sections, draft.blocks)).toEqual([])
  expect(lessonStudioExampleTransportIssues(draft, 'meu-curso')[0]?.code).toBe('limit')
})

test('ordinary lessons skip transport projection when no private registry exists', () => {
  let calls = 0
  const draft: LessonDraftDocument = {
    title: 'Criar',
    slug: 'criar',
    estimatedMinutes: null,
    blocks: [
      {
        id: blockId,
        content: {
          kind: 'studio',
          get initialProject() {
            calls++
            throw new Error('unneeded')
          },
        },
      },
    ],
    sections: [],
    attachments: [],
    plannedVideos: [],
  }
  expect(lessonStudioExampleTransportIssues(draft, 'meu-curso')).toEqual([])
  expect(calls).toBe(0)
})
