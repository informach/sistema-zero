import { beforeAll, describe, expect, test } from 'bun:test'
import type { Object3D } from 'three'
import { Vector3 } from 'three'
import { type ColisorDaIlha, lerColisores, soParaOCorpo } from '../src/mundo/colisores-da-ilha'
import { NIVEL_DA_AGUA } from '../src/mundo/medidas'
import { CORPO } from '../src/sistemas/corpo'
import { CINTURA } from '../src/sistemas/modos/chao'
import {
  arquivoDaIlha,
  bate,
  CENTRO_DO_CORPO,
  carregarGlb,
  type Forma,
  grupo,
  jsonDoGlb,
  TAMPO,
  topoEm,
} from './ajuda-colisores'

const ARQUIVO = arquivoDaIlha('recife.glb')
/** Nadando, a cintura fica na linha da água: o meio do corpo fica acima dela por isto. */
const NADANDO = NIVEL_DA_AGUA - CINTURA + CENTRO_DO_CORPO

let raiz: Object3D
let colisores: ColisorDaIlha[]
let formas: Forma[]
const ancora = (nome: string) => {
  const o = raiz.getObjectByName(nome)
  if (!o) throw new Error(`sem a âncora ${nome}`)
  return o.position
}
const doGrupo = (g: string) => formas.filter((c) => grupo(c.nome) === g)
const quemBate = (p: Vector3) => formas.find((c) => bate(c, p))?.nome

beforeAll(async () => {
  raiz = await carregarGlb(ARQUIVO)
  colisores = lerColisores(raiz)
  formas = colisores.filter((c): c is Forma => c.forma !== 'malha')
})

describe('os nós col-* do Recife', () => {
  test('existem todos os grupos, sem material (não desenham)', () => {
    const doc = jsonDoGlb(ARQUIVO)
    const nos = doc.nodes.filter((n) => n.name?.startsWith('col-'))
    const grupos = new Set(nos.map((n) => grupo(n.name ?? '')))
    for (const g of [
      'col-terreno',
      'col-cil-casa-mare',
      'col-cil-poste-luneta',
      'col-mesa',
      'col-cavalete',
      'col-cil-cesto',
      'col-cais',
      'col-cil-estaca',
      'col-cil-poste',
      'col-caixote',
      'col-cil-rocha-caverna',
      'col-arco-caverna',
      'col-cil-teto-caverna',
      'col-cil-chao-caverna',
      'col-cil-tronco',
      'col-cil-coral',
      'col-cil-pedra',
      'col-cil-castelo',
    ]) {
      expect(grupos.has(g)).toBe(true)
    }
    for (const n of nos) {
      for (const p of doc.meshes[n.mesh ?? -1]?.primitives ?? []) expect(p.material).toBeUndefined()
    }
    expect(colisores.length).toBe(nos.length)
  })

  test('caixa, cilindro e malha saem do nome; o chão fica no tampo', () => {
    for (const c of colisores) {
      if (c.nome === 'col-terreno') expect(c.forma).toBe('malha')
      else if (c.nome.startsWith('col-cil-')) expect(c.forma).toBe('cilindro')
      else expect(c.forma).toBe('caixa')
    }
    const chao = colisores.find((c) => c.forma === 'malha')
    if (chao?.forma !== 'malha') throw new Error('sem chão')
    let topo = -Infinity
    for (let i = 1; i < chao.vertices.length; i += 3) topo = Math.max(topo, chao.vertices[i] ?? 0)
    expect(topo).toBeCloseTo(TAMPO, 2)
  })

  test('a chegada da ponte fica livre e ninguém tapa a Maré, os Lumis e a lagoa', () => {
    const chegada = ancora('chegada')
    for (let x = 5.5; x <= chegada.x; x += 0.25) {
      expect(quemBate(new Vector3(x, TAMPO + CENTRO_DO_CORPO, 0))).toBeUndefined()
    }
    for (const nome of ['morador', 'lumi-1', 'lumi-2', 'lumi-3', 'lumi-4', 'casa-mare', 'lagoa']) {
      const a = ancora(nome)
      expect(quemBate(new Vector3(a.x, a.y + CENTRO_DO_CORPO, a.z))).toBeUndefined()
    }
  })

  test('o cais se anda da areia até a ponta, sem nada no caminho, e a ponta fica no deque', () => {
    const [cais] = doGrupo('col-cais')
    if (cais?.forma !== 'caixa') throw new Error('sem o deque do cais')
    const ponta = ancora('cais')
    const deque = cais.posicao[1] + cais.meio[1]
    expect(topoEm(cais, ponta.x, ponta.z)).toBeCloseTo(ponta.y + 0.04, 2)
    // Da beira da ilha (raio 12) até a ponta: piso contínuo e corpo livre, pelo lado do deque sem o
    // caixote (ele ocupa um lado; do outro sobra mais de um metro).
    const ini = new Vector3(2.8, 0, -9.4).setLength(12)
    const fim = new Vector3(ponta.x, 0, ponta.z)
    const rumo = fim.clone().sub(ini).normalize()
    const lado = new Vector3(-rumo.z, 0, rumo.x)
    const [caixote] = doGrupo('col-caixote')
    if (!caixote) throw new Error('sem o caixote do cais')
    const doCaixote = new Vector3(caixote.posicao[0], 0, caixote.posicao[2]).sub(ini).dot(lado)
    lado.multiplyScalar(doCaixote > 0 ? -0.3 : 0.3)
    const passos = 60
    for (let i = 0; i <= passos; i++) {
      const p = ini
        .clone()
        .lerp(fim, i / passos)
        .add(lado)
      expect(topoEm(cais, p.x, p.z)).toBeCloseTo(deque, 2)
      expect(quemBate(new Vector3(p.x, deque + CENTRO_DO_CORPO + 0.02, p.z))).toBeUndefined()
    }
  })

  test('do mergulho à caverna se nada sem bater: a boca, o salão e o tesouro', () => {
    const mergulho = ancora('mergulho')
    expect(quemBate(new Vector3(mergulho.x, NADANDO, mergulho.z))).toBeUndefined()
    const entrada = ancora('caverna-entrada')
    const salao = ancora('caverna')
    const tesouro = ancora('caverna-tesouro')
    // Um pouco para fora da boca até o meio do salão e até o mexilhão.
    const fora = new Vector3(entrada.x - 2, 0, entrada.z)
    for (const [de, ate] of [
      [fora, salao],
      [salao, tesouro],
    ] as const) {
      for (let i = 0; i <= 40; i++) {
        const x = de.x + ((ate.x - de.x) * i) / 40
        const z = de.z + ((ate.z - de.z) * i) / 40
        expect(quemBate(new Vector3(x, NADANDO, z))).toBeUndefined()
      }
    }
    // A cabeça passa por baixo do arco e do teto (a cápsula vai a 1,8 do pé).
    const [arco] = doGrupo('col-arco-caverna')
    const [teto] = doGrupo('col-cil-teto-caverna')
    if (arco?.forma !== 'caixa' || teto?.forma !== 'cilindro') throw new Error('sem arco ou teto')
    const cabeca = NIVEL_DA_AGUA - CINTURA + 2 * CORPO.meiaAltura + 2 * CORPO.raio
    expect(arco.posicao[1] - arco.meio[1]).toBeGreaterThan(cabeca + 0.2)
    expect(teto.posicao[1] - teto.meiaAltura).toBeGreaterThan(cabeca + 0.2)
  })

  test('o teto da caverna é um morrinho que se pisa', () => {
    const [teto] = doGrupo('col-cil-teto-caverna')
    if (teto?.forma !== 'cilindro') throw new Error('sem teto')
    const salao = ancora('caverna')
    // Ao lado do coqueiro, em cima da areia do teto (2,65 no desenho).
    expect(topoEm(teto, salao.x - 1, salao.z)).toBeCloseTo(2.645, 2)
  })

  test('peça fina segura só o corpo; casa, pedras, rochas e corais tapam a câmera', () => {
    for (const g of ['col-cil-estaca', 'col-cil-poste', 'col-cil-poste-luneta']) {
      for (const c of doGrupo(g)) expect(soParaOCorpo(c.nome)).toBe(true)
    }
    for (const g of [
      'col-cil-casa-mare',
      'col-cil-pedra',
      'col-cil-rocha-caverna',
      'col-cil-coral',
    ]) {
      for (const c of doGrupo(g)) expect(soParaOCorpo(c.nome)).toBe(false)
    }
  })

  test('cesto, caixote e castelinho seguram o corpo (não se sobem andando)', () => {
    for (const c of [...doGrupo('col-cil-cesto'), ...doGrupo('col-cil-castelo')]) {
      if (c.forma !== 'cilindro') throw new Error(c.nome)
      expect(c.posicao[1] + c.meiaAltura - TAMPO).toBeGreaterThan(0.65)
    }
    const [caixote] = doGrupo('col-caixote')
    const [cais] = doGrupo('col-cais')
    if (caixote?.forma !== 'caixa' || cais?.forma !== 'caixa') throw new Error('sem caixote')
    expect(caixote.posicao[1] + caixote.meio[1] - (cais.posicao[1] + cais.meio[1])).toBeGreaterThan(
      0.65,
    )
  })
})
