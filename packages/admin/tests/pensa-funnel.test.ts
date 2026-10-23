import { describe, expect, test } from 'bun:test'
import {
  isPensaFunnelPeriod,
  type PensaFunnelView,
  pensaFunnelStages,
} from '../src/lib/pensa-funnel'

const view: PensaFunnelView = {
  days: 30,
  since: '2026-09-16T00:00:00.000Z',
  projects: 20,
  definitionStarted: 20,
  draftReady: 15,
  planAccepted: 12,
  setupCompleted: 10,
  firstMissionCompleted: 8,
  constructionCompleted: 5,
  projectCompleted: 3,
  pendingChoices: 2,
  adaptationsAccepted: 4,
}
describe('funil do Pensa funcional', () => {
  test('mostra o plano completo até o projeto conferido, sem confundir instalação com funcionalidade', () => {
    const stages = pensaFunnelStages(view)
    expect(stages.map((stage) => stage.key)).toEqual([
      'projects',
      'definitionStarted',
      'draftReady',
      'planAccepted',
      'firstMissionCompleted',
      'constructionCompleted',
      'projectCompleted',
    ])
    expect(stages[2]).toMatchObject({ count: 15, ofProjects: 75, lost: 5 })
    expect(stages[6]).toMatchObject({ count: 3, ofProjects: 15, lost: 2 })
  })
  test('sem projetos, não inventa porcentagens', () => {
    expect(
      pensaFunnelStages({ ...view, projects: 0 }).every((stage) => stage.ofProjects === null),
    ).toBe(true)
  })
  test('o período só aceita 7, 30 ou 90 dias', () => {
    expect([7, 30, 90].every(isPensaFunnelPeriod)).toBe(true)
    expect([31, Number.NaN, '30', undefined].some(isPensaFunnelPeriod)).toBe(false)
  })
})
