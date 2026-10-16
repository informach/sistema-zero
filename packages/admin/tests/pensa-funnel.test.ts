import { describe, expect, test } from 'bun:test'
import {
  isPensaFunnelPeriod,
  type PensaFunnelView,
  pensaFunnelAnswers,
  pensaFunnelStages,
} from '../src/lib/pensa-funnel'

const view: PensaFunnelView = {
  days: 30,
  since: '2026-09-15T00:00:00.000Z',
  games: 20,
  told: 18,
  asked: 9,
  questions: 12,
  answeredByChoice: 7,
  answeredAny: 2,
  answeredTyped: 1,
  waitingOnQuestion: 2,
  proposal: 15,
  accepted: 12,
  firstMission: 8,
  tested: 5,
  versionDone: 3,
}

describe('funil do Pensa no painel', () => {
  test('as etapas seguem a ordem da criança com a parte dos jogos e quem parou antes', () => {
    const stages = pensaFunnelStages(view)
    expect(stages.map((s) => s.key)).toEqual([
      'games',
      'told',
      'proposal',
      'accepted',
      'firstMission',
      'tested',
      'versionDone',
    ])
    expect(stages[0]).toMatchObject({ count: 20, ofGames: 100, lost: 0 })
    expect(stages[2]).toMatchObject({ count: 15, ofGames: 75, lost: 3 })
    expect(stages[6]).toMatchObject({ count: 3, ofGames: 15, lost: 2 })
  })

  test('sem jogos, nenhuma porcentagem é inventada', () => {
    const empty = pensaFunnelStages({ ...view, games: 0, told: 0, proposal: 0, accepted: 0 })
    expect(empty.every((s) => s.ofGames === null)).toBe(true)
  })

  test('as respostas dividem as perguntas e dizem quantos jogos receberam pergunta', () => {
    const answers = pensaFunnelAnswers(view)
    expect(answers.askedOfTold).toBe(50)
    expect(answers.rows.map((r) => [r.key, r.count, r.ofQuestions])).toEqual([
      ['byChoice', 7, 58],
      ['any', 2, 17],
      ['typed', 1, 8],
      ['waiting', 2, 17],
    ])
    expect(pensaFunnelAnswers({ ...view, questions: 0 }).rows[0]?.ofQuestions).toBeNull()
  })

  test('o período só aceita 7, 30 ou 90 dias', () => {
    expect([7, 30, 90].every(isPensaFunnelPeriod)).toBe(true)
    expect(isPensaFunnelPeriod(31)).toBe(false)
    expect(isPensaFunnelPeriod(Number.NaN)).toBe(false)
  })
})
