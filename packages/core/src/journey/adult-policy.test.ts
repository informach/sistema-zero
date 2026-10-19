import { expect, test } from 'bun:test'
import {
  type AdultJourneyPolicy,
  AdultJourneyPolicySchema,
  adultJourneyPosition,
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
