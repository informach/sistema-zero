import { describe, expect, test } from 'bun:test'
import { evaluateAdvanceGate, PENSA_NEXT_STAGE } from '../../src/domain/pensa/advance'
import { isPensaArtifactContent } from '../../src/domain/pensa/artifact-content'
import { trimConversation } from '../../src/domain/pensa/conversation'
import { pensaStageSourceId } from '../../src/domain/pensa/gamification'
import type { PensaChatMessage, PensaTask } from '../../src/domain/pensa/pensa'
import {
  canCompleteTask,
  nextAvailableTask,
  taskPlanArtifactMatchesTasks,
  validateTaskPlan,
} from '../../src/domain/pensa/task-plan'

const msg = (content: string, i = 0): PensaChatMessage => ({
  role: i % 2 === 0 ? 'user' : 'assistant',
  content,
  at: '2026-07-01T12:00:00.000Z',
})

const task = (id: string, position: number, dependencies: string[] = []): PensaTask => ({
  id,
  cycleId: 'cycle',
  title: `Tarefa ${position + 1}`,
  summary: null,
  destination: 'studio',
  category: 'gameplay',
  estimatedMinutes: 20,
  position,
  dependencies,
  guide: {
    steps: [{ id: `step-${id}`, text: 'Criar', required: true }],
    criteria: [{ id: `criterion-${id}`, text: 'Funciona', required: true }],
  },
  context: {
    kind: 'studio',
    dimension: '2d',
    visualAssetIds: [],
    blockIds: [],
    blocks: [],
    mechanicDocumentIds: [],
    extensionIds: [],
  },
  progress: {
    status: 'planned',
    completedStepIds: [],
    completedCriteriaIds: [],
    outputRef: null,
    startedAt: null,
    completedAt: null,
    updatedAt: null,
  },
  revision: 1,
  supersedesTaskId: null,
  archivedAt: null,
  createdAt: new Date('2026-07-01T12:00:00.000Z'),
  updatedAt: new Date('2026-07-01T12:00:00.000Z'),
})

describe('gates da metodologia ZERO', () => {
  test('exige os cinco artefatos e um plano válido nas etapas certas', () => {
    expect(
      evaluateAdvanceGate('z', { latestArtifacts: [], taskCount: 0, taskPlanValid: true }),
    ).toEqual({
      ok: false,
      missing: ['idea'],
    })
    expect(
      evaluateAdvanceGate('z', {
        latestArtifacts: [{ type: 'idea', status: 'validated' }],
        taskCount: 0,
        taskPlanValid: true,
      }).ok,
    ).toBe(true)
    expect(
      evaluateAdvanceGate('e', {
        latestArtifacts: [{ type: 'game_design', status: 'validated' }],
        taskCount: 0,
        taskPlanValid: true,
      }).missing,
    ).toEqual(['visual_direction'])
    expect(
      evaluateAdvanceGate('r', {
        latestArtifacts: [{ type: 'task_plan', status: 'validated' }],
        taskCount: 1,
        taskPlanValid: false,
      }).missing,
    ).toEqual(['tasks'])
    expect(
      evaluateAdvanceGate('o', {
        latestArtifacts: [
          { type: 'plan_review', status: 'validated', content: { approved: false } },
        ],
        taskCount: 1,
        taskPlanValid: true,
      }).missing,
    ).toEqual(['plan_review'])
    expect(
      evaluateAdvanceGate('o', {
        latestArtifacts: [
          { type: 'plan_review', status: 'validated', content: { approved: true } },
        ],
        taskCount: 1,
        taskPlanValid: true,
      }).ok,
    ).toBe(true)
    expect(PENSA_NEXT_STAGE).toEqual({ z: 'e', e: 'r', r: 'o', o: 'done' })
  })
})

describe('contratos persistidos dos cinco artefatos', () => {
  const idea = {
    title: 'Bosque das Estrelas',
    idea: 'Uma raposa recupera estrelas',
    objective: 'Encontrar três estrelas',
    controls: ['setas'],
    victory: 'as três estrelas foram encontradas',
    defeat: 'o tempo acaba',
    dimension: '2d',
  }
  const gameDesign = {
    coreLoop: ['explorar', 'coletar'],
    scenes: [{ id: 'forest', name: 'Bosque', purpose: 'Cena principal' }],
    screens: [{ id: 'start', name: 'Início', purpose: 'Começar o jogo' }],
    camera: 'lateral fixa',
  }
  const visualDirection = {
    style: 'pixel art',
    camera: 'lateral',
    mood: 'acolhedor',
    shapeLanguage: 'formas arredondadas',
    palette: [
      { role: 'fundo', color: '#102030' },
      { role: 'herói', color: '#F0A020' },
      { role: 'ação', color: '#80E060' },
    ],
    visualRules: ['contorno escuro', 'objetivos brilhantes'],
    screens: [{ screenId: 'start', description: 'Título grande e botão jogar' }],
    assets: [
      {
        id: 'fox',
        name: 'Raposa',
        kind: 'sprite',
        appearance: 'pequena e laranja',
        animations: ['andar'],
        states: ['feliz'],
        usage: 'personagem jogável',
      },
    ],
  }
  const taskPlan = {
    taskIds: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
    generatedAt: '2026-08-04T12:00:00.000Z',
    catalog: 'studio-official',
  }
  const planReview = {
    approved: true,
    findings: [{ severity: 'info', message: 'Plano pronto', taskKey: null }],
    recommendations: [],
    auditedAt: '2026-08-04T12:00:00.000Z',
  }

  test('aceita os contratos atuais e rejeita os artefatos legados', () => {
    expect(isPensaArtifactContent('idea', idea)).toBe(true)
    expect(isPensaArtifactContent('game_design', gameDesign)).toBe(true)
    expect(isPensaArtifactContent('visual_direction', visualDirection)).toBe(true)
    expect(isPensaArtifactContent('task_plan', taskPlan)).toBe(true)
    expect(isPensaArtifactContent('plan_review', planReview)).toBe(true)
    expect(isPensaArtifactContent('idea', { idea: 'sem contrato completo' })).toBe(false)
    expect(isPensaArtifactContent('idea', { ...idea, identity: { palette: [] } })).toBe(false)
    expect(isPensaArtifactContent('task_plan', { missions: [] })).toBe(false)
  })
})

describe('plano e Cartão de Criação', () => {
  test('aceita DAG global e recusa dependência futura ou desconhecida', () => {
    expect(validateTaskPlan([task('a', 0), task('b', 1, ['a'])]).ok).toBe(true)
    expect(validateTaskPlan([task('a', 0, ['b']), task('b', 1)]).ok).toBe(false)
    expect(validateTaskPlan([task('a', 0), task('b', 1, ['missing'])]).ok).toBe(false)
  })

  test('só conclui com itens obrigatórios e output da ferramenta correta', () => {
    const current = task('a', 0)
    const completeProgress = {
      ...current.progress,
      status: 'completed' as const,
      completedStepIds: ['step-a'],
      completedCriteriaIds: ['criterion-a'],
      outputRef: { kind: 'studio_project' as const, projectId: 'studio-a' },
    }
    expect(canCompleteTask(current, completeProgress)).toBe(true)
    expect(canCompleteTask(current, { ...completeProgress, outputRef: null })).toBe(false)
    expect(
      canCompleteTask(current, {
        ...completeProgress,
        outputRef: { kind: 'pinta_asset', assetId: 'asset-a' },
      }),
    ).toBe(false)
  })

  test('calcula a próxima tarefa apenas com dependências concluídas', () => {
    const first = task('a', 0)
    const second = task('b', 1, ['a'])
    expect(nextAvailableTask([first, second])?.id).toBe('a')
    first.progress.status = 'completed'
    expect(nextAvailableTask([first, second])?.id).toBe('b')
  })

  test('o artefato do plano referencia exatamente as tarefas ativas na ordem', () => {
    const tasks = [task('a', 0), task('b', 1, ['a'])]
    expect(taskPlanArtifactMatchesTasks({ taskIds: ['a', 'b'] }, tasks)).toBe(true)
    expect(taskPlanArtifactMatchesTasks({ taskIds: ['b', 'a'] }, tasks)).toBe(false)
    expect(taskPlanArtifactMatchesTasks({ taskIds: ['a'] }, tasks)).toBe(false)
  })
})

describe('conversa e gamificação', () => {
  test('trimConversation mantém as mensagens mais recentes nos dois limites', () => {
    const messages = Array.from({ length: 100 }, (_, i) => msg(`m${i}`, i))
    const trimmed = trimConversation(messages, { maxMessages: 80, maxChars: 262_144 })
    expect(trimmed).toHaveLength(80)
    expect(trimmed[0]?.content).toBe('m20')
    expect(
      trimConversation([msg('velha'), msg('n'.repeat(50), 1)], {
        maxMessages: 80,
        maxChars: 10,
      })[0]?.content,
    ).toBe('n'.repeat(50))
  })

  test('pensaStageSourceId permanece determinístico', () => {
    const cycle = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    expect(pensaStageSourceId(cycle, 'z')).toBe('602a2a9a-fb4d-5bdb-ae91-cdc53a2e10d3')
  })
})
