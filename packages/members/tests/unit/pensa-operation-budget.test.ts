import { describe, expect, test } from 'bun:test'
import { PENSA_LIMITS } from '@sistemazero/core/pensa'
import {
  type PensaOperationBudgetRow,
  pensaOperationRetryable,
} from '../../src/domain/pensa/operation-budget'

const REQUEST = '00000000-0000-4000-8000-000000000051'
const OPERATION = '00000000-0000-4000-8000-000000000052'

function understanding(attempts: number, extra: Partial<Record<string, number>> = {}) {
  return {
    id: OPERATION,
    kind: 'planning',
    step: 'understanding',
    status: 'failed',
    input: {
      messageRequestId: REQUEST,
      budget: {
        dialogueCalls: extra.dialogueCalls ?? attempts,
        roundCalls: extra.roundCalls ?? attempts,
        planningCalls: 0,
        helpCalls: 0,
        unitAttempts: { [`${REQUEST}:understanding:${REQUEST}`]: attempts },
      },
    },
    output: {},
  } satisfies PensaOperationBudgetRow
}

describe('nova tentativa de uma operação do Pensa', () => {
  // Incidente de 26/10/2026: a rodada gastou a 1ª tentativa e o reparo automático do worker,
  // e a tela seguia oferecendo "Tentar de novo", que a reivindicação recusava na hora.
  test('a rodada que gastou as duas tentativas não oferece nova tentativa', () => {
    expect(pensaOperationRetryable(understanding(PENSA_LIMITS.attemptsPerUnit))).toBe(false)
  })

  test('uma falha na primeira tentativa (rede, provedor) ainda pode tentar de novo', () => {
    expect(pensaOperationRetryable(understanding(1))).toBe(true)
  })

  test('o teto da conversa inteira também encerra as tentativas', () => {
    expect(
      pensaOperationRetryable(understanding(0, { dialogueCalls: PENSA_LIMITS.dialogueCalls })),
    ).toBe(false)
  })

  test('só uma operação que falhou é retomável', () => {
    expect(pensaOperationRetryable({ ...understanding(0), status: 'waiting' })).toBe(false)
  })

  test('uma parte do plano conta as tentativas da própria unidade do manifesto', () => {
    const manifest = {
      id: '00000000-0000-4000-8000-000000000053',
      units: ['outline', 'produce-0', 'audit'].map((id) => ({
        id,
        kind: id === 'outline' ? 'outline' : id === 'audit' ? 'audit' : 'produce',
        missionIds: [],
        requirementIds: [],
        maxInputBytes: PENSA_LIMITS.promptBytes,
        maxOutputTokens: PENSA_LIMITS.outputTokens,
      })),
      maxCalls: 6,
    }
    const row = (attempts: number): PensaOperationBudgetRow => ({
      id: OPERATION,
      kind: 'planning',
      step: 'missions',
      status: 'failed',
      input: {
        messageRequestId: REQUEST,
        budget: {
          dialogueCalls: 1,
          roundCalls: 1,
          planningCalls: 1 + attempts,
          helpCalls: 0,
          unitAttempts: { [`${REQUEST}:outline`]: 1, [`${REQUEST}:produce-0`]: attempts },
        },
      },
      output: { manifest, unitKey: 'produce-0' },
    })
    expect(pensaOperationRetryable(row(1))).toBe(true)
    expect(pensaOperationRetryable(row(PENSA_LIMITS.attemptsPerUnit))).toBe(false)
  })
})
