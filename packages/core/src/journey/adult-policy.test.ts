import { expect, test } from 'bun:test'
import {
  type AdultJourneyPolicy,
  AdultJourneyPolicySchema,
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
