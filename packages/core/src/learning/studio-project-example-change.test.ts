import { expect, test } from 'bun:test'
import { applyLessonDraftChange, type LessonDraftDocument, restoreFromPublished } from './authoring'
import type { StudioProjectExampleChange } from './studio-project-example-change'
import { readStudioProjectExamples } from './studio-project-examples'

const blockId = '11111111-1111-4111-8111-111111111111'
const partA = '22222222-2222-4222-8222-222222222222'
const partB = '33333333-3333-4333-8333-333333333333'
const first = '44444444-4444-4444-8444-444444444444'
const second = '55555555-5555-4555-8555-555555555555'
const project = (code: string) => ({
  formatVersion: 2,
  id: 'same-project',
  name: 'Meu jogo',
  kind: 'classic',
  files: { 'index.html': '', 'style.css': '', 'script.js': code },
  installedExtensions: [],
})
const part = (id: string) => ({
  id,
  title: 'Criar',
  objective: '',
  intent: 'application' as const,
  blockIds: id === partA ? [blockId] : [],
  workspaceBlockId: blockId,
  externalTool: null,
  pendingMedia: [],
})
const document = (): LessonDraftDocument => ({
  title: 'Meu jogo',
  slug: 'meu-jogo',
  estimatedMinutes: null,
  blocks: [{ id: blockId, content: { kind: 'studio', initialProject: project('initial') } }],
  sections: [part(partA), part(partB)],
  attachments: [],
  plannedVideos: [],
})
const change = (
  action: StudioProjectExampleChange['action'],
  sectionId = partA,
  role: StudioProjectExampleChange['role'] = 'solution',
): StudioProjectExampleChange => ({ type: 'studio-example', blockId, sectionId, role, action })
function examples(doc: LessonDraftDocument) {
  const read = readStudioProjectExamples(
    doc.blocks.find((block) => block.id === blockId)?.content.projectExamples,
  )
  if (read.kind !== 'valid') throw new Error('Expected a valid private registry')
  return read.value
}

test('entry and solution are different immutable snapshots even when their project IDs match', () => {
  const original = project('before')
  const entry = applyLessonDraftChange(
    document(),
    change({ type: 'save', exampleId: first, project: original }, partA, 'entry'),
  )
  original.files['script.js'] = 'mutated outside'
  const result = applyLessonDraftChange(
    entry,
    change({ type: 'save', exampleId: second, project: project('after') }),
  )
  const registry = examples(result)
  expect(registry.sections[partA]).toEqual({ entryExampleId: first, solutionExampleId: second })
  expect(registry.examples[first]).toMatchObject({
    id: 'same-project',
    files: { 'script.js': 'before' },
  })
  expect(registry.examples[second]).toMatchObject({
    id: 'same-project',
    files: { 'script.js': 'after' },
  })
  expect(result.blocks[0]?.content.initialProject).toEqual(
    document().blocks[0]?.content.initialProject,
  )
})

test('an existing snapshot ID cannot overwrite another checkpoint', () => {
  const current = applyLessonDraftChange(
    document(),
    change({ type: 'save', exampleId: first, project: project('one') }),
  )
  expect(() =>
    applyLessonDraftChange(
      current,
      change({ type: 'save', exampleId: first, project: project('two') }),
    ),
  ).toThrow('imutável')
  expect(examples(current).examples[first]).toMatchObject({ files: { 'script.js': 'one' } })
})

test('replacement prunes an unreferenced old snapshot without changing the previous document', () => {
  const before = applyLessonDraftChange(
    document(),
    change({ type: 'save', exampleId: first, project: project('one') }),
  )
  const after = applyLessonDraftChange(
    before,
    change({ type: 'save', exampleId: second, project: project('two') }),
  )
  expect(Object.keys(examples(after).examples)).toEqual([second])
  expect(Object.keys(examples(before).examples)).toEqual([first])
})

test('reusing a checkpoint keeps it alive until its final association is cleared', () => {
  const before = applyLessonDraftChange(
    document(),
    change({ type: 'save', exampleId: first, project: project('one') }),
  )
  const reused = applyLessonDraftChange(before, change({ type: 'reuse', exampleId: first }, partB))
  const replaced = applyLessonDraftChange(
    reused,
    change({ type: 'save', exampleId: second, project: project('two') }),
  )
  expect(Object.keys(examples(replaced).examples).sort()).toEqual([first, second].sort())
  const cleared = applyLessonDraftChange(replaced, change({ type: 'clear' }, partB))
  expect(Object.keys(examples(cleared).examples)).toEqual([second])
  const empty = applyLessonDraftChange(cleared, change({ type: 'clear' }))
  expect(examples(empty)).toEqual({ version: 1, examples: {}, sections: {} })
})

test('a snapshot ID from another workspace is not a valid reuse reference', () => {
  expect(() =>
    applyLessonDraftChange(document(), change({ type: 'reuse', exampleId: first })),
  ).toThrow('neste Estúdio')
})

test('a deleted part, a different workspace or a gallery cannot adopt a checkpoint', () => {
  const save = change({ type: 'save', exampleId: first, project: project('solution') })
  expect(() => applyLessonDraftChange({ ...document(), sections: [] }, save)).toThrow('parte')
  expect(() =>
    applyLessonDraftChange(
      { ...document(), sections: [{ ...part(partA), workspaceBlockId: second }] },
      save,
    ),
  ).toThrow('parte')
  const gallery = document()
  if (!gallery.blocks[0]) throw new Error('Expected a workspace')
  gallery.blocks[0].content.gallery = { minItems: 1, maxItems: 1 }
  expect(() => applyLessonDraftChange(gallery, save)).toThrow('incorporado')
})

test('saving rejects invalid projects without executing their accessors', () => {
  let calls = 0
  const snapshot = project('source')
  Object.defineProperty(snapshot, 'name', {
    enumerable: true,
    get() {
      calls++
      return 'unsafe'
    },
  })
  expect(() =>
    applyLessonDraftChange(
      document(),
      change({ type: 'save', exampleId: first, project: snapshot }),
    ),
  ).toThrow()
  expect(calls).toBe(0)
})

test('ordinary block edits retain examples in optimistic and server documents', () => {
  const current = applyLessonDraftChange(
    document(),
    change({ type: 'save', exampleId: first, project: project('solution') }),
  )
  const before = current.blocks[0]?.content.projectExamples
  const next = applyLessonDraftChange(current, {
    type: 'block',
    block: {
      id: blockId,
      content: { kind: 'studio', initialProject: project('initial'), allowLevelReveal: true },
    },
  })
  expect(next.blocks[0]?.content.projectExamples).toBe(before)
  expect(examples(next)).toEqual(examples(current))
  expect(() =>
    applyLessonDraftChange(current, {
      type: 'block',
      block: {
        id: blockId,
        content: { kind: 'studio', projectExamples: {} },
      },
    }),
  ).toThrow('por parte')
})

test('moving parts retains snapshot references; removing the part releases its associations', () => {
  const current = applyLessonDraftChange(
    document(),
    change({ type: 'save', exampleId: first, project: project('solution') }),
  )
  const before = current.blocks[0]?.content.projectExamples
  const moved = applyLessonDraftChange(current, {
    type: 'structure',
    sections: [...current.sections].reverse(),
  })
  expect(moved.blocks[0]?.content.projectExamples).toBe(before)
  const removed = applyLessonDraftChange(moved, {
    type: 'structure',
    sections: moved.sections.filter((item) => item.id !== partA),
  })
  expect(examples(removed)).toEqual({ version: 1, examples: {}, sections: {} })
  expect(Object.keys(examples(current).examples)).toEqual([first])
})

test('partial restore does not retarget examples by title and leaves published/undo documents intact', () => {
  const published = applyLessonDraftChange(
    document(),
    change({ type: 'save', exampleId: first, project: project('solution') }),
  )
  const current = { ...document(), sections: [{ ...part(partB), blockIds: [blockId] }] }
  const restored = restoreFromPublished(current, published, [blockId])
  expect(examples(restored)).toEqual({ version: 1, examples: {}, sections: {} })
  expect(examples(published).sections[partA]).toEqual({ solutionExampleId: first })
  const full = restoreFromPublished(current, published, 'all')
  expect(examples(full)).toEqual(examples(published))
  expect(full).not.toBe(published)
  expect(current.blocks[0]?.content.projectExamples).toBeUndefined()
})

test('after clearing the final association an explicit switch to gallery cannot strand an empty registry', () => {
  const saved = applyLessonDraftChange(
    document(),
    change({ type: 'save', exampleId: first, project: project('solution') }),
  )
  const cleared = applyLessonDraftChange(saved, change({ type: 'clear' }))
  const gallery = applyLessonDraftChange(cleared, {
    type: 'block',
    block: {
      id: blockId,
      content: { kind: 'studio', initialProject: null, gallery: { minItems: 1, maxItems: 1 } },
    },
  })
  expect(gallery.blocks[0]?.content.projectExamples).toBeUndefined()
  expect(examples(cleared)).toEqual({ version: 1, examples: {}, sections: {} })
})
