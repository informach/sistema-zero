import { beforeAll, describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import {
  type BufferGeometry,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
  Raycaster,
  Vector3,
} from 'three'
import { lerColisores } from '../src/mundo/colisores-da-ilha'
import { alturaDaIlha } from '../src/mundo/medidas'
import { LOTE_DA_CASA, LOTE_DA_CASA_GRANDE } from '../src/sistemas/construcao/lote'
import { carregarGlb } from './ajuda-colisores'

/**
 * O chão do lote grande da casa como malha própria no `terreno.glb` (pedido "Moldar o terreno",
 * `docs/plans/2026-10-30-arquipelago-pedidos-de-arte.md`): o nó `chao-do-lote` cobre o retângulo de
 * `LOTE_DA_CASA_GRANDE`, com o mesmo material e a mesma cor por vértice da grama em volta, emendado
 * no resto do chão vértice por vértice, com a altura de `alturaDaIlha` dentro e fora dele.
 */

const LOTE = LOTE_DA_CASA_GRANDE.area
let raiz: Object3D
let chao: Mesh
let doLote: Mesh

/** Os vértices de uma malha no referencial do arquivo, com a cor de cada um. */
function vertices(m: Mesh): { p: Vector3; cor: [number, number, number] }[] {
  const g = m.geometry as BufferGeometry
  const pos = g.getAttribute('position')
  const cor = g.getAttribute('color') ?? pos
  const lista: { p: Vector3; cor: [number, number, number] }[] = []
  for (let i = 0; i < pos.count; i++) {
    lista.push({
      p: new Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld),
      cor: [cor.getX(i), cor.getY(i), cor.getZ(i)],
    })
  }
  return lista
}

/** As malhas de um nó (o nó e os filhos que não são outro nó do contrato). */
function malhasDe(no: Object3D, fora?: Object3D): Mesh[] {
  const lista: Mesh[] = []
  no.traverse((o) => {
    if (fora && (o === fora || o.parent === fora)) return
    if ((o as Mesh).isMesh) lista.push(o as Mesh)
  })
  return lista
}

/** O raio efetivo da ilha central (a borda irregular), a mesma conta de `alturaDaIlha`. */
function raioEfetivo(x: number, z: number): number {
  const a = Math.atan2(z, x)
  return Math.hypot(x, z) / (1 + 0.06 * Math.sin(a * 3 + 1) + 0.04 * Math.sin(a * 7 + 2))
}

const dentro = (x: number, z: number, folga = 0) =>
  x > LOTE.x0 + folga && x < LOTE.x1 - folga && z > LOTE.z0 + folga && z < LOTE.z1 - folga

beforeAll(async () => {
  raiz = await carregarGlb(join(import.meta.dir, '..', 'src', 'assets', 'mundo', 'terreno.glb'))
  raiz.updateMatrixWorld(true)
  const c = raiz.getObjectByName('chao')
  const l = raiz.getObjectByName('chao-do-lote')
  if (!c || !l) throw new Error('terreno.glb sem chao ou chao-do-lote')
  doLote = (malhasDe(l)[0] ?? l) as Mesh
  chao = (malhasDe(c, l)[0] ?? c) as Mesh
})

describe('o chão do lote no terreno.glb', () => {
  test('o lote grande contém o de sempre (o chão novo cobre os dois)', () => {
    const p = LOTE_DA_CASA.area
    expect(LOTE.x0 <= p.x0 && LOTE.z0 <= p.z0 && LOTE.x1 >= p.x1 && LOTE.z1 >= p.z1).toBe(true)
  })

  test('chao-do-lote é filho do chao, com o mesmo material e cor por vértice', () => {
    const no = raiz.getObjectByName('chao-do-lote') as Object3D
    let pai: Object3D | null = no.parent
    while (pai && pai.name !== 'chao') pai = pai.parent
    expect(pai?.name).toBe('chao')
    const material = (m: Mesh) => m.material as MeshStandardMaterial
    expect(material(doLote).name).toBe('chao')
    expect(material(chao).name).toBe('chao')
    expect(material(doLote).vertexColors).toBe(true)
    expect(doLote.geometry.getAttribute('color')).toBeDefined()
    expect(chao.geometry.getAttribute('color')).toBeDefined()
  })

  test('a malha do lote é exatamente o retângulo, em grade de 1 m', () => {
    const vs = vertices(doLote)
    const xs = vs.map((v) => v.p.x)
    const zs = vs.map((v) => v.p.z)
    expect(Math.min(...xs)).toBeCloseTo(LOTE.x0, 4)
    expect(Math.max(...xs)).toBeCloseTo(LOTE.x1, 4)
    expect(Math.min(...zs)).toBeCloseTo(LOTE.z0, 4)
    expect(Math.max(...zs)).toBeCloseTo(LOTE.z1, 4)
    for (const v of vs) {
      expect(Math.abs(v.p.x - Math.round(v.p.x))).toBeLessThan(1e-4)
      expect(Math.abs(v.p.z - Math.round(v.p.z))).toBeLessThan(1e-4)
    }
  })

  test('cada vértice da borda do lote existe também no chão vizinho, com a mesma cor', () => {
    const chave = (p: Vector3) => `${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)}`
    const vizinho = new Map(vertices(chao).map((v) => [chave(v.p), v.cor]))
    const borda = vertices(doLote).filter(
      (v) => !dentro(v.p.x, v.p.z, 1e-3) && Math.abs(v.p.x - Math.round(v.p.x)) < 1e-4,
    )
    // 2 × (33 + 27) pontos inteiros na volta do retângulo.
    const unicos = new Map(borda.map((v) => [chave(v.p), v]))
    expect(unicos.size).toBe(2 * (LOTE.x1 - LOTE.x0 + (LOTE.z1 - LOTE.z0)))
    for (const [k, v] of unicos) {
      const cor = vizinho.get(k)
      expect(cor, `vértice da borda ${k} sem par no chão vizinho`).toBeDefined()
      if (cor)
        for (let i = 0; i < 3; i++)
          expect(Math.abs((cor[i] ?? 0) - (v.cor[i] ?? 0))).toBeLessThan(0.01)
    }
  })

  test('cada vértice dos dois pedaços fica na altura de alturaDaIlha', () => {
    for (const m of [doLote, chao])
      for (const { p } of vertices(m))
        expect(Math.abs(p.y - alturaDaIlha(p.x, p.z))).toBeLessThan(1e-4)
  })

  test('olhando de cima: dentro do retângulo só o chão do lote, fora só o resto, na altura certa', () => {
    const raio = new Raycaster()
    const baixo = new Vector3(0, -1, 0)
    let dentroDoLote = 0
    for (let x = -30; x <= 30; x += 0.37) {
      for (let z = -30; z <= 30; z += 0.41) {
        // Até o fim do gramado: na divisa com a praia (raio efetivo 24) a própria conta do jogo dá um
        // degrau de até 0,35 m (o ondulado do gramado não chega a zero ali), que nenhuma malha segue.
        if (raioEfetivo(x, z) > 23.4) continue
        raio.set(new Vector3(x, 20, z), baixo)
        const [noLote] = raio.intersectObject(doLote, false)
        const [noResto] = raio.intersectObject(chao, false)
        const acerto = noLote ?? noResto
        expect(acerto, `sem chão em (${x}, ${z})`).toBeDefined()
        if (!acerto) continue
        // A malha é feita de planos entre os vértices: no lote (plano, ou quase) dentro de 3 cm da conta
        // do jogo; no gramado ondulado em volta, dentro de 6 cm.
        const erro = Math.abs(acerto.point.y - alturaDaIlha(x, z))
        expect(erro).toBeLessThan(dentro(x, z) ? 0.03 : 0.06)
        if (dentro(x, z, 0.01)) {
          dentroDoLote++
          expect(noLote).toBeDefined()
          expect(noResto).toBeUndefined()
        } else if (!dentro(x, z, -0.01)) {
          expect(noLote).toBeUndefined()
          expect(noResto).toBeDefined()
        }
      }
    }
    expect(dentroDoLote).toBeGreaterThan(5000)
    // Uns 15 mil raios contra as duas malhas: a suíte inteira em paralelo passa dos 5 s de praxe.
  }, 60_000)

  test('nenhum colisor col-* nem enfeite dentro do retângulo', () => {
    for (const c of lerColisores(raiz)) {
      if (c.forma === 'malha') continue
      const meia = c.forma === 'caixa' ? Math.hypot(c.meio[0], c.meio[2]) : c.raio
      const [x, , z] = c.posicao
      expect(dentro(x, z, -meia), c.nome).toBe(false)
    }
    const enfeites = raiz.getObjectByName('enfeites') as Object3D
    for (const m of malhasDe(enfeites))
      for (const { p } of vertices(m))
        expect(dentro(p.x, p.z), `enfeite em ${p.x}, ${p.z}`).toBe(false)
  })
})
