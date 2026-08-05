import { describe, expect, it, mock } from 'bun:test'

mock.module('server-only', () => ({}))

const { resolveStudioTier } = await import('../src/lib/studio-tier')
const {
  availablePlannerCatalog,
  PensaCatalogDriftError,
  resolveTaskPlan,
  TaskPlanDraftSchema,
  validateVisualTaskCoverage,
  VisualDirectionArtifactSchema,
} = await import('../src/server/pensa-agents/planner-contract')
const { auditPlan } = await import('../src/routes/pensa-ai')

const guide = {
  steps: [{ id: 'step-create', text: 'Monte os blocos.', required: true }],
  criteria: [{ id: 'criterion-run', text: 'Funciona ao rodar.', required: true }],
}

describe('catálogo autoritativo do plano', () => {
  it('resolve metadados exclusivamente a partir do catálogo oficial', () => {
    const tier = resolveStudioTier('god', 'admin')
    const available = availablePlannerCatalog(tier, '2d')
    const entry =
      available.blocks.find((block) => block.extension === 'game-2d') ?? available.blocks[0]!
    const raw = TaskPlanDraftSchema.parse({
      tasks: [
        {
          key: 'movimento',
          title: 'Programar movimento',
          summary: null,
          destination: 'studio',
          category: 'gameplay',
          estimatedMinutes: 20,
          dependencies: [],
          guide,
          context: {
            kind: 'studio',
            dimension: '2d',
            visualAssetIds: [],
            blockIds: [entry.type],
            mechanicDocumentIds: entry.extension ? [entry.extension] : [],
            extensionIds: entry.extension ? [entry.extension] : [],
          },
        },
      ],
    })
    const [task] = resolveTaskPlan(raw, tier, '2d')
    expect(task?.context.kind).toBe('studio')
    if (task?.context.kind !== 'studio') throw new Error('contexto inesperado')
    expect(task.context.blocks[0]).toEqual({
      id: entry.type,
      label: entry.label,
      category: entry.category,
      subcategory: entry.subcategory,
      area: entry.area,
      extension: entry.extension,
    })
  })

  it('falha fechado para ID inventado, nível/extensão bloqueada e referência futura', () => {
    const tier = resolveStudioTier('noob', undefined)
    const draft = (blockIds: string[], dependencies: string[] = []) =>
      TaskPlanDraftSchema.parse({
        tasks: [
          {
            key: 'uma',
            title: 'Uma tarefa',
            summary: null,
            destination: 'studio',
            category: 'setup',
            estimatedMinutes: 15,
            dependencies,
            guide,
            context: {
              kind: 'studio',
              dimension: '2d',
              visualAssetIds: [],
              blockIds,
              mechanicDocumentIds: [],
              extensionIds: [],
            },
          },
        ],
      })
    expect(() => resolveTaskPlan(draft(['bloco_inventado']), tier, '2d')).toThrow(
      PensaCatalogDriftError,
    )
    expect(() => resolveTaskPlan(draft([], ['depois']), tier, '2d')).toThrow(PensaCatalogDriftError)
  })

  it('não oferece elementos 3D em um plano 2D', () => {
    const tier = resolveStudioTier('god', 'admin')
    const catalog = availablePlannerCatalog(tier, '2d')
    expect(catalog.blocks.some((block) => block.extension === 'game-3d')).toBe(false)
    expect(catalog.blocks.some((block) => block.extension === 'world-3d')).toBe(false)
    expect(catalog.documents.some((document) => document.extension.includes('3d'))).toBe(false)
  })

  it('exige exatamente um cartão por item da Bíblia Visual e manda só arte 2D ao Pinta', () => {
    const tier = resolveStudioTier('god', 'admin')
    const visual = VisualDirectionArtifactSchema.parse({
      style: 'pixel com modelos simples',
      camera: 'terceira pessoa',
      mood: 'aventura',
      shapeLanguage: 'arredondada',
      palette: [
        { role: 'herói', color: '#AA33CC' },
        { role: 'mundo', color: '#22AA66' },
        { role: 'fundo', color: '#112233' },
      ],
      visualRules: ['silhuetas claras', 'cores por função'],
      screens: [{ screenId: 'game', description: 'Jogo' }],
      assets: [
        {
          id: 'hero',
          name: 'Herói',
          kind: 'sprite',
          appearance: 'aventureira',
          animations: ['andar'],
          states: ['parada'],
          usage: 'HUD',
        },
        {
          id: 'island',
          name: 'Ilha',
          kind: 'world',
          appearance: 'flutuante',
          animations: [],
          states: [],
          usage: 'mundo do jogo',
        },
      ],
    })
    const raw = TaskPlanDraftSchema.parse({
      tasks: [
        {
          key: 'hero-art',
          title: 'Desenhar heroína',
          summary: null,
          destination: 'pinta',
          category: 'art',
          estimatedMinutes: 20,
          dependencies: [],
          guide,
          context: {
            kind: 'pinta',
            assetId: 'hero',
            artKind: 'sprite',
            style: 'pixel',
            palette: [],
            appearance: 'aventureira',
            animations: ['andar'],
            states: ['parada'],
            usage: 'HUD',
            requiresStudioUse: false,
          },
        },
        {
          key: 'island-world',
          title: 'Montar ilha',
          summary: null,
          destination: 'studio',
          category: 'scene',
          estimatedMinutes: 30,
          dependencies: ['hero-art'],
          guide,
          context: {
            kind: 'studio',
            dimension: '3d',
            visualAssetIds: ['island'],
            blockIds: [],
            mechanicDocumentIds: [],
            extensionIds: [],
          },
        },
      ],
    })
    const tasks = resolveTaskPlan(raw, tier, '3d')
    expect(() => validateVisualTaskCoverage(tasks, visual)).not.toThrow()
    expect(() => validateVisualTaskCoverage(tasks.slice(0, 1), visual)).toThrow(
      PensaCatalogDriftError,
    )
    const wrongTool = structuredClone(raw)
    if (wrongTool.tasks[0]?.context.kind === 'pinta') wrongTool.tasks[0].context.assetId = 'island'
    expect(() =>
      validateVisualTaskCoverage(resolveTaskPlan(wrongTool, tier, '3d'), visual),
    ).toThrow(PensaCatalogDriftError)
  })

  it('a etapa O detecta drift de rótulo, manual, extensão e dimensão', () => {
    const tier = resolveStudioTier('god', 'admin')
    const catalog = availablePlannerCatalog(tier, '2d')
    const entry = catalog.blocks.find((block) => block.extension)!
    const raw = TaskPlanDraftSchema.parse({
      tasks: [
        {
          key: 'official',
          title: 'Usar bloco oficial',
          summary: null,
          destination: 'studio',
          category: 'gameplay',
          estimatedMinutes: 15,
          dependencies: [],
          guide,
          context: {
            kind: 'studio',
            dimension: '2d',
            visualAssetIds: [],
            blockIds: [entry.type],
            mechanicDocumentIds: entry.extension ? [entry.extension] : [],
            extensionIds: entry.extension ? [entry.extension] : [],
          },
        },
      ],
    })
    const [resolved] = resolveTaskPlan(raw, tier, '2d')
    const task = {
      ...resolved!,
      id: 'task-1',
      position: 0,
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
    }
    const stage = {
      stage: 'o' as const,
      conversation: { messages: [], summary: null, messageCount: 0 },
      state: {},
      artifacts: [],
      tasks: [task],
      nextTaskId: 'task-1',
    }
    expect(auditPlan(stage, catalog, '2d', true).approved).toBe(true)

    const drifted = structuredClone(stage)
    if (drifted.tasks[0]?.context.kind === 'studio') {
      drifted.tasks[0].context.blocks[0]!.label = 'Rótulo inventado'
      drifted.tasks[0].context.mechanicDocumentIds = ['manual-inventado']
      drifted.tasks[0].context.extensionIds = ['extensao-inventada']
      drifted.tasks[0].context.dimension = '3d'
    }
    const review = auditPlan(drifted, catalog, '2d', true)
    expect(review.approved).toBe(false)
    expect(
      review.findings.filter((finding) => finding.severity === 'error').length,
    ).toBeGreaterThanOrEqual(4)
  })
})
