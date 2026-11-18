import { expect, test } from 'bun:test'
import { BufferAttribute, BufferGeometry, Float32BufferAttribute } from 'three'
import { dividirGeometriaComDeformacoes } from '../src/compilar/geometria-animavel'

function exemplo(n = 65_001) {
  const g = new BufferGeometry()
    .setAttribute(
      'position',
      new Float32BufferAttribute(
        Float32Array.from({ length: n * 3 }, (_, i) => (i % 3 === 0 ? Math.floor(i / 3) / 100 : 0)),
        3,
      ),
    )
    .setAttribute(
      'indiceOriginal',
      new Float32BufferAttribute(
        Float32Array.from({ length: n }, (_, i) => i),
        1,
      ),
    )
    .setAttribute('uv', new Float32BufferAttribute(new Float32Array(n * 2).fill(0.25), 2))
    .setAttribute('skinIndex', new BufferAttribute(new Uint16Array(n * 4), 4))
    .setAttribute(
      'skinWeight',
      new Float32BufferAttribute(
        Float32Array.from({ length: n * 4 }, (_, i) => (i % 4 === 0 ? 1 : 0)),
        4,
      ),
    )
  const alvo = new Float32BufferAttribute(
    Float32Array.from({ length: n * 3 }, (_, i) => (i % 3 === 1 ? 0.5 : 0)),
    3,
  )
  alvo.name = 'Sorriso'
  g.morphAttributes.position = [alvo]
  g.morphTargetsRelative = true
  return g
}
test('divisão conserva skin, UVs, atributos próprios e slots de morph em todos os vértices remapeados', () => {
  const g = exemplo(),
    antes = g.getAttribute('position').array.slice(),
    partes = dividirGeometriaComDeformacoes(g)
  try {
    expect(partes).toHaveLength(2)
    expect(partes.reduce((s, p) => s + p.index!.count, 0)).toBe(65_001)
    expect(
      partes.every(
        (p) =>
          p.getAttribute('position').count <= 65_000 &&
          p.getAttribute('skinIndex').array instanceof Uint16Array,
      ),
    ).toBe(true)
    let coerente = true
    for (const p of partes)
      for (let i = 0; i < p.getAttribute('position').count; i++) {
        const origem = p.getAttribute('indiceOriginal').getX(i)
        if (
          p.getAttribute('position').getX(i) !== g.getAttribute('position').getX(origem) ||
          p.getAttribute('uv').getX(i) !== 0.25 ||
          p.getAttribute('skinWeight').getX(i) !== 1 ||
          p.morphAttributes.position![0]!.getY(i) !== 0.5
        )
          coerente = false
      }
    expect(coerente).toBe(true)
    expect(partes[0]!.morphTargetsRelative).toBe(true)
    expect(partes[0]!.morphAttributes.position![0]!.name).toBe('Sorriso')
    expect(g.getAttribute('position').array).toEqual(antes)
  } finally {
    for (const p of partes) p.dispose()
    g.dispose()
  }
})
test('faixa de material conserva sua seleção de triângulos sem copiar os demais', () => {
  const g = exemplo(9)
  g.setIndex([0, 1, 2, 3, 5, 4, 6, 7, 8])
  const partes = dividirGeometriaComDeformacoes(g, { inicio: 3, quantidade: 3 })
  try {
    expect([...partes[0]!.getAttribute('indiceOriginal').array]).toEqual([3, 5, 4])
    expect(partes[0]!.index!.count).toBe(3)
  } finally {
    for (const p of partes) p.dispose()
    g.dispose()
  }
})
test('layout inválido, skin fracionária e orçamento excedido recusam a deformação sem entregar partes', () => {
  const g = exemplo(3)
  try {
    expect(() => dividirGeometriaComDeformacoes(g, undefined, 32)).toThrow(/orçamento/)
    expect(() => dividirGeometriaComDeformacoes(g, { inicio: 1, quantidade: 2 })).toThrow(
      /triângulos|intervalo/,
    )
    g.setAttribute('skinIndex', new Float32BufferAttribute(new Float32Array(12).fill(0.5), 4))
    expect(() => dividirGeometriaComDeformacoes(g)).toThrow(/junta|inteir/)
    g.setAttribute('skinIndex', new BufferAttribute(new Float64Array(12).fill(1.0000000001), 4))
    expect(() => dividirGeometriaComDeformacoes(g)).toThrow(/junta|inteir/)
    g.setAttribute('skinIndex', new BufferAttribute(new Uint16Array(12), 4))
    g.morphAttributes.position![0]!.setY(1, NaN)
    expect(() => dividirGeometriaComDeformacoes(g)).toThrow(/atributo|finito/)
  } finally {
    g.dispose()
  }
})
