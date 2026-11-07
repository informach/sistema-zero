import { expect, test } from 'bun:test'
import { defaultLessonSection } from '@sistemazero/core/learning'
import { certificateLessonIssues } from '../../src/domain/course/certificate-lesson'
import type { LessonBlockContent } from '../../src/domain/course/lesson-block'

const blocks: { id: string; content: LessonBlockContent }[] = [
  { id: 'quiz', content: { kind: 'quiz', passingScore: 100, questions: [] } },
  { id: 'cert', content: { kind: 'certificate' } },
]
const review = {
  ...defaultLessonSection('review', 'Revisão', ['quiz']),
  completion: { version: 1 as const, blockIds: ['quiz'] },
}
const certificate = {
  ...defaultLessonSection('celebrate', 'Certificado', ['cert']),
  completion: { version: 1 as const, blockIds: ['cert'] },
}

test('permite revisão obrigatória antes do certificado', () => {
  expect(certificateLessonIssues([review, certificate], blocks)).toEqual([])
})
test('recusa quiz posterior, misturado, ausente ou sem critério', () => {
  for (const sections of [
    [certificate, review],
    [
      {
        ...certificate,
        blockIds: ['quiz', 'cert'],
        completion: { version: 1 as const, blockIds: ['quiz', 'cert'] },
      },
    ],
    [certificate],
    [{ ...review, completion: { version: 1 as const, blockIds: [] } }, certificate],
    [review, { ...certificate, completion: { version: 1 as const, blockIds: [] } }],
    [],
  ])
    expect(certificateLessonIssues(sections, blocks)).toHaveLength(1)
})
test('não libera outros bloqueios na aula de certificado nem interfere em outras aulas', () => {
  const studio = { id: 'studio', content: { kind: 'studio' as const, initialProject: {} } }
  expect(certificateLessonIssues([review, certificate], [...blocks, studio])).toHaveLength(1)
  expect(certificateLessonIssues([review], [blocks[0]!])).toEqual([])
  expect(certificateLessonIssues([], [blocks[1]!])).toEqual([])
})

test('permite preparar o certificado com a aula inteira bloqueada por em breve', () => {
  const comingSoon = { id: 'soon', content: { kind: 'coming_soon' as const } }
  const preparing = { ...review, blockIds: ['soon', ...review.blockIds] }
  expect(certificateLessonIssues([preparing, certificate], [...blocks, comingSoon])).toEqual([])
  expect(certificateLessonIssues([certificate, preparing], [...blocks, comingSoon])).toHaveLength(1)
})
