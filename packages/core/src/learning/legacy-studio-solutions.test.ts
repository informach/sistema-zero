import { expect, test } from 'bun:test'
import { isLearningManifest } from './index'
import {
  convertLegacyLearningManifest,
  convertLegacyStudioSolutionBlocks,
} from './legacy-studio-solutions'

const blockId = '11111111-1111-4111-8111-111111111111'
const sectionId = '22222222-2222-4222-8222-222222222222'
const otherSectionId = '33333333-3333-4333-8333-333333333333'
const exampleId = '44444444-4444-4444-8444-444444444444'
const project = {
  formatVersion: 2,
  id: 'child-project-id',
  kind: 'classic',
  name: 'Uma solução',
  files: { 'index.html': '', 'style.css': '', 'script.js': 'console.log("livre")' },
  installedExtensions: [],
}
const blocks = () => [
  { id: blockId, content: { kind: 'studio', initialProject: project, solutionProject: project } },
]
const sections = [
  { id: sectionId, workspaceBlockId: blockId },
  { id: otherSectionId, workspaceBlockId: blockId },
]

test('explicit conversion preserves one solution snapshot and records all provisional part associations', () => {
  const original = blocks()
  const converted = convertLegacyStudioSolutionBlocks(original, sections, () => exampleId)
  expect(converted.converted).toEqual([
    { blockId, exampleId, sectionIds: [sectionId, otherSectionId] },
  ])
  expect(converted.blocks[0]?.content).toEqual({
    kind: 'studio',
    initialProject: project,
    projectExamples: {
      version: 1,
      examples: { [exampleId]: project },
      sections: {
        [sectionId]: { solutionExampleId: exampleId },
        [otherSectionId]: { solutionExampleId: exampleId },
      },
    },
  })
  expect(original[0]?.content.solutionProject).toBe(project)
  expect(converted.blocks[0]?.content.initialProject).toBe(project)
  expect(converted.converted[0]).not.toHaveProperty('passed')
})

test('an orphan or mixed old/new solution is refused rather than silently discarded', () => {
  expect(() => convertLegacyStudioSolutionBlocks(blocks(), [], () => exampleId)).toThrow('parte')
  expect(() =>
    convertLegacyStudioSolutionBlocks(
      [
        {
          id: blockId,
          content: {
            ...blocks()[0]?.content,
            kind: 'studio',
            projectExamples: { version: 1, examples: {}, sections: {} },
          },
        },
      ],
      sections,
      () => exampleId,
    ),
  ).toThrow('mistura')
})

test('portable v5 conversion binds section keys explicitly without assuming they are UUIDs', () => {
  const converted = convertLegacyStudioSolutionBlocks(
    blocks(),
    [{ id: 'parte-criar', workspaceBlockId: blockId }],
    () => exampleId,
    'manifest',
  )
  expect(converted.blocks[0]?.content).toMatchObject({
    projectExamples: {
      sections: { 'parte-criar': { solutionExampleId: exampleId } },
    },
  })
  expect(() =>
    convertLegacyStudioSolutionBlocks(
      blocks(),
      [{ id: 'parte-criar', workspaceBlockId: blockId }],
      () => exampleId,
    ),
  ).toThrow()
})

test('conversion rejects malformed and incompatible examples with the original document intact', () => {
  const malformed = [
    { id: blockId, content: { kind: 'studio', initialProject: project, solutionProject: null } },
  ]
  expect(() => convertLegacyStudioSolutionBlocks(malformed, sections, () => exampleId)).toThrow()
  expect(malformed[0]?.content.solutionProject).toBeNull()
  let invoked = false
  const accessor = {
    kind: 'studio',
    initialProject: project,
    get solutionProject() {
      invoked = true
      return project
    },
  }
  expect(() =>
    convertLegacyStudioSolutionBlocks(
      [{ id: blockId, content: accessor }],
      sections,
      () => exampleId,
    ),
  ).toThrow('JSON')
  expect(invoked).toBe(false)
})

test('old v5 files require the explicit converter and become canonical v5 without changing content or keys', () => {
  const original = {
    version: 5,
    courseSlug: 'curso-criar',
    lessonSlug: 'criar',
    title: 'Criar',
    blocks: [{ key: 'workspace', content: blocks()[0]?.content }],
    sections: [
      {
        key: 'parte-criar',
        title: 'Criar',
        objective: '',
        intent: 'application',
        blockKeys: ['workspace'],
        workspaceKey: 'workspace',
        externalTool: null,
        pendingMedia: [],
        completion: { version: 1, blockIds: [] },
      },
    ],
  }
  expect(isLearningManifest(original)).toBe(false)
  const converted = convertLegacyLearningManifest(original, () => exampleId)
  expect(isLearningManifest(converted.manifest)).toBe(true)
  expect(converted.manifest.version).toBe(5)
  expect(converted.manifest.blocks[0]).toMatchObject({
    key: 'workspace',
    content: {
      initialProject: project,
      projectExamples: { sections: { 'parte-criar': { solutionExampleId: exampleId } } },
    },
  })
  expect(original.blocks[0]?.content).toHaveProperty('solutionProject')
  expect(() => convertLegacyLearningManifest({ ...original, version: 4 }, () => exampleId)).toThrow(
    'v5',
  )
})
