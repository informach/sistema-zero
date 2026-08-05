import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { CreatePensaProjectService } from '../../src/application/pensa/create-project.service'
import { GetPensaStageService } from '../../src/application/pensa/get-stage.service'
import { GetPensaTaskHandoffService } from '../../src/application/pensa/get-task-handoff.service'
import {
  type ReplacePensaTaskInput,
  ReplacePensaTasksService,
} from '../../src/application/pensa/replace-tasks.service'
import { SavePensaArtifactService } from '../../src/application/pensa/save-artifact.service'
import { UpdatePensaTaskService } from '../../src/application/pensa/update-task.service'
import { UpdatePensaTaskProgressService } from '../../src/application/pensa/update-task-progress.service'
import { ValidatePensaArtifactService } from '../../src/application/pensa/validate-artifact.service'
import { InMemoryPensaRepository } from '../fakes/pensa-in-memory'

const USER = '11111111-1111-1111-1111-111111111111'
const OTHER = '22222222-2222-2222-2222-222222222222'
const ACCOUNT = '33333333-3333-3333-3333-333333333333'

const guide = {
  steps: [{ id: 'step-create', text: 'Criar o resultado', required: true }],
  criteria: [{ id: 'criterion-ready', text: 'Está pronto no jogo', required: true }],
}

const studioTask = (key: string, dependencies: string[] = []): ReplacePensaTaskInput => ({
  key,
  title: `Tarefa ${key}`,
  destination: 'studio',
  category: 'gameplay',
  estimatedMinutes: 20,
  dependencies,
  guide,
  context: {
    kind: 'studio',
    dimension: '2d',
    visualAssetIds: [],
    blockIds: [],
    blocks: [],
    mechanicDocumentIds: [],
    extensionIds: [],
  },
})

function buildServices() {
  const repo = new InMemoryPensaRepository()
  let tick = 0
  const now = () => new Date(Date.parse('2026-07-01T12:00:00.000Z') + tick++)
  return {
    repo,
    create: new CreatePensaProjectService(repo, () => randomUUID(), now),
    replace: new ReplacePensaTasksService(repo, () => randomUUID(), now),
    progress: new UpdatePensaTaskProgressService(repo, now),
    update: new UpdatePensaTaskService(repo, () => randomUUID(), now),
    handoff: new GetPensaTaskHandoffService(repo),
    stage: new GetPensaStageService(repo),
    saveArtifact: new SavePensaArtifactService(repo, () => randomUUID(), now),
    validateArtifact: new ValidatePensaArtifactService(repo, now),
  }
}

const studioProjectId = (projectId: string) => `pensa-${projectId.replace(/-/g, '')}`

describe('Pensa planejador — aplicação', () => {
  test('cria exclusivamente um plano de jogo sem ambiente ou projeto do Estúdio', async () => {
    const s = buildServices()
    const project = await s.create.execute(USER, ACCOUNT, 'kids', { name: '  Nave Zero  ' })
    expect(project).toMatchObject({ name: 'Nave Zero', status: 'active' })
    expect(project.currentCycle).toMatchObject({ number: 1, stage: 'z' })
    expect(project).not.toHaveProperty('buildEnv')
    expect(project).not.toHaveProperty('studioProjectId')
    expect(project).not.toHaveProperty('studioSnapshotAt')
  })

  test('resolve dependências do lote e calcula a próxima tarefa', async () => {
    const s = buildServices()
    const project = await s.create.execute(USER, ACCOUNT, 'kids', { name: 'Nave Zero' })
    const tasks = await s.replace.execute(USER, 'kids', project.currentCycle.id, [
      studioTask('primeira'),
      studioTask('segunda', ['primeira']),
    ])
    expect(tasks[1]?.dependencies).toEqual([tasks[0]!.id])
    const view = await s.stage.execute(USER, 'kids', project.currentCycle.id, 'z')
    expect(view.nextTaskId).toBe(tasks[0]!.id)
  })

  test('não permite salvar nem validar artefatos fora da etapa atual', async () => {
    const s = buildServices()
    const project = await s.create.execute(USER, ACCOUNT, 'kids', { name: 'Nave Zero' })
    const cycleId = project.currentCycle.id

    await expect(
      s.saveArtifact.execute(USER, 'kids', cycleId, {
        stage: 'e',
        type: 'game_design',
        content: {
          loop: ['Explorar', 'Coletar'],
          scenes: [{ id: 'scene-1', name: 'Bosque', purpose: 'Começo' }],
          screens: [{ id: 'screen-1', name: 'Jogo', purpose: 'Jogar' }],
        },
      }),
    ).rejects.toMatchObject({ code: 'PENSA_STAGE_MISMATCH' })

    s.repo.artifacts.push({
      id: randomUUID(),
      cycleId,
      stage: 'e',
      type: 'game_design',
      version: 1,
      content: {
        loop: ['Explorar', 'Coletar'],
        scenes: [{ id: 'scene-1', name: 'Bosque', purpose: 'Começo' }],
        screens: [{ id: 'screen-1', name: 'Jogo', purpose: 'Jogar' }],
      },
      status: 'draft',
      createdAt: new Date('2026-07-01T11:00:00.000Z'),
    })
    await expect(
      s.validateArtifact.execute(USER, 'kids', cycleId, 'game_design'),
    ).rejects.toMatchObject({
      code: 'PENSA_STAGE_MISMATCH',
    })
  })

  test('bloqueia dependência, valida progresso e exige resultado vinculado', async () => {
    const s = buildServices()
    const project = await s.create.execute(USER, ACCOUNT, 'kids', { name: 'Nave Zero' })
    const tasks = await s.replace.execute(USER, 'kids', project.currentCycle.id, [
      studioTask('primeira'),
      studioTask('segunda', ['primeira']),
    ])
    const first = tasks[0]!
    const second = tasks[1]!
    await expect(
      s.progress.execute(USER, 'kids', second.id, { status: 'in_progress' }),
    ).rejects.toMatchObject({
      code: 'PENSA_TASK_DEPENDENCY_PENDING',
    })
    await s.progress.execute(USER, 'kids', first.id, { status: 'in_progress' })
    await expect(
      s.progress.execute(USER, 'kids', first.id, {
        outputRef: { kind: 'pinta_asset', assetId: 'arte-errada' },
      }),
    ).rejects.toMatchObject({ code: 'PENSA_TASK_TRANSITION_INVALID' })
    await expect(
      s.progress.execute(USER, 'kids', first.id, {
        outputRef: { kind: 'studio_project', projectId: 'projeto-forjado' },
      }),
    ).rejects.toMatchObject({ code: 'PENSA_TASK_TRANSITION_INVALID' })
    await expect(
      s.progress.execute(USER, 'kids', first.id, { status: 'completed' }),
    ).rejects.toMatchObject({
      code: 'PENSA_TASK_TRANSITION_INVALID',
    })
    await s.progress.execute(USER, 'kids', first.id, {
      status: 'completed',
      completedStepIds: ['step-create'],
      completedCriteriaIds: ['criterion-ready'],
      outputRef: { kind: 'studio_project', projectId: studioProjectId(project.id) },
    })
    expect(
      (await s.progress.execute(USER, 'kids', second.id, { status: 'in_progress' })).progress
        .status,
    ).toBe('in_progress')
  })

  test('tarefa iniciada gera revisão; a original fica arquivada e imutável', async () => {
    const s = buildServices()
    const project = await s.create.execute(USER, ACCOUNT, 'kids', { name: 'Nave Zero' })
    const [created] = await s.replace.execute(USER, 'kids', project.currentCycle.id, [
      studioTask('uma'),
    ])
    await s.progress.execute(USER, 'kids', created!.id, { status: 'in_progress' })
    const revised = await s.update.execute(USER, 'kids', created!.id, { title: 'Tarefa revisada' })
    expect(revised).toMatchObject({
      title: 'Tarefa revisada',
      revision: 2,
      supersedesTaskId: created!.id,
    })
    expect(s.repo.tasks.get(created!.id)?.archivedAt).not.toBeNull()
    expect(revised.progress.status).toBe('planned')
  })

  test('editar tarefa não iniciada após aprovação reabre O e invalida a revisão', async () => {
    const s = buildServices()
    const project = await s.create.execute(USER, ACCOUNT, 'kids', { name: 'Nave Zero' })
    const cycleId = project.currentCycle.id
    const [created] = await s.replace.execute(USER, 'kids', cycleId, [studioTask('uma')])
    const storedCycle = s.repo.cycles.get(cycleId)!
    s.repo.cycles.set(cycleId, {
      ...storedCycle,
      stage: 'done',
      oCompletedAt: new Date('2026-07-01T11:00:00.000Z'),
    })
    const priorReviewId = randomUUID()
    const latestReviewId = randomUUID()
    s.repo.artifacts.push(
      {
        id: priorReviewId,
        cycleId,
        stage: 'o',
        type: 'plan_review',
        version: 1,
        content: { approved: true },
        status: 'validated',
        createdAt: new Date('2026-06-30T11:00:00.000Z'),
      },
      {
        id: latestReviewId,
        cycleId,
        stage: 'o',
        type: 'plan_review',
        version: 2,
        content: { approved: true },
        status: 'validated',
        createdAt: new Date('2026-07-01T11:00:00.000Z'),
      },
    )

    const updated = await s.update.execute(USER, 'kids', created!.id, {
      title: 'Tarefa mais clara',
    })
    expect(updated).toMatchObject({ id: created!.id, title: 'Tarefa mais clara', revision: 1 })
    expect(s.repo.cycles.get(cycleId)).toMatchObject({ stage: 'o', oCompletedAt: null })
    expect(s.repo.artifacts.find((artifact) => artifact.id === latestReviewId)?.status).toBe(
      'draft',
    )
    expect(s.repo.artifacts.find((artifact) => artifact.id === priorReviewId)?.status).toBe(
      'validated',
    )
  })

  test('editar uma tarefa durante O invalida imediatamente a auditoria já aprovada', async () => {
    const s = buildServices()
    const project = await s.create.execute(USER, ACCOUNT, 'kids', { name: 'Nave Zero' })
    const cycleId = project.currentCycle.id
    const [created] = await s.replace.execute(USER, 'kids', cycleId, [studioTask('uma')])
    const storedCycle = s.repo.cycles.get(cycleId)!
    s.repo.cycles.set(cycleId, { ...storedCycle, stage: 'o' })
    s.repo.artifacts.push({
      id: randomUUID(),
      cycleId,
      stage: 'o',
      type: 'plan_review',
      version: 1,
      content: { approved: true },
      status: 'validated',
      createdAt: new Date('2026-07-01T11:00:00.000Z'),
    })

    await s.update.execute(USER, 'kids', created!.id, { title: 'Tarefa alterada em O' })

    expect(s.repo.cycles.get(cycleId)?.stage).toBe('o')
    expect(s.repo.artifacts.find((artifact) => artifact.type === 'plan_review')?.status).toBe(
      'draft',
    )
  })

  test('revisar uma dependência refaz em cascata os cartões posteriores já iniciados', async () => {
    const s = buildServices()
    const project = await s.create.execute(USER, ACCOUNT, 'kids', { name: 'Nave Zero' })
    const [first, second] = await s.replace.execute(USER, 'kids', project.currentCycle.id, [
      studioTask('primeira'),
      studioTask('segunda', ['primeira']),
    ])
    await s.progress.execute(USER, 'kids', first!.id, { status: 'in_progress' })
    await s.progress.execute(USER, 'kids', first!.id, {
      status: 'completed',
      completedStepIds: ['step-create'],
      completedCriteriaIds: ['criterion-ready'],
      outputRef: { kind: 'studio_project', projectId: studioProjectId(project.id) },
    })
    await s.progress.execute(USER, 'kids', second!.id, { status: 'in_progress' })

    const revisedFirst = await s.update.execute(USER, 'kids', first!.id, {
      title: 'Primeira refeita',
    })
    const active = await s.repo.listTasks(project.currentCycle.id)
    const revisedSecond = active.find((task) => task.supersedesTaskId === second!.id)

    expect(revisedSecond).toBeDefined()
    expect(revisedSecond?.progress.status).toBe('planned')
    expect(revisedSecond?.dependencies).toEqual([revisedFirst.id])
    expect(s.repo.tasks.get(second!.id)?.archivedAt).not.toBeNull()
  })

  test('qualquer edição mantém o artefato task_plan alinhado às tarefas ativas', async () => {
    const s = buildServices()
    const project = await s.create.execute(USER, ACCOUNT, 'kids', { name: 'Nave Zero' })
    const cycleId = project.currentCycle.id
    const [created] = await s.replace.execute(USER, 'kids', cycleId, [studioTask('uma')])
    s.repo.artifacts.push({
      id: randomUUID(),
      cycleId,
      stage: 'r',
      type: 'task_plan',
      version: 1,
      content: {
        taskIds: [created!.id],
        generatedAt: '2026-07-01T11:00:00.000Z',
        catalog: 'studio-official',
      },
      status: 'validated',
      createdAt: new Date('2026-07-01T11:00:00.000Z'),
    })

    const revised = await s.update.execute(USER, 'kids', created!.id, {
      title: 'Nova definição',
    })
    const latest = await s.repo.findLatestArtifact(cycleId, 'task_plan')

    expect(latest?.version).toBe(2)
    expect(latest?.content).toMatchObject({ taskIds: [revised.id], catalog: 'studio-official' })
  })

  test('rejeita progresso baseado em uma versão já alterada por outro dispositivo', async () => {
    const s = buildServices()
    const project = await s.create.execute(USER, ACCOUNT, 'kids', { name: 'Nave Zero' })
    const [created] = await s.replace.execute(USER, 'kids', project.currentCycle.id, [
      studioTask('uma'),
    ])
    const started = await s.progress.execute(USER, 'kids', created!.id, { status: 'in_progress' })
    const staleVersion = started.progress.updatedAt

    await s.progress.execute(USER, 'kids', created!.id, {
      completedStepIds: ['step-create'],
      expectedUpdatedAt: staleVersion,
    } as Parameters<typeof s.progress.execute>[3])

    await expect(
      s.progress.execute(USER, 'kids', created!.id, {
        completedCriteriaIds: ['criterion-ready'],
        expectedUpdatedAt: staleVersion,
      } as Parameters<typeof s.progress.execute>[3]),
    ).rejects.toMatchObject({ code: 'PENSA_TASK_PROGRESS_CONFLICT' })
  })

  test('handoff aplica ownership sem revelar a tarefa de outra criança', async () => {
    const s = buildServices()
    const project = await s.create.execute(USER, ACCOUNT, 'kids', { name: 'Nave Zero' })
    const [created] = await s.replace.execute(USER, 'kids', project.currentCycle.id, [
      studioTask('uma'),
    ])
    expect((await s.handoff.execute(USER, 'kids', created!.id)).project.name).toBe('Nave Zero')
    await expect(s.handoff.execute(OTHER, 'kids', created!.id)).rejects.toMatchObject({
      code: 'PENSA_NOT_FOUND',
    })
  })

  test('arte do Pinta exige uso bem-sucedido no Estúdio quando o cartão pede isso', async () => {
    const s = buildServices()
    const project = await s.create.execute(USER, ACCOUNT, 'kids', { name: 'Nave Zero' })
    const [created] = await s.replace.execute(USER, 'kids', project.currentCycle.id, [
      {
        key: 'sprite',
        title: 'Sprite da nave',
        destination: 'pinta',
        category: 'art',
        estimatedMinutes: 25,
        guide,
        context: {
          kind: 'pinta',
          assetId: 'nave',
          artKind: 'sprite',
          style: 'pixel',
          palette: [{ role: 'cor principal', color: '#4f46e5' }],
          appearance: 'Nave triangular amigável',
          animations: ['voando'],
          states: ['normal'],
          usage: 'Personagem do jogador',
          requiresStudioUse: true,
        },
      },
    ])
    await s.progress.execute(USER, 'kids', created!.id, { status: 'in_progress' })
    const base = {
      status: 'completed' as const,
      completedStepIds: ['step-create'],
      completedCriteriaIds: ['criterion-ready'],
    }
    await expect(
      s.progress.execute(USER, 'kids', created!.id, {
        ...base,
        outputRef: { kind: 'pinta_asset', assetId: 'asset-a' },
      }),
    ).rejects.toMatchObject({ code: 'PENSA_TASK_TRANSITION_INVALID' })
    expect(
      (
        await s.progress.execute(USER, 'kids', created!.id, {
          ...base,
          outputRef: {
            kind: 'pinta_asset',
            assetId: 'asset-a',
            usedInStudioAt: '2026-07-01T12:00:00.000Z',
          },
        })
      ).progress.status,
    ).toBe('completed')
  })
})
