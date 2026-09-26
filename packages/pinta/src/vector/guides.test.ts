import { describe, expect, it } from 'bun:test'
import {
  addGuide,
  clampGuidePos,
  guideAt,
  MAX_GUIDES,
  moveGuide,
  removeGuide,
  type StageGuide,
} from './guides'

describe('guias do palco (sessão, só visuais)', () => {
  it('a posição vira inteiro e fica dentro do documento', () => {
    expect(clampGuidePos(12.6, 64)).toBe(13)
    expect(clampGuidePos(-4, 64)).toBe(0)
    expect(clampGuidePos(99, 64)).toBe(64)
    expect(clampGuidePos(Number.NaN, 64)).toBe(0)
  })

  it('adiciona com id próprio e respeita o teto devolvendo o MESMO array', () => {
    let guides: readonly StageGuide[] = []
    for (let i = 0; i < MAX_GUIDES; i += 1) guides = addGuide(guides, 'x', i, 64)
    expect(guides.length).toBe(MAX_GUIDES)
    expect(new Set(guides.map((guide) => guide.id)).size).toBe(MAX_GUIDES)
    const cheio = addGuide(guides, 'y', 10, 64)
    expect(cheio).toBe(guides)
  })

  it('mover e apagar são imutáveis e não mexem à toa', () => {
    const base = addGuide([], 'y', 20, 64)
    const id = base[0]?.id ?? ''
    const moved = moveGuide(base, id, 30.4, 64)
    expect(moved).not.toBe(base)
    expect(moved[0]?.pos).toBe(30)
    expect(base[0]?.pos).toBe(20)
    expect(moveGuide(moved, id, 30, 64)).toBe(moved)
    expect(moveGuide(moved, 'outra', 5, 64)).toBe(moved)
    const removed = removeGuide(moved, id)
    expect(removed.length).toBe(0)
    expect(removeGuide(removed, id)).toBe(removed)
  })

  it('guideAt acha a mais perto dentro da tolerância, por eixo', () => {
    const guides = addGuide(addGuide([], 'x', 10, 64), 'y', 40, 64)
    expect(guideAt(guides, { x: 12, y: 0 }, 3)?.axis).toBe('x')
    expect(guideAt(guides, { x: 0, y: 43 }, 3)?.axis).toBe('y')
    expect(guideAt(guides, { x: 20, y: 20 }, 3)).toBeNull()
  })
})
