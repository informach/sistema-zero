import { describe, expect, it } from 'bun:test'
import { buildHeatmapGrid, cellTitle, intensityFor } from '../src/lib/heatmap'
import type { BestTimesView } from '../src/lib/types'

const view: BestTimesView = {
  cells: [
    { dow: 2, hour: 19, posts: 2, views: 400, likes: 40 }, // avg 200 (o melhor)
    { dow: 2, hour: 8, posts: 1, views: 90, likes: 9 }, // avg 90 (~45%)
    { dow: 5, hour: 12, posts: 3, views: 30, likes: 3 }, // avg 10 (~5%)
  ],
  totalPosts: 6,
}

describe('buildHeatmapGrid', () => {
  it('grade densa 7×24 com intensidade normalizada pelo melhor avg', () => {
    const grid = buildHeatmapGrid(view)
    expect(grid).toHaveLength(7)
    expect(grid[0]).toHaveLength(24)
    expect(grid[2]?.[19]).toMatchObject({ posts: 2, avgViews: 200, intensity: 4 })
    expect(grid[2]?.[8]).toMatchObject({ posts: 1, avgViews: 90, intensity: 2 })
    expect(grid[5]?.[12]).toMatchObject({ posts: 3, avgViews: 10, intensity: 1 })
    expect(grid[0]?.[0]).toMatchObject({ posts: 0, intensity: 0 })
  })

  it('sem células → grade toda em 0', () => {
    const grid = buildHeatmapGrid({ cells: [], totalPosts: 0 })
    expect(grid.flat().every((cell) => cell.intensity === 0)).toBe(true)
  })
})

describe('intensityFor / cellTitle', () => {
  it('post sem views ainda ganha intensidade mínima 1 (nunca some do mapa)', () => {
    expect(intensityFor(0, 0)).toBe(1)
    expect(intensityFor(100, 100)).toBe(4)
    expect(intensityFor(60, 100)).toBe(3)
  })

  it('tooltip legível em pt-BR', () => {
    const grid = buildHeatmapGrid(view)
    const cell = grid[2]?.[19]
    expect(cell && cellTitle(cell)).toBe('ter 19h · 2 posts · 400 views (200/post)')
    const empty = grid[0]?.[0]
    expect(empty && cellTitle(empty)).toBe('dom 0h · sem posts')
  })
})
