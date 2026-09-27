import { describe, expect, test } from 'bun:test'
import { buildJourneyGeometry, JOURNEY_OFFSETS, JOURNEY_ROW } from '../src/lib/journey-path'
import { LEVEL_ORDER } from '../src/lib/level-info'

/** Nº de segmentos de curva (comandos `C`) num path SVG. */
const segments = (d: string): number => (d.match(/C/g) ?? []).length

describe('journey-path (geometria pura da fita)', () => {
  test('offsets consecutivos SEMPRE diferem (a curva serpenteia, sem sobrepor)', () => {
    for (let i = 1; i < JOURNEY_OFFSETS.length; i += 1) {
      expect(JOURNEY_OFFSETS[i]).not.toBe(JOURNEY_OFFSETS[i - 1])
    }
  })

  test('um ponto por nível + viewHeight proporcional às linhas', () => {
    const geo = buildJourneyGeometry(LEVEL_ORDER.length, 0)
    expect(geo.points).toHaveLength(LEVEL_ORDER.length)
    expect(geo.viewHeight).toBe(LEVEL_ORDER.length * JOURNEY_ROW)
    // A fita completa liga os 8 nós → 7 segmentos.
    expect(segments(geo.fullPath)).toBe(LEVEL_ORDER.length - 1)
  })

  test('no começo (índice 0) nada está percorrido', () => {
    const geo = buildJourneyGeometry(8, 0)
    expect(geo.traveledPath).toBe('')
    expect(geo.gradientStops).toHaveLength(0)
  })

  test('o trecho percorrido tem 1 segmento por passo até o nível atual', () => {
    const geo = buildJourneyGeometry(8, 3)
    expect(segments(geo.traveledPath)).toBe(3)
    expect(geo.gradientStops).toHaveLength(4) // nós 0..3
    // As paradas do degradê apontam índices de nível em ordem.
    expect(geo.gradientStops.map((s) => s.index)).toEqual([0, 1, 2, 3])
    expect(geo.gradientStops[0]?.offset).toBe(0)
    expect(geo.gradientStops.at(-1)?.offset).toBe(1)
  })

  test('currentIndex fora do intervalo é fixado no topo', () => {
    const geo = buildJourneyGeometry(8, 99)
    expect(segments(geo.traveledPath)).toBe(7)
  })
})
