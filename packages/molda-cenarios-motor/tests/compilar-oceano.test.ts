import { expect, test } from 'bun:test'
import { AguaSchema, type BaseDeTerreno } from '@sistemazero/molda-cenarios-core/v2'
import { type BufferGeometry, Matrix4, Vector3 } from 'three'
import { geometriaDaAgua } from '../src/agua/geometria'
import { MaterialDaAgua } from '../src/agua/material'
import { prepararAguaUniforme } from '../src/compilar/agua'
import {
  particionarAguaHorizontalCompilada,
  particionarOceanoCompilado,
} from '../src/compilar/oceano'

function area(g: BufferGeometry) {
  const p = g.getAttribute('position'),
    n = g.index?.count ?? p.count
  let soma = 0
  for (let i = 0; i < n; i += 3) {
    const [a, b, c] = [0, 1, 2].map((j) =>
      new Vector3().fromBufferAttribute(p, g.index?.getX(i + j) ?? i + j),
    )
    soma += Math.abs(new Vector3().crossVectors(b!.sub(a!), c!.sub(a!)).y) / 2
  }
  return soma
}
function exemplo(passo = 1) {
  const base: BaseDeTerreno = {
      tipo: 'terreno',
      origem: { x: -99999.875, z: 200.375 },
      passo,
      colunas: 128,
      linhas: 64,
      min: -10,
      max: 20,
      fundo: -2,
      pecas: [{ coluna: 0, linha: 0, digest: 'a'.repeat(64) }],
    },
    agua = AguaSchema.parse({
      id: 'mar',
      nome: 'Mar',
      grupo: null,
      oculto: false,
      bloqueado: false,
      tipo: 'mar',
      nivel: 0.27,
    }),
    g = geometriaDaAgua(agua, base),
    matriz = new Matrix4().makeTranslation(g.origem.x, g.origem.y, g.origem.z)
  return { base, geometria: g.geometria, matriz }
}

test('rio extenso é recortado da mesma malha em áreas de até 64 m, preservando cotas e UVs', () => {
  const agua = AguaSchema.parse({
      id: 'rio',
      nome: 'Rio',
      grupo: null,
      oculto: false,
      bloqueado: false,
      tipo: 'rio',
      largura: 4,
      profundidade: 2,
      correnteza: 1,
      pontos: [
        { x: 0, y: 2, z: 0 },
        { x: 150, y: 1, z: 10 },
      ],
    }),
    fonte = geometriaDaAgua(agua, { tipo: 'plano', largura: 256, comprimento: 64 }),
    matriz = new Matrix4().makeTranslation(fonte.origem.x, fonte.origem.y, fonte.origem.z),
    r = particionarAguaHorizontalCompilada({ geometria: fonte.geometria, matriz })
  try {
    expect(r.length).toBeGreaterThan(1)
    expect(r.reduce((s, p) => s + area(p.geometria), 0)).toBeCloseTo(area(fonte.geometria), 3)
    for (const p of r) {
      p.geometria.computeBoundingBox()
      const tamanho = p.geometria.boundingBox!.getSize(new Vector3())
      expect(tamanho.x).toBeLessThanOrEqual(64.00001)
      expect(tamanho.z).toBeLessThanOrEqual(64.00001)
      expect(p.geometria.getAttribute('uv').count).toBe(p.geometria.getAttribute('position').count)
    }
  } finally {
    for (const p of r) p.geometria.dispose()
    fonte.geometria.dispose()
  }
})
test('oceano é a mesma lâmina, sem sobreposição: perto do relevo e cinco faixas uniformes', () => {
  const f = exemplo(),
    antes = f.geometria.getAttribute('position').array.slice(),
    r = particionarOceanoCompilado(f, f.base)
  try {
    expect(r.filter((p) => !p.uniforme)).toHaveLength(1)
    expect(r.filter((p) => p.uniforme)).toHaveLength(5)
    expect(r.reduce((s, p) => s + area(p.geometria), 0)).toBeCloseTo(area(f.geometria), 4)
    const caixas = r.map((p) => {
      p.geometria.computeBoundingBox()
      return p.geometria.boundingBox!.clone().applyMatrix4(p.matriz)
    })
    for (let a = 0; a < caixas.length; a++)
      for (let b = a + 1; b < caixas.length; b++) {
        const intersecao = caixas[a]!.clone().intersect(caixas[b]!)
        expect(
          intersecao.isEmpty() ||
            intersecao.max.x - intersecao.min.x < 1e-5 ||
            intersecao.max.z - intersecao.min.z < 1e-5,
        ).toBe(true)
      }
    for (const p of r) expect(p.matriz.elements[13]).toBeCloseTo(0.27, 12)
    expect(f.geometria.getAttribute('position').array).toEqual(antes)
  } finally {
    for (const p of r) p.geometria.dispose()
    f.geometria.dispose()
  }
})
test('passo maior divide apenas a região com alturas em partes de até 64 m', () => {
  const f = exemplo(4),
    r = particionarOceanoCompilado(f, f.base)
  try {
    expect(r.filter((p) => !p.uniforme)).toHaveLength(16)
    for (const p of r.filter((p) => !p.uniforme)) {
      const tamanho = p.geometria.boundingBox!.getSize(new Vector3())
      expect(tamanho.x).toBeLessThanOrEqual(64.00001)
      expect(tamanho.z).toBeLessThanOrEqual(64.00001)
    }
    expect(r.reduce((s, p) => s + area(p.geometria), 0)).toBeCloseTo(area(f.geometria), 4)
  } finally {
    for (const p of r) p.geometria.dispose()
    f.geometria.dispose()
  }
})
test('oceano sem alturas próprias não cria mapas nem subdivisão ociosa', () => {
  const f = exemplo(),
    r = particionarOceanoCompilado(f, { ...f.base, pecas: [] }),
    material = new MaterialDaAgua(undefined, { fundo: null, plano: -2, profundidade: 100000 }),
    a = prepararAguaUniforme({ ...r[0]!, acabamento: material }, new AbortController().signal)
  try {
    expect(r).toHaveLength(1)
    expect(r[0]!.uniforme).toBe(true)
    expect(a.pintura).toBeUndefined()
    expect(a.material.map).toBeNull()
    expect(a.material.opacity).toBeGreaterThan(0)
    expect(area(a.geometria)).toBe(area(f.geometria))
    a.descartar()
    a.descartar()
  } finally {
    a.descartar()
    material.descartar()
    for (const p of r) p.geometria.dispose()
    f.geometria.dispose()
  }
})
