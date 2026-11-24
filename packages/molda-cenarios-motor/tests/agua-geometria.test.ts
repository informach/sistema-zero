import { expect, test } from 'bun:test'
import { AguaSchema, prepararConsultaDaAgua } from '@sistemazero/molda-cenarios-core/v2'
import { Vector3 } from 'three'
import { geometriaDaAgua } from '../src/agua/geometria'

const comum = { id: 'a', nome: 'Água', grupo: null, bloqueado: false, oculto: false },
  base = { tipo: 'plano' as const, largura: 64, comprimento: 64 }

test('lago triangula ilha seca e contorno côncavo com face superior e escala física', () => {
  const agua = AguaSchema.parse({
      ...comum,
      tipo: 'lago',
      modelo: null,
      centro: { x: 20, z: 30 },
      giro: 0.6,
      escala: 2,
      nivel: 4,
      profundidade: 3,
      contorno: [
        { x: -8, z: -8 },
        { x: 8, z: -8 },
        { x: 8, z: 8 },
        { x: 0, z: 5 },
        { x: -8, z: 8 },
      ],
      recorte: [
        { x: -8, z: -8 },
        { x: 8, z: -8 },
        { x: 0, z: 8 },
      ],
      ilhas: [
        [
          { x: -1, z: -1 },
          { x: 1, z: -1 },
          { x: 0, z: 1 },
        ],
      ],
    }),
    r = geometriaDaAgua(agua, base),
    consulta = prepararConsultaDaAgua(agua)
  try {
    const p = r.geometria.getAttribute('position'),
      indices = r.geometria.index!
    let area = 0
    for (let i = 0; i < indices.count; i += 3) {
      const a = new Vector3().fromBufferAttribute(p, indices.getX(i)),
        b = new Vector3().fromBufferAttribute(p, indices.getX(i + 1)),
        c = new Vector3().fromBufferAttribute(p, indices.getX(i + 2)),
        normal = b.clone().sub(a).cross(c.clone().sub(a))
      expect(normal.y).toBeGreaterThan(0)
      area += normal.y / 2
      const centro = a.add(b).add(c).divideScalar(3).add(r.origem)
      expect(consulta.em(centro.x, centro.z)?.nivel).toBe(4)
    }
    expect(area).toBeCloseTo((256 - 24 - 2) * 4, 4)
    expect(consulta.em(20, 30)).toBeNull()
  } finally {
    r.geometria.dispose()
  }
})

test('rio conserva eixo nas curvas e a geometria fica independente da consulta; mar e queda não degeneram', () => {
  const rio = AguaSchema.parse({
      ...comum,
      tipo: 'rio',
      largura: 4,
      profundidade: 2,
      correnteza: 1,
      pontos: [
        { x: 1000, y: 5, z: 1000 },
        { x: 1004, y: 4, z: 1000 },
        { x: 1006, y: 2, z: 1004 },
      ],
    }),
    consulta = prepararConsultaDaAgua(rio),
    r = geometriaDaAgua(rio, base)
  try {
    expect(r.geometria.getAttribute('position').count).toBe(9)
    const q = new Vector3()
      .fromBufferAttribute(r.geometria.getAttribute('position'), 4)
      .add(r.origem)
    expect(q.toArray()).toEqual([1004, 4, 1000])
    expect(consulta.em(q.x, q.z)?.nivel).toBe(4)
    r.geometria.translate(50, 50, 50)
    expect(consulta.em(q.x, q.z)?.nivel).toBe(4)
    for (const agua of [
      AguaSchema.parse({ ...comum, tipo: 'mar', nivel: 1 }),
      AguaSchema.parse({
        ...comum,
        tipo: 'cachoeira',
        topo: { x: 0, y: 5, z: 0 },
        base: { x: 2, y: 0, z: 3 },
        largura: 3,
        giro: 0.5,
      }),
    ]) {
      const g = geometriaDaAgua(agua, base)
      try {
        expect(g.geometria.boundingSphere!.radius).toBeGreaterThan(0)
        expect(g.geometria.index!.count).toBe(6)
      } finally {
        g.geometria.dispose()
      }
    }
  } finally {
    r.geometria.dispose()
  }
})
