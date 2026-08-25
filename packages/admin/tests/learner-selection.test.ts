import { describe, expect, test } from 'bun:test'
import { resolveLearnerId } from '../src/lib/learner-selection'

const input = {
  accountId: 'account',
  profileIds: ['child-a', 'child-b'],
}

describe('seleção de aprendiz por plataforma', () => {
  test('preserva deep-link ou escolha manual enquanto a plataforma não muda', () => {
    expect(
      resolveLearnerId({
        ...input,
        platform: 'kids',
        selection: { platform: 'kids', learnerId: 'child-b' },
      }),
    ).toBe('child-b')
  })

  test('troca imediatamente para o padrão da nova plataforma', () => {
    expect(
      resolveLearnerId({
        ...input,
        platform: 'adult',
        selection: { platform: 'kids', learnerId: 'child-b' },
      }),
    ).toBe('account')
    expect(
      resolveLearnerId({
        ...input,
        platform: 'kids',
        selection: { platform: 'adult', learnerId: 'account' },
      }),
    ).toBe('child-a')
  })

  test('seleção inexistente degrada para o padrão válido da plataforma', () => {
    expect(
      resolveLearnerId({
        ...input,
        platform: 'kids',
        selection: { platform: 'kids', learnerId: 'missing' },
      }),
    ).toBe('child-a')
  })
})
