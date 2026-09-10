import { describe, expect, test } from 'bun:test'
import {
  defaultLessonSection,
  evaluateLearning,
  type InteractiveBlock,
  isInteractiveBlock,
  publicInteractiveBlock,
  sectionCompletionIssues,
  sectionProgressView,
} from '../src/learning'

const question: InteractiveBlock = {
  kind: 'interactive',
  title: 'Preparação',
  instructions: 'Confira a ideia.',
  hints: ['Primeiro prepare.'],
  required: true,
  activity: { type: 'checkpoint' },
  checkpoint: {
    prompt: 'O que vem antes do desenho?',
    choices: [
      { id: 'prepare', label: 'Preparar' },
      { id: 'finish', label: 'Terminar' },
    ],
    correctChoiceId: 'prepare',
    explanation: 'O desenho usa a preparação.',
  },
}

describe('section progression', () => {
  test('native checkpoint requires a real correct answer and keeps the key private', () => {
    expect(isInteractiveBlock(question)).toBe(true)
    expect(isInteractiveBlock({ ...question, checkpoint: undefined })).toBe(false)
    expect(evaluateLearning(question, {}).passed).toBe(false)
    expect(evaluateLearning(question, { checkpoint: 'finish' }).passed).toBe(false)
    expect(evaluateLearning(question, { checkpoint: 'prepare' })).toMatchObject({
      passed: true,
      verifiedBy: 'server',
    })
    expect(publicInteractiveBlock(question).checkpoint).not.toHaveProperty('correctChoiceId')
  })
  test('only completed evidence changes percent; future sections have no activity details', () => {
    const sections = ['a', 'b', 'c'].map((id) => ({ id, title: id }))
    const state = sectionProgressView(
      'revision',
      sections,
      new Set(['a']),
      new Map([['c', ['Secret question']]]),
    )
    expect(state.percent).toBeCloseTo(100 / 3)
    expect(state.sections.map((s) => s.status)).toEqual(['completed', 'available', 'locked'])
    expect(state.sections[2]?.pending).toEqual(['Conclua a seção anterior.'])
  })
  test('publication rejects missing, foreign and participation-only criteria', () => {
    const section = {
      ...defaultLessonSection('s', 'Começo', ['q']),
      completion: { version: 1 as const, blockIds: ['q'] },
    }
    expect(sectionCompletionIssues([section], [{ id: 'q', content: question }])).toEqual([])
    expect(
      sectionCompletionIssues(
        [{ ...section, completion: { version: 1, blockIds: ['foreign'] } }],
        [{ id: 'q', content: question }],
      ),
    ).not.toEqual([])
    expect(
      sectionCompletionIssues(
        [section, defaultLessonSection('empty', 'Fim', [])],
        [{ id: 'q', content: question }],
      ),
    ).not.toEqual([])
    expect(
      sectionCompletionIssues(
        [section],
        [
          {
            id: 'q',
            content: {
              ...question,
              activity: {
                type: 'prediction',
                choices: question.checkpoint?.choices,
                outcome: 'Observe.',
              },
              checkpoint: undefined,
            },
          },
        ],
      ),
    ).not.toEqual([])
  })
  test('a shared project can be used early but delivery belongs to closing', () => {
    const first = {
      ...defaultLessonSection('a', 'Construir', ['q']),
      workspaceBlockId: 'project',
      completion: { version: 1 as const, blockIds: ['q'] },
    }
    const last = {
      ...defaultLessonSection('b', 'Enviar', ['project']),
      intent: 'closing' as const,
      completion: { version: 1 as const, blockIds: ['project'] },
    }
    const blocks = [
      { id: 'q', content: question },
      { id: 'project', content: { kind: 'studio' } },
    ]
    expect(sectionCompletionIssues([first, last], blocks)).toEqual([])
    expect(sectionCompletionIssues([{ ...last, intent: 'application' }], blocks)).not.toEqual([])
  })
  test.each(['studio', 'pinta'])('the %s delivery must close the actual section order', (kind) => {
    const first = {
      ...defaultLessonSection('a', 'Construir', ['q']),
      workspaceBlockId: 'project',
      completion: { version: 1 as const, blockIds: ['q'] },
    }
    const last = {
      ...defaultLessonSection('b', 'Enviar', ['project']),
      intent: 'closing' as const,
      completion: { version: 1 as const, blockIds: ['project'] },
    }
    const blocks = [
      { id: 'q', content: question },
      { id: 'project', content: { kind } },
    ]
    expect(sectionCompletionIssues([first, last], blocks)).toEqual([])
    expect(sectionCompletionIssues([last, first], blocks)).toContainEqual({
      sectionId: last.id,
      message: 'Mova a entrega para a última seção do percurso, marcada como fechamento.',
    })
    // Delivery is still mandatory when the author selects another checkpoint as evidence.
    const early = {
      ...last,
      blockIds: ['project', 'q'],
      completion: { version: 1 as const, blockIds: ['q'] },
    }
    const later = {
      ...defaultLessonSection('c', 'Continuar', ['other']),
      completion: { version: 1 as const, blockIds: ['other'] },
    }
    expect(
      sectionCompletionIssues([early, later], [...blocks, { id: 'other', content: question }]),
    ).toContainEqual({
      sectionId: early.id,
      message: 'Mova a entrega para a última seção do percurso, marcada como fechamento.',
    })
    expect(
      sectionCompletionIssues(
        [{ ...early, intent: 'exploration' }, later],
        [
          { id: 'q', content: question },
          { id: 'other', content: question },
          { id: 'project', content: { kind, purpose: 'experiment' } },
        ],
      ),
    ).toEqual([])
  })
})
