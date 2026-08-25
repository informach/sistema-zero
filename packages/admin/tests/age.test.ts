import { describe, expect, test } from 'bun:test'
import { ageFrom } from '../src/lib/age'
import { relativeCivilDayLabel } from '../src/lib/format'

describe('ageFrom — idade em anos completos no dia civil SP', () => {
  // 01h UTC de 15/06 = 22h SP de 14/06 — o dia civil que vale é o de SP.
  const now = new Date('2026-06-15T01:00:00.000Z')

  test('antes e depois do aniversário no ano', () => {
    expect(ageFrom('2018-06-14', now)).toBe(8)
    // Em SP ainda é 14/06 → quem nasce 15/06 NÃO fez aniversário ainda.
    expect(ageFrom('2018-06-15', now)).toBe(7)
    expect(ageFrom('2018-12-01', now)).toBe(7)
  })

  test('ausente/lixo/absurdo → null', () => {
    expect(ageFrom(null, now)).toBeNull()
    expect(ageFrom(undefined, now)).toBeNull()
    expect(ageFrom('14/06/2018', now)).toBeNull()
    expect(ageFrom('2190-01-01', now)).toBeNull()
  })
})

describe('relativeCivilDayLabel — data civil SP direto (sem parse UTC)', () => {
  const now = new Date('2026-06-11T01:00:00.000Z') // 22h SP de 10/06

  test('hoje/ontem/há N dias pela data CIVIL (o parse UTC mentiria um dia)', () => {
    expect(relativeCivilDayLabel('2026-06-10', now)).toBe('hoje')
    expect(relativeCivilDayLabel('2026-06-09', now)).toBe('ontem')
    expect(relativeCivilDayLabel('2026-06-05', now)).toBe('há 5 dias')
    expect(relativeCivilDayLabel('2026-04-01', now)).toBe('01/04/2026')
    expect(relativeCivilDayLabel(null, now)).toBeNull()
  })
})
