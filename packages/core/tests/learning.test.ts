import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { LearningAnswers } from '../src/learning'
import {
  evaluateLearning,
  type InteractiveBlock,
  isInteractiveBlock,
  isLearningAnswers,
  isLearningFrameMessage,
  isLearningManifest,
  LEARNING_PROTOCOL,
  publicInteractiveBlock,
  sectionCompletionIssues,
  validateLessonSections,
} from '../src/learning'
import {
  initialDemonstration,
  initialExperiment,
  packDemonstration,
  packExperiment,
  sceneModel,
  stepDemonstration,
  stepExperiment,
} from '../src/learning/scene'
import { scenePaths } from './fixtures/exploration-paths'

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
const experimento: InteractiveBlock = {
  kind: 'interactive',
  title: 'Faça o Dino aparecer',
  instructions: 'Crie o Dino e ligue o desenho.',
  required: true,
  hints: [],
  activity: { type: 'experimentation', scene: 'world' },
}
/** O que o servidor guardaria depois de a criança cumprir as duas metas de `world`. */
function sessaoCompleta() {
  const start = { scene: 'world' } as const
  let s = initialExperiment(start)
  s = stepExperiment(start, s, { type: 'create' }).session
  s = stepExperiment(start, s, { type: 'connect', port: 'draw', enabled: true }).session
  return packExperiment(s)
}
describe('learning contracts', () => {
  test('⚠️ uma cena não aceita pergunta anexa', () => {
    // `answers.checkpoint` seria a alternativa escolhida E os pedaços da sessão ao mesmo
    // tempo, na mesma chave. Antes isso só era impedido por uma invariante implícita.
    expect(isInteractiveBlock(experimento)).toBe(true)
    expect(
      isInteractiveBlock({
        ...experimento,
        checkpoint: {
          prompt: 'Por quê?',
          choices: [
            { id: 'a', label: 'Uma' },
            { id: 'b', label: 'Outra' },
          ],
          correctChoiceId: 'a',
          explanation: 'Porque sim.',
        },
      }),
    ).toBe(false)
  })
  test('a cena é aprovada pela evidência que ela mesma guarda', () => {
    expect(evaluateLearning(experimento, {}).passed).toBe(false)
    expect(evaluateLearning(experimento, { sceneCheckpoint: sessaoCompleta() }).passed).toBe(true)
    // Pacote corrompido não aprova nem finge que está tudo bem.
    expect(evaluateLearning(experimento, { sceneCheckpoint: ['{lixo'] }).passed).toBe(false)
  })
  test('an essential HTML claim requires its independent native checkpoint', () => {
    const block: InteractiveBlock = {
      ...experimento,
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
  test('⚠️ atividade de forma desconhecida não conclui com um "participei" do cliente', () => {
    // Um bloco gravado antes desta reescrita (uma sequência, uma previsão) não tem como ser
    // avaliado. Aceitar `{participated:true}` daria o bloco obrigatório por cumprido sem
    // ninguém ter respondido nada.
    const legado = { ...experimento, activity: { type: 'sequence' } } as unknown as InteractiveBlock
    const r = evaluateLearning(legado, { participated: true })
    expect(r.passed).toBe(false)
    expect(r.participated).toBe(false)
  })

  test('⚠️ a projeção pública poda campo que não pertence à forma da atividade', () => {
    // A projeção roda sobre o conteúdo CRU do banco, sem passar pelo guard: uma linha antiga
    // pode carregar um gabarito, e copiá-la inteira mandaria a resposta para a criança.
    const comGabarito = {
      ...experimento,
      activity: { type: 'experimentation', scene: 'world', solution: ['a', 'b'] },
    } as unknown as InteractiveBlock
    const publico = publicInteractiveBlock(comGabarito)
    expect(publico.activity).not.toHaveProperty('solution')
    expect(publico.activity).toMatchObject({ type: 'experimentation', scene: 'world' })
  })

  test('quem nunca abriu a demonstração não consta como participante', () => {
    const demo = {
      ...experimento,
      activity: { type: 'demonstration', scene: 'world' },
    } as InteractiveBlock
    expect(evaluateLearning(demo, {}).participated).toBe(false)
    expect(evaluateLearning(demo, {}).passed).toBe(false)
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
      expect(manifest.version).toBe(entry.course === 'corre-dino' ? 4 : 3)
      expect(
        sectionCompletionIssues(
          manifest.sections.map((s) => ({
            ...s,
            id: s.key,
            blockIds: s.blockKeys,
            workspaceBlockId: s.workspaceKey,
          })),
          manifest.blocks.map((b) => ({
            id: b.key,
            content:
              'content' in b
                ? b.content
                : 'existing' in b
                  ? { kind: b.existing.kind }
                  : { kind: 'video' },
          })),
        ),
      ).toEqual([])
      expect(manifest.sections.flatMap((section) => section.pendingMedia)).toHaveLength(0)
      const videos = manifest.blocks.filter((block) => 'plannedVideo' in block)
      expect(videos).toHaveLength(entry.clips)
      for (const video of videos)
        expect(
          manifest.sections.filter((section) => section.blockKeys.includes(video.key)),
        ).toHaveLength(1)
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
        // ⚠️ O caminho de sucesso é expresso como AÇÕES da criança, nunca como um "passou"
        // que o cliente manda pronto. É o que separa evidência de autodeclaração.
        if (activity.type === 'experimentation') {
          const start = { scene: activity.scene, initialImpulse: activity.initialImpulse }
          let sessao = initialExperiment(start)
          for (const action of scenePaths[activity.scene])
            sessao = stepExperiment(start, sessao, action).session
          answers.sceneCheckpoint = packExperiment(sessao)
        }
        if (activity.type === 'demonstration') {
          const start = { scene: activity.scene }
          const script = activity.script ?? sceneModel(activity.scene).script
          let sessao = stepDemonstration(start, script, initialDemonstration(start), {
            type: 'start',
          }).session
          for (let i = 0; i < 600 && !sessao.viewed; i++) {
            sessao = stepDemonstration(start, script, sessao, {
              type: 'tick',
              seconds: 0.1,
            }).session
            if (sessao.ready && sessao.step < script.length - 1)
              sessao = stepDemonstration(start, script, sessao, { type: 'next' }).session
          }
          answers.sceneCheckpoint = packDemonstration(sessao)
        }
        if (activity.type === 'html') answers.participated = true
        if (block.checkpoint) answers.checkpoint = block.checkpoint.correctChoiceId
        expect(evaluateLearning(block, answers).passed).toBe(true)
      }
    })
})
