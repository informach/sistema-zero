import { describe, expect, test } from 'bun:test'
import { giftDurationLabel } from '../src/referrals'

describe('prazo do presente em texto', () => {
  test('dias no singular e no plural', () => {
    expect(giftDurationLabel(1)).toBe('1 dia')
    expect(giftDurationLabel(7)).toBe('7 dias')
    expect(giftDurationLabel(30)).toBe('30 dias')
  })
  test('oferta vitalícia não tem prazo', () => {
    expect(giftDurationLabel(null)).toBe('sem prazo')
  })
})
