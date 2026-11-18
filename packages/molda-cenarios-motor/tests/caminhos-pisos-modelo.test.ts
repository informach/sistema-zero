import { expect, test } from 'bun:test'
import { CaminhoSchema } from '@sistemazero/molda-cenarios-core/v2'
import { BoxGeometry, Group, Matrix4, MeshStandardMaterial, Vector3 } from 'three'
import { montarPisoDeModelo } from '../src/curvas/pisos'
import type { ModeloCarregado } from '../src/modelos'

const base = { tipo: 'plano', largura: 100, comprimento: 100 } as const
const comum = {
  id: 'c',
  nome: 'Caminho',
  grupo: null,
  oculto: false,
  bloqueado: false,
  acabamento: 'm',
  largura: 2,
  encaixeModelo: { eixo: 'x' },
  pontos: [
    { x: 0, z: 0 },
    { x: 10, z: 0 },
  ],
}
function modelo() {
  const geometria = new BoxGeometry(4, 0.2, 2).translate(0, 0.1, 0)
  geometria.computeBoundingBox()
  const material = new MeshStandardMaterial()
  return {
    partes: [{ geometria, material, matriz: new Matrix4() }],
    caixa: geometria.boundingBox!.clone(),
    triangulos: 12,
    raiz: new Group(),
    descartar() {
      geometria.dispose()
      material.dispose()
    },
  } satisfies ModeloCarregado
}
function areaSuperior(g: ReturnType<typeof montarPisoDeModelo>['partes'][number]['geometria']) {
  const p = g.getAttribute('position')
  let soma = 0
  for (let i = 0; i < p.count; i += 3) {
    const a = new Vector3().fromBufferAttribute(p, i),
      b = new Vector3().fromBufferAttribute(p, i + 1),
      c = new Vector3().fromBufferAttribute(p, i + 2),
      normal = b.sub(a).cross(c.sub(a))
    if (normal.y > 1e-7) soma += normal.y / 2
  }
  return soma
}

test('piso GLB recorta o último módulo sem comprimir UV ou alterar o modelo', () => {
  const m = modelo(),
    antes = [...m.partes[0]!.geometria.getAttribute('position').array],
    r = montarPisoDeModelo(CaminhoSchema.parse({ ...comum, tipo: 'trilha' }), m, base, null)
  try {
    const g = r.partes[0]!.geometria,
      p = g.getAttribute('position'),
      uv = g.getAttribute('uv')
    expect(areaSuperior(g)).toBeCloseTo(20, 4)
    expect(g.boundingBox!.min.x).toBeCloseTo(0)
    expect(g.boundingBox!.max.x).toBeCloseTo(10)
    expect(g.boundingBox!.min.z).toBeCloseTo(-1)
    expect(g.boundingBox!.max.z).toBeCloseTo(1)
    const us: number[] = []
    for (let i = 0; i < p.count; i++)
      if (Math.abs(p.getX(i) - 10) < 1e-5 && p.getY(i) > 0.19) us.push(uv.getX(i))
    expect(us.some((u) => Math.abs(u - 0.5) < 1e-5)).toBe(true)
    expect([...m.partes[0]!.geometria.getAttribute('position').array]).toEqual(antes)
    expect(r.partes[0]!.material).toBe(m.partes[0]!.material)
  } finally {
    r.descartar()
    m.descartar()
  }
})

test('mesma bissetriz fecha a esquina dos módulos sem preencher fora da faixa', () => {
  const m = modelo(),
    r = montarPisoDeModelo(
      CaminhoSchema.parse({
        ...comum,
        tipo: 'trilha',
        pontos: [
          { x: 0, z: 0 },
          { x: 10, z: 0 },
          { x: 10, z: 10 },
        ],
      }),
      m,
      base,
      null,
    )
  try {
    const g = r.partes[0]!.geometria
    expect(areaSuperior(g)).toBeCloseTo(40, 4)
    expect(g.boundingBox!.max.x).toBeCloseTo(11)
    expect(g.boundingBox!.max.z).toBeCloseTo(10)
    expect(g.boundingBox!.max.y).toBeCloseTo(0.2)
  } finally {
    r.descartar()
    m.descartar()
  }
})

test('praça de catálogo preserva contorno côncavo, origem distante e ambas as orientações', () => {
  for (const eixo of ['x', 'z']) {
    const m = modelo(),
      r = montarPisoDeModelo(
        CaminhoSchema.parse({
          ...comum,
          tipo: 'praca',
          encaixeModelo: { eixo },
          pontos: [
            { x: 9000, z: 9000 },
            { x: 9004, z: 9000 },
            { x: 9004, z: 9002 },
            { x: 9002, z: 9002 },
            { x: 9002, z: 9004 },
            { x: 9000, z: 9004 },
          ],
        }),
        m,
        base,
        null,
      )
    try {
      expect(r.origem).toEqual({ x: 9000, z: 9000 })
      // O plano de teste é centrado na origem; usar um plano maior para a praça distante.
      expect(r.partes[0]!.geometria.boundingBox!.isEmpty()).toBe(true)
    } finally {
      r.descartar()
      m.descartar()
    }
    const n = modelo(),
      s = montarPisoDeModelo(
        CaminhoSchema.parse({
          ...comum,
          tipo: 'praca',
          encaixeModelo: { eixo },
          pontos: [
            { x: 0, z: 0 },
            { x: 4, z: 0 },
            { x: 4, z: 2 },
            { x: 2, z: 2 },
            { x: 2, z: 4 },
            { x: 0, z: 4 },
          ],
        }),
        n,
        base,
        null,
      )
    try {
      expect(areaSuperior(s.partes[0]!.geometria)).toBeCloseTo(12, 4)
      const p = s.partes[0]!.geometria.getAttribute('position')
      for (let i = 0; i < p.count; i += 3) {
        const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3,
          z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3
        expect(x > 2.00001 && z > 2.00001).toBe(false)
      }
    } finally {
      s.descartar()
      n.descartar()
    }
  }
})

test('limites de montagem e medidas são conferidos antes de repetir o modelo', () => {
  const m = modelo()
  try {
    expect(() =>
      montarPisoDeModelo(
        CaminhoSchema.parse({ ...comum, tipo: 'trilha', encaixeModelo: undefined }),
        m,
        base,
        null,
      ),
    ).toThrow('eixo')
    expect(() =>
      montarPisoDeModelo(
        CaminhoSchema.parse({
          ...comum,
          tipo: 'trilha',
          largura: 0.05,
          pontos: [
            { x: -99999, z: 0 },
            { x: 99999, z: 0 },
          ],
        }),
        m,
        base,
        null,
      ),
    ).toThrow('peças demais')
  } finally {
    m.descartar()
  }
})
