import { expect, test } from 'bun:test'
import { liveLessonCompletionIssues } from '../src/course/modality'
import { defaultLessonSection } from '../src/learning'

test('ao vivo recusa entrega e nota no Estúdio, incluindo propósito antigo ausente', () => {
  for (const purpose of [undefined, 'submission'])
    expect(
      liveLessonCompletionIssues([{ id: 'b', content: { kind: 'studio', purpose } }], []),
    ).toMatchObject([{ blockId: 'b' }])
  expect(
    liveLessonCompletionIssues(
      [{ id: 'b', content: { kind: 'studio', purpose: 'experiment' } }],
      [],
    ),
  ).toEqual([])
})
test('envio em dia incompatível é localizado na seção; objetivos continuam permitidos', () => {
  const section = {
    ...defaultLessonSection('s'),
    workspaceBlockId: 'b',
    blockIds: ['b'],
    completion: { version: 1 as const, blockIds: [], submissionUpToDate: true as const },
  }
  expect(
    liveLessonCompletionIssues(
      [{ id: 'b', content: { kind: 'studio', purpose: 'experiment' } }],
      [section],
    ),
  ).toMatchObject([{ sectionId: 's' }])
  expect(liveLessonCompletionIssues([{ id: 'b', content: { kind: 'pinta' } }], [section])).toEqual(
    [],
  )
})
