import { describe, expect, test } from 'bun:test'
import { type Bone, Box3, type Mesh, type Object3D, Bone as Osso, Skeleton, Vector3 } from 'three'
import {
  CANELA_DE,
  PE_ATE,
  PES_DOS_PATINS,
  patimNoEsqueleto,
  pesoDaCanela,
} from '../src/personagem/patins-nos-pes'
import { RODAS_ABAIXO_DA_SOLA } from '../src/sistemas/ajustes-da-arte'
import { carregarGlb } from './ajuda-colisores'

const PATINS = `${import.meta.dir}/../src/assets/movimento/patins.glb`
const PECAS = `${import.meta.dir}/../../community-kids/public/avatar3d/parts`

/** Um esqueleto com os ossos que os patins usam (a pose de referência na origem). */
function esqueleto(): Skeleton {
  const ossos: Bone[] = []
  for (const p of PES_DOS_PATINS)
    for (const nome of [p.pe, p.canela]) {
      const o = new Osso()
      o.name = nome
      ossos.push(o)
    }
  return new Skeleton(ossos)
}

describe('os pesos da bota', () => {
  test('embaixo só o pé, em cima só a canela, e a passagem é suave', () => {
    expect(pesoDaCanela(-0.1)).toBe(0)
    expect(pesoDaCanela(PE_ATE)).toBe(0)
    expect(pesoDaCanela(CANELA_DE)).toBe(1)
    expect(pesoDaCanela(1)).toBe(1)
    let antes = 0
    for (let y = PE_ATE; y <= CANELA_DE; y += 0.005) {
      const w = pesoDaCanela(y)
      expect(w).toBeGreaterThanOrEqual(antes)
      expect(w - antes).toBeLessThan(0.07)
      antes = w
    }
  })

  test('cada malha do patim vira malha com o esqueleto, rodas no pé e a boca na canela', async () => {
    const cena = await carregarGlb(PATINS)
    const sk = esqueleto()
    for (const p of PES_DOS_PATINS) {
      const no = cena.getObjectByName(p.peca)
      if (!no) throw new Error(`sem ${p.peca}`)
      const malhas = patimNoEsqueleto(no, sk, 1, p)
      expect(malhas.length).toBeGreaterThan(5)
      const pe = sk.bones.findIndex((b) => b.name === p.pe)
      const canela = sk.bones.findIndex((b) => b.name === p.canela)
      let rodas = 0
      let boca = 0
      for (const m of malhas) {
        expect(m.isSkinnedMesh).toBe(true)
        expect(m.skeleton).toBe(sk)
        const pos = m.geometry.attributes.position
        const idx = m.geometry.attributes.skinIndex
        const w = m.geometry.attributes.skinWeight
        if (!pos || !idx || !w) throw new Error('sem os atributos do esqueleto')
        for (let i = 0; i < pos.count; i++) {
          expect(idx.getX(i)).toBe(pe)
          expect(idx.getY(i)).toBe(canela)
          expect(w.getX(i) + w.getY(i)).toBeCloseTo(1, 6)
          if (pos.getY(i) < 0) {
            rodas++
            expect(w.getY(i)).toBe(0)
          }
          if (pos.getY(i) > CANELA_DE) {
            boca++
            expect(w.getX(i)).toBe(0)
          }
        }
        m.geometry.dispose()
      }
      expect(rodas).toBeGreaterThan(100)
      expect(boca).toBeGreaterThan(20)
    }
  })
})

/** Os vértices das peças do avatar do lado esquerdo (x > 0) abaixo de `altura`. */
async function pontosDasPecas(nomes: string[], altura: number): Promise<Vector3[]> {
  const pontos: Vector3[] = []
  for (const n of nomes) {
    const r = await carregarGlb(`${PECAS}/${n}.glb`)
    // O avatar usa só a geometria de cada peça (no referencial do esqueleto), sem os nós do arquivo.
    r.traverse((o) => {
      const m = o as Mesh
      if (!m.isMesh) return
      const pos = m.geometry.attributes.position
      if (!pos) return
      for (let i = 0; i < pos.count; i++) {
        const v = new Vector3().fromBufferAttribute(pos, i)
        if (v.x > 0.01 && v.y < altura) pontos.push(v)
      }
    })
  }
  return pontos
}

/** Os vértices do casco da bota (sem a sola nem o chassi) de um patim, no referencial do avatar. */
function cascoDaBota(no: Object3D): Vector3[] {
  const pontos: Vector3[] = []
  no.updateMatrixWorld(true)
  no.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh) return
    const pos = m.geometry.attributes.position
    const mats = Array.isArray(m.material) ? m.material : [m.material]
    if (!pos || !mats.some((x) => x.name === 'patim' || x.name === 'patimClaro')) return
    for (let i = 0; i < pos.count; i++)
      pontos.push(new Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld))
  })
  return pontos
}

type P2 = [number, number]

/** O fecho convexo no plano (x, z), pelo método da corrente monótona. */
function fecho(pontos: P2[]): P2[] {
  const p = [...pontos].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const giro = (o: P2, a: P2, b: P2) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const baixo: P2[] = []
  for (const q of p) {
    while (
      baixo.length >= 2 &&
      giro(baixo[baixo.length - 2] as P2, baixo[baixo.length - 1] as P2, q) <= 0
    )
      baixo.pop()
    baixo.push(q)
  }
  const cima: P2[] = []
  for (const q of p.reverse()) {
    while (
      cima.length >= 2 &&
      giro(cima[cima.length - 2] as P2, cima[cima.length - 1] as P2, q) <= 0
    )
      cima.pop()
    cima.push(q)
  }
  return [...baixo.slice(0, -1), ...cima.slice(0, -1)]
}

function dentroDoFecho(h: P2[], q: P2): boolean {
  for (let i = 0; i < h.length; i++) {
    const a = h[i] as P2
    const b = h[(i + 1) % h.length] as P2
    if ((b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]) < 0) return false
  }
  return true
}

describe('a bota no avatar', () => {
  test('a calça, a perna e as fantasias de bicho cabem dentro da bota até o fundo acolchoado', async () => {
    const cena = await carregarGlb(PATINS)
    const no = cena.getObjectByName('patim-esq')
    if (!no) throw new Error('sem patim-esq')
    const casco = cascoDaBota(no)
    // O contorno da bota em cada altura: o fecho dos vértices do casco numa faixa em volta dela (as
    // paredes são quase retas; a faixa pega os anéis de cima e de baixo).
    const contorno = (y: number) =>
      fecho(casco.filter((v) => Math.abs(v.y - y) < 0.045).map((v): P2 => [v.x, v.z]))
    const contornos = new Map<number, P2[]>()
    // Até onde a perna fica escondida (o fundo acolchoado logo abaixo da boca, na frente).
    const fundo = 0.16
    // Vestidos e saias longas (bottom-03, bottom-05, outfit-01, outfit-06) passam por fora da bota.
    const pontos = await pontosDasPecas(
      ['bottom-01', 'bottom-02', 'bottom-04', 'outfit-02', 'outfit-03', 'outfit-04', 'outfit-05'],
      fundo,
    )
    expect(pontos.length).toBeGreaterThan(1000)
    let fora = 0
    for (const v of pontos) {
      // O rabo do gato fica atrás da perna, alto: fora da conta. Abaixo da sola não há bota.
      if (v.z < -0.25 || v.y < 0.02) continue
      const k = Math.round(v.y / 0.02)
      let h = contornos.get(k)
      if (!h) {
        h = contorno(k * 0.02)
        contornos.set(k, h)
      }
      if (!dentroDoFecho(h, [v.x, v.z])) fora++
    }
    expect(fora).toBe(0)
  })

  test('as rodinhas ficam abaixo da sola o tanto que o jogo conta', async () => {
    const cena = await carregarGlb(PATINS)
    const caixa = new Box3().setFromObject(cena, true)
    expect(caixa.min.y).toBeCloseTo(-RODAS_ABAIXO_DA_SOLA, 2)
  })
})
