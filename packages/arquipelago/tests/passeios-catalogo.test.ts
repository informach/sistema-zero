import { expect, test } from 'bun:test'
import { BufferGeometry, Float32BufferAttribute } from 'three'
import { contornoConvexo, recortarMalha } from '../src/mundo/faisca/recortar-malha'
import { montarPasseio } from '../src/sistemas/passeios-da-faisca'

test('recorte remove a área sobreposta e interpola UV sem alterar a malha original', () => {
  const original = new BufferGeometry()
    .setAttribute(
      'position',
      new Float32BufferAttribute([0, 0, 0, 2, 0, 0, 2, 0, 2, 0, 0, 0, 2, 0, 2, 0, 0, 2], 3),
    )
    .setAttribute('uv', new Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], 2))
  for (const t of [
    [
      { x: 0, z: 0 },
      { x: 1, z: 0 },
      { x: 1, z: 1 },
      { x: 0, z: 1 },
    ],
    [
      { x: 0, z: 0 },
      { x: 1, z: 0 },
      { x: 0, z: 1 },
    ],
    [
      { x: 0, z: 1 },
      { x: 1, z: 0 },
      { x: 0, z: 0 },
    ],
  ]) {
    const g = recortarMalha(original, [], [t]),
      p = g.getAttribute('position'),
      uv = g.getAttribute('uv')
    let area = 0
    for (let i = 0; i < p.count; i += 3) {
      const ax = p.getX(i),
        az = p.getZ(i),
        bx = p.getX(i + 1),
        bz = p.getZ(i + 1),
        cx = p.getX(i + 2),
        cz = p.getZ(i + 2)
      area += Math.abs((bx - ax) * (cz - az) - (cx - ax) * (bz - az)) / 2
      expect((ax + bx + cx + az + bz + cz) / 3).toBeGreaterThanOrEqual(1 - 1e-6)
    }
    expect(area).toBeCloseTo(t.length === 4 ? 3 : 3.5, 5)
    for (let i = 0; i < p.count; i++) {
      expect(uv.getX(i)).toBeCloseTo(p.getX(i) / 2, 5)
      expect(uv.getY(i)).toBeCloseTo(p.getZ(i) / 2, 5)
    }
    expect(original.getAttribute('position').count).toBe(6)
    g.dispose()
  }
  original.dispose()
})
test('o envelope do módulo ignora vértices internos e duplicados sem perder as bordas', () => {
  const p = contornoConvexo([
    { x: 0, z: 0 },
    { x: 1, z: 0 },
    { x: 1, z: 1 },
    { x: 0, z: 1 },
    { x: 0.5, z: 0.5 },
    { x: 1, z: 0 },
  ])
  expect(p).toHaveLength(4)
  expect(new Set(p.map((p) => `${p.x},${p.z}`))).toEqual(new Set(['0,0', '1,0', '1,1', '0,1']))
})
test('curvas do catálogo mantêm raio e tangentes sem alterar a largura do módulo', () => {
  for (const sentido of [1, -1]) {
    const pecas = montarPasseio(
        [
          { x: 0, z: 0 },
          { x: 10, z: 0 },
          { x: 10, z: 10 * sentido },
        ],
        'templo',
      ),
      curva = pecas.find((p) => p.modelo === 'caminho_lajes_curvo')!
    const global = (x: number, z: number) => ({
      x: curva.x + Math.cos(curva.giro) * x + Math.sin(curva.giro) * z,
      z: curva.z - Math.sin(curva.giro) * x + Math.cos(curva.giro) * z,
    })
    const a = global(-3.5, 0),
      b = global(0, 3.5),
      pontas = [a, b]
    expect(pontas.some((p) => Math.hypot(p.x - 6.5, p.z) < 1e-6)).toBe(true)
    expect(pontas.some((p) => Math.hypot(p.x - 10, p.z - 3.5 * sentido) < 1e-6)).toBe(true)
  }
})
