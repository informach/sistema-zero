import { describe, expect, mock, test } from 'bun:test'

mock.module('server-only', () => ({}))
const { getPensaCapabilities } = await import('../src/server/pensa-capabilities')
const { availablePlannerCatalog, resolveTaskPlan, TaskPlanDraftSchema } = await import(
  '../src/server/pensa-agents/planner-contract'
)
const { resolveStudioTier } = await import('../src/lib/studio-tier')
const { auditPlan } = await import('../src/server/pensa-agents/plan-audit')
const members = {
  getStudioUnlocksReadonly: async () => ({ status: 200, body: { blocks: ['sz_html_div'] } }),
  checkCreativeToolsAccessReadonly: async () => ({
    status: 200,
    body: { access: { molda: true, pinta: true, 'estudio-completo': true } },
  }),
}
describe('capacidades reais do Pensa', () => {
  test('o catálogo limita-se aos blocos conquistados e Molda exige Explorador', async () => {
    const hacker = await getPensaCapabilities(members, 'hacker', 'customer')
    expect(hacker?.moldaAvailable).toBe(false)
    if (!hacker) throw new Error('Missing capabilities')
    expect(hacker.tier.allowBlocks).toEqual(['sz_html_div'])
    expect(availablePlannerCatalog(hacker.tier, '2d').blocks.map((block) => block.type)).toEqual([
      'sz_html_div',
    ])
    expect((await getPensaCapabilities(members, 'explorer', 'customer'))?.moldaAvailable).toBe(true)
    expect(
      await getPensaCapabilities(
        {
          ...members,
          getStudioUnlocksReadonly: async () => ({ status: 503, body: { blocks: [] } }),
        },
        'explorer',
        'customer',
      ),
    ).toBeNull()
  })
  test('o draft do Molda exige capacidade e dimensão 3D; referências ficam intactas', () => {
    const raw = TaskPlanDraftSchema.parse({
      tasks: [
        {
          key: 'rocha',
          title: 'Modelar rocha',
          summary: null,
          destination: 'molda',
          category: 'art',
          estimatedMinutes: 15,
          dependencies: [],
          guide: {
            steps: [{ id: 's', text: 'Modele', hint: null, required: true }],
            criteria: [{ id: 'c', text: 'Confira', hint: null, required: true }],
          },
          context: {
            kind: 'molda',
            assetId: 'rocha-visual',
            artKind: 'model',
            appearance: 'Azul',
            usage: 'Cenário',
            palette: [],
          },
        },
      ],
    })
    const tier = resolveStudioTier('explorer', 'customer')
    expect(() => resolveTaskPlan(raw, tier, '3d', false)).toThrow('não está disponível')
    expect(() => resolveTaskPlan(raw, tier, '2d', true)).toThrow('não está disponível')
    expect(resolveTaskPlan(raw, tier, '3d', true)[0]?.context).toMatchObject({
      kind: 'molda',
      assetId: 'rocha-visual',
      artKind: 'model',
    })
  })
  test('a aprovação revalida Pinta e Estúdio mesmo quando o catálogo ainda é compatível', async () => {
    const capabilities = await getPensaCapabilities(members, 'explorer', 'customer')
    if (!capabilities) throw new Error('Missing capabilities')
    const raw = TaskPlanDraftSchema.parse({
      tasks: [
        {
          key: 'personagem',
          title: 'Desenhar personagem',
          summary: null,
          destination: 'pinta',
          category: 'art',
          estimatedMinutes: 10,
          dependencies: [],
          guide: {
            steps: [{ id: 's', text: 'Desenhe', hint: null, required: true }],
            criteria: [{ id: 'c', text: 'Confira', hint: null, required: true }],
          },
          context: {
            kind: 'pinta',
            assetId: 'hero',
            artKind: 'sprite',
            appearance: 'Azul',
            usage: 'Personagem',
            style: 'pixel',
            preset: null,
            animations: [],
            states: [],
            requiresStudioUse: true,
            palette: [],
          },
        },
        {
          key: 'jogo',
          title: 'Montar jogo',
          summary: null,
          destination: 'studio',
          category: 'gameplay',
          estimatedMinutes: 10,
          dependencies: ['personagem'],
          guide: {
            steps: [{ id: 's', text: 'Crie', hint: null, required: true }],
            criteria: [{ id: 'c', text: 'Teste', hint: null, required: true }],
          },
          context: {
            kind: 'studio',
            dimension: '2d',
            visualAssetIds: [],
            blockIds: [],
            mechanicDocumentIds: [],
            extensionIds: [],
          },
        },
      ],
    })
    const tasks = resolveTaskPlan(raw, capabilities.tier, '2d').map((task, position) => ({
      ...task,
      id: task.key,
      position,
      revision: 1,
      supersedesTaskId: null,
      progress: {
        status: 'planned' as const,
        completedStepIds: [],
        completedCriteriaIds: [],
        outputRef: null,
        startedAt: null,
        completedAt: null,
        updatedAt: null,
      },
    }))
    const stage = {
      stage: 'o' as const,
      conversation: { messages: [], summary: null, messageCount: 0 },
      state: {},
      artifacts: [],
      tasks,
      nextTaskId: tasks[0]?.id ?? null,
    }
    const catalog = availablePlannerCatalog(capabilities.tier, '2d')
    expect(auditPlan(stage, catalog, '2d', true, undefined, capabilities).approved).toBe(true)
    for (const unavailable of [
      { ...capabilities, pintaAvailable: false },
      { ...capabilities, studioAvailable: false },
    ]) {
      const review = auditPlan(stage, catalog, '2d', true, undefined, unavailable)
      expect(review.approved).toBe(false)
      expect(review.findings.some((finding) => finding.severity === 'error')).toBe(true)
    }
  })
})
