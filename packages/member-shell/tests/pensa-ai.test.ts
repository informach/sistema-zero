import { describe, expect, it, mock } from 'bun:test'

mock.module('server-only', () => ({}))

const { buildStageZSystem } = await import('../src/server/pensa-agents/stage-z')
const { PENSA_CHILD_SAFETY_CLAUSE } = await import('../src/server/pensa-agents/safety')
const { transcriptForEvaluator } = await import('../src/server/pensa-agents/stage-z-evaluator')
const { pensaChatRateLimited, GenerateBody } = await import('../src/routes/pensa-ai')
const { ClientArtifactBody, ClientValidatableArtifactType } = await import('../src/routes/pensa')
const {
  GameDesignArtifactSchema,
  IdeaArtifactSchema,
  PlanReviewArtifactSchema,
  VisualDirectionArtifactSchema,
} = await import('../src/server/pensa-agents/planner-contract')

describe('etapa Z do planejador', () => {
  const base = { mode: 'kids' as const, projectName: 'Dino Ninja', cycleNumber: 1 }

  it('mantém segurança infantil e as cinco decisões do novo ZERO', () => {
    const system = buildStageZSystem(base)
    expect(system).toContain(PENSA_CHILD_SAFETY_CLAUSE)
    expect(system).toContain('IDEIA')
    expect(system).toContain('OBJETIVO')
    expect(system).toContain('CONTROLES')
    expect(system).toContain('RESULTADO')
    expect(system).toContain('DIMENSÃO')
    expect(system).toContain('SUGESTÕES:')
  })

  it('foca somente nas decisões que ainda faltam', () => {
    const system = buildStageZSystem({
      ...base,
      state: {
        answered: {
          idea: true,
          objective: true,
          controls: false,
          outcome: false,
          dimension: false,
        },
        ready: false,
      },
    })
    expect(system).toContain('Falta clarear: CONTROLES, VITÓRIA E DERROTA, 2D OU 3D')
  })

  it('transcript preserva resumo e identifica os papéis', () => {
    const transcript = transcriptForEvaluator(
      [{ role: 'user', content: 'quero um jogo de\npular', at: '' }],
      'A criança escolheu um dinossauro.',
    )
    expect(transcript).toContain('RESUMO das mensagens antigas')
    expect(transcript).toContain('CRIANÇA: quero um jogo de pular')
  })
})

describe('contratos dos cinco artefatos', () => {
  it('aceita os shapes executáveis e rejeita campos legados', () => {
    expect(
      IdeaArtifactSchema.safeParse({
        title: 'Dino Ninja',
        idea: 'Um dinossauro pula obstáculos.',
        objective: 'Chegar ao fim da fase.',
        controls: ['setas', 'espaço'],
        victory: 'Chegar à bandeira.',
        defeat: 'Encostar em três obstáculos.',
        dimension: '2d',
      }).success,
    ).toBe(true)
    expect(
      GameDesignArtifactSchema.safeParse({
        coreLoop: ['mover', 'pular', 'chegar ao fim'],
        scenes: [{ id: 'fase-1', name: 'Fase 1', purpose: 'Ensinar o pulo.' }],
        screens: [{ id: 'inicio', name: 'Início', purpose: 'Começar o jogo.' }],
        camera: 'Lateral fixa.',
      }).success,
    ).toBe(true)
    expect(
      VisualDirectionArtifactSchema.safeParse({
        style: 'Pixel art simples.',
        camera: 'Lateral.',
        mood: 'Aventura alegre.',
        shapeLanguage: 'Formas arredondadas para amigos e pontas para perigos.',
        palette: [
          { role: 'herói', color: '#22C55E' },
          { role: 'perigo', color: '#EF4444' },
          { role: 'fundo', color: '#0F172A' },
        ],
        visualRules: ['Contorno escuro', 'Perigos sempre vermelhos'],
        screens: [{ screenId: 'inicio', description: 'Título grande e botão.' }],
        assets: [
          {
            id: 'hero',
            name: 'Dinossauro',
            kind: 'sprite',
            appearance: 'Verde e arredondado.',
            animations: ['correndo'],
            states: ['normal'],
            usage: 'Personagem do jogador.',
          },
        ],
      }).success,
    ).toBe(true)
    expect(
      PlanReviewArtifactSchema.safeParse({
        approved: true,
        findings: [],
        recommendations: [],
        auditedAt: '2026-08-04T12:00:00.000Z',
      }).success,
    ).toBe(true)
    expect(IdeaArtifactSchema.safeParse({ who: 'crianças', problem: 'tédio' }).success).toBe(false)
  })
})

describe('GenerateBody', () => {
  const projectId = '4fa0e474-1f0d-4a52-9a6a-3f2b8c85e001'
  it('aceita somente os cinco artefatos atuais', () => {
    for (const body of [
      { type: 'idea', projectId },
      { type: 'game_design', projectId },
      { type: 'visual_direction', projectId },
      { type: 'task_plan', projectId },
      { type: 'plan_review', projectId, approved: true },
    ])
      expect(GenerateBody.safeParse(body).success).toBe(true)
    expect(GenerateBody.safeParse({ type: 'mission_plan', projectId }).success).toBe(false)
    expect(GenerateBody.safeParse({ type: 'task_plan', projectId, append: true }).success).toBe(
      false,
    )
    expect(GenerateBody.safeParse({ type: 'checklist_seed', projectId }).success).toBe(false)
  })
})

describe('fronteira pública dos artefatos', () => {
  it('não permite que o navegador fabrique task_plan ou plan_review', () => {
    expect(
      ClientArtifactBody.safeParse({
        stage: 'o',
        type: 'plan_review',
        content: { approved: true },
      }).success,
    ).toBe(false)
    expect(
      ClientArtifactBody.safeParse({
        stage: 'r',
        type: 'task_plan',
        content: { taskIds: [] },
      }).success,
    ).toBe(false)
    expect(ClientValidatableArtifactType.safeParse('plan_review').success).toBe(false)
    expect(ClientValidatableArtifactType.safeParse('task_plan').success).toBe(true)
  })
})

describe('rate limit do chat', () => {
  it('libera dez mensagens por minuto e bloqueia a décima primeira', () => {
    const key = `pensa-${Math.random()}`
    const now = 1_700_000_000_000
    for (let index = 0; index < 10; index += 1) expect(pensaChatRateLimited(key, now)).toBe(false)
    expect(pensaChatRateLimited(key, now)).toBe(true)
    expect(pensaChatRateLimited(key, now + 61_000)).toBe(false)
  })
})
