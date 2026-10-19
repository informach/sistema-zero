import { expect, test } from 'bun:test'
import { getSchemaValidator } from 'elysia'
import { preserveStudioExamplesForLegacyWrite } from '../../src/domain/course/studio-project-examples'
import { LessonBlockContentSchema } from '../../src/interfaces/http/dtos'

const sectionId = '11111111-1111-4111-8111-111111111111'
const exampleId = '22222222-2222-4222-8222-222222222222'
const project = {
  formatVersion: 2,
  name: 'Meu jogo',
  kind: 'classic',
  files: { 'index.html': '', 'style.css': '', 'script.js': '' },
  installedExtensions: [],
}
const examples = {
  version: 1,
  examples: { [exampleId]: project },
  sections: { [sectionId]: { solutionExampleId: exampleId } },
}
const incoming = { kind: 'studio', initialProject: project, level: 'iniciante-2d' }
const previous = { ...incoming, projectExamples: examples }

test('legacy normalization retains an explicit registry so the writer can reject it', () => {
  const validator = getSchemaValidator(LessonBlockContentSchema, { normalize: true })
  const result = validator.safeParse({ ...incoming, projectExamples: null })
  if (!result.success) throw new Error('Expected the opaque field to reach the rejecting writer')
  expect(Object.hasOwn(result.data, 'projectExamples')).toBe(true)
  expect(() => preserveStudioExamplesForLegacyWrite(result.data)).toThrow('rascunho')
})

test('ordinary edits preserve the fresh private registry and never mutate the previous snapshot', () => {
  const updated = preserveStudioExamplesForLegacyWrite(
    { ...incoming, allowLevelReveal: true },
    previous,
  )
  expect(updated).toEqual({ ...incoming, allowLevelReveal: true, projectExamples: examples })
  expect(updated).not.toBe(previous)
  expect(Object.getOwnPropertyDescriptor(updated, 'projectExamples')?.value).not.toBe(examples)
  expect(previous.projectExamples).toBe(examples)
})

test('incompatible whole-block edits cannot erase or invalidate existing examples', () => {
  for (const update of [
    { kind: 'rich_text', markdown: 'Troca' },
    { ...incoming, gallery: { minItems: 1, maxItems: 1 } },
    { ...incoming, initialProject: { ...project, kind: 'pro' } },
  ])
    expect(() => preserveStudioExamplesForLegacyWrite(update, previous)).toThrow()
  expect(() =>
    preserveStudioExamplesForLegacyWrite(incoming, { ...previous, projectExamples: null }),
  ).toThrow()
})

test('an explicit empty registry is also a protected replacement', () => {
  expect(() =>
    preserveStudioExamplesForLegacyWrite(
      { ...incoming, projectExamples: { version: 1, examples: {}, sections: {} } },
      previous,
    ),
  ).toThrow()
  expect(preserveStudioExamplesForLegacyWrite(incoming)).toBe(incoming)
})
