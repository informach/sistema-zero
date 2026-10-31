import { beforeAll, describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import { ilhasDoAnel } from '@sistemazero/arquipelago-contracts'
import { Box3, type Mesh, type MeshStandardMaterial, type Object3D } from 'three'
import {
  ARVORES,
  COLISORES_DO_FAROL,
  deslocar,
  GRUPOS,
  posicaoDoCanteiro,
} from '../src/mundo/colisao-da-ilha-central'
import { lerColisores } from '../src/mundo/colisores-da-ilha'
import { lugarDoQuadroNaSuaIlha, lugarDoQuadroNoFarol } from '../src/mundo/lugar-do-quadro'
import {
  alturaDaIlha,
  BANCADA,
  CATA_VENTO,
  FAROL,
  PIER,
  RAIO_DO_GRAMADO,
  trajetoDaPonte,
} from '../src/mundo/medidas'
import { CHAVES_DA_CASA } from '../src/sistemas/chaves-da-casa'
import { LOTE_DA_CASA_GRANDE } from '../src/sistemas/construcao/lote'
import { CORPO } from '../src/sistemas/corpo'
import { SEGREDOS } from '../src/sistemas/segredos'
import { carregarGlb, type Forma } from './ajuda-colisores'

/**
 * A florada da sua ilha (`florada.glb`, `arte/mundo/florada.py`): três níveis de flores e moitinhas
 * (cada um um canteirinho para o jogo copiar em cada ponto) e os 24 pontos onde podem nascer, no
 * gramado, longe de tudo o que já mora na ilha.
 */

const MUNDO = join(import.meta.dir, '..', 'src', 'assets', 'mundo')
/** O raio do canteirinho de um nível (o maior). */
const RAIO = 0.9
const TRILHAS: [number, number][][] = [
  [
    [-0.5, 12.8],
    [-2, 15],
    [-4, 18],
    [-5, 24.5],
  ],
  [
    [-0.5, 12.8],
    [3, 13.3],
    [5.4, 13.4],
  ],
]

let raiz: Object3D
let pontos: { nome: string; x: number; y: number; z: number }[]
let doTerreno: Forma[]
let daSubida: Forma[]
let doCipo: Forma[]

function triangulos(no: Object3D): number {
  let n = 0
  no.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh) return
    n += (m.geometry.index?.count ?? m.geometry.getAttribute('position').count) / 3
  })
  return n
}

/** Triângulos com material de pétala (as flores e os botões das moitinhas). */
function petalas(no: Object3D): number {
  let n = 0
  no.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh || !(m.material as MeshStandardMaterial).name.startsWith('petala')) return
    n += (m.geometry.index?.count ?? m.geometry.getAttribute('position').count) / 3
  })
  return n
}

function distanciaAoSegmento(x: number, z: number, a: [number, number], b: [number, number]) {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)))
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t)
}

function raioEfetivo(x: number, z: number): number {
  const a = Math.atan2(z, x)
  return Math.hypot(x, z) / (1 + 0.06 * Math.sin(a * 3 + 1) + 0.04 * Math.sin(a * 7 + 2))
}

const solidos = (r: Object3D) => lerColisores(r).filter((c): c is Forma => c.forma !== 'malha')

beforeAll(async () => {
  raiz = await carregarGlb(join(MUNDO, 'florada.glb'))
  raiz.updateMatrixWorld(true)
  pontos = []
  for (let i = 1; i <= 24; i++) {
    const o = raiz.getObjectByName(`ponto-florada-${i}`)
    if (o) pontos.push({ nome: o.name, x: o.position.x, y: o.position.y, z: o.position.z })
  }
  doTerreno = solidos(await carregarGlb(join(MUNDO, 'terreno.glb')))
  const farol = solidos(await carregarGlb(join(MUNDO, 'farol.glb')))
  daSubida = deslocar(
    [...COLISORES_DO_FAROL, ...farol.filter((c) => /subida|escada-reta/.test(c.nome))],
    GRUPOS.farol,
  ) as Forma[]
  doCipo = solidos(await carregarGlb(join(MUNDO, 'segredos-da-ilha.glb')))
})

describe('a florada da sua ilha', () => {
  test('três níveis, cada um até 3 mil triângulos, cada vez mais florido', () => {
    let antes = 0
    for (let i = 1; i <= 3; i++) {
      const no = raiz.getObjectByName(`florada-${i}`)
      expect(no, `florada-${i}`).toBeDefined()
      if (!no) continue
      expect(triangulos(no)).toBeLessThanOrEqual(3000)
      expect(petalas(no), `florada-${i}`).toBeGreaterThan(antes)
      antes = petalas(no)
    }
  })

  test('cada nível cabe no canteirinho e é miúdo do chão (não colide, o corpo passa por cima)', () => {
    for (let i = 1; i <= 3; i++) {
      const no = raiz.getObjectByName(`florada-${i}`) as Object3D
      const caixa = new Box3().setFromObject(no)
      expect(Math.max(-caixa.min.x, caixa.max.x, -caixa.min.z, caixa.max.z)).toBeLessThanOrEqual(
        RAIO,
      )
      expect(caixa.max.y).toBeLessThan(CORPO.degrau)
      expect(caixa.min.y).toBeGreaterThan(-0.1)
    }
    let colisores = 0
    raiz.traverse((o) => {
      if (o.name.startsWith('col-')) colisores++
    })
    expect(colisores).toBe(0)
  })

  test('24 pontos no chão do gramado, a pelo menos 2,6 m um do outro', () => {
    expect(pontos).toHaveLength(24)
    for (const p of pontos) {
      expect(Math.abs(p.y - alturaDaIlha(p.x, p.z)), p.nome).toBeLessThan(0.01)
      // O canteirinho inteiro no gramado (a borda dele fica antes da praia).
      expect(raioEfetivo(p.x, p.z) + RAIO, p.nome).toBeLessThan(RAIO_DO_GRAMADO - 0.8)
      for (const q of pontos)
        if (q !== p)
          expect(Math.hypot(p.x - q.x, p.z - q.z), `${p.nome} x ${q.nome}`).toBeGreaterThan(2.5)
    }
  })

  test('longe da casa, da horta, da bancada, do cata-vento, do píer e do Farol', () => {
    const a = LOTE_DA_CASA_GRANDE.area
    for (const p of pontos) {
      const fora = Math.max(a.x0 - p.x, p.x - a.x1, a.z0 - p.z, p.z - a.z1)
      expect(fora, p.nome).toBeGreaterThan(RAIO)
      for (let i = 0; i < 6; i++) {
        const c = posicaoDoCanteiro(i)
        expect(Math.hypot(p.x - c.x, p.z - c.z), p.nome).toBeGreaterThan(RAIO + 1.5)
      }
      expect(Math.hypot(p.x - BANCADA.x, p.z - BANCADA.z), p.nome).toBeGreaterThan(RAIO + 1.6)
      expect(Math.hypot(p.x - CATA_VENTO.x, p.z - CATA_VENTO.z), p.nome).toBeGreaterThan(RAIO + 1.4)
      // O píer e o caminho até ele na areia (x de -7 a -3, z depois de 22).
      const pier = Math.max(PIER.x - 2 - p.x, p.x - (PIER.x + 2), PIER.z - 5 - p.z)
      expect(pier, p.nome).toBeGreaterThan(RAIO)
      expect(Math.hypot(p.x - FAROL.x, p.z - FAROL.z), p.nome).toBeGreaterThan(5)
      for (const c of daSubida) {
        const meia = c.forma === 'caixa' ? Math.hypot(c.meio[0], c.meio[2]) : c.raio
        expect(
          Math.hypot(p.x - c.posicao[0], p.z - c.posicao[2]) - meia,
          `${p.nome} x ${c.nome}`,
        ).toBeGreaterThan(RAIO)
      }
    }
  })

  test('fora das trilhas e das pontes, das árvores, das moitas e das pedras', () => {
    for (const p of pontos) {
      for (const t of TRILHAS)
        for (let i = 0; i + 1 < t.length; i++)
          expect(
            distanciaAoSegmento(p.x, p.z, t[i] as [number, number], t[i + 1] as [number, number]),
            p.nome,
          ).toBeGreaterThan(RAIO + 0.6)
      for (const ilha of ilhasDoAnel())
        for (const q of trajetoDaPonte(ilha))
          expect(
            Math.hypot(p.x - q.x, p.z - q.z),
            `${p.nome} x ponte de ${ilha.id}`,
          ).toBeGreaterThan(RAIO + 1.6)
      for (const [x, z, s] of ARVORES)
        expect(Math.hypot(p.x - x, p.z - z), `${p.nome} x árvore`).toBeGreaterThan(1.9 * s)
      for (const c of doTerreno) {
        const r = c.forma === 'cilindro' ? c.raio : Math.hypot(c.meio[0], c.meio[2])
        expect(
          Math.hypot(p.x - c.posicao[0], p.z - c.posicao[2]) - r,
          `${p.nome} x ${c.nome}`,
        ).toBeGreaterThan(RAIO)
      }
    }
  })

  test('longe das chaves, do segredo, dos quadros e do segredo do cipó', () => {
    for (const p of pontos) {
      for (const k of CHAVES_DA_CASA)
        expect(Math.hypot(p.x - k.x, p.z - k.z), `${p.nome} x ${k.nome}`).toBeGreaterThan(RAIO + 1)
      for (const s of SEGREDOS.filter((s) => s.ilha === 'sua-ilha'))
        expect(Math.hypot(p.x - s.x, p.z - s.z), `${p.nome} x ${s.id}`).toBeGreaterThan(RAIO + 1.2)
      for (const q of [lugarDoQuadroNaSuaIlha(), lugarDoQuadroNoFarol()]) {
        expect(Math.hypot(p.x - q.x, p.z - q.z), p.nome).toBeGreaterThan(RAIO + 1.5)
        // E da frente dele, onde a criança fica para pintar.
        const fx = q.x + Math.sin(q.giro) * 1.6
        const fz = q.z + Math.cos(q.giro) * 1.6
        expect(Math.hypot(p.x - fx, p.z - fz), p.nome).toBeGreaterThan(RAIO + 0.6)
      }
      for (const c of doCipo) {
        const r = c.forma === 'cilindro' ? c.raio : Math.hypot(c.meio[0], c.meio[2])
        expect(
          Math.hypot(p.x - c.posicao[0], p.z - c.posicao[2]) - r,
          `${p.nome} x ${c.nome}`,
        ).toBeGreaterThan(RAIO + 1)
      }
    }
  })
})
