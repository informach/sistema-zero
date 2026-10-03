import { describe, expect, it, mock, spyOn } from 'bun:test'

mock.module('server-only', () => ({}))

process.env.JWT_HS256_SECRET ??= 'test-jwt-secret-with-32-characters'
process.env.OPENROUTER_API_KEY ??= 'test-openrouter-key'

const { buildStageZSystem } = await import('../src/server/pensa-agents/stage-z')
const { PENSA_CHILD_SAFETY_CLAUSE } = await import('../src/server/pensa-agents/safety')
const { transcriptForEvaluator } = await import('../src/server/pensa-agents/stage-z-evaluator')
const { pensaChatRateLimited, GenerateBody, createPensaAiRoutes } = await import(
  '../src/routes/pensa-ai'
)
const { ClientArtifactBody, ClientValidatableArtifactType } = await import('../src/routes/pensa')
const { auditPlan } = await import('../src/server/pensa-agents/plan-audit')
const {
  availablePlannerCatalog,
  buildTaskPlan,
  GameDesignArtifactSchema,
  IdeaArtifactSchema,
  jsonSchemaFor,
  PensaCatalogDriftError,
  PlanReviewArtifactSchema,
  resolveTaskPlan,
  stripRedundantArtFromStudioTasks,
  TaskPlanDraftSchema,
  VisualDirectionArtifactSchema,
  visualCardChecklist,
} = await import('../src/server/pensa-agents/planner-contract')
const { resolveStudioTier } = await import('../src/lib/studio-tier')

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

  it('todo schema enviado ao provider é compatível com o modo estrito', () => {
    // O modo estrito exige `required` com TODAS as chaves de cada objeto (um `.optional()`
    // no Zod vira 400 do provider em produção — caso real do pensa_task_plan_v1) e não
    // aceita `oneOf`. Este teste trava a deriva para os quatro schemas gerados por IA.
    const problems: string[] = []
    const walk = (node: unknown, path: string): void => {
      if (Array.isArray(node)) {
        for (const [index, item] of node.entries()) walk(item, `${path}[${index}]`)
        return
      }
      if (!node || typeof node !== 'object') return
      const record = node as Record<string, unknown>
      if ('oneOf' in record) problems.push(`${path}: usa oneOf (o modo estrito só aceita anyOf)`)
      if (record.properties && typeof record.properties === 'object') {
        if (record.additionalProperties !== false) {
          problems.push(`${path}: objeto sem additionalProperties:false`)
        }
        const keys = Object.keys(record.properties as Record<string, unknown>)
        const required = Array.isArray(record.required) ? (record.required as string[]) : []
        for (const key of keys) {
          if (!required.includes(key)) {
            problems.push(`${path}.${key}: fora do required (use .nullable(), não .optional())`)
          }
        }
      }
      for (const [key, value] of Object.entries(record)) walk(value, `${path}.${key}`)
    }
    for (const [name, schema] of [
      ['pensa_idea_v2', IdeaArtifactSchema],
      ['pensa_game_design_v1', GameDesignArtifactSchema],
      ['pensa_visual_direction_v1', VisualDirectionArtifactSchema],
      ['pensa_task_plan_v1', TaskPlanDraftSchema],
    ] as const) {
      walk(jsonSchemaFor(schema), name)
    }
    expect(problems).toEqual([])
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

describe('stripRedundantArtFromStudioTasks', () => {
  const visual = {
    assets: [
      { id: 'fundo_background', kind: 'background' },
      { id: 'foguete_sprite', kind: 'sprite' },
      { id: 'mundo_espacial', kind: 'world' },
      { id: 'nave_modelo', kind: 'model' },
    ],
  } as never
  const studio = (key: string, visualAssetIds: string[]) =>
    ({
      key,
      destination: 'studio',
      context: {
        kind: 'studio',
        dimension: '3d',
        visualAssetIds,
        blockIds: [],
        blocks: [],
        mechanicDocumentIds: [],
        extensionIds: [],
      },
    }) as never
  const ids = (result: unknown) =>
    (result as Array<{ context: { visualAssetIds?: string[] } }>).map(
      (task) => task.context.visualAssetIds,
    )

  it('tira o item que já tem cartão do Molda e a segunda citação do mesmo mundo', () => {
    const molda = {
      key: 'nave',
      destination: 'molda',
      context: { kind: 'molda', assetId: 'nave_modelo' },
    } as never
    const result = stripRedundantArtFromStudioTasks(
      [
        molda,
        studio('montar', ['mundo_espacial', 'nave_modelo']),
        studio('jogar', ['mundo_espacial']),
      ],
      visual,
    )
    // O mundo nasce no PRIMEIRO cartão do Estúdio que o cita; os seguintes só o usam.
    expect(ids(result)).toEqual([undefined, ['mundo_espacial'], []])
  })

  it('remove artes 2D redundantes das tarefas do Estúdio, preservando o resto', () => {
    const studioTask = {
      key: 'studio-setup',
      destination: 'studio',
      context: {
        kind: 'studio',
        dimension: '2d',
        visualAssetIds: ['fundo_background', 'mundo_espacial', 'fantasma'],
        blockIds: [],
        blocks: [],
        mechanicDocumentIds: [],
        extensionIds: [],
      },
    } as never
    const result = stripRedundantArtFromStudioTasks([studioTask], visual) as unknown as Array<{
      context: { visualAssetIds: string[] }
    }>
    // A arte 2D some (é tarefa do Pinta; citar de novo reprovava o plano
    // inteiro); asset 3D fica; id desconhecido fica p/ a validação reprovar.
    expect(result[0]?.context.visualAssetIds).toEqual(['mundo_espacial', 'fantasma'])
  })

  it('não toca tarefas do Pinta', () => {
    const pintaTask = {
      key: 'pinta-fundo',
      destination: 'pinta',
      context: { kind: 'pinta', assetId: 'fundo_background' },
    } as never
    const result = stripRedundantArtFromStudioTasks([pintaTask], visual) as unknown as Array<{
      context: { assetId: string }
    }>
    expect(result[0]?.context.assetId).toBe('fundo_background')
  })
})

// O plano 3D que chegou à criança como "A tarefa molda_tela_vitoria_background não corresponde à
// criação 3D da Bíblia Visual" (QA 02/10/2026): um fundo 2D da tela de vitória mandado ao Molda.
const guide3d = {
  steps: [{ id: 'passo', text: 'Faça a parte.', hint: null, required: true }],
  criteria: [{ id: 'pronto', text: 'Ficou pronto.', hint: null, required: true }],
}
const visual3d = VisualDirectionArtifactSchema.parse({
  style: 'Blocos coloridos.',
  camera: 'Terceira pessoa.',
  mood: 'Aventura.',
  shapeLanguage: 'Formas redondas.',
  palette: [
    { role: 'herói', color: '#22C55E' },
    { role: 'perigo', color: '#EF4444' },
    { role: 'fundo', color: '#0F172A' },
  ],
  visualRules: ['Contorno escuro', 'Perigo vermelho'],
  screens: [{ screenId: 'vitoria', description: 'Tela de vitória.' }],
  assets: [
    {
      id: 'fundo_vitoria',
      name: 'Fundo da vitória',
      kind: 'background',
      appearance: 'Céu com fogos.',
      animations: ['brilhar'],
      states: ['aceso'],
      usage: 'Tela de vitória.',
    },
    {
      id: 'heroi',
      name: 'Herói',
      kind: 'model',
      appearance: 'Robô azul.',
      animations: ['andar'],
      states: ['parado'],
      usage: 'Jogador.',
    },
    {
      id: 'grama',
      name: 'Grama',
      kind: 'material',
      appearance: 'Verde.',
      animations: [],
      states: [],
      usage: 'Chão.',
    },
    {
      id: 'ilha',
      name: 'Ilha',
      kind: 'world',
      appearance: 'Ilha flutuante.',
      animations: [],
      states: [],
      usage: 'Mundo do jogo.',
    },
  ],
})
const card3d = (key: string, context: { kind: string }, dependencies: string[] = []) => ({
  key,
  title: `Cartão ${key}`,
  summary: null,
  destination: context.kind,
  category: 'art',
  estimatedMinutes: 15,
  dependencies,
  guide: guide3d,
  context,
})
const pintaContext = (assetId: string, artKind: string) => ({
  kind: 'pinta',
  assetId,
  artKind,
  style: 'either',
  preset: null,
  palette: [],
  appearance: 'Como na Bíblia.',
  animations: [],
  states: [],
  usage: 'No jogo.',
  requiresStudioUse: true,
})
const moldaContext = (assetId: string, artKind: string) => ({
  kind: 'molda',
  assetId,
  artKind,
  appearance: 'Como na Bíblia.',
  usage: 'No jogo.',
  palette: [],
})
const plan3d = (first: ReturnType<typeof card3d>) =>
  TaskPlanDraftSchema.parse({
    tasks: [
      first,
      card3d('heroi', moldaContext('heroi', 'model')),
      card3d('grama', moldaContext('grama', 'texture')),
      card3d(
        'ilha',
        {
          kind: 'studio',
          dimension: '3d',
          visualAssetIds: ['ilha'],
          blockIds: [],
          mechanicDocumentIds: [],
          extensionIds: [],
        } as { kind: string },
        ['heroi', 'grama'],
      ),
    ],
  })
/** O cartão certo do fundo. */
const fundoNoPinta = card3d('fundo', pintaContext('fundo_vitoria', 'background'))
/** O caso do QA: o fundo 2D mandado ao Molda. */
const fundoNoMolda = card3d(
  'molda_tela_vitoria_background',
  moldaContext('fundo_vitoria', 'texture'),
)
/** Um item que não existe na Bíblia Visual: nada a arrumar, só gerar de novo. */
const itemInventado = card3d(
  'molda_tela_vitoria_background',
  moldaContext('tela_vitoria', 'texture'),
)
/**
 * Plano CERTO com um cartão inventado a mais. Sem o cartão certo do fundo, o plano reprovaria pela
 * cobertura de qualquer jeito e o teste não provaria que o item inventado é recusado.
 */
const planoComItemInventado = () =>
  TaskPlanDraftSchema.parse({ tasks: [...plan3d(fundoNoPinta).tasks, itemInventado] })

describe('o plano 3D que reprovava', () => {
  const tier = resolveStudioTier('god', 'admin')
  const build = (raw: unknown, moldaAvailable = true, switchTools = false) =>
    buildTaskPlan(raw as never, {
      visual: visual3d,
      tier,
      dimension: '3d',
      moldaAvailable,
      switchTools,
    })

  it('o pedido diz a ferramenta e o tipo de CADA item da Bíblia Visual', () => {
    const comMolda = visualCardChecklist(visual3d, true)
    expect(comMolda).toContain(
      '- fundo_vitoria (Fundo da vitória, background) → tarefa pinta com assetId "fundo_vitoria" e artKind "background"',
    )
    expect(comMolda).toContain(
      '- heroi (Herói, model) → tarefa molda com assetId "heroi" e artKind "model"',
    )
    expect(comMolda).toContain(
      '- grama (Grama, material) → tarefa molda com assetId "grama" e artKind "texture"',
    )
    expect(comMolda).toContain(
      '- ilha (Ilha, world) → uma única tarefa studio com "ilha" em visualAssetIds',
    )
    // Sem o Molda (ou num jogo 2D) modelo e material nascem no Estúdio, como a validação aceita.
    expect(visualCardChecklist(visual3d, false)).toContain(
      '- heroi (Herói, model) → uma única tarefa studio com "heroi" em visualAssetIds',
    )
  })

  it('na 1ª geração o fundo mandado ao Molda é recusado, com o cartão certo no motivo', () => {
    // Trocar de ferramenta deixaria título e guia falando do Molda num cartão do Pinta: o modelo
    // gera de novo sabendo exatamente o que errou.
    expect(() => build(plan3d(fundoNoMolda))).toThrow(
      '"fundo_vitoria" (background) deve ser uma tarefa pinta com artKind "background"',
    )
  })

  it('na 2ª geração (último recurso) ele vira cartão do Pinta, com título e guia neutros', () => {
    const molde = plan3d(fundoNoMolda)
    molde.tasks[0] = {
      ...molde.tasks[0]!,
      title: 'Modele em 3D no Molda',
      guide: {
        steps: [
          { id: 'abrir', text: 'Abra o Molda e escolha uma forma 3D.', hint: null, required: true },
        ],
        criteria: [
          { id: 'gira', text: 'O modelo gira na vitrine do Molda.', hint: null, required: true },
        ],
      },
    }
    const [fundo] = build(molde, true, true)
    expect(fundo?.destination).toBe('pinta')
    expect(fundo?.context).toMatchObject({
      kind: 'pinta',
      assetId: 'fundo_vitoria',
      artKind: 'background',
      animations: ['brilhar'],
      states: ['aceso'],
    })
    expect(fundo?.title).toBe('Desenhar Fundo da vitória')
    expect(JSON.stringify(fundo?.guide)).not.toContain('Molda')
    expect(fundo?.guide.steps[0]?.text).toContain('No Pinta, crie Fundo da vitória')
  })

  it('o tipo errado num cartão da ferramenta certa sai do inventário', () => {
    const [fundo] = build(plan3d(card3d('fundo', pintaContext('fundo_vitoria', 'sprite'))))
    expect(fundo?.context).toMatchObject({ kind: 'pinta', artKind: 'background' })
  })

  it('o modelo mandado ao Pinta vai ao Molda na 2ª geração, quando ele está liberado', () => {
    const raw = plan3d(fundoNoPinta)
    raw.tasks[1] = card3d('heroi', pintaContext('heroi', 'sprite')) as never
    expect(() => build(raw)).toThrow(PensaCatalogDriftError)
    expect(build(raw, true, true)[1]).toMatchObject({
      destination: 'molda',
      title: 'Modelar Herói',
      context: { kind: 'molda', assetId: 'heroi', artKind: 'model' },
    })
  })

  it('item que não está na Bíblia Visual continua reprovando, mesmo na 2ª geração', () => {
    // O plano tem o cartão certo de cada item: quem reprova é o cartão inventado, e o motivo o nomeia.
    expect(() => build(plan3d(fundoNoPinta))).not.toThrow()
    for (const switchTools of [false, true])
      expect(() => build(planoComItemInventado(), true, switchTools)).toThrow(
        'A tarefa molda_tela_vitoria_background usa o assetId "tela_vitoria", que não existe na Bíblia Visual',
      )
  })

  it('passo e critério com o mesmo id ganham sufixo, como o members exige', () => {
    const raw = plan3d(fundoNoPinta)
    const repetido = { id: 'a', text: 'Faça.', hint: null, required: true }
    raw.tasks[0] = {
      ...raw.tasks[0]!,
      guide: { steps: [repetido, repetido], criteria: [repetido] },
    }
    const [fundo] = build(raw)
    expect(fundo?.guide.steps.map((item) => item.id)).toEqual(['a', 'a-2'])
    expect(fundo?.guide.criteria.map((item) => item.id)).toEqual(['a-3'])
  })
})

describe('a Revisão do Plano fala com o nome que a criança vê', () => {
  const tier = resolveStudioTier('god', 'admin')
  const capabilities = { moldaAvailable: true, pintaAvailable: true, studioAvailable: true }
  // Um título comprido com um emoji justo na borda do corte.
  const longTitle = `${'a'.repeat(118)}🎮 e mais`
  const stageWith = (dependencies: string[]) => {
    const raw = TaskPlanDraftSchema.parse({
      tasks: [{ ...fundoNoPinta, title: longTitle }],
    })
    const [resolved] = resolveTaskPlan(raw, tier, '3d', true)
    return {
      stage: 'o' as const,
      conversation: { messages: [], summary: null, messageCount: 0 },
      state: {},
      artifacts: [],
      nextTaskId: null,
      tasks: [
        {
          ...resolved!,
          id: '11111111-1111-4111-8111-111111111111',
          position: 0,
          revision: 1,
          supersedesTaskId: null,
          dependencies,
          progress: {
            status: 'planned' as const,
            completedStepIds: [],
            completedCriteriaIds: [],
            outputRef: null,
            startedAt: null,
            completedAt: null,
            updatedAt: null,
          },
        },
      ],
    }
  }
  const review = (dependencies: string[]) =>
    auditPlan(
      stageWith(dependencies) as never,
      availablePlannerCatalog(tier, '3d'),
      '3d',
      true,
      visual3d,
      capabilities,
    )

  it('cita o TÍTULO do cartão e o NOME do item, nunca o id', () => {
    const messages = review(['22222222-2222-4222-8222-222222222222']).findings.map((f) => f.message)
    expect(messages.some((m) => m.endsWith('depende de um cartão que não existe mais.'))).toBe(true)
    expect(messages).toContain('"Herói" ainda não tem um Cartão de Criação.')
    for (const message of messages) {
      expect(message).not.toMatch(/fundo_vitoria|heroi|asset|metadados|auditoria|—/)
      // O corte é por caractere: nenhum emoji partido ao meio.
      expect(message).not.toMatch(/[\ud800-\udbff](?![\udc00-\udfff])/)
      expect(message.length).toBeLessThanOrEqual(500)
    }
  })

  it('separa a dependência que vem depois da que não existe mais', () => {
    const ownId = '11111111-1111-4111-8111-111111111111'
    const messages = review([ownId]).findings.map((f) => f.message)
    expect(messages.some((m) => m.endsWith('depende de um cartão que vem depois dele.'))).toBe(true)
  })
})

describe('geração de artefatos por SSE', () => {
  // A geração leva minutos; a resposta é um stream com keepalive para a borda
  // não derrubar o POST com 502 — só o PRÉ-VOO (sessão/gates/quota) segue JSON.
  const projectId = '4fa0e474-1f0d-4a52-9a6a-3f2b8c85e001'
  const cycleId = '4fa0e474-1f0d-4a52-9a6a-3f2b8c85e002'

  const idea = {
    title: 'Dino Ninja',
    idea: 'Um dinossauro pula obstáculos.',
    objective: 'Chegar ao fim da fase.',
    controls: ['setas', 'espaço'],
    victory: 'Chegar à bandeira.',
    defeat: 'Encostar em três obstáculos.',
    dimension: '2d',
  }
  const visual = {
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
  }

  const artifact = (type: string, content: unknown) => ({
    id: `${type}-1`,
    type,
    status: 'validated',
    version: 1,
    createdAt: '2026-08-01T00:00:00.000Z',
    content,
  })
  const stageView = (stage: string, extra?: Record<string, unknown>) => ({
    stage,
    conversation: { messages: [], messageCount: 0 },
    state: {},
    artifacts: [],
    tasks: [],
    nextTaskId: null,
    ...extra,
  })

  function makeRoutes(
    overrides: { members?: Record<string, unknown>; user?: unknown; completeJson?: unknown } = {},
  ) {
    const members = {
      pensaGetProject: async () => ({
        status: 200,
        body: {
          project: {
            id: projectId,
            name: 'Runo',
            cycles: [{ id: cycleId, number: 1, stage: 'o' }],
          },
        },
      }),
      aiUsageConsume: async () => ({ status: 200, body: { allowed: true } }),
      getGamification: async () => ({ status: 200, body: { level: { slug: 'god' } } }),
      getStudioUnlocksReadonly: async () => ({ status: 200, body: { blocks: [] } }),
      checkCreativeToolsAccessReadonly: async () => ({
        status: 200,
        body: { access: { pinta: true, molda: true, 'estudio-completo': true } },
      }),
      pensaSaveArtifact: async (_cycle: string, input: { type: string; content: unknown }) => ({
        status: 200,
        body: { artifact: artifact(input.type, input.content) },
      }),
      ...overrides.members,
    }
    const session = {
      getSession: async () =>
        'user' in overrides ? overrides.user : { id: 'user-1', role: 'staff' },
    }
    return createPensaAiRoutes({
      members: members as never,
      session: session as never,
      ...(overrides.completeJson ? { completeJson: overrides.completeJson as never } : {}),
    })
  }

  const post = (routes: ReturnType<typeof createPensaAiRoutes>, body: unknown) =>
    routes.pensaGenerateArtifact.POST(
      new Request('http://localhost/api/pensa/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ cycleId }) },
    )

  it('plan_review responde SSE: keepalive imediato e o corpo de sempre no evento done', async () => {
    const routes = makeRoutes({
      members: {
        pensaGetStage: async (_cycle: string, stage: string) => ({
          status: 200,
          body:
            stage === 'z'
              ? stageView('z', { artifacts: [artifact('idea', idea)] })
              : stage === 'e'
                ? stageView('e', { artifacts: [artifact('visual_direction', visual)] })
                : stageView('r'),
        }),
      },
    })
    const res = await post(routes, { type: 'plan_review', projectId, approved: false })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type') ?? '').toContain('text/event-stream')
    expect(res.headers.get('x-accel-buffering')).toBe('no')
    const text = await res.text()
    // TTFB imediato: o comentário de abertura sai ANTES de qualquer geração.
    expect(text.startsWith(': ok\n\n')).toBe(true)
    const doneBlock = text.split('\n\n').find((block) => block.startsWith('event: done')) ?? ''
    expect(doneBlock).not.toBe('')
    const dataLine = doneBlock.split('\n').find((line) => line.startsWith('data:')) ?? 'data: {}'
    const payload = JSON.parse(dataLine.slice(5).trim()) as {
      artifact?: { type?: string; content?: { approved?: boolean } }
    }
    expect(payload.artifact?.type).toBe('plan_review')
    // Plano sem tarefas reprova na auditoria — o conteúdo de sempre, agora via done.
    expect(payload.artifact?.content?.approved).toBe(false)
  })

  it('recusa de gate vira evento error dentro do stream (não um 4xx pendurado)', async () => {
    const routes = makeRoutes({
      members: {
        pensaGetProject: async () => ({
          status: 200,
          body: {
            project: {
              id: projectId,
              name: 'Runo',
              cycles: [{ id: cycleId, number: 1, stage: 'z' }],
            },
          },
        }),
        pensaGetStage: async () => ({
          status: 200,
          body: stageView('z', { state: { ready: false } }),
        }),
      },
    })
    const res = await post(routes, { type: 'idea', projectId })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type') ?? '').toContain('text/event-stream')
    const text = await res.text()
    const errorBlock = text.split('\n\n').find((block) => block.startsWith('event: error')) ?? ''
    expect(errorBlock).toContain('PENSA_GATE_NOT_READY')
    expect(errorBlock).toContain('"status":409')
    expect(text).not.toContain('event: done')
  })

  describe('plano de tarefas 3D', () => {
    /**
     * A IA de mentira: devolve um rascunho por chamada e guarda o pedido de cada uma. Uma resposta
     * que é FUNÇÃO roda antes de devolver o que ela retornar (é como o teste mexe no relógio).
     */
    const scripted = (answers: unknown[]) => {
      const prompts: string[] = []
      const calls: Array<{ maxAttempts?: number }> = []
      const completeJson = async (opts: { user: string; maxAttempts?: number }) => {
        prompts.push(opts.user)
        calls.push({ maxAttempts: opts.maxAttempts })
        const planned = answers[prompts.length - 1]
        const answer = typeof planned === 'function' ? planned() : planned
        if (answer instanceof Error) throw answer
        return answer
      }
      return { prompts, calls, completeJson }
    }
    const stagesFor3d = (ideaStatus = 'validated', bible: unknown = visual3d) => ({
      pensaGetStage: async (_cycle: string, stage: string) => ({
        status: 200,
        body:
          stage === 'z'
            ? stageView('z', {
                artifacts: [
                  { ...artifact('idea', { ...idea, dimension: '3d' }), status: ideaStatus },
                ],
              })
            : stageView('e', {
                artifacts: [
                  artifact('game_design', { coreLoop: ['explorar', 'vencer'] }),
                  artifact('visual_direction', bible),
                ],
              }),
      }),
    })
    const event = (text: string, name: string) => {
      const block = text.split('\n\n').find((item) => item.startsWith(`event: ${name}`))
      const data = block?.split('\n').find((line) => line.startsWith('data:'))
      return data ? (JSON.parse(data.slice(5).trim()) as Record<string, unknown>) : null
    }
    const generatePlan = async (
      answers: unknown[],
      options: {
        ideaStatus?: string
        bible?: unknown
        replied?: { status: number; body: unknown }
      } = {},
    ) => {
      const ai = scripted(answers)
      const saved: Array<{ destination: string; title?: string }> = []
      const routes = makeRoutes({
        completeJson: ai.completeJson,
        members: {
          ...stagesFor3d(options.ideaStatus, options.bible),
          pensaReplaceTasks: async (_cycle: string, tasks: Array<{ destination: string }>) => {
            saved.push(...tasks)
            return (
              options.replied ?? {
                status: 200,
                body: { tasks: tasks.map((task) => ({ ...task, id: crypto.randomUUID() })) },
              }
            )
          },
        },
      })
      const quiet = spyOn(console, 'error').mockImplementation(() => {})
      const quietWarn = spyOn(console, 'warn').mockImplementation(() => {})
      try {
        const text = await (await post(routes, { type: 'task_plan', projectId })).text()
        return {
          prompts: ai.prompts,
          calls: ai.calls,
          saved,
          done: event(text, 'done'),
          error: event(text, 'error'),
          logged: quiet.mock.calls.length,
        }
      } finally {
        quiet.mockRestore()
        quietWarn.mockRestore()
      }
    }

    it('o pedido leva a lista de cartões da Bíblia Visual', async () => {
      const result = await generatePlan([plan3d(fundoNoPinta)])
      expect(result.prompts).toHaveLength(1)
      expect(result.prompts[0]).toContain('CARTÕES DA BÍBLIA VISUAL')
      expect(result.prompts[0]).toContain(
        '- fundo_vitoria (Fundo da vitória, background) → tarefa pinta',
      )
      expect(result.done).not.toBeNull()
    })

    it('o fundo mandado ao Molda: a 2ª geração recebe o cartão certo e, insistindo, ele é trocado', async () => {
      const result = await generatePlan([plan3d(fundoNoMolda), plan3d(fundoNoMolda)])
      expect(result.prompts).toHaveLength(2)
      expect(result.prompts[1]).toContain(
        '"fundo_vitoria" (background) deve ser uma tarefa pinta com artKind "background"',
      )
      expect(result.done).not.toBeNull()
      expect(result.saved[0]).toMatchObject({
        destination: 'pinta',
        title: 'Desenhar Fundo da vitória',
      })
    })

    it('plano recusado gera de novo com o motivo, sem o reparo interno, e a criança recebe o segundo', async () => {
      const result = await generatePlan([planoComItemInventado(), plan3d(fundoNoPinta)])
      expect(result.prompts).toHaveLength(2)
      expect(result.prompts[1]).toContain('O PLANO ANTERIOR FOI RECUSADO')
      expect(result.prompts[1]).toContain('molda_tela_vitoria_background')
      // A 2ª geração não ganha por dentro uma 3ª chamada de reparo de JSON.
      expect(result.calls.map((call) => call.maxAttempts)).toEqual([undefined, 1])
      expect(result.error).toBeNull()
      expect(result.done).not.toBeNull()
    })

    it('se a 1ª geração demorou demais, não há 2ª: a criança recebe a frase', async () => {
      const realNow = Date.now
      let offset = 0
      const clock = spyOn(Date, 'now').mockImplementation(() => realNow() + offset)
      try {
        const result = await generatePlan([
          () => {
            offset = 200_000
            return planoComItemInventado()
          },
          plan3d(fundoNoPinta),
        ])
        expect(result.prompts).toHaveLength(1)
        expect(result.error?.code).toBe('PENSA_CATALOG_DRIFT')
      } finally {
        clock.mockRestore()
      }
    })

    it('Bíblia Visual com item repetido: nenhuma geração, e o recado diz o que refazer', async () => {
      const repetida = { ...visual3d, assets: [...visual3d.assets, visual3d.assets[0]] }
      const result = await generatePlan([plan3d(fundoNoPinta)], { bible: repetida })
      expect(result.prompts).toHaveLength(0)
      expect(result.error?.message).toBe(
        'A Bíblia Visual tem itens repetidos. Gere a Bíblia Visual de novo e aprove para seguir.',
      )
    })

    it('a recusa do servidor vira frase; a de regra passa como veio', async () => {
      const invalido = await generatePlan([plan3d(fundoNoPinta)], {
        replied: {
          status: 400,
          body: {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Passos e critérios precisam de IDs únicos no cartão.',
            },
          },
        },
      })
      expect(invalido.error).toMatchObject({
        code: 'PENSA_TASKS_NOT_SAVED',
        message:
          'O plano saiu com algumas peças fora do lugar. Tente gerar de novo que a IA monta outro.',
      })
      const sumiu = await generatePlan([plan3d(fundoNoPinta)], {
        replied: {
          status: 404,
          body: { error: { code: 'PENSA_NOT_FOUND', message: 'Recurso do Pensa não encontrado' } },
        },
      })
      expect(sumiu.error?.message).toBe('Esse plano não está mais aqui.')
      const fora = await generatePlan([plan3d(fundoNoPinta)], {
        replied: { status: 500, body: { error: { code: 'INTERNAL', message: 'Erro interno' } } },
      })
      expect(fora.error?.message).toBe(
        'Não deu para guardar agora. Espere um pouquinho e tente de novo.',
      )
      const travada = await generatePlan([plan3d(fundoNoPinta)], {
        replied: {
          status: 409,
          body: {
            error: {
              code: 'PENSA_TASK_LOCKED',
              message: 'Uma tarefa iniciada não pode ser apagada nem substituída',
            },
          },
        },
      })
      expect(travada.error).toMatchObject({
        status: 409,
        message: 'Uma tarefa iniciada não pode ser apagada nem substituída',
      })
    })

    it('duas recusas viram uma frase para a criança, sem nome interno', async () => {
      const result = await generatePlan([planoComItemInventado(), planoComItemInventado()])
      expect(result.prompts).toHaveLength(2)
      expect(result.done).toBeNull()
      expect(result.error).toMatchObject({
        status: 422,
        code: 'PENSA_CATALOG_DRIFT',
        message:
          'O plano saiu com algumas peças fora do lugar. Tente gerar de novo que a IA monta outro.',
      })
      // O motivo técnico fica no log do servidor.
      expect(result.logged).toBeGreaterThan(0)
    })

    it('erro inesperado não leva o texto técnico para a tela', async () => {
      const result = await generatePlan([new Error('Zod: tasks[3].context.assetId inválido')])
      expect(result.error?.message).toBe(
        'Não deu para criar isso agora. Espere um pouquinho e tente de novo.',
      )
      expect(JSON.stringify(result.error)).not.toContain('assetId')
    })

    it('etapa sem aprovação diz o que falta com o nome que a tela usa', async () => {
      const result = await generatePlan([], { ideaStatus: 'draft' })
      expect(result.prompts).toHaveLength(0)
      expect(result.error?.message).toBe('Aprove a Carta da Ideia antes de seguir.')
    })
  })

  it('sem sessão o pré-voo responde 401 em JSON, sem abrir stream', async () => {
    const routes = makeRoutes({ user: null })
    const res = await post(routes, { type: 'plan_review', projectId, approved: false })
    expect(res.status).toBe(401)
    expect(res.headers.get('content-type') ?? '').toContain('application/json')
    expect(await res.json()).toEqual({ error: { code: 'UNAUTHENTICATED' } })
  })
})
