import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  evaluateLearning,
  type InteractiveBlock,
  isInteractiveBlock,
  isLearningAnswers,
  isLearningFrameMessage,
  isLearningManifest,
  LEARNING_PROTOCOL,
  type LearningAnswers,
  publicInteractiveBlock,
  validateLessonSections,
} from '../src/learning'

const section = {
  id: 'section',
  title: 'Aula',
  objective: 'Criar',
  intent: 'application' as const,
  blockIds: ['a'],
  workspaceBlockId: null,
  externalTool: null,
  pendingMedia: [],
}
const sequence: InteractiveBlock = {
  kind: 'interactive',
  title: 'Ordem',
  instructions: 'Organize a preparação.',
  required: true,
  hints: [],
  activity: {
    type: 'sequence',
    mode: 'order',
    items: [
      { id: 'draw', label: 'Desenhar' },
      { id: 'create', label: 'Criar' },
    ],
    solution: ['create', 'draw'],
    targets: [],
  },
}
describe('learning contracts', () => {
  test('a checkpoint cannot approve an incorrectly ordered sequence', () => {
    const block: InteractiveBlock = {
      ...sequence,
      checkpoint: {
        prompt: 'Por que preparar primeiro?',
        choices: [
          { id: 'right', label: 'O desenho depende da preparação.' },
          { id: 'wrong', label: 'Não importa.' },
        ],
        correctChoiceId: 'right',
        explanation: 'A preparação cria o que será desenhado.',
      },
    }
    expect(evaluateLearning(block, { order: ['draw', 'create'], checkpoint: 'right' }).passed).toBe(
      false,
    )
    expect(evaluateLearning(block, { order: ['create', 'draw'], checkpoint: 'wrong' }).passed).toBe(
      false,
    )
    expect(evaluateLearning(block, { order: ['create', 'draw'], checkpoint: 'right' }).passed).toBe(
      true,
    )
  })
  test('keeps answer keys private and checks exact sequence without accepting duplicate pieces', () => {
    expect(publicInteractiveBlock(sequence).activity).not.toHaveProperty('solution')
    expect(evaluateLearning(sequence, { order: ['create', 'create'] }).passed).toBe(false)
    expect(evaluateLearning(sequence, { order: ['draw', 'create'] }).passed).toBe(false)
    expect(evaluateLearning(sequence, { order: ['create', 'draw'] }).passed).toBe(true)
  })
  test('an essential HTML claim requires its independent native checkpoint', () => {
    const block: InteractiveBlock = {
      ...sequence,
      activity: { type: 'html', html: '<button>Explorar</button>' },
      checkpoint: {
        prompt: 'Conclusão?',
        choices: [
          { id: 'correct', label: 'Sim' },
          { id: 'other', label: 'Outra' },
        ],
        correctChoiceId: 'correct',
        explanation: 'Observe a relação.',
      },
    }
    expect(evaluateLearning(block, { participated: true, passed: true }).passed).toBe(false)
    expect(evaluateLearning(block, { checkpoint: 'correct' }).passed).toBe(false)
    expect(evaluateLearning(block, { participated: true, checkpoint: 'correct' }).passed).toBe(true)
    expect(publicInteractiveBlock(block).checkpoint).not.toHaveProperty('correctChoiceId')
    expect(isInteractiveBlock({ ...block, checkpoint: undefined })).toBe(false)
  })
  test('untrusted frames cannot use another instance, oversized or invalid state', () => {
    expect(isLearningAnswers({ constructor: { nested: 'bad' } })).toBe(false)
    expect(isLearningAnswers({ value: Number.NaN })).toBe(false)
    expect(isLearningAnswers({ text: 'a'.repeat(8001) })).toBe(false)
    expect(
      isLearningFrameMessage(
        { protocol: LEARNING_PROTOCOL, instance: 'other', event: 'participated' },
        'mine',
      ),
    ).toBe(false)
    expect(
      isLearningFrameMessage(
        {
          protocol: LEARNING_PROTOCOL,
          instance: 'mine',
          event: 'participated',
          state: { nested: { notNumber: true } },
        },
        'mine',
      ),
    ).toBe(false)
    expect(
      isLearningFrameMessage(
        { protocol: LEARNING_PROTOCOL, instance: 'mine', event: 'resize', height: Infinity },
        'mine',
      ),
    ).toBe(false)
  })
  test('a block belongs to exactly one section and an embedded workspace must exist', () => {
    expect(validateLessonSections([section], [{ id: 'a', kind: 'rich_text' }])).toBeNull()
    expect(
      validateLessonSections(
        [section, { ...section, id: 'other' }],
        [{ id: 'a', kind: 'rich_text' }],
      ),
    ).not.toBeNull()
    expect(
      validateLessonSections(
        [{ ...section, workspaceBlockId: 'a' }],
        [{ id: 'a', kind: 'rich_text' }],
      ),
    ).not.toBeNull()
  })
})

const directory = resolve(import.meta.dir, '../../../docs/aulas-interativas')
const catalog: Array<{ course: string; path: string; clips: number }> = JSON.parse(
  readFileSync(resolve(directory, 'catalogo.json'), 'utf8'),
)
describe('the 27 adapted lessons', () => {
  test('covers the complete curriculum once', () => {
    expect(catalog).toHaveLength(27)
    expect(new Set(catalog.map((lesson) => lesson.path)).size).toBe(27)
    expect(catalog.filter((lesson) => lesson.course === 'corre-dino')).toHaveLength(13)
    expect(catalog.filter((lesson) => lesson.course === 'o-jogo-do-meu-jeito')).toHaveLength(8)
  })
  for (const entry of catalog)
    test(entry.path, () => {
      const manifest: unknown = JSON.parse(
        readFileSync(resolve(directory, entry.path, 'manifesto.json'), 'utf8'),
      )
      expect(isLearningManifest(manifest)).toBe(true)
      if (!isLearningManifest(manifest)) throw new Error('Invalid authored manifest')
      expect(manifest.sections.flatMap((section) => section.pendingMedia)).toHaveLength(entry.clips)
      expect(readFileSync(resolve(directory, entry.path, 'roteiro.md'), 'utf8')).toContain(
        'Narração revisada',
      )
      if (entry.course === 'o-jogo-do-meu-jeito') {
        expect(manifest.sections.every((section) => section.workspaceKey === null)).toBe(true)
        expect(manifest.sections.some((section) => section.externalTool !== null)).toBe(true)
        expect(
          manifest.blocks.some(
            (block) => 'existing' in block && ['studio', 'pinta'].includes(block.existing.kind),
          ),
        ).toBe(false)
      }
      for (const entryBlock of manifest.blocks) {
        if (!('content' in entryBlock) || entryBlock.content.kind !== 'interactive') continue
        const block = entryBlock.content
        expect(evaluateLearning(block, {}).passed).toBe(false)
        const answers: LearningAnswers = {}
        const activity = block.activity
        if (activity.type === 'sequence') answers.order = activity.solution
        if (activity.type === 'prediction') {
          answers.prediction = activity.choices[0]?.id ?? ''
          answers.observed = true
        }
        if (activity.type === 'experiment') {
          answers.experiments = 2
          answers.observed = true
        }
        if (activity.type === 'html') answers.participated = true
        if (activity.type === 'comparison') {
          answers.leftObserved = true
          answers.rightObserved = true
        }
        if (block.checkpoint) answers.checkpoint = block.checkpoint.correctChoiceId
        expect(evaluateLearning(block, answers).passed).toBe(true)
      }
    })
})
