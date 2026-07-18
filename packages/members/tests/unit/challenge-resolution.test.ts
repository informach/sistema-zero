import { describe, expect, test } from 'bun:test'
import {
  challengeForMonth,
  customChallengeSlug,
  isPastMonthKey,
  monthKeyFromMonth,
  monthKeysFrom,
  resolveChallengeTheme,
} from '../../src/domain/gamification/challenges'

const CUSTOM = {
  id: 'aaaabbbb-cccc-4ddd-8eee-ffff00001111',
  emoji: '🎄',
  title: 'Natal dos criadores',
  description: 'Crie um jogo natalino.',
}

describe('resolveChallengeTheme (override → fallback sorteio)', () => {
  test('sem override → byte a byte o sorteio determinístico', () => {
    const { theme, source } = resolveChallengeTheme('m:2026-07', null)
    expect(source).toBe('sorteio')
    expect(theme).toEqual(challengeForMonth('m:2026-07'))
  })

  test('override builtin válido → tema definido do catálogo', () => {
    const { theme, source } = resolveChallengeTheme('m:2026-07', {
      builtinSlug: 'neve',
      customTheme: null,
    })
    expect(source).toBe('definido')
    expect(theme.slug).toBe('neve')
    expect(theme.title).toBe('Mundo de gelo')
  })

  test('builtin desconhecido (sumiu do catálogo) → cai DEFENSIVAMENTE no sorteio', () => {
    const { theme, source } = resolveChallengeTheme('m:2026-07', {
      builtinSlug: 'tema-que-nao-existe',
      customTheme: null,
    })
    expect(source).toBe('sorteio')
    expect(theme).toEqual(challengeForMonth('m:2026-07'))
  })

  test('override custom → tema da biblioteca com slug derivado', () => {
    const { theme, source } = resolveChallengeTheme('m:2026-12', {
      builtinSlug: null,
      customTheme: CUSTOM,
    })
    expect(source).toBe('definido')
    expect(theme.slug).toBe('custom-aaaabbbb')
    expect(theme.title).toBe('Natal dos criadores')
  })

  test('custom vence mesmo com builtinSlug residual (não deveria coexistir, mas o custom manda)', () => {
    const { theme } = resolveChallengeTheme('m:2026-12', {
      builtinSlug: 'neve',
      customTheme: CUSTOM,
    })
    expect(theme.title).toBe('Natal dos criadores')
  })
})

describe('aritmética de meses (chave m:YYYY-MM em SP)', () => {
  test('monthKeysFrom: 12 chaves a partir do mês corrente', () => {
    const keys = monthKeysFrom(new Date('2026-06-02T12:00:00.000Z'), 12)
    expect(keys).toHaveLength(12)
    expect(keys[0]).toBe('m:2026-06')
    expect(keys[6]).toBe('m:2026-12')
    expect(keys[7]).toBe('m:2027-01') // virada de ano
    expect(keys[11]).toBe('m:2027-05')
  })

  test('monthKeysFrom respeita o fuso de SP na fronteira do mês', () => {
    // 01/07 às 01:00 UTC ainda é 30/06 22:00 em SP → mês corrente = junho.
    const keys = monthKeysFrom(new Date('2026-07-01T01:00:00.000Z'), 2)
    expect(keys[0]).toBe('m:2026-06')
    expect(keys[1]).toBe('m:2026-07')
  })

  test('monthKeyFromMonth e customChallengeSlug', () => {
    expect(monthKeyFromMonth('2026-08')).toBe('m:2026-08')
    expect(customChallengeSlug('12345678-aaaa-bbbb-cccc-dddddddddddd')).toBe('custom-12345678')
  })

  test('isPastMonthKey: passado true, corrente e futuro false', () => {
    const now = new Date('2026-06-02T12:00:00.000Z')
    expect(isPastMonthKey('m:2026-05', now)).toBe(true)
    expect(isPastMonthKey('m:2025-12', now)).toBe(true)
    expect(isPastMonthKey('m:2026-06', now)).toBe(false)
    expect(isPastMonthKey('m:2026-07', now)).toBe(false)
  })
})
