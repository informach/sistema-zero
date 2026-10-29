import { beforeAll, describe, expect, test } from 'bun:test'
import type { Mesh, Object3D } from 'three'
import type { ColisorDaIlha } from '../src/mundo/colisores-da-ilha'
import { lerColisores } from '../src/mundo/colisores-da-ilha'
import {
  type AncorasDaSubida,
  FLOCO_ACIMA_DO_CORPO,
  lerAncorasDaSubida,
  subidaNoModelo,
} from '../src/mundo/subida'
import { CORPO } from '../src/sistemas/corpo'
import {
  type CorpoNaCorrida,
  criarCorrida,
  estrelasDaCorrida,
  PERCURSO_DO_CUME,
  type PontosDoPercurso,
  passoDaCorrida,
} from '../src/sistemas/percurso'
import { arquivoDaIlha, carregarGlb, type Forma, gradeDeAndar } from './ajuda-colisores'

let ancoras: AncorasDaSubida
let pontos: PontosDoPercurso
let grade: ReturnType<typeof gradeDeAndar>
/** A altura do chão de andar em (x, z): o terreno com a trilha cavada e as formas baixas. */
const chao = (x: number, z: number) => grade.chaoEm(x, z) ?? Number.NaN

beforeAll(async () => {
  const raiz: Object3D = await carregarGlb(arquivoDaIlha('pico.glb'))
  raiz.updateMatrixWorld(true)
  const lidas = lerAncorasDaSubida((nome) => {
    const o = raiz.getObjectByName(nome)
    return o ? { x: o.position.x, y: o.position.y, z: o.position.z } : undefined
  })
  if (!lidas) throw new Error('faltam âncoras da subida no pico.glb')
  ancoras = lidas
  pontos = subidaNoModelo(lidas)
  const formas = lerColisores(raiz).filter((c: ColisorDaIlha): c is Forma => c.forma !== 'malha')
  grade = gradeDeAndar(raiz.getObjectByName('col-terreno') as Mesh, formas)
}, 120_000)

/** O comprimento da linha do meio da trilha, do pé ao platô. */
function comprimentoDaTrilha(): number {
  let total = 0
  for (let i = 0; i + 1 < ancoras.trilha.length; i++) {
    const a = ancoras.trilha[i]
    const b = ancoras.trilha[i + 1]
    if (a && b) total += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
  }
  return total
}

describe('a subida ao cume no pico.glb', () => {
  test('a largada fica no chão em volta da montanha, perto do pé da trilha', () => {
    expect(Math.abs(chao(pontos.largada.x, pontos.largada.z) - pontos.largada.y)).toBeLessThan(0.05)
    const pe = ancoras.trilha.at(-1)
    if (!pe) throw new Error('sem a linha da trilha')
    expect(Math.hypot(pontos.largada.x - pe.x, pontos.largada.z - pe.z)).toBeLessThan(
      PERCURSO_DO_CUME.distanciaParaDesistir,
    )
  })

  test('as paradas sobem pela trilha, cada uma no chão dela, e a chegada é o platô', () => {
    expect(pontos.deques).toHaveLength(4)
    let antes = pontos.largada.y
    for (const d of pontos.deques) {
      expect(d.y).toBeGreaterThan(antes)
      antes = d.y
      expect(Math.abs(chao(d.volta.x, d.volta.z) - d.y)).toBeLessThan(0.1)
    }
    // A última parada é a boca do platô, quase na altura dele (o platô é plano).
    expect(Math.abs(pontos.chegada.y - antes)).toBeLessThan(0.15)
    expect(Math.abs(chao(pontos.chegada.x, pontos.chegada.z) - pontos.chegada.y)).toBeLessThan(0.05)
  })

  test('a volta de cada parada olha para onde a trilha sobe', () => {
    // A última é a boca do platô: na frente dela o chão é plano.
    for (const d of pontos.deques.slice(0, -1)) {
      const frente = { x: d.x + Math.sin(d.rumoDaVolta), z: d.z + Math.cos(d.rumoDaVolta) }
      expect(chao(frente.x, frente.z)).toBeGreaterThan(d.y)
    }
  })

  test('cada floco fica sobre o chão da trilha, ao alcance de quem anda pela linha do meio', () => {
    expect(pontos.vagalumes).toHaveLength(PERCURSO_DO_CUME.vagalumes)
    for (const f of pontos.vagalumes) {
      const centro = chao(f.x, f.z) + CORPO.doCentroAoPe
      expect(f.y - centro).toBeCloseTo(FLOCO_ACIMA_DO_CORPO, 1)
      expect(f.y - centro).toBeLessThan(PERCURSO_DO_CUME.raioDoVagalume)
    }
  })

  test('o tempo da estrela fica para quem sobe andando sem parar, como nos outros percursos', () => {
    // Da largada ao pé da trilha, a trilha pela linha do meio e o platô até a bandeira.
    const pe = ancoras.trilha.at(-1)
    const topo = ancoras.trilha[1]
    if (!pe || !topo) throw new Error('sem a linha da trilha')
    const metros =
      Math.hypot(pe.x - ancoras.largada.x, pe.z - ancoras.largada.z) +
      comprimentoDaTrilha() -
      Math.hypot(topo.x - (ancoras.trilha[0]?.x ?? 0), topo.z - (ancoras.trilha[0]?.z ?? 0)) +
      Math.hypot(ancoras.cume.x - topo.x, ancoras.cume.z - topo.z)
    const alvo = PERCURSO_DO_CUME.tempoAlvoMs / 1000
    expect(metros / CORPO.andar).toBeLessThan(alvo)
    expect(alvo).toBeLessThan((metros / CORPO.andar) * 1.5)
  })

  test('uma subida inteira: as paradas, os flocos, a queda e a chegada com três estrelas', () => {
    const c = criarCorrida(pontos.vagalumes.length)
    const corpo: CorpoNaCorrida = { x: 0, y: 0, z: 0, pes: 0, noChaoDaIlha: false }
    const em = (p: { x: number; y: number; z: number }, noChao = false) => {
      corpo.x = p.x
      corpo.z = p.z
      corpo.pes = p.y
      corpo.y = p.y + CORPO.doCentroAoPe
      corpo.noChaoDaIlha = noChao
      return passoDaCorrida(c, corpo, pontos, 500, PERCURSO_DO_CUME)
    }
    expect(em(pontos.largada, true)).toBeNull()
    expect(em(pontos.deques[0] ?? pontos.largada)).toEqual({ tipo: 'deque', indice: 0 })
    // Caiu da trilha no chão em volta: volta para a primeira parada.
    expect(em(pontos.largada, true)).toEqual({ tipo: 'caiu', deque: 0 })
    let pegos = 0
    for (const f of pontos.vagalumes) {
      corpo.x = f.x
      corpo.y = f.y - FLOCO_ACIMA_DO_CORPO
      corpo.z = f.z
      corpo.pes = corpo.y - CORPO.doCentroAoPe
      corpo.noChaoDaIlha = false
      for (let i = 0; i < 3; i++) {
        const ev = passoDaCorrida(c, corpo, pontos, 100, PERCURSO_DO_CUME)
        if (ev?.tipo === 'vagalume') pegos++
      }
    }
    expect(pegos).toBe(pontos.vagalumes.length)
    for (const d of pontos.deques) em(d)
    expect(c.deque).toBe(pontos.deques.length - 1)
    expect(em(pontos.chegada)).toEqual({ tipo: 'chegou' })
    expect(estrelasDaCorrida(c, PERCURSO_DO_CUME)).toEqual({
      chegada: true,
      tempo: true,
      vagalumes: true,
    })
  })
})
