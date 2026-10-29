import { beforeAll, describe, expect, test } from 'bun:test'
import type { Mesh, Object3D } from 'three'
import { type ColisorDaIlha, lerColisores, soParaOCorpo } from '../src/mundo/colisores-da-ilha'
import { GRAVIDADE } from '../src/mundo/medidas'
import { alcanceDoPulo, beiradaMaximaDoPulo, CORPO } from '../src/sistemas/corpo'
import {
  arquivoDaIlha,
  carregarGlb,
  type Forma,
  gradeDeAndar,
  grupo,
  jsonDoGlb,
  TAMPO,
  topoDaForma,
} from './ajuda-colisores'

/**
 * A Ilha das Nuvens (`arte/ilhas-b/nuvens.py`, aj-ligar-10): o chão que flutua, as peças com formas
 * simples, os degraus de nuvem e o tampo de cada plataforma flutuante (`col-cil-plataforma-N`, no
 * lugar do nó `plataforma-N`, que o jogo vai mover). No arquivo a ilha está no tampo de sempre
 * (y = 1); no jogo ela fica num grupo a y = 7.
 */
const ARQUIVO = arquivoDaIlha('nuvens.glb')

let raiz: Object3D
let colisores: ColisorDaIlha[]
let formas: Forma[]
let grade: ReturnType<typeof gradeDeAndar>
const ancora = (nome: string) => {
  const o = raiz.getObjectByName(nome)
  if (!o) throw new Error(`sem a âncora ${nome}`)
  return o.position
}
const forma = (nome: string) => {
  const f = formas.find((c) => c.nome === nome)
  if (!f) throw new Error(`sem o colisor ${nome}`)
  return f
}

beforeAll(async () => {
  raiz = await carregarGlb(ARQUIVO)
  raiz.updateMatrixWorld(true)
  colisores = lerColisores(raiz)
  formas = colisores.filter((c): c is Forma => c.forma !== 'malha')
  const terreno = raiz.getObjectByName('col-terreno') as Mesh | undefined
  if (!terreno?.isMesh) throw new Error('nuvens.glb sem col-terreno')
  grade = gradeDeAndar(terreno, formas)
}, 120_000)

describe('os nós col-* das Nuvens', () => {
  test('existem todos os grupos, sem material (não desenham)', () => {
    const doc = jsonDoGlb(ARQUIVO)
    const nos = doc.nodes.filter((n) => n.name?.startsWith('col-'))
    const quantos = (g: string) => nos.filter((n) => grupo(n.name ?? '') === g).length
    expect({
      terreno: quantos('col-terreno'),
      tear: quantos('col-tear'),
      banquinho: quantos('col-banquinho'),
      troncoDoNinho: quantos('col-cil-tronco-ninho'),
      fundoDoNinho: quantos('col-cil-ninho-fundo'),
      bordaDoNinho: quantos('col-guarda-ninho'),
      copasDoNinho: quantos('col-cil-copa-ninho'),
      moitasDeNuvem: quantos('col-cil-moita-nuvem'),
      pesDoArcoIris: quantos('col-pe-arco-iris'),
      degrausDeNuvem: quantos('col-cil-degrau-nuvem'),
      cataventos: quantos('col-cil-poste-cataventos'),
      troncos: quantos('col-cil-tronco'),
      copas: quantos('col-cil-copa'),
      posteDoBalao: quantos('col-cil-poste-balao'),
      lampioes: quantos('col-cil-poste-lampiao'),
    }).toEqual({
      terreno: 1,
      tear: 1,
      banquinho: 1,
      troncoDoNinho: 1,
      fundoDoNinho: 1,
      bordaDoNinho: 10,
      copasDoNinho: 3,
      moitasDeNuvem: 8,
      pesDoArcoIris: 2,
      degrausDeNuvem: 3,
      cataventos: 4,
      troncos: 4,
      copas: 4,
      posteDoBalao: 1,
      lampioes: 2,
    })
    expect(quantos('col-cil-plataforma')).toBe(4)
    for (let i = 1; i <= 4; i++)
      expect(nos.some((n) => n.name === `col-cil-plataforma-${i}`)).toBe(true)
    for (const n of nos) {
      if (n.mesh === undefined) continue
      for (const p of doc.meshes[n.mesh]?.primitives ?? []) expect(p.material).toBeUndefined()
    }
  })

  test('a câmera passa pelas nuvens, copas, borda do ninho e postes; o tear a segura', () => {
    expect(soParaOCorpo('col-cil-moita-nuvem-1')).toBe(true)
    expect(soParaOCorpo('col-cil-copa-1')).toBe(true)
    expect(soParaOCorpo('col-guarda-ninho-1')).toBe(true)
    expect(soParaOCorpo('col-cil-poste-balao-1')).toBe(true)
    expect(soParaOCorpo('col-tear-1')).toBe(false)
  })
})

describe('andando e pulando nas Nuvens', () => {
  test('da chegada da ponte, a criança chega a cada lugar do chão', () => {
    const chegada = ancora('chegada')
    const andou = grade.alcance(chegada.x, chegada.z)
    for (const nome of [
      'tear',
      'pe-da-arvore',
      'balao',
      'arco-iris',
      'morador',
      'lumi-1',
      'lumi-2',
      'lumi-3',
      'lumi-4',
    ]) {
      const p = ancora(nome)
      expect([nome, grade.chegaPerto(andou, p.x, p.z, 0.6)]).toEqual([nome, true])
    }
  })

  test('os degraus de nuvem levam, pulando, do chão à primeira plataforma', () => {
    const altura = beiradaMaximaDoPulo(GRAVIDADE)
    const alcance = alcanceDoPulo(CORPO.andar, GRAVIDADE)
    const caminho = [
      'col-cil-degrau-nuvem-1',
      'col-cil-degrau-nuvem-2',
      'col-cil-degrau-nuvem-3',
      'col-cil-plataforma-1',
    ].map(forma)
    let antes = {
      x: caminho[0]?.posicao[0] ?? 0,
      z: caminho[0]?.posicao[2] ?? 0,
      y: TAMPO,
      raio: 0,
    }
    for (const c of caminho) {
      if (c.forma !== 'cilindro') throw new Error(`${c.nome} não é cilindro`)
      const topo = topoDaForma(c)
      // Sobe no máximo um pulo (com folga), e o vão entre as beiradas cabe num pulo andando.
      expect([c.nome, topo - antes.y < altura * 0.8]).toEqual([c.nome, true])
      const vao = Math.hypot(c.posicao[0] - antes.x, c.posicao[2] - antes.z) - c.raio - antes.raio
      expect([c.nome, vao < alcance * 0.8]).toEqual([c.nome, true])
      antes = { x: c.posicao[0], z: c.posicao[2], y: topo, raio: c.raio }
    }
  })

  test('cada âncora do topo de plataforma fica em cima do tampo dela', () => {
    for (let i = 1; i <= 4; i++) {
      const p = ancora(`topo-plataforma-${i}`)
      const c = forma(`col-cil-plataforma-${i}`)
      expect(Math.hypot(p.x - c.posicao[0], p.z - c.posicao[2])).toBeLessThan(0.05)
      expect(Math.abs(p.y - topoDaForma(c))).toBeLessThan(0.05)
      // O colisor fica no mesmo lugar do nó que o jogo move.
      const no = raiz.getObjectByName(`plataforma-${i}`)?.position
      expect(Math.hypot((no?.x ?? 0) - c.posicao[0], (no?.z ?? 0) - c.posicao[2])).toBeLessThan(
        0.05,
      )
    }
  })

  test('as âncoras dos lugares ficam em chão plano', () => {
    for (const nome of [
      'tear',
      'pe-da-arvore',
      'balao',
      'morador',
      'lumi-1',
      'lumi-2',
      'lumi-3',
      'lumi-4',
    ]) {
      const p = ancora(nome)
      expect([nome, Math.abs((grade.chaoEm(p.x, p.z) ?? 0) - TAMPO) < 0.15]).toEqual([nome, true])
    }
    // O ninho: em cima do fundo dele, lá no alto da árvore.
    const ninho = ancora('ninho')
    expect(Math.abs(ninho.y - topoDaForma(forma('col-cil-ninho-fundo-1')))).toBeLessThan(0.1)
  })
})
