import { beforeAll, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ilhasDoAnel } from '@sistemazero/arquipelago-contracts'
import { Matrix4, type Mesh, type Object3D, Quaternion, Raycaster, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { paraOMundo, RAIO_DO_BOSQUE } from '../src/mundo/bosque'
import { type ColisorDaIlha, lerColisores } from '../src/mundo/colisores-da-ilha'
import {
  centroNoAnel,
  giroDaIlha,
  noModelo,
  RAIO_DA_ILHA_DO_ANEL,
  raioDoChaoDaIlha,
  rodaDaIlhaNoModelo,
} from '../src/mundo/medidas'
import { TELHADO } from '../src/sistemas/construcao/telhado'
import { BOIAS_DA_ILHA_DO_ANEL as BOIAS } from '../src/sistemas/correnteza'

/**
 * O Bosque cresceu para o lado de fora (28/10/2026): a ponta de campo do -x do modelo, com o lote da
 * cabana. O jogo calcula o contorno com a mesma conta da arte (`raioDoChaoDaIlha`, a roda de boias e
 * a espera pelo chão); aqui a conta é conferida contra o `bosque.glb`, e o lote contra o chão, os
 * colisores e o céu (o telhado do kit começa a 4 m).
 */
const ARQUIVO = join(import.meta.dir, '..', 'src', 'assets', 'ilhas', 'bosque.glb')
const BOSQUE = ilhasDoAnel().find((i) => i.id === 'bosque')!

let raiz: Object3D
let terreno: Mesh
let colisores: Exclude<ColisorDaIlha, { forma: 'malha' }>[]

beforeAll(async () => {
  const buf = readFileSync(ARQUIVO)
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  raiz = (await new GLTFLoader().parseAsync(ab, '')).scene
  raiz.updateMatrixWorld(true)
  terreno = raiz.getObjectByName('col-terreno') as Mesh
  colisores = lerColisores(raiz).filter(
    (c): c is Exclude<ColisorDaIlha, { forma: 'malha' }> => c.forma !== 'malha',
  )
})

const raio = new Raycaster()
function alturaDoChao(x: number, z: number): number | null {
  raio.set(new Vector3(x, 50, z), new Vector3(0, -1, 0))
  return raio.intersectObject(terreno, true)[0]?.point.y ?? null
}

/** Os colisores que tocam a coluna de (x, z) entre as alturas `y0` e `y1`. */
function naColuna(x: number, z: number, y0: number, y1: number): string[] {
  return colisores
    .filter((c) => {
      const m = new Matrix4()
        .compose(new Vector3(...c.posicao), new Quaternion(...c.rotacao), new Vector3(1, 1, 1))
        .invert()
      for (let y = y0; y <= y1; y += 0.25) {
        const l = new Vector3(x, y, z).applyMatrix4(m)
        const dentro =
          c.forma === 'caixa'
            ? Math.abs(l.x) < c.meio[0] && Math.abs(l.y) < c.meio[1] && Math.abs(l.z) < c.meio[2]
            : Math.hypot(l.x, l.z) < c.raio && Math.abs(l.y) < c.meiaAltura
        if (dentro) return true
      }
      return false
    })
    .map((c) => c.nome)
}

describe('o Bosque crescido para o lado de fora', () => {
  test('o contorno do jogo é o do arquivo: nenhum chão passa dele, e ele chega até a beira', () => {
    const pos = terreno.geometry.getAttribute('position')
    const v = new Vector3()
    let maisLonge = 0
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(terreno.matrixWorld)
      if (v.y < -0.9) continue
      const d = Math.hypot(v.x, v.z)
      expect(d).toBeLessThan(raioDoChaoDaIlha(BOSQUE, v.x, v.z) + 0.35)
      maisLonge = Math.max(maisLonge, d)
    }
    // O chão vai até perto do maior raio da conta (a ponta de campo).
    expect(maisLonge).toBeGreaterThan(RAIO_DO_BOSQUE - 0.6)
    expect(RAIO_DO_BOSQUE).toBeGreaterThan(RAIO_DA_ILHA_DO_ANEL + 8)
  })

  test('a chegada da ponte não mudou de lugar', () => {
    const c = raiz.getObjectByName('chegada')!.position
    expect(c.x).toBeCloseTo(11.6, 5)
    expect(c.z).toBeCloseTo(0, 5)
    // Do lado da ponte o chão continua com o raio de antes.
    expect(raioDoChaoDaIlha(BOSQUE, 1, 0)).toBeLessThan(RAIO_DA_ILHA_DO_ANEL + 1.4 + 1)
  })

  test('do mundo para o modelo e de volta: a ponta de campo continua no -x do modelo', () => {
    const centro = { ...centroNoAnel(BOSQUE), y: 0 }
    const g = giroDaIlha(BOSQUE)
    const p = paraOMundo({ x: -18, y: 1, z: 2 }, centro, g, { x: 0, y: 0, z: 0 })
    const m = noModelo(p.x - centro.x, p.z - centro.z, g)
    expect(m.x).toBeCloseTo(-18, 6)
    expect(m.z).toBeCloseTo(2, 6)
    expect(raioDoChaoDaIlha(BOSQUE, m.x, m.z)).toBeGreaterThan(Math.hypot(-18, 2))
  })

  test('a roda de boias passa por fora de todo o chão, com o mar livre em volta', () => {
    const roda = rodaDaIlhaNoModelo(BOSQUE, BOIAS)
    const folga = BOIAS - (RAIO_DA_ILHA_DO_ANEL + 1.4)
    const pos = terreno.geometry.getAttribute('position')
    const v = new Vector3()
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(terreno.matrixWorld)
      expect(Math.hypot(v.x - roda.x, v.z - roda.z)).toBeLessThan(roda.livre - folga + 0.4)
    }
    // O meio da roda vai para o lado da ponta de campo (o -x do modelo).
    expect(roda.x).toBeLessThan(-2)
  })

  test('o lote da cabana: plano, sem nada que colida e de céu aberto para o telhado', () => {
    const a = raiz.getObjectByName('lote-cabana-a')!.position
    const b = raiz.getObjectByName('lote-cabana-b')!.position
    expect(a.y).toBeCloseTo(1, 5)
    expect(b.y).toBeCloseTo(1, 5)
    const largura = b.x - a.x
    const fundo = b.z - a.z
    // Cabe uma cabana: pelo menos 6 × 8 células, inteiras.
    expect(Number.isInteger(a.x) && Number.isInteger(a.z) && Number.isInteger(b.x)).toBe(true)
    expect(Math.min(largura, fundo)).toBeGreaterThanOrEqual(6)
    expect(Math.max(largura, fundo)).toBeGreaterThanOrEqual(8)
    for (let x = a.x; x <= b.x; x += 0.5)
      for (let z = a.z; z <= b.z; z += 0.5) {
        expect({ x, z, chao: alturaDoChao(x, z) }).toEqual({ x, z, chao: expect.closeTo(1, 2) })
        // Nada no chão (até a altura de uma parede) nem em cima (deques, pontes, copas com colisor)
        // até a cumeeira de um telhado de duas águas.
        expect({ x, z, toca: naColuna(x, z, 1.05, 1 + TELHADO.altura + 3) }).toEqual({
          x,
          z,
          toca: [],
        })
      }
  })
})
