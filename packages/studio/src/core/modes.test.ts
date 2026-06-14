import { describe, expect, it } from 'bun:test'
import { modesForKind, normalizeClassicMode } from './modes'

describe('modesForKind', () => {
  it('básico (classic/ausente) = Blocos + Ponte; pro = Código', () => {
    expect(modesForKind(undefined)).toEqual(['blocks', 'bridge'])
    expect(modesForKind('classic')).toEqual(['blocks', 'bridge'])
    expect(modesForKind('pro')).toEqual(['code'])
  })
})

describe('normalizeClassicMode', () => {
  it('mantém blocks/bridge, manda code legado para bridge, resto vira blocks', () => {
    expect(normalizeClassicMode('blocks')).toBe('blocks')
    expect(normalizeClassicMode('bridge')).toBe('bridge')
    expect(normalizeClassicMode('code')).toBe('bridge')
    expect(normalizeClassicMode('xxx')).toBe('blocks')
    expect(normalizeClassicMode(undefined)).toBe('blocks')
  })
})
