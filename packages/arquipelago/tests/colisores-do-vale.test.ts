import { beforeAll, describe, expect, test } from 'bun:test'
import type { Mesh, Object3D } from 'three'
import { lerColisores, soParaOCorpo } from '../src/mundo/colisores-da-ilha'
import {
  arquivoDaIlha,
  carregarGlb,
  type Forma,
  gradeDeAndar,
  grupo,
  jsonDoGlb,
  TAMPO,
} from './ajuda-colisores'

/**
 * O Vale dos Dinos (`arte/ilhas-b/vale.py`, aj-ligar-01): o vulcão no chão de colisão (as encostas
 * não se sobem) e as peças com formas simples. A busca em grade confere que a criança anda da
 * chegada da ponte até cada lugar e que não chega à cratera.
 */
const ARQUIVO = arquivoDaIlha('vale-dos-dinos.glb')

let raiz: Object3D
let grade: ReturnType<typeof gradeDeAndar>
const ancora = (nome: string) => {
  const o = raiz.getObjectByName(nome)
  if (!o) throw new Error(`sem a âncora ${nome}`)
  return o.position
}

beforeAll(async () => {
  raiz = await carregarGlb(ARQUIVO)
  raiz.updateMatrixWorld(true)
  const formas = lerColisores(raiz).filter((c): c is Forma => c.forma !== 'malha')
  const terreno = raiz.getObjectByName('col-terreno') as Mesh | undefined
  if (!terreno?.isMesh) throw new Error('vale-dos-dinos.glb sem col-terreno')
  grade = gradeDeAndar(terreno, formas)
}, 120_000)

describe('os nós col-* do Vale dos Dinos', () => {
  test('existem todos os grupos, sem material (não desenham)', () => {
    const doc = jsonDoGlb(ARQUIVO)
    const nos = doc.nodes.filter((n) => n.name?.startsWith('col-'))
    const quantos = (g: string) => nos.filter((n) => grupo(n.name ?? '') === g).length
    expect({
      terreno: quantos('col-terreno'),
      pedrasDoVulcao: quantos('col-cil-pedra-vulcao'),
      pedras: quantos('col-cil-pedra'),
      ninhos: quantos('col-cil-ninho'),
      samambaias: quantos('col-cil-moita-samambaia'),
      cavalinhas: quantos('col-cil-moita-cavalinha'),
      coqueiros: quantos('col-cil-coqueiro'),
      observatorio: quantos('col-cil-observatorio'),
      varanda: quantos('col-cil-varanda'),
      cupula: quantos('col-cil-cupula'),
      degraus: quantos('col-degrau-observatorio'),
      postesDaCerca: quantos('col-cil-poste-cerca'),
      cordasDaCerca: quantos('col-guarda-cerca'),
      cranio: quantos('col-cranio'),
      costelas: quantos('col-costelas'),
      lampioes: quantos('col-cil-poste-lampiao'),
    }).toEqual({
      terreno: 1,
      pedrasDoVulcao: 7,
      pedras: 4,
      ninhos: 3,
      samambaias: 10,
      cavalinhas: 4,
      coqueiros: 3,
      observatorio: 1,
      varanda: 1,
      cupula: 1,
      degraus: 3,
      postesDaCerca: 10,
      // Dez postes e nove cordas: entre o 5º e o 6º fica a entrada da escavação.
      cordasDaCerca: 9,
      cranio: 1,
      costelas: 1,
      lampioes: 3,
    })
    for (const n of nos) {
      if (n.mesh === undefined) continue
      for (const p of doc.meshes[n.mesh]?.primitives ?? []) expect(p.material).toBeUndefined()
    }
  })

  test('a câmera passa pelas plantas, pela cerca e pelos postes; o observatório a segura', () => {
    expect(soParaOCorpo('col-cil-moita-samambaia-1')).toBe(true)
    expect(soParaOCorpo('col-cil-moita-cavalinha-1')).toBe(true)
    expect(soParaOCorpo('col-guarda-cerca-1')).toBe(true)
    expect(soParaOCorpo('col-cil-poste-cerca-1')).toBe(true)
    expect(soParaOCorpo('col-cil-observatorio-1')).toBe(false)
  })
})

describe('andando no Vale', () => {
  test('da chegada da ponte, a criança chega a cada lugar', () => {
    const chegada = ancora('chegada')
    const andou = grade.alcance(chegada.x, chegada.z)
    const lugares: [string, number][] = [
      ['observatorio', 0.5],
      ['pe-do-vulcao', 0.5],
      ['morador', 0.5],
      ['lumi-1', 0.5],
      ['lumi-2', 0.5],
      ['lumi-3', 0.5],
      ['lumi-4', 0.5],
      // Os ninhos (1,2 de raio): chega-se à beira.
      ['ninho-1', 1.8],
      ['ninho-2', 1.8],
      ['ninho-3', 1.8],
    ]
    for (const [nome, perto] of lugares) {
      const p = ancora(nome)
      expect([nome, grade.chegaPerto(andou, p.x, p.z, perto)]).toEqual([nome, true])
    }
  })

  test('na escavação, entra-se pela abertura da cerca', () => {
    const chegada = ancora('chegada')
    const escavacao = ancora('escavacao')
    const andou = grade.alcance(chegada.x, chegada.z)
    // Dentro da cerca (elipse de 3,6 × 2,8), em volta do esqueleto.
    const dentro = [...andou].filter((i) => {
      const { x, z } = grade.centro(i)
      return ((x - escavacao.x) / 3.3) ** 2 + ((z - escavacao.z) / 2.5) ** 2 < 1
    })
    expect(dentro.length).toBeGreaterThan(20)
  })

  test('a cratera não se alcança: as encostas do vulcão não se sobem', () => {
    const chegada = ancora('chegada')
    const andou = grade.alcance(chegada.x, chegada.z)
    let maisAlto = 0
    for (const i of andou) maisAlto = Math.max(maisAlto, grade.celulas[i]?.y ?? 0)
    // O facetado deixa subir uns 0,8 m no pé do vulcão; a cratera fica a 6,5 m.
    expect(maisAlto - TAMPO).toBeLessThan(1.2)
  })

  test('as âncoras dos lugares ficam em chão plano, fora do vulcão', () => {
    for (const nome of [
      'morador',
      'lumi-1',
      'lumi-2',
      'lumi-3',
      'lumi-4',
      'observatorio',
      'pe-do-vulcao',
    ]) {
      const p = ancora(nome)
      expect([nome, Math.abs((grade.chaoEm(p.x, p.z) ?? 0) - TAMPO) < 0.15]).toEqual([nome, true])
    }
  })
})
