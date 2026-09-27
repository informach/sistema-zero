import { describe, expect, test } from 'bun:test'
import {
  defaultLessonSection,
  isLegacyLessonLayout,
  legacyLessonBlockOrder,
  lessonCompletionRequirements,
} from '../src/learning'

describe('gradual lesson migration', () => {
  test('recognizes absent sections and automatic backfill, without taking over authored sections', () => {
    const automatic = defaultLessonSection('lesson', 'Aula', ['video', 'project', 'quiz'])
    expect(isLegacyLessonLayout('lesson', undefined)).toBe(true)
    expect(isLegacyLessonLayout('lesson', [automatic])).toBe(true)
    expect(isLegacyLessonLayout('lesson', [{ ...automatic, id: 'authored' }])).toBe(false)
    expect(isLegacyLessonLayout('lesson', [{ ...automatic, objective: 'Criar um salto' }])).toBe(
      false,
    )
    expect(
      isLegacyLessonLayout('lesson', [
        { ...automatic, completion: { version: 1, blockIds: ['quiz'] } },
      ]),
    ).toBe(false)
  })

  test('orders video, project and quiz while retaining every block and its identity', () => {
    const blocks = [
      { id: 'quiz', kind: 'quiz' },
      { id: 'project', kind: 'studio' },
      { id: 'v1', kind: 'video' },
      { id: 'text', kind: 'rich_text' },
      { id: 'v2', kind: 'video' },
    ]
    const ordered = legacyLessonBlockOrder(blocks)
    expect(ordered.map((b) => b.id)).toEqual(['v1', 'v2', 'text', 'project', 'quiz'])
    expect(ordered[3]).toBe(blocks[1])
    expect(blocks[0]?.id).toBe('quiz')
  })

  test('the original delivery and quiz gates remain independent of presentation', () => {
    const blocks = [
      { id: 'video', kind: 'video', content: { kind: 'video' } },
      {
        id: 'project',
        kind: 'studio',
        content: { kind: 'studio' },
        studioState: { submitted: true },
      },
      {
        id: 'quiz',
        kind: 'quiz',
        content: { kind: 'quiz', passingScore: 70, questions: [{}] },
        quizState: { passed: false },
      },
    ]
    const requirements = lessonCompletionRequirements({
      blocks: legacyLessonBlockOrder(blocks),
      completed: false,
    })
    expect(requirements.map((r) => [r.blockId, r.complete])).toEqual([
      ['project', true],
      ['quiz', false],
    ])
    expect(lessonCompletionRequirements({ blocks, completed: true }).every((r) => r.complete)).toBe(
      true,
    )
  })
})
