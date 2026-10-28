import { describe, expect, test } from 'bun:test'
import { BICHOS_DO_BOSQUE } from '@sistemazero/arquipelago-contracts'
import { FORMA_DA_PEGADA, RASTRO, rastroNoCaminho } from '../src/sistemas/pegadas'

describe('as pegadas dos bichos do Bosque', () => {
  test('cada desenho cabe no quadro de 64 e é diferente dos outros', () => {
    for (const b of BICHOS_DO_BOSQUE) {
      const forma = FORMA_DA_PEGADA[b]
      expect(forma.length).toBeGreaterThan(1)
      for (const e of forma) {
        const r = Math.max(e.rx, e.ry)
        expect(e.x - r).toBeGreaterThanOrEqual(0)
        expect(e.x + r).toBeLessThanOrEqual(64)
        expect(e.y - r).toBeGreaterThanOrEqual(0)
        expect(e.y + r).toBeLessThanOrEqual(64)
      }
    }
    const assinaturas = BICHOS_DO_BOSQUE.map((b) => JSON.stringify(FORMA_DA_PEGADA[b]))
    expect(new Set(assinaturas).size).toBe(BICHOS_DO_BOSQUE.length)
  })

  test('o rastro vai pelo caminho, de perto do esconderijo para longe, apontando para ele', () => {
    // O caminho sai do esconderijo, em (0, 0), e segue reto para +z.
    const rastro = rastroNoCaminho([
      { x: 0, z: 0 },
      { x: 0, z: 10 },
    ])
    expect(rastro.length).toBe(Math.floor((RASTRO.acaba - RASTRO.comeca) / RASTRO.passo + 1e-9) + 1)
    expect(rastro[0]?.z).toBeCloseTo(RASTRO.comeca, 9)
    for (let i = 1; i < rastro.length; i++) {
      const p = rastro[i]
      const antes = rastro[i - 1]
      if (!p || !antes) continue
      expect(p.z).toBeGreaterThan(antes.z)
      // Um passo de cada lado do meio do caminho.
      expect(Math.sign(p.x)).toBe(-Math.sign(antes.x))
      expect(Math.abs(p.x)).toBeCloseTo(RASTRO.lado, 9)
      // A ponta aponta de volta para o esconderijo, (sin g, cos g) = (0, -1).
      expect(Math.sin(p.giro)).toBeCloseTo(0, 9)
      expect(Math.cos(p.giro)).toBeCloseTo(-1, 9)
    }
  })

  test('caminho curto dá rastro curto, e sem caminho não há rastro', () => {
    const curto = rastroNoCaminho([
      { x: 0, z: 0 },
      { x: 2.5, z: 0 },
    ])
    expect(curto.length).toBeGreaterThan(0)
    for (const p of curto) expect(p.x).toBeLessThanOrEqual(2.5 - RASTRO.passo + 1e-9)
    expect(rastroNoCaminho([{ x: 0, z: 0 }])).toEqual([])
  })
})
