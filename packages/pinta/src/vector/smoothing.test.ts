import { describe, expect, it } from 'bun:test'
import { parsePathD } from './geometry'
import { catmullRomToPath, simplifyRDP, smoothStrokeToPath } from './smoothing'

describe('simplifyRDP', () => {
  it('remove pontos colineares e preserva as pontas', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 5, y: 0.1 },
      { x: 10, y: 0 },
    ]
    const out = simplifyRDP(points, 1.5)
    expect(out).toHaveLength(2)
    expect(out[0]).toEqual({ x: 0, y: 0 })
    expect(out[1]).toEqual({ x: 10, y: 0 })
  })

  it('mantém o cotovelo (desvio acima do epsilon)', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 5, y: 8 },
      { x: 10, y: 0 },
    ]
    expect(simplifyRDP(points, 1.5)).toHaveLength(3)
  })
})

describe('catmullRomToPath', () => {
  it('produz M + C absolutos que o NOSSO parser entende', () => {
    const d = catmullRomToPath([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 0 },
    ])
    expect(d.startsWith('M 0 0 C')).toBe(true)
    expect(parsePathD(d)).not.toBeNull()
  })

  it('um ponto vira um traço mínimo (pontinho visível)', () => {
    const d = catmullRomToPath([{ x: 5, y: 5 }])
    expect(d).toContain('M 5 5 L')
  })

  it('vazio → string vazia', () => {
    expect(catmullRomToPath([])).toBe('')
  })
})

describe('smoothStrokeToPath (pipeline do pincel)', () => {
  it('rabisco cru vira path suave parseável', () => {
    const raw = Array.from({ length: 40 }, (_, i) => ({
      x: i,
      y: Math.sin(i / 4) * 10 + (i % 2) * 0.4, // tremidinha de mão
    }))
    const d = smoothStrokeToPath(raw)
    const parsed = parsePathD(d)
    expect(parsed).not.toBeNull()
    // Simplificou: bem menos comandos que pontos crus.
    expect(parsed?.commands.length ?? 99).toBeLessThan(raw.length)
  })
})
