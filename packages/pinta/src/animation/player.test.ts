import { describe, expect, it } from 'bun:test'
import { frameIndexAt } from './player'

describe('frameIndexAt (relógio puro da prévia)', () => {
  it('8 fps = um quadro a cada 125ms', () => {
    expect(frameIndexAt(0, 8, 4, true)).toBe(0)
    expect(frameIndexAt(124, 8, 4, true)).toBe(0)
    expect(frameIndexAt(125, 8, 4, true)).toBe(1)
    expect(frameIndexAt(375, 8, 4, true)).toBe(3)
  })

  it('com loop dá a volta', () => {
    expect(frameIndexAt(500, 8, 4, true)).toBe(0)
    expect(frameIndexAt(625, 8, 4, true)).toBe(1)
  })

  it('sem loop TRAVA no último quadro', () => {
    expect(frameIndexAt(500, 8, 4, false)).toBe(3)
    expect(frameIndexAt(99999, 8, 4, false)).toBe(3)
  })

  it('entradas degeneradas não explodem', () => {
    expect(frameIndexAt(-100, 8, 4, true)).toBe(0)
    expect(frameIndexAt(100, 0, 4, true)).toBe(0) // fps clampado a 1
    expect(frameIndexAt(100, 8, 0, true)).toBe(0)
  })
})
