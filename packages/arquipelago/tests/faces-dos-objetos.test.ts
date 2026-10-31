import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { CATALOGO_DE_OBJETOS, OBJETOS_DA_CASA } from '@sistemazero/arquipelago-contracts'
import {
  Box3,
  type BufferAttribute,
  type BufferGeometry,
  type Material,
  Mesh,
  Triangle,
  Vector2,
  Vector3,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { NOMES_DAS_FACES } from '../src/mundo/carregar-aparencia'

/**
 * Cada face que o catálogo promete ao Pinta precisa existir no GLB do objeto, do tamanho prometido
 * (a imagem não sai esticada) e com a imagem inteira nela (UV de 0 a 1). A face plana pode ter
 * buracos (o vidro da porta do forno, a porta da casinha): o que vale é o retângulo dela.
 */

interface MedidaDaFace {
  area: number
  caixa: Box3
  u: [number, number]
  v: [number, number]
}

async function medirFaces(objeto: string) {
  const arquivo = readFileSync(new URL(`../src/assets/objetos/${objeto}.glb`, import.meta.url))
  const cena = (
    await new GLTFLoader().parseAsync(
      arquivo.buffer.slice(arquivo.byteOffset, arquivo.byteOffset + arquivo.byteLength),
      '',
    )
  ).scene
  cena.updateMatrixWorld(true)
  const medidas = new Map<string, MedidaDaFace>()
  const a = new Vector3()
  const b = new Vector3()
  const c = new Vector3()
  const uv = new Vector2()
  cena.traverse((o) => {
    if (!(o instanceof Mesh)) return
    const geo = o.geometry as BufferGeometry
    const mats = (Array.isArray(o.material) ? o.material : [o.material]) as Material[]
    const pos = geo.attributes.position as BufferAttribute
    const uvs = geo.attributes.uv as BufferAttribute | undefined
    const indices = geo.index
    const grupos = geo.groups.length
      ? geo.groups
      : [{ start: 0, count: indices ? indices.count : pos.count, materialIndex: 0 }]
    for (const g of grupos) {
      const nome = mats[g.materialIndex ?? 0]?.name ?? ''
      if (!/^pinta|^tela$/.test(nome)) continue
      const m = medidas.get(nome) ?? { area: 0, caixa: new Box3(), u: [1, 0], v: [1, 0] }
      for (let i = g.start; i < g.start + g.count; i += 3) {
        const ids = [0, 1, 2].map((k) => (indices ? indices.getX(i + k) : i + k))
        a.fromBufferAttribute(pos, ids[0]!).applyMatrix4(o.matrixWorld)
        b.fromBufferAttribute(pos, ids[1]!).applyMatrix4(o.matrixWorld)
        c.fromBufferAttribute(pos, ids[2]!).applyMatrix4(o.matrixWorld)
        m.area += new Triangle(a, b, c).getArea()
        m.caixa.expandByPoint(a).expandByPoint(b).expandByPoint(c)
        if (!uvs) continue
        for (const id of ids) {
          uv.fromBufferAttribute(uvs, id)
          m.u = [Math.min(m.u[0], uv.x), Math.max(m.u[1], uv.x)]
          m.v = [Math.min(m.v[0], uv.y), Math.max(m.v[1], uv.y)]
        }
      }
      medidas.set(nome, m)
    }
  })
  return medidas
}

describe('as faces do Pinta nos modelos dos objetos', () => {
  for (const objeto of OBJETOS_DA_CASA) {
    const { faces } = CATALOGO_DE_OBJETOS[objeto].molde
    if (faces.length === 0) continue
    test(`${objeto}: cada face do catálogo existe, do tamanho prometido e com a imagem inteira`, async () => {
      const medidas = await medirFaces(objeto)
      for (const f of faces) {
        const m = medidas.get(NOMES_DAS_FACES[f.face])
        expect(m, `${objeto} sem ${NOMES_DAS_FACES[f.face]}`).toBeDefined()
        const t = m!.caixa.getSize(new Vector3())
        // No GLB o y sobe e a frente olha para +z.
        const [largura, altura, espessura] =
          f.face === 'lado-esq' || f.face === 'lado-dir'
            ? [t.z, t.y, t.x]
            : f.face === 'topo'
              ? [t.x, t.z, t.y]
              : [t.x, t.y, t.z]
        expect(m!.area).toBeLessThan(f.largura * f.altura * 1.02)
        if (espessura < 0.01) {
          expect(Math.abs(largura - f.largura)).toBeLessThan(0.02)
          expect(Math.abs(altura - f.altura)).toBeLessThan(0.02)
        } else {
          // A face que dá a volta (o rótulo do vaso): a largura é a volta, a altura é a do vaso.
          expect(Math.abs(altura - f.altura)).toBeLessThan(0.02)
          expect(m!.area).toBeGreaterThan(f.largura * f.altura * 0.5)
        }
        expect(m!.u[0]).toBeGreaterThan(-0.01)
        expect(m!.u[1]).toBeLessThan(1.01)
        expect(m!.v[0]).toBeGreaterThan(-0.01)
        expect(m!.v[1]).toBeLessThan(1.01)
        expect(m!.u[1] - m!.u[0]).toBeGreaterThan(0.95)
        expect(m!.v[1] - m!.v[0]).toBeGreaterThan(0.95)
      }
    })
  }
})
