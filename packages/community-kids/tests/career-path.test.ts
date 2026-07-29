import { describe, expect, test } from 'bun:test'
import { buildCareerGeometry, CAREER_OFFSETS, CAREER_ROW } from '../src/lib/career-path'
import { LEVEL_ORDER } from '../src/lib/level-info'

/** Nº de segmentos de curva (comandos `C`) num path SVG. */
const segments = (d: string): number => (d.match(/C/g) ?? []).length

describe('career-path (geometria pura da fita)', () => {
  test('offsets consecutivos SEMPRE diferem (a curva serpenteia, sem sobrepor)', () => {
    for (let i = 1; i < CAREER_OFFSETS.length; i += 1) {
      expect(CAREER_OFFSETS[i]).not.toBe(CAREER_OFFSETS[i - 1])
    }
  })

  test('um ponto por nível + viewHeight proporcional às linhas', () => {
    const geo = buildCareerGeometry(LEVEL_ORDER.length, 0)
    expect(geo.points).toHaveLength(LEVEL_ORDER.length)
    expect(geo.viewHeight).toBe(LEVEL_ORDER.length * CAREER_ROW)
    // A fita completa liga os 8 nós → 7 segmentos.
    expect(segments(geo.fullPath)).toBe(LEVEL_ORDER.length - 1)
  })

  test('no começo (índice 0) nada está percorrido', () => {
    const geo = buildCareerGeometry(8, 0)
    expect(geo.traveledPath).toBe('')
    expect(geo.gradientStops).toHaveLength(0)
  })

  test('o trecho percorrido tem 1 segmento por passo até o nível atual', () => {
    const geo = buildCareerGeometry(8, 3)
    expect(segments(geo.traveledPath)).toBe(3)
    expect(geo.gradientStops).toHaveLength(4) // nós 0..3
    // As paradas do degradê apontam índices de nível em ordem.
    expect(geo.gradientStops.map((s) => s.index)).toEqual([0, 1, 2, 3])
    expect(geo.gradientStops[0]?.offset).toBe(0)
    expect(geo.gradientStops.at(-1)?.offset).toBe(1)
  })

  test('currentIndex fora do intervalo é fixado no topo', () => {
    const geo = buildCareerGeometry(8, 99)
    expect(segments(geo.traveledPath)).toBe(7)
  })
})
