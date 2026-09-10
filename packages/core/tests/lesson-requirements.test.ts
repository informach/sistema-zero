import { describe, expect, test } from 'bun:test'
import { defaultLessonSection, lessonCompletionRequirements } from '../src/learning'

describe('lesson completion requirements', () => {
  test('reusing a project points to its primary section and counts a single requirement', () => {
    const first = {
      ...defaultLessonSection('first', 'Criar', ['studio']),
      workspaceBlockId: 'studio',
    }
    const second = {
      ...defaultLessonSection('second', 'Experimentar', []),
      workspaceBlockId: 'studio',
    }
    const result = lessonCompletionRequirements({
      completed: false,
      sections: [first, second],
      blocks: [
        {
          id: 'studio',
          kind: 'studio',
          content: { kind: 'studio' },
          studioState: { submitted: false },
        },
      ],
    })
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      sectionId: 'first',
      complete: false,
      action: 'Enviar projeto',
    })
  })
  test('optional experiments, empty legacy quizzes and video never become completion requirements', () => {
    expect(
      lessonCompletionRequirements({
        completed: false,
        blocks: [
          { id: 'studio', kind: 'studio', content: { purpose: 'experiment' } },
          { id: 'pinta', kind: 'pinta', content: { purpose: 'experiment' } },
          { id: 'quiz', kind: 'quiz', content: { passingScore: 70, questions: [] } },
          { id: 'video', kind: 'video', content: { src: 'video' } },
        ],
      }),
    ).toEqual([])
  })
  test('grade and delivery are distinct, and an already completed lesson never regresses', () => {
    const blocks = [
      {
        id: 'studio',
        kind: 'studio',
        content: { activity: { passingScore: 70 } },
        studioState: { submitted: true, passed: false },
      },
    ]
    expect(lessonCompletionRequirements({ completed: false, blocks })[0]).toMatchObject({
      complete: false,
      reason: 'STUDIO_GATE_NOT_PASSED',
    })
    expect(lessonCompletionRequirements({ completed: true, blocks })[0]?.complete).toBe(true)
  })
  test('a discovery pass must belong to the current content revision', () => {
    const blocks = [
      { id: 'discovery', kind: 'interactive', blockRevision: 'new', content: { required: true } },
    ]
    expect(
      lessonCompletionRequirements({
        completed: false,
        blocks,
        learningProgress: {
          sectionId: null,
          blocks: [
            {
              blockId: 'discovery',
              revision: 'old',
              positionSeconds: null,
              answers: {},
              hintsUsed: 0,
              attemptsCount: 1,
              updatedAt: 'now',
              result: { passed: true, participated: true, feedback: '', verifiedBy: 'server' },
            },
          ],
        },
      })[0]?.complete,
    ).toBe(false)
  })
  test('coming-soon explains availability without exposing hidden activity requirements', () => {
    expect(
      lessonCompletionRequirements({
        completed: false,
        blocks: [
          { id: 'studio', kind: 'studio', content: {} },
          { id: 'soon', kind: 'coming_soon', content: {} },
        ],
      }),
    ).toMatchObject([{ blockId: 'soon', reason: 'LESSON_COMING_SOON' }])
  })
})
