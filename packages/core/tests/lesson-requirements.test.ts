import { describe, expect, test } from 'bun:test'
import {
  defaultLessonSection,
  type LessonLearningProgress,
  lessonCompletionRequirements,
} from '../src/learning'

describe('lesson completion requirements', () => {
  test('a abertura exige assistir ao vídeo e encontrar todos no jogo pronto', () => {
    const blocks = [
      { id: 'video', kind: 'video', blockRevision: 'v1', content: { kind: 'video' } },
      {
        id: 'jogo',
        kind: 'interactive',
        blockRevision: 'g1',
        content: { kind: 'interactive', required: true, activity: { type: 'project-play' } },
      },
    ]
    const progress = (watched: boolean, found: boolean): LessonLearningProgress => ({
      sectionId: null,
      blocks: [
        {
          blockId: 'video',
          revision: 'v1',
          positionSeconds: null,
          answers: { videoDuration: 100, videoRanges: watched ? ['0:90'] : ['0:40'] },
          hintsUsed: 0,
          attemptsCount: 0,
          result: null,
          updatedAt: 'now',
        },
        {
          blockId: 'jogo',
          revision: 'g1',
          positionSeconds: null,
          answers: { foundTargets: found ? ['arbusto', 'pedras', 'flores'] : ['arbusto'] },
          hintsUsed: 0,
          attemptsCount: 1,
          updatedAt: 'now',
          result: {
            participated: true,
            passed: found,
            verifiedBy: 'client',
            feedback: '',
          },
        },
      ],
    })
    const requirements = (watched: boolean, found: boolean) =>
      lessonCompletionRequirements({
        completed: false,
        blocks,
        videoBlockIds: ['video'],
        learningProgress: progress(watched, found),
      })
    expect(requirements(false, false).map((item) => item.complete)).toEqual([false, false])
    expect(requirements(true, false).map((item) => item.complete)).toEqual([true, false])
    expect(requirements(false, true).map((item) => item.complete)).toEqual([false, true])
    expect(requirements(true, true).map((item) => item.complete)).toEqual([true, true])
    expect(requirements(false, false)[1]?.action).toBe('Encontre todos os personagens no jogo')
  })

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
      action: 'Envie seu projeto para o professor',
    })
  })
  test('a copy de cada requisito é a voz da criança, sem ponto final nem travessão (30/09/2026)', () => {
    const acoes = lessonCompletionRequirements({
      completed: false,
      videoBlockIds: ['video'],
      learningProgress: {
        sectionId: null,
        blocks: [
          {
            blockId: 'video',
            revision: 'v1',
            positionSeconds: null,
            answers: { videoDuration: 100, videoRanges: ['0:45'] },
            hintsUsed: 0,
            attemptsCount: 0,
            result: null,
            updatedAt: 'now',
          },
        ],
      },
      blocks: [
        { id: 'video', kind: 'video', blockRevision: 'v1', content: { kind: 'video' } },
        {
          id: 'exp',
          kind: 'interactive',
          blockRevision: 'e1',
          content: {
            kind: 'interactive',
            required: true,
            activity: { type: 'experimentation', scene: 'world' },
          },
        },
        {
          id: 'jogo',
          kind: 'interactive',
          blockRevision: 'g1',
          content: {
            kind: 'interactive',
            required: true,
            activity: { type: 'project-play', completion: 'participation' },
          },
        },
        {
          id: 'alvos',
          kind: 'interactive',
          blockRevision: 'g2',
          content: {
            kind: 'interactive',
            required: true,
            activity: { type: 'project-play', completion: 'targets' },
          },
        },
        { id: 'quiz', kind: 'quiz', content: { passingScore: 70, questions: [{ id: 'q' }] } },
        {
          id: 'studio',
          kind: 'studio',
          content: { kind: 'studio' },
          studioState: { submitted: false },
        },
        {
          id: 'studio-nota',
          kind: 'studio',
          content: { kind: 'studio', activity: { passingScore: 60 } },
          studioState: { submitted: true, passed: false },
        },
        { id: 'pinta', kind: 'pinta', content: { kind: 'pinta' } },
        { id: 'cert', kind: 'certificate', content: { kind: 'certificate' } },
      ],
    }).map((r) => r.action)
    expect(acoes).toEqual([
      'Veja o vídeo até o fim (você já viu 45%)',
      'Termine o experimento',
      'Jogue o jogo pronto',
      'Complete os alvos do jogo',
      'Passe no quiz (nota mínima 70%)',
      'Envie seu projeto para o professor',
      'Alcance a nota mínima do projeto',
      'Envie seu desenho para o professor',
      'Pegue seu certificado',
    ])
    for (const acao of acoes) {
      expect(acao.endsWith('.')).toBe(false)
      expect(acao).not.toContain('—')
    }
    // A aula em produção é o único requisito enquanto o bloco "Em breve" existir.
    expect(
      lessonCompletionRequirements({
        completed: false,
        blocks: [
          { id: 'cs', kind: 'coming_soon', content: { kind: 'coming_soon' } },
          { id: 'v', kind: 'video', content: { kind: 'video' } },
        ],
      }).map((r) => r.action),
    ).toEqual(['Espere a aula ficar pronta'])
    // ⚠️ O gate de seção junta as frases com " · ": sem ponto final, `join(' ')` as colava.
    expect(
      lessonCompletionRequirements({
        completed: false,
        blocks: [],
        sectionProgress: {
          revision: 'r',
          completed: 0,
          total: 1,
          percent: 0,
          sections: [
            {
              id: 's',
              title: 'S',
              status: 'available',
              pending: ['Termine o experimento', 'Passe no quiz (nota mínima 70%)'],
              pendingItems: [
                { kind: 'LEARNING_GATE_INCOMPLETE', text: 'Termine o experimento' },
                { kind: 'QUIZ_GATE_NOT_PASSED', text: 'Passe no quiz (nota mínima 70%)' },
              ],
            },
          ],
        },
      })[0]?.action,
    ).toBe('Termine o experimento · Passe no quiz (nota mínima 70%)')
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
