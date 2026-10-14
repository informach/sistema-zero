import { describe, expect, test } from 'bun:test'
import type { InteractiveBlock, LearningAnswers } from '@sistemazero/core/learning'
import { sceneSegmentAnswers } from '@sistemazero/core/learning/scene'
import { createBlankProjectSnapshot } from '@sistemazero/studio/blank-project'
import { LiveService } from '../../src/application/live/live.service'
import { LiveLearningService } from '../../src/application/live/live-learning.service'
import { LiveAccessError, LiveConflictError } from '../../src/domain/live/live.errors'
import { InMemoryLiveRepository } from '../fakes/live-in-memory'

const uuid = () => crypto.randomUUID()
const html: InteractiveBlock = {
  kind: 'interactive',
  title: 'Uma descoberta',
  instructions: 'Observe e responda',
  required: true,
  hints: ['Olhe de novo'],
  activity: { type: 'html', html: '<p>Crie algo!</p>' },
  checkpoint: {
    prompt: 'Qual opção?',
    choices: [
      { id: 'yes', label: 'Sim' },
      { id: 'no', label: 'Não' },
    ],
    correctChoiceId: 'yes',
    explanation: 'Isso mesmo!',
  },
}
async function setup(content: InteractiveBlock = html) {
  let now = new Date('2026-11-07T17:00:00Z')
  const repository = new InMemoryLiveRepository()
  const teacher = { id: uuid(), accountId: uuid(), name: 'Professora', staff: true }
  const child = { id: uuid(), accountId: uuid(), name: 'Alice', staff: false }
  const live = new LiveService(
    repository,
    () => now,
    { assertOwnership: async () => ({ name: 'Alice' }) },
    { mediaReady: true },
  )
  const blocks = [
    { id: uuid(), revision: uuid(), content },
    {
      id: uuid(),
      revision: uuid(),
      content: {
        kind: 'interactive',
        title: 'Criar mundo',
        instructions: 'Crie no palco',
        required: true,
        hints: [],
        semPerguntaFinal: true,
        activity: { type: 'experimentation', scene: 'world' },
      } as InteractiveBlock,
    },
  ]
  const steps = [
    { id: uuid(), title: 'Descobertas', instructions: 'Experimente no seu ritmo', blocks },
  ]
  const program = await live.createProgram(teacher, {
    title: 'Oficina',
    description: 'Aprender criando',
    lessons: [
      {
        title: 'Encontro',
        instructions: 'Vamos criar',
        materials: [],
        starterProjectId: null,
        steps,
      },
    ],
  })
  const { cohort, sessions } = await live.createCohort(teacher, program.id, {
    title: 'Turma',
    timeZone: 'America/Sao_Paulo',
    accessDays: 30,
    capacity: 2,
    teacherIds: [teacher.id],
    schedule: [{ startsAt: now.toISOString(), endsAt: '2026-11-07T18:00:00Z' }],
  })
  await live.updateCohort(teacher, cohort.id, 'open')
  const enrollment = await live.enroll(teacher, cohort.id, {
    accountId: child.accountId,
    learnerId: child.id,
    learnerName: child.name,
  })
  const learning = new LiveLearningService(live, repository, () => now)
  return {
    live,
    learning,
    repository,
    teacher,
    child,
    session: sessions[0]!,
    cohort,
    program,
    enrollment,
    steps,
    block: blocks[0]!,
    scene: blocks[1]!,
    time: (value: string) => {
      now = new Date(value)
    },
  }
}
describe('atividades nas oficinas sem identidade de curso', () => {
  test('project-play reutiliza participação com indicação honesta de evidência do navegador', async () => {
    const content: InteractiveBlock = {
      kind: 'interactive',
      title: 'Experimente o jogo',
      instructions: 'Jogue um pouco',
      required: true,
      hints: [],
      activity: {
        type: 'project-play',
        completion: 'participation',
        project: createBlankProjectSnapshot(uuid(), 'Meu jogo'),
        stage: { width: 800, height: 450 },
        targets: [],
      },
    }
    const f = await setup(content)
    const result = await f.learning.attempt(f.child, f.session.id, f.block.id, {
      id: uuid(),
      revision: f.block.revision,
      hintsUsed: 0,
      answers: { participated: true },
    })
    expect(result.attempt.result).toMatchObject({ passed: true, verifiedBy: 'client' })
  })
  test('gabarito fica privado; turma congela roteiro e sugestão docente não altera progresso', async () => {
    const f = await setup()
    expect(JSON.stringify((await f.live.room(f.child, f.session.id)).plan)).not.toContain(
      'correctChoiceId',
    )
    expect(
      (await f.learning.preview(f.teacher, f.session.id)).steps[0]?.blocks[0]?.content.checkpoint
        ?.correctChoiceId,
    ).toBe('yes')
    await expect(f.learning.preview(f.child, f.session.id)).rejects.toBeInstanceOf(LiveAccessError)
    await f.live.updateProgram(f.teacher, f.program.id, {
      expectedRevision: 1,
      lessons: [{ ...f.program.lessons[0]!, steps: [] }],
    })
    expect((await f.live.room(f.child, f.session.id)).plan?.steps).toHaveLength(1)
    const room = await f.live.control(f.teacher, f.session.id, 1, {
      kind: 'suggest-step',
      stepId: f.steps[0]!.id,
    })
    expect(room.occurrence?.suggestedStepId).toBe(f.steps[0]!.id)
    expect((await f.learning.read(f.child, f.session.id)).blocks).toEqual([])
    await expect(
      f.live.control(f.teacher, f.session.id, room.occurrence!.version, {
        kind: 'suggest-step',
        stepId: uuid(),
      }),
    ).rejects.toThrow()
  })
  test('poll de sala omite somente roteiro vigente; expiração sempre manda null para limpar conteúdo', async () => {
    const f = await setup()
    const initial = await f.live.room(f.child, f.session.id)
    expect(initial.planRevision).toHaveLength(64)
    expect((await f.live.room(f.child, f.session.id, initial.planRevision)).plan).toBeUndefined()
    expect((await f.live.room(f.child, f.session.id, '0'.repeat(64))).plan?.steps).toHaveLength(1)
    f.time('2026-12-07T17:00:00Z')
    expect((await f.live.room(f.child, f.session.id, initial.planRevision)).plan).toBeNull()
  })
  test('tentativas avaliam no servidor, repetição é idempotente e respostas sobrevivem a nova leitura', async () => {
    const f = await setup(),
      id = uuid()
    const input = {
      id,
      revision: f.block.revision,
      answers: { participated: true, checkpoint: 'yes', passed: false },
      hintsUsed: 0,
    }
    const results = await Promise.all([
      f.learning.attempt(f.child, f.session.id, f.block.id, input),
      f.learning.attempt(f.child, f.session.id, f.block.id, input),
    ])
    expect(results[0]!.attempt.result).toMatchObject({ passed: true, verifiedBy: 'server' })
    expect(results[1]!.progress.attemptsCount).toBe(1)
    await f.learning.save(f.child, f.session.id, f.block.id, {
      revision: f.block.revision,
      answers: { participated: true, checkpoint: 'no' },
      hintsUsed: 1,
      positionSeconds: null,
    })
    const read = await new LiveLearningService(f.live, f.repository, () => new Date()).read(
      f.child,
      f.session.id,
    )
    expect(read.blocks[0]).toMatchObject({
      attemptsCount: 1,
      hintsUsed: 1,
      result: { passed: true },
      answers: { checkpoint: 'no' },
    })
    await expect(
      f.learning.save(f.child, f.session.id, f.block.id, {
        revision: uuid(),
        answers: {},
        hintsUsed: 0,
        positionSeconds: null,
      }),
    ).rejects.toBeInstanceOf(LiveConflictError)
  })
  test('cada ação verifica família, perfil e prazo; prévia não grava respostas de crianças', async () => {
    const f = await setup(),
      input = { revision: f.block.revision, answers: {}, hintsUsed: 0, positionSeconds: null }
    await expect(
      f.learning.save(f.teacher, f.session.id, f.block.id, input),
    ).rejects.toBeInstanceOf(LiveAccessError)
    await expect(f.learning.read({ ...f.child, accountId: uuid() }, f.session.id)).rejects.toThrow()
    await expect(f.learning.read({ ...f.child, id: uuid() }, f.session.id)).rejects.toThrow()
    f.time('2026-11-07T16:59:59Z')
    await expect(f.learning.save(f.child, f.session.id, f.block.id, input)).rejects.toBeInstanceOf(
      LiveAccessError,
    )
    f.time('2026-12-07T17:00:00Z')
    await expect(f.learning.read(f.child, f.session.id)).rejects.toBeInstanceOf(LiveAccessError)
    expect(f.repository.learning.size).toBe(0)
  })
  test('cenas guardam comandos autoritativos, deduplicam segmentos e recusam sobrescrita concorrente', async () => {
    const f = await setup()
    const segment = {
      sessionId: uuid(),
      segmentId: uuid(),
      baseSequence: 0,
      commands: [{ type: 'create' }],
    }
    const input = {
      revision: f.scene.revision,
      answers: sceneSegmentAnswers(segment) as LearningAnswers,
      hintsUsed: 0,
      positionSeconds: null,
    }
    const first = await f.learning.save(f.child, f.session.id, f.scene.id, input)
    expect((await f.learning.save(f.child, f.session.id, f.scene.id, input)).answers).toEqual(
      first.answers,
    )
    const stale = {
      ...input,
      answers: sceneSegmentAnswers({ ...segment, segmentId: uuid() }) as LearningAnswers,
    }
    await expect(f.learning.save(f.child, f.session.id, f.scene.id, stale)).rejects.toBeInstanceOf(
      LiveConflictError,
    )
    await expect(
      f.learning.attempt(f.child, f.session.id, f.scene.id, {
        id: uuid(),
        revision: f.scene.revision,
        hintsUsed: 0,
        answers: {
          sceneSequence: 999,
          sceneSessionId: segment.sessionId,
          sceneSegmentId: segment.segmentId,
          passed: true,
        },
      }),
    ).rejects.toBeInstanceOf(LiveConflictError)
    const result = await f.learning.attempt(f.child, f.session.id, f.scene.id, {
      id: uuid(),
      revision: f.scene.revision,
      hintsUsed: 0,
      answers: { ...first.answers, sceneCheckpoint: ['forged'] },
    })
    expect(result.attempt.answers.sceneCheckpoint).toEqual(first.answers.sceneCheckpoint)
  })
  test('resposta à pergunta da cena permanece na retomada sem aceitar checkpoint forjado', async () => {
    const f = await setup({ ...html, activity: { type: 'experimentation', scene: 'world' } })
    const first = await f.learning.save(f.child, f.session.id, f.block.id, {
      revision: f.block.revision,
      answers: sceneSegmentAnswers({
        sessionId: uuid(),
        segmentId: uuid(),
        baseSequence: 0,
        commands: [{ type: 'create' }],
      }) as LearningAnswers,
      hintsUsed: 0,
      positionSeconds: null,
    })
    await f.learning.attempt(f.child, f.session.id, f.block.id, {
      id: uuid(),
      revision: f.block.revision,
      hintsUsed: 0,
      answers: { ...first.answers, checkpoint: 'yes', sceneCheckpoint: ['forged'] },
    })
    const saved = (await f.learning.read(f.child, f.session.id)).blocks[0]!
    expect(saved.answers.checkpoint).toBe('yes')
    expect(saved.answers.sceneCheckpoint).toEqual(first.answers.sceneCheckpoint)
  })
})
