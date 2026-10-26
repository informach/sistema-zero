import { expect, mock, test } from 'bun:test'
import {
  type PensaGameDefinition,
  PensaJsonObjectSchema,
  type PensaOperationStepResult,
  PensaProjectRevisionSchema,
  validatePensaPlan,
} from '@sistemazero/core/pensa'
import { SERVER_BLOCK_CATALOG } from '@sistemazero/studio/server-catalog'
import { SERVER_MECHANIC_DOCUMENTS } from '@sistemazero/studio/server-knowledge'
import type { PensaContext } from '../src/server/pensa/context'
import {
  type DefinitionReply,
  DefinitionReplySchema,
  MissionCardsReplySchema,
  type OutlineReply,
  OutlineReplySchema,
} from '../src/server/pensa/contracts'
import type { completePensaJson } from '../src/server/pensa-llm'
import {
  PENSA_ACTOR,
  PENSA_DATE,
  pensaContext,
  pensaDefinition,
  pensaId,
  pensaWork,
} from './pensa-fixtures'

mock.module('server-only', () => ({}))
const { producePensaStep } = await import('../src/server/pensa/planning')

function rawDefinition(definition: PensaGameDefinition): DefinitionReply {
  return DefinitionReplySchema.parse({
    title: definition.title,
    summary: definition.summary,
    playerExperience: definition.playerExperience,
    dimension: definition.dimension,
    requirements: definition.requirements.map((item, index) => ({
      key: `r${index + 1}`,
      text: item.text,
      category: item.category,
      origin: 'child',
    })),
    assetSlots: [],
    removedRequirements: [],
    openChoices: [],
    futureIdeas: [],
    adaptations: [],
    pendingChoices: [],
  })
}
function scenario(
  dimension: '2d' | '3d',
  title: string,
  requirements: string[],
  runtime = 'game-2d-advanced',
) {
  const context = pensaContext()
  const definition: PensaGameDefinition = {
    title,
    originalIntent: title,
    summary: title,
    playerExperience: title,
    dimension,
    requirements: requirements.map((text, index) => ({
      id: pensaId(10 + index),
      text,
      category: 'gameplay',
      origin: 'child',
    })),
    assetSlots: [],
    adaptations: [],
    openChoices: [],
    futureIdeas: [],
  }
  if (!context.view.draft) throw new Error('Missing draft')
  context.view.draft.definition = definition
  const programmer = context.capabilities.participants[0]
  if (!programmer) throw new Error('Missing programmer')
  programmer.dimensions = [dimension]
  programmer.extensionIds = [runtime]
  programmer.blockIds = SERVER_BLOCK_CATALOG.filter(
    (block) => !block.extension || block.extension === runtime,
  ).map((block) => block.type)
  context.blocks = SERVER_BLOCK_CATALOG.filter((block) => programmer.blockIds.includes(block.type))
  context.documents = SERVER_MECHANIC_DOCUMENTS.filter((doc) => doc.extension === runtime)
  context.references = [{ kind: 'manual', id: runtime, title: runtime, href: null }]
  return { context, definition }
}
function outline(
  runtime: string,
  titles: string[],
  requirements: string[],
  phases: number[] = titles.map(() => 0),
): OutlineReply {
  return OutlineReplySchema.parse({
    runtimeExtensionId: runtime,
    stages: [...new Set(phases)].map((phase) => ({
      key: `s${phase + 1}`,
      title: `Etapa ${phase + 1}`,
    })),
    missions: titles.map((title, index) => ({
      key: `m${index + 1}`,
      stageKey: `s${(phases[index] ?? 0) + 1}`,
      title,
      objective: title,
      destination: 'studio',
      kind: index === 0 ? 'setup' : index === titles.length - 1 ? 'playtest' : 'feature',
      requirementKeys:
        index === 0 || index === titles.length - 1
          ? []
          : [requirements[Math.min(index - 1, requirements.length - 1)]],
      dependencyKeys: index ? [`m${index}`] : [],
      assetKeys: [],
      scope: index === titles.length - 1 ? 'project' : null,
      blockIds: [],
      extensionIds: [runtime],
      moldaToolIds: [],
      manualIds: [runtime],
    })),
  })
}
async function run(context: PensaContext, definition: DefinitionReply, plan: OutlineReply) {
  let work = pensaWork(context)
  const requests: Array<{ name: string; data: Record<string, unknown> }> = []
  const complete: typeof completePensaJson = async (options) => {
    const request = PensaJsonObjectSchema.parse(JSON.parse(options.user))
    const data = PensaJsonObjectSchema.parse(request.data)
    requests.push({ name: options.schemaName ?? '', data })
    const value =
      options.schemaName === 'pensa_definition'
        ? definition
        : options.schemaName === 'pensa_outline'
          ? plan
          : options.schemaName === 'pensa_missions'
            ? {
                missions: OutlineReplySchema.shape.missions.parse(data.missions).map((mission) =>
                  MissionCardsReplySchema.shape.missions.element.parse({
                    key: mission.key,
                    title: mission.title,
                    objective: mission.objective,
                    rules: [],
                    checks: [
                      {
                        key: 'works',
                        action: 'Experimente esta parte do jogo.',
                        expected: mission.objective,
                      },
                    ],
                    recommendation:
                      mission.kind === 'setup'
                        ? 'Use a extensão recomendada para este jogo.'
                        : null,
                  }),
                ),
              }
            : {
                approved: true,
                issues: [],
                corrections: [],
                summary: 'Cobertura, ordem, recursos e critérios conferidos.',
              }
    return options.schema.parse(value)
  }
  let result: PensaOperationStepResult
  for (let attempt = 0; attempt < 30; attempt++) {
    result = await producePensaStep(work, context, complete)
    if (result.type !== 'step') return { result, requests }
    work = { ...work, step: result.step, output: result.output }
  }
  throw new Error('Planning did not finish')
}

test('a platform game covers its phases and final playtest in logical order', async () => {
  const { context, definition } = scenario('2d', 'Atravessar duas fases de plataformas', [
    'Mover e pular nas plataformas.',
    'Avançar para a segunda fase pela saída.',
    'Perder a tentativa ao cair e começar de novo.',
  ])
  const plan = outline(
    'game-2d-advanced',
    [
      'Prepare o jogo',
      'Crie a primeira fase',
      'Deixe o personagem pular',
      'Crie a segunda fase',
      'Ligue a saída à próxima aula',
      'Recomece depois da queda',
      'Experimente as duas fases',
    ],
    ['r1', 'r1', 'r2', 'r2', 'r3'],
    [0, 0, 0, 1, 1, 1, 2],
  )
  const { result } = await run(context, rawDefinition(definition), plan)
  if (result.type !== 'draft') throw new Error('Missing draft')
  expect(result.plan.stages).toHaveLength(3)
  expect(result.plan.missions.at(-1)).toMatchObject({ kind: 'playtest', scope: 'project' })
  expect(
    validatePensaPlan({ ...result, capabilities: context.capabilities, team: context.view.team })
      .ok,
  ).toBe(true)
})

test('free 3D exploration remains complete without invented victory or enemies', async () => {
  const { context, definition } = scenario(
    '3d',
    'Explorar livremente uma ilha em 3D',
    [
      'Andar por uma ilha com árvores e caminhos.',
      'Olhar em volta e explorar sem pontos nem vitória.',
    ],
    'world-3d',
  )
  const { result } = await run(
    context,
    rawDefinition(definition),
    outline(
      'world-3d',
      [
        'Prepare o mundo',
        'Crie os caminhos da ilha',
        'Deixe explorar e olhar em volta',
        'Explore a ilha inteira',
      ],
      ['r1', 'r2'],
    ),
  )
  if (result.type !== 'draft') throw new Error('Missing draft')
  expect(result.definition.dimension).toBe('3d')
  expect(result.plan.missions.map((mission) => mission.title).join(' ')).not.toMatch(
    /vencer|inimigo|vitória/i,
  )
  expect(
    validatePensaPlan({ ...result, capabilities: context.capabilities, team: context.view.team })
      .ok,
  ).toBe(true)
})

test('a 3D limitation asks for the proposed 2D adaptation without inventing an acceptance', async () => {
  const { context, definition } = scenario('3d', 'Explorar uma ilha 3D', [
    'Explorar caminhos de uma ilha.',
  ])
  const raw = rawDefinition(definition)
  raw.dimension = '2d'
  raw.adaptations = [
    {
      key: 'adapt1',
      originalIntent: definition.originalIntent,
      limitation: 'O jogo 3D ainda não está disponível.',
      alternative: 'Uma ilha vista de cima em 2D.',
      preserved: 'Explorar os caminhos e lugares da ilha.',
    },
  ]
  raw.pendingChoices = [
    {
      key: 'adapt1',
      kind: 'adaptation',
      question: 'Podemos fazer sua ilha vista de cima?',
      options: [
        {
          key: 'yes',
          label: 'Fazer em 2D',
          description: 'Manter a exploração com a visão de cima.',
        },
        {
          key: 'change',
          label: 'Mudar a ideia',
          description: 'Conversar sobre outra forma de explorar.',
        },
      ],
    },
  ]
  const result = await producePensaStep(pensaWork(context), context, async (options) =>
    options.schema.parse(raw),
  )
  expect(result.type).toBe('question')
  if (result.type !== 'question') throw new Error('Expected explicit choice')
  expect(result.definition.originalIntent).toBe(definition.originalIntent)
  expect(result.definition.adaptations[0]).toMatchObject({
    acceptedAt: null,
    acceptedByProfileId: null,
  })
  expect(result.pendingChoices[0]?.kind).toBe('adaptation')
})

test('replanning keeps mission identities, original intent and unchanged content revisions', async () => {
  const { context, definition } = scenario('2d', 'Percorrer um labirinto', [
    'Percorrer o caminho até a saída.',
  ])
  const plan = outline(
    'game-2d-advanced',
    ['Prepare o jogo', 'Crie os caminhos', 'Experimente o labirinto'],
    ['r1'],
  )
  const first = await run(context, rawDefinition(definition), plan)
  if (first.result.type !== 'draft') throw new Error('Missing first draft')
  const previous = first.result
  context.view.revision = PensaProjectRevisionSchema.parse({
    id: pensaId(80),
    projectId: context.view.project.id,
    number: 1,
    previousRevisionId: null,
    acceptedByProfileId: PENSA_ACTOR.profileId,
    acceptedAt: PENSA_DATE,
    definition: previous.definition,
    plan: previous.plan,
    technical: previous.technical,
  })
  context.view.draft = null
  plan.missions[1]!.objective = 'Crie caminhos com duas saídas diferentes.'
  const second = await run(context, rawDefinition(previous.definition), plan)
  if (second.result.type !== 'draft') throw new Error('Missing second draft')
  expect(second.result.definition.originalIntent).toBe(previous.definition.originalIntent)
  expect(second.result.plan.missions.map((mission) => mission.id)).toEqual(
    previous.plan.missions.map((mission) => mission.id),
  )
  expect(second.result.plan.missions[0]?.contentRevision).toBe(1)
  expect(second.result.plan.missions[1]?.contentRevision).toBe(2)
  const previousPlan = second.requests.find((request) => request.name === 'pensa_outline')?.data
    .previousPlan
  expect(JSON.stringify(previousPlan)).toContain('"key":"m1"')
  expect(JSON.stringify(previousPlan)).not.toContain(previous.plan.missions[0]?.id ?? 'absent')
})

test('an invented runtime is rejected before any mission cards are produced', async () => {
  const { context, definition } = scenario('2d', 'Percorrer um labirinto', ['Chegar à saída.'])
  await expect(
    run(
      context,
      rawDefinition(definition),
      outline('invented-extension', ['Prepare o jogo', 'Crie caminhos', 'Confira o jogo'], ['r1']),
    ),
  ).rejects.toThrow('Não consegui organizar')
})

/**
 * Incidente de 26/10/2026 (staging, Kids): depois que a criança escolhe um desenho seu num
 * cartão, a rodada seguinte da conversa recebia a arte escolhida sem a chave do inventário e
 * a resposta fiel ao que recebeu era recusada ("A criação existente … não corresponde"), nas
 * duas tentativas da unidade. O modelo daqui devolve EXATAMENTE o que a definição anterior
 * lhe mostra.
 */
test('a drawing chosen from the inventory survives the next round of the conversation', async () => {
  const context = pensaContext()
  const draft = context.view.draft
  if (!draft?.definition) throw new Error('Missing draft')
  const chosen = {
    tool: 'pinta' as const,
    profileId: PENSA_ACTOR.profileId,
    creationId: 'cesto-plastico-1',
    saveRevision: '3',
    contentFingerprint: null,
  }
  context.inventory = [
    {
      name: 'cesto-palha',
      kind: 'sprite',
      creation: { ...chosen, creationId: 'cesto-palha-1', saveRevision: '1' },
    },
    // A criança mexeu no desenho no Pinta entre uma rodada e outra.
    { name: 'cesto-plastico', kind: 'sprite', creation: { ...chosen, saveRevision: '4' } },
  ]
  draft.definition.assetSlots = [
    {
      id: pensaId(40),
      name: 'Cesta',
      kind: 'sprite',
      description: 'A cesta que pega as folhas.',
      source: 'existing',
      existing: chosen,
    },
  ]
  const complete: typeof completePensaJson = async (options) => {
    const request = PensaJsonObjectSchema.parse(JSON.parse(options.user))
    const previous = PensaJsonObjectSchema.parse(PensaJsonObjectSchema.parse(request.data).previous)
    const slots = PensaJsonObjectSchema.array().parse(previous.assetSlots)
    return options.schema.parse({
      ...rawDefinition(pensaDefinition()),
      // Sem a chave na definição anterior, o modelo fiel não tem de onde tirá-la.
      assetSlots: slots.map(({ key, name, kind, description, source, existingInventoryKey }) => ({
        key,
        name,
        kind,
        description,
        source,
        existingInventoryKey: existingInventoryKey ?? null,
      })),
    })
  }
  const result = await producePensaStep(
    { ...pensaWork(context), input: { message: 'Lugares fixos' } },
    context,
    complete,
  )
  if (result.type !== 'step') throw new Error('Expected the definition to be accepted')
  const definition = PensaJsonObjectSchema.parse(result.output).definition
  expect(definition).toMatchObject({
    assetSlots: [
      { id: pensaId(40), source: 'existing', existing: { ...chosen, saveRevision: '4' } },
    ],
  })
})

test('a chosen drawing that left the inventory is shown without an invented key', async () => {
  const context = pensaContext()
  const draft = context.view.draft
  if (!draft?.definition) throw new Error('Missing draft')
  draft.definition.assetSlots = [
    {
      id: pensaId(40),
      name: 'Cesta',
      kind: 'sprite',
      description: 'A cesta que pega as folhas.',
      source: 'existing',
      existing: {
        tool: 'pinta',
        profileId: PENSA_ACTOR.profileId,
        creationId: 'apagado',
        saveRevision: '1',
        contentFingerprint: null,
      },
    },
  ]
  let shown: unknown
  await producePensaStep(pensaWork(context), context, async (options) => {
    shown = PensaJsonObjectSchema.parse(JSON.parse(options.user)).data
    return options.schema.parse(rawDefinition(pensaDefinition()))
  })
  expect(JSON.stringify(shown)).toContain('"existingInventoryKey":null')
  expect(JSON.stringify(shown)).not.toContain('apagado')
})
