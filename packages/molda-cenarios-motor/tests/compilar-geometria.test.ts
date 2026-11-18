import { expect, test } from 'bun:test'
import { BufferAttribute, BufferGeometry, Float32BufferAttribute, Matrix4, Vector3 } from 'three'
import { dividirParteEstatica } from '../src/compilar/geometria'

test('parte estática conserva drawRange, atributos e winding sob reflexão sem alterar a fonte', () => {
  const original = new BufferGeometry()
    .setAttribute(
      'position',
      new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0, 2, 0, 0, 3, 0, 0, 2, 1, 0], 3),
    )
    .setAttribute(
      'normal',
      new Float32BufferAttribute(Array.from({ length: 6 }, () => [0, 0, 1]).flat(), 3),
    )
    .setAttribute('uv', new Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 2))
    .setAttribute('color', new BufferAttribute(new Uint8Array(18).fill(255), 3, true))
    .setIndex([0, 1, 2, 3, 4, 5])
  original.setDrawRange(3, 3)
  const antes = original.getAttribute('position').array.slice(),
    matriz = new Matrix4().makeScale(-2, 3, 1),
    partes = dividirParteEstatica(
      { geometria: original, matriz },
      new Matrix4().makeTranslation(5, 0, 0),
    )
  try {
    expect(partes).toHaveLength(1)
    const g = partes[0]!,
      p = g.getAttribute('position'),
      indice = g.index!,
      a = new Vector3().fromBufferAttribute(p, indice.getX(0)),
      b = new Vector3().fromBufferAttribute(p, indice.getX(1)),
      c = new Vector3().fromBufferAttribute(p, indice.getX(2))
    expect(new Vector3().crossVectors(b.sub(a), c.sub(a)).z).toBeGreaterThan(0)
    expect(p.count).toBe(3)
    expect(g.boundingBox!.min.x).toBe(-1)
    expect(g.boundingBox!.max.x).toBe(1)
    expect(g.getAttribute('color').getX(0)).toBe(1)
    expect(g.getAttribute('uv').count).toBe(3)
    expect(original.getAttribute('position').array).toEqual(antes)
    expect(original.drawRange).toEqual({ start: 3, count: 3 })
  } finally {
    for (const p of partes) p.dispose()
    original.dispose()
  }
})
test('divisão de geometria gerada respeita 65.000 vértices e conserva todos os triângulos', () => {
  const n = 65_001,
    g = new BufferGeometry().setAttribute(
      'position',
      new Float32BufferAttribute(new Float32Array(n * 3), 3),
    ),
    partes = dividirParteEstatica({ geometria: g, matriz: new Matrix4() }, new Matrix4())
  try {
    expect(partes).toHaveLength(2)
    expect(
      partes.every(
        (p) => p.getAttribute('position').count <= 65_000 && p.index!.array instanceof Uint16Array,
      ),
    ).toBe(true)
    expect(partes.reduce((s, p) => s + p.index!.count, 0)).toBe(n)
  } finally {
    for (const p of partes) p.dispose()
    g.dispose()
  }
})
test('morphs não são assados implicitamente no caminho estático', () => {
  const g = new BufferGeometry().setAttribute(
    'position',
    new Float32BufferAttribute(new Float32Array(9), 3),
  )
  g.morphAttributes.position = [new Float32BufferAttribute(new Float32Array(9), 3)]
  try {
    expect(() =>
      dividirParteEstatica({ geometria: g, matriz: new Matrix4() }, new Matrix4()),
    ).toThrow(/anim|morph/)
  } finally {
    g.dispose()
  }
})
