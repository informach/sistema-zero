import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { lessonCompletionRequirements } from '@sistemazero/core/learning'
import { creatorJourneyEditorialReviews } from '../../src/application/creator-journey/creator-journey-editorial-review'

interface Manifest {
  blocks: {
    key: string
    content?: { kind: string; text?: string; purpose?: string; [key: string]: unknown }
    plannedVideo?: string
  }[]
  sections: {
    key: string
    title: string
    intent: string
    objective: string
    completion: {
      version: number
      blockIds: string[]
      submissionUpToDate?: boolean
      [key: string]: unknown
    }
  }[]
}
const paths = [
  'desafio-primeiro-jogo/desafio-dia-3',
  'cade-todo-mundo/cade-todo-mundo-aula-2',
  'nave-contra-asteroides/nave-contra-asteroides-dia-5',
  'corre-dino/corre-dino-aula-13',
  'o-jogo-do-meu-jeito/meu-jeito-aula-08',
]
const manifest = (path: string): Manifest =>
  JSON.parse(
    readFileSync(
      new URL(`../../../../docs/aulas-interativas/${path}.manifesto.json`, import.meta.url),
      'utf8',
    ),
  )

test('all five existing course endings use learning gates and never require a real Mural publication', () => {
  for (const path of paths) {
    const document = manifest(path)
    for (const section of document.sections)
      expect(
        Object.keys(section.completion).every((key) =>
          [
            'version',
            'blockIds',
            'projectChecks',
            'submissionUpToDate',
            'materialItems',
            'platformAction',
          ].includes(key),
        ),
      ).toBe(true)
    for (const block of document.blocks.filter(
      (block) => block.content?.kind === 'studio' && block.content.purpose !== 'experiment',
    )) {
      const content = block.content!
      const requirements = (submitted: boolean) =>
        lessonCompletionRequirements({
          completed: false,
          blocks: [{ id: block.key, kind: content.kind, content, studioState: { submitted } }],
        })
      expect(requirements(true).every((requirement) => requirement.complete)).toBe(true)
      expect(
        requirements(false).some(
          (requirement) =>
            requirement.reason === 'STUDIO_GATE_NOT_SUBMITTED' && !requirement.complete,
        ),
      ).toBe(true)
    }
  }
})

test('Farol and Cadê explicitly offer optional sharing without weakening the preceding delivery', () => {
  for (const path of paths.slice(0, 2)) {
    const document = manifest(path)
    const closing = document.sections.at(-1)!
    expect(closing.objective).toContain('escolha')
    expect(closing.completion.blockIds).toHaveLength(1)
    const video = document.blocks.find((block) => block.key === closing.completion.blockIds[0])!
    expect(video.plannedVideo).toBeDefined()
    expect(
      document.sections.some(
        (section) => section.intent === 'delivery' && section.completion.submissionUpToDate,
      ),
    ).toBe(true)
    expect(
      document.blocks.some((block) =>
        block.content?.text?.includes('continuar a jornada sem publicar'),
      ),
    ).toBe(true)
  }
})

test('seed reports exact editorial fields with course identity/version and never treats a remote lesson as audited', () => {
  const course = { id: crypto.randomUUID(), slug: 'cade-todo-mundo-adulto', version: 19 }
  const reviews = creatorJourneyEditorialReviews([course, { ...course, slug: 'corre-dino' }])
  expect(reviews).toHaveLength(1)
  expect(reviews[0]).toMatchObject({
    courseId: course.id,
    expectedCourseVersion: 19,
    action: 'review-existing-lesson-draft',
  })
  expect(reviews[0]?.sourceFields).toEqual([
    'blocks[key=ponte-a2-publicar].content.text',
    'sections[key=conclusao].title',
    'sections[key=conclusao].objective',
  ])
  expect(reviews[0]?.reason).toContain('não contém a revisão da aula')
})
