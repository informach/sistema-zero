import { expect, test } from 'bun:test'
import { type StudioBlock, toMemberFacingStudioContent } from '../../src/domain/course/lesson-block'

test('the member view contains only Studio editor configuration, never private authoring examples', () => {
  const content: StudioBlock = {
    kind: 'studio',
    initialProject: { id: 'child-initial', files: { 'script.js': 'child source' } },
    level: 'iniciante-2d',
    allowBlocks: ['sz_js_if_else'],
    allowCategories: ['programming'],
    allowedModes: ['blocks', 'bridge'],
    allowLevelReveal: false,
    pythonLevel: 2,
    purpose: 'submission',
    chain: 'my-game',
    showcase: { enabled: true, title: 'Meu jogo', summary: 'Meu resumo' },
  }
  const enriched = Object.assign({}, content, {
    solutionProject: { secret: 'PRIVATE_GLOBAL_SOLUTION_SENTINEL' },
    projectExamples: { examples: { secret: 'PRIVATE_EXAMPLES_SENTINEL' } },
    activity: { answer: 'PRIVATE_OLD_ACTIVITY_SENTINEL' },
    teacherOnlyNote: 'PRIVATE_UNKNOWN_FIELD_SENTINEL',
    showcase: {
      enabled: true,
      title: 'Meu jogo',
      summary: 'Meu resumo',
      teacherOnlyNote: 'PRIVATE_SHOWCASE_SENTINEL',
    },
  })
  expect(toMemberFacingStudioContent(enriched)).toEqual(content)
  expect(JSON.stringify(toMemberFacingStudioContent(enriched))).not.toContain('PRIVATE_')
})

test('gallery configuration remains available to the child', () => {
  const content: StudioBlock = {
    kind: 'studio',
    initialProject: null,
    gallery: { minItems: 1, maxItems: 1 },
  }
  expect(
    toMemberFacingStudioContent({
      ...content,
      gallery: Object.assign(
        { minItems: 1, maxItems: 1 },
        { teacherOnlyNote: 'PRIVATE_GALLERY_SENTINEL' },
      ),
    }),
  ).toEqual(content)
})
