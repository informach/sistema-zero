import { expect, test } from 'bun:test'
import { BufferGeometry, Float32BufferAttribute, Matrix4, Vector3 } from 'three'
import { MundoDoTeste } from '../src/teste/colisoes'

function teto(inverter = false) {
  // One quad, two coplanar triangles. The first triangle's diagonal is internal.
  const a = [8, 2.3, 5, 14, 2.3, 11, 8, 2.3, 11],
    b = [8, 2.3, 5, 14, 2.3, 5, 14, 2.3, 11],
    geometria = new BufferGeometry().setAttribute(
      'position',
      new Float32BufferAttribute(inverter ? [...b, ...a] : [...a, ...b], 3),
    ),
    mundo = new MundoDoTeste([{ geometria, matriz: new Matrix4() }])
  return {
    mundo,
    limpar: () => {
      mundo.descartar()
      geometria.dispose()
    },
  }
}

test('a junta coplanar do teto não produz empurrão lateral, em qualquer ordem dos triângulos', () => {
  for (const inverter of [false, true]) {
    const { mundo, limpar } = teto(inverter)
    try {
      const hit = mundo.resolver(new Vector3(8.5, 1.2236211111111144, 5.3), 1.16, 0.25)
      expect(hit.posicao.x).toBeCloseTo(8.5, 8)
      expect(hit.posicao.z).toBeCloseTo(5.3, 8)
      expect(hit.posicao.y).toBeCloseTo(2.3 - 1.16 - 1e-5, 6)
      expect(hit.normais.length).toBeGreaterThan(0)
      expect(hit.normais.every((n) => Math.abs(n.x) + Math.abs(n.z) < 1e-8 && n.y < -0.999)).toBe(
        true,
      )
    } finally {
      limpar()
    }
  }
})

test('a borda externa real do mesmo teto continua produzindo contato lateral', () => {
  const { mundo, limpar } = teto()
  try {
    const hit = mundo.resolver(new Vector3(7.9, 1.2236211111111144, 5.3), 1.16, 0.25)
    expect(hit.posicao.x).toBeLessThan(7.9)
    expect(hit.normais.some((n) => n.x < -0.2)).toBe(true)
  } finally {
    limpar()
  }
})
