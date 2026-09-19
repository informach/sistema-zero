import { describe, expect, test } from 'bun:test'
import {
  defaultLessonSection,
  type LessonLearningProgress,
  lessonCompletionRequirements,
} from '../src/learning'

describe('lesson completion requirements', () => {
  test('video and selected files must both be completed in the current revision', () => {
    const blocks = [
      { id: 'video', kind: 'video', blockRevision: 'v1', content: { kind: 'video' } },
      { id: 'files', kind: 'materials', blockRevision: 'm1', content: { kind: 'materials' } },
    ]
    const progress = (
      videoRanges: string[],
      downloadedMaterialItemIds: string[],
      materialRevision = 'm1',
    ): LessonLearningProgress => ({
      sectionId: null,
      blocks: [
        {
          blockId: 'video',
          revision: 'v1',
          positionSeconds: null,
          answers: { videoDuration: 100, videoRanges },
          hintsUsed: 0,
          attemptsCount: 0,
          result: null,
          updatedAt: 'now',
        },
        {
          blockId: 'files',
          revision: materialRevision,
          positionSeconds: null,
          answers: { downloadedMaterialItemIds },
          hintsUsed: 0,
          attemptsCount: 0,
          result: null,
          updatedAt: 'now',
        },
      ],
    })
    const evaluate = (videoRanges: string[], ids: string[], revision?: string) =>
      lessonCompletionRequirements({
        completed: false,
        blocks,
        learningProgress: progress(videoRanges, ids, revision),
        videoBlockIds: ['video'],
        materialItems: [{ blockId: 'files', itemIds: ['one', 'two'] }],
      }).map((requirement) => requirement.complete)
    expect(evaluate(['0:90'], ['one'])).toEqual([true, false])
    expect(evaluate(['0:40'], ['one', 'two'])).toEqual([false, true])
    expect(evaluate(['0:90'], ['one', 'two'], 'old')).toEqual([true, false])
    expect(evaluate(['0:90'], ['one', 'two'])).toEqual([true, true])
  })
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
