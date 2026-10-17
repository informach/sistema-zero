import { expect, mock, test } from 'bun:test'
import {
  PensaJsonObjectSchema,
  type PensaOperationStepResult,
  validatePensaPlan,
} from '@sistemazero/core/pensa'
import {
  DefinitionReplySchema,
  MissionCardsReplySchema,
  OutlineReplySchema,
  PlanningStateSchema,
  ReviewReplySchema,
} from '../src/server/pensa/contracts'
import { PensaOutputInvalid } from '../src/server/pensa/errors'
import type { completePensaJson } from '../src/server/pensa-llm'
import { pensaContext, pensaWork } from './pensa-fixtures'

mock.module('server-only', () => ({}))
const { producePensaStep, resolvePensaDefinition } = await import('../src/server/pensa/planning')

function definitionReply() {
  const definition = pensaContext().view.draft?.definition
  if (!definition) throw new Error('Missing definition')
  return DefinitionReplySchema.parse({
    title: definition.title,
    summary: definition.summary,
    playerExperience: definition.playerExperience,
    dimension: definition.dimension,
    requirements: definition.requirements.map((item, index) => ({
      key: `r${index + 1}`,
      text: item.text,
      origin: item.origin,
      category: item.category,
    })),
    removedRequirements: [],
    assetSlots: [],
    openChoices: [],
    futureIdeas: [],
    adaptations: [],
    pendingChoices: [],
  })
}

function outlineReply() {
  const titles = [
    'Prepare as ferramentas',
    'Organize a área das cartas',
    'Distribua seis pares',
    'Escolha duas cartas',
    'Deixe os pares abertos',
    'Esconda as cartas diferentes',
    'Mostre a vitória',
    'Deixe jogar novamente',
    'Experimente uma partida',
  ]
  return OutlineReplySchema.parse({
    runtimeExtensionId: 'game-2d-advanced',
    stages: [{ key: 's1', title: 'Construir o jogo' }],
    missions: titles.map((title, position) => ({
      key: `m${position + 1}`,
      stageKey: 's1',
      kind: position === 0 ? 'setup' : position === 8 ? 'playtest' : 'feature',
      destination: 'studio',
      title,
      objective: title,
      requirementKeys:
        position === 0 || position === 8
          ? []
          : [position < 3 ? 'r1' : position === 3 ? 'r2' : position < 6 ? 'r3' : 'r4'],
      dependencyKeys: position === 0 ? [] : [`m${position}`],
      assetKeys: [],
      scope: position === 8 ? 'project' : null,
      blockIds: [],
      extensionIds: ['game-2d-advanced'],
      moldaToolIds: [],
      manualIds: ['game-2d-advanced'],
    })),
  })
}

test('a reviewed, complete memory-game plan can exceed eight functional missions', async () => {
  const context = pensaContext()
  let work = pensaWork(context)
  const complete: typeof completePensaJson = async (options) => {
    let value: unknown
    if (options.schemaName === 'pensa_definition') value = definitionReply()
    else if (options.schemaName === 'pensa_outline') value = outlineReply()
    else if (options.schemaName === 'pensa_missions') {
      const request = PensaJsonObjectSchema.parse(JSON.parse(options.user))
      const data = PensaJsonObjectSchema.parse(request.data)
      const missions = OutlineReplySchema.shape.missions.parse(data.missions)
      value = MissionCardsReplySchema.parse({
        missions: missions.map((mission) => ({
          key: mission.key,
          title: mission.title,
          objective: mission.objective,
          rules: [{ key: 'behavior', text: 'Siga as regras escolhidas para esta parte do jogo.' }],
          checks: [
            { key: 'result', action: 'Experimente esta parte.', expected: mission.objective },
          ],
          recommendation: mission.kind === 'setup' ? 'Recomendo Jogo 2D Avançado.' : null,
        })),
      })
    } else
      value = ReviewReplySchema.parse({
        approved: true,
        issues: [],
        corrections: [],
        summary: 'Requisitos, regras, ordem e conferências estão coerentes.',
      })
    return options.schema.parse(value)
  }
  let result: PensaOperationStepResult | null = null
  for (let count = 0; count < 30; count++) {
    result = await producePensaStep(work, context, complete)
    if (result.type !== 'step') break
    work = { ...work, step: result.step, output: result.output }
  }
  if (result?.type !== 'draft') throw new Error('The complete reviewed draft was not produced')
  expect(result.plan.missions).toHaveLength(9)
  expect(result.plan.missions[0]?.kind).toBe('setup')
  expect(result.plan.missions.at(-1)?.kind).toBe('playtest')
  expect(result.plan.missions.map((mission) => mission.title)).toContain('Deixe jogar novamente')
  expect(
    validatePensaPlan({ ...result, capabilities: context.capabilities, team: context.view.team })
      .ok,
  ).toBe(true)
  const state = PlanningStateSchema.parse(work.output)
  expect(state.reviewed.flatMap((review) => review.missionIds)).toEqual(
    expect.arrayContaining(result.plan.missions.map((mission) => mission.id)),
  )
})

test('an old decision cannot disappear silently during a new conversation', () => {
  const context = pensaContext()
  const raw = definitionReply()
  raw.requirements.pop()
  try {
    resolvePensaDefinition(raw, context, {
      r1: context.view.draft?.definition?.requirements[0]?.id ?? '',
      r2: context.view.draft?.definition?.requirements[1]?.id ?? '',
      r3: context.view.draft?.definition?.requirements[2]?.id ?? '',
      r4: context.view.draft?.definition?.requirements[3]?.id ?? '',
    })
    throw new Error('An omitted requirement was accepted')
  } catch (cause) {
    expect(cause).toBeInstanceOf(PensaOutputInvalid)
    if (cause instanceof PensaOutputInvalid) expect(cause.reason).toContain('desapareceram')
  }
})

test('review and audit accept an empty corrections array', () => {
  expect(
    ReviewReplySchema.safeParse({
      approved: true,
      issues: [],
      corrections: [],
      summary: 'Tudo conferido.',
    }).success,
  ).toBe(true)
})
