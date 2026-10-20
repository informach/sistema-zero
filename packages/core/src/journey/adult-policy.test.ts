import { expect, test } from 'bun:test'
import {
  type AdultJourneyPolicy,
  AdultJourneyPolicySchema,
  adultJourneyPosition,
  normalizeAdultJourneyFloor,
  projectAdultJourney,
} from './adult-policy'

const first = '11111111-1111-4111-8111-111111111111'
const advanced = '22222222-2222-4222-8222-222222222222'
const policy: AdultJourneyPolicy = {
  schemaVersion: 1,
  stages: [
    {
      id: 'primeiro-jogo',
      title: 'Primeiro jogo',
      requirements: [{ courseId: first, milestone: 'complete' }],
      capabilities: ['studio', 'pinta'],
    },
    {
      id: 'avancado',
      title: 'Avançado',
      requirements: [{ courseId: advanced, milestone: 'showcase' }],
      capabilities: ['pro', 'ai', 'pensa'],
    },
  ],
}
test('curso avançado não pula etapa anterior; publicar sozinho não substitui conclusão', () => {
  expect(
    projectAdultJourney(policy, 1, [{ courseId: advanced, completed: true, showcased: true }])
      .capabilities,
  ).toEqual([])
  const milestones = [
    { courseId: first, completed: true, showcased: false },
    { courseId: advanced, completed: false, showcased: true },
  ]
  expect(projectAdultJourney(policy, 1, milestones).capabilities).toEqual(['studio', 'pinta'])
  milestones[1]!.completed = true
  expect(projectAdultJourney(policy, 1, milestones).capabilities).toEqual([
    'studio',
    'pinta',
    'pro',
    'ai',
    'pensa',
  ])
})
test('mudança de política não retira capacidade já concedida e não copia posições Kids', () => {
  expect(
    projectAdultJourney({ schemaVersion: 1, stages: [] }, 2, [], ['studio']).capabilities,
  ).toEqual(['studio'])
  const stages = Array.from({ length: 60 }, (_, index) => ({
    ...policy.stages[0]!,
    id: `etapa-${index}`,
  }))
  expect(AdultJourneyPolicySchema.safeParse({ schemaVersion: 1, stages }).success).toBe(true)
  expect(
    AdultJourneyPolicySchema.safeParse({
      schemaVersion: 1,
      stages: [policy.stages[0], policy.stages[0]],
    }).success,
  ).toBe(false)
})

test('a etapa traz os cursos que pede e o que libera, sem expor o objeto da política', () => {
  const view = projectAdultJourney(policy, 1, [])
  expect(view.stages[0]?.requirements).toEqual([{ courseId: first, milestone: 'complete' }])
  expect(view.stages[0]?.capabilities).toEqual(['studio', 'pinta'])
  expect(view.stages[1]?.capabilities).toEqual(['pro', 'ai', 'pensa'])
  view.stages[0]?.requirements.push({ courseId: advanced, milestone: 'complete' })
  view.stages[0]?.capabilities.push('molda')
  expect(policy.stages[0]?.requirements).toHaveLength(1)
  expect(policy.stages[0]?.capabilities).toEqual(['studio', 'pinta'])
})

test('a posição é a primeira etapa não concluída, e quem terminou tudo fica na última', () => {
  expect(adultJourneyPosition(null)).toBeNull()
  expect(
    adultJourneyPosition(projectAdultJourney({ schemaVersion: 1, stages: [] }, 1, [])),
  ).toBeNull()
  expect(adultJourneyPosition(projectAdultJourney(policy, 1, []))).toEqual({
    position: 1,
    total: 3,
    stageId: 'primeiro-jogo',
    title: 'Primeiro jogo',
  })
  const firstDone = [{ courseId: first, completed: true, showcased: false }]
  expect(adultJourneyPosition(projectAdultJourney(policy, 1, firstDone))).toEqual({
    position: 2,
    total: 3,
    stageId: 'avancado',
    title: 'Avançado',
  })
  const allDone = [...firstDone, { courseId: advanced, completed: true, showcased: true }]
  expect(adultJourneyPosition(projectAdultJourney(policy, 1, allDone))).toEqual({
    position: 3,
    total: 3,
    stageId: null,
    title: null,
  })
  // Uma etapa posterior feita antes da anterior não pula a pessoa para frente.
  const onlyAdvanced = [{ courseId: advanced, completed: true, showcased: true }]
  expect(adultJourneyPosition(projectAdultJourney(policy, 1, onlyAdvanced))?.position).toBe(1)
})

test('o piso da posição não volta quando a política ganha curso numa etapa já concluída', () => {
  const extra = '33333333-3333-4333-8333-333333333333'
  const firstDone = [{ courseId: first, completed: true, showcased: false }]
  const reached = adultJourneyPosition(projectAdultJourney(policy, 1, firstDone))?.position
  expect(reached).toBe(2)
  const edited: AdultJourneyPolicy = {
    ...policy,
    stages: [
      {
        ...policy.stages[0]!,
        requirements: [
          ...policy.stages[0]!.requirements,
          { courseId: extra, milestone: 'complete' },
        ],
      },
      policy.stages[1]!,
    ],
  }
  // Sem piso a pessoa voltaria para a etapa 1.
  expect(adultJourneyPosition(projectAdultJourney(edited, 2, firstDone))?.position).toBe(1)
  const floored = projectAdultJourney(edited, 2, firstDone, ['studio', 'pinta'], reached)
  expect(adultJourneyPosition(floored)?.position).toBe(2)
  expect(floored.stages[0]).toMatchObject({ completed: true, available: true, missing: [] })
  expect(floored.stages[1]).toMatchObject({ completed: false, available: true })
  expect(floored.capabilities).toEqual(['studio', 'pinta'])
  // A conclusão visual seguinte não concede capacidades enquanto faltar requisito anterior.
  const advancedDone = [...firstDone, { courseId: advanced, completed: true, showcased: true }]
  const next = projectAdultJourney(edited, 2, advancedDone, ['studio', 'pinta'], reached)
  expect(adultJourneyPosition(next)?.position).toBe(3)
  expect(next.capabilities).toEqual(['studio', 'pinta'])
  const allDone = [...advancedDone, { courseId: extra, completed: true, showcased: false }]
  expect(
    projectAdultJourney(edited, 2, allDone, ['studio', 'pinta'], reached).capabilities,
  ).toEqual(['studio', 'pinta', 'pro', 'ai', 'pensa'])
})

test('piso visual não substitui requisito avançado anterior para novas capacidades', () => {
  const edited: AdultJourneyPolicy = {
    schemaVersion: 1,
    stages: [
      {
        id: 'novo-avancado',
        title: 'Novo avançado',
        requirements: [{ courseId: advanced, milestone: 'showcase' }],
        capabilities: ['molda'],
      },
      {
        id: 'primeiro-jogo',
        title: 'Primeiro jogo',
        requirements: [{ courseId: first, milestone: 'complete' }],
        capabilities: ['studio', 'ai', 'pensa'],
      },
    ],
  }
  const firstDone = [{ courseId: first, completed: true, showcased: false }]
  const withoutFloor = projectAdultJourney(edited, 2, firstDone, ['studio'])
  expect(withoutFloor.capabilities).toEqual(['studio'])
  expect(adultJourneyPosition(withoutFloor)?.position).toBe(1)
  for (const reached of [2, 3, 9]) {
    const floored = projectAdultJourney(edited, 2, firstDone, ['studio'], reached)
    expect(floored.capabilities).toEqual(['studio'])
    expect(floored.stages.map(({ completed, available }) => ({ completed, available }))).toEqual([
      { completed: true, available: true },
      { completed: true, available: true },
    ])
    expect(adultJourneyPosition(floored)?.position).toBe(3)
    const missingShowcase = [
      ...firstDone,
      { courseId: advanced, completed: true, showcased: false },
    ]
    expect(
      projectAdultJourney(edited, 2, missingShowcase, ['studio'], reached).capabilities,
    ).toEqual(['studio'])
    expect(
      projectAdultJourney(
        edited,
        2,
        [...firstDone, { courseId: advanced, completed: true, showcased: true }],
        ['studio'],
        reached,
      ).capabilities,
    ).toEqual(['studio', 'molda', 'ai', 'pensa'])
    // Conquistas anteriores permanecem mesmo se a nova política tiver requisitos pendentes.
    expect(
      projectAdultJourney(edited, 2, firstDone, ['studio', 'ai', 'pensa'], reached).capabilities,
    ).toEqual(['studio', 'ai', 'pensa'])
  }
})

test('o piso não concede capacidade, vale o maior entre calculada e piso e respeita o total', () => {
  // Etapa nova inserida abaixo do piso aparece concluída, mas não libera a ferramenta dela.
  const inserted: AdultJourneyPolicy = {
    ...policy,
    stages: [
      {
        id: 'nova',
        title: 'Nova',
        requirements: [{ courseId: '44444444-4444-4444-8444-444444444444', milestone: 'complete' }],
        capabilities: ['molda'],
      },
      ...policy.stages,
    ],
  }
  const view = projectAdultJourney(inserted, 3, [], [], 2)
  expect(view.stages[0]?.completed).toBe(true)
  expect(view.capabilities).toEqual([])
  expect(adultJourneyPosition(view)?.position).toBe(2)
  // Calculada acima do piso: vence a calculada.
  const allDone = [
    { courseId: first, completed: true, showcased: false },
    { courseId: advanced, completed: true, showcased: true },
  ]
  expect(adultJourneyPosition(projectAdultJourney(policy, 1, allDone, [], 2))?.position).toBe(3)
  // Piso acima do total (etapas removidas): fica na última posição.
  expect(adultJourneyPosition(projectAdultJourney(policy, 1, [], [], 9))).toEqual({
    position: 3,
    total: 3,
    stageId: null,
    title: null,
  })
  // Piso inválido é ignorado.
  for (const floor of [null, 0, -3, 1.5, Number.NaN])
    expect(adultJourneyPosition(projectAdultJourney(policy, 1, [], [], floor))?.position).toBe(1)
  expect(normalizeAdultJourneyFloor(4)).toBe(4)
  expect(normalizeAdultJourneyFloor(undefined)).toBe(1)
})
