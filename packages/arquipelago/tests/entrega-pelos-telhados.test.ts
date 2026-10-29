import { beforeAll, describe, expect, test } from 'bun:test'
import { PERCURSOS } from '@sistemazero/arquipelago-contracts'
import type { Object3D } from 'three'
import type { ColisorDaIlha } from '../src/mundo/colisores-da-ilha'
import { lerColisores } from '../src/mundo/colisores-da-ilha'
import { GRAVIDADE } from '../src/mundo/medidas'
import {
  type AncorasDosTelhados,
  NOMES_DAS_ANCORAS_DOS_TELHADOS,
  telhadosNoModelo,
} from '../src/mundo/telhados'
import { alturaDoPulo, CORPO } from '../src/sistemas/corpo'
import {
  type CorpoNaCorrida,
  criarCorrida,
  estrelasDaCorrida,
  juntarResultado,
  PERCURSO_DAS_COPAS,
  PERCURSO_DOS_TELHADOS,
  PERCURSOS_DO_JOGO,
  type PontosDoPercurso,
  passoDaCorrida,
} from '../src/sistemas/percurso'
import { arquivoDaIlha, carregarGlb, type Forma, pisoEm } from './ajuda-colisores'

let pontos: PontosDoPercurso
let formas: Forma[]

beforeAll(async () => {
  const raiz: Object3D = await carregarGlb(arquivoDaIlha('vila-doce.glb'))
  const ancoras: Partial<AncorasDosTelhados> = {}
  for (const nome of NOMES_DAS_ANCORAS_DOS_TELHADOS) {
    const o = raiz.getObjectByName(nome)
    if (!o) throw new Error(`sem a âncora ${nome}`)
    ancoras[nome] = { x: o.position.x, y: o.position.y, z: o.position.z }
  }
  pontos = telhadosNoModelo(ancoras as AncorasDosTelhados)
  formas = lerColisores(raiz).filter((c: ColisorDaIlha): c is Forma => c.forma !== 'malha')
})

describe('os percursos', () => {
  test('cada percurso do contrato tem a sua configuração, com o mesmo corte suave', () => {
    for (const id of PERCURSOS) {
      const c = PERCURSOS_DO_JOGO[id]
      expect(c.id).toBe(id)
      for (const fala of [c.falaDoComeco, c.falaDoFim, c.falaDasTresEstrelas]) {
        expect(fala).not.toMatch(/[—!]/)
        expect(fala.endsWith('?')).toBe(false)
      }
      expect(c.corteSaiMs).toBe(PERCURSO_DAS_COPAS.corteSaiMs)
      expect(c.corteVoltaMs).toBe(PERCURSO_DAS_COPAS.corteVoltaMs)
    }
  })
})

describe('a entrega pelos telhados no vila-doce.glb', () => {
  test('a largada fica no chão livre da praça, longe dos caixotes', () => {
    const piso = pisoEm(formas, pontos.largada.x, pontos.largada.z, pontos.largada.y)
    expect(piso.y).toBeCloseTo(pontos.largada.y, 3)
    const caixote = pontos.deques[0]
    if (!caixote) throw new Error('sem a primeira parada')
    expect(Math.hypot(pontos.largada.x - caixote.x, pontos.largada.z - caixote.z)).toBeLessThan(
      PERCURSO_DOS_TELHADOS.distanciaParaDesistir,
    )
  })

  test('as paradas sobem, e cada pulo cabe no pulo do corpo', () => {
    const caminho = [...pontos.deques, pontos.chegada]
    const pulo = alturaDoPulo(GRAVIDADE)
    for (let i = 0; i + 1 < caminho.length; i++) {
      const a = caminho[i]
      const b = caminho[i + 1]
      if (!a || !b) continue
      expect(b.y).toBeGreaterThan(a.y)
      expect(b.y - a.y).toBeLessThan(pulo - 0.3)
    }
    // A volta de cada parada é em cima dela (o piso do colisor na altura da âncora).
    for (const d of pontos.deques) {
      const piso = pisoEm(formas, d.volta.x, d.volta.z, pontos.largada.y)
      expect(piso.y).toBeCloseTo(d.y, 1)
    }
  })

  test('cada confeito fica no meio de um pulo, abaixo do alto do pulo e acima da parada', () => {
    const caminho = [...pontos.deques, pontos.chegada]
    const pulo = alturaDoPulo(GRAVIDADE)
    expect(pontos.vagalumes).toHaveLength(PERCURSO_DOS_TELHADOS.vagalumes)
    for (const [i, c] of pontos.vagalumes.entries()) {
      const a = caminho[i]
      const b = caminho[i + 1]
      if (!a || !b) throw new Error('confeito sem pulo')
      // Saindo de a, o centro do corpo vai até `pulo` acima do centro em pé ali.
      expect(c.y).toBeLessThan(a.y + CORPO.doCentroAoPe + pulo)
      expect(c.y).toBeGreaterThan(b.y + CORPO.doCentroAoPe)
      expect(c.x).toBeCloseTo((a.x + b.x) / 2, 5)
      expect(c.z).toBeCloseTo((a.z + b.z) / 2, 5)
    }
  })

  test('uma entrega inteira: as paradas, os confeitos, a queda e a chegada com três estrelas', () => {
    const c = criarCorrida(pontos.vagalumes.length)
    const corpo: CorpoNaCorrida = { x: 0, y: 0, z: 0, pes: 0, noChaoDaIlha: false }
    const em = (p: { x: number; y: number; z: number }, noChao = false) => {
      corpo.x = p.x
      corpo.z = p.z
      corpo.pes = p.y
      corpo.y = p.y + CORPO.doCentroAoPe
      corpo.noChaoDaIlha = noChao
      return passoDaCorrida(c, corpo, pontos, 500, PERCURSO_DOS_TELHADOS)
    }
    expect(em(pontos.largada, true)).toBeNull()
    expect(em(pontos.deques[0] ?? pontos.largada)).toEqual({ tipo: 'deque', indice: 0 })
    // Caiu na rua depois do caixote: volta para ele.
    expect(em(pontos.largada, true)).toEqual({ tipo: 'caiu', deque: 0 })
    for (const [i, d] of pontos.deques.entries()) {
      em(d)
      expect(c.deque).toBe(i)
      const confeito = pontos.vagalumes[i]
      if (!confeito) continue
      corpo.x = confeito.x
      corpo.y = confeito.y
      corpo.z = confeito.z
      corpo.pes = confeito.y - CORPO.doCentroAoPe
      corpo.noChaoDaIlha = false
      // No meio do pulo o corpo já pode estar sobre a parada seguinte: um evento por quadro.
      const eventos = [1, 2].map(() => passoDaCorrida(c, corpo, pontos, 100, PERCURSO_DOS_TELHADOS))
      expect(eventos).toContainEqual({ tipo: 'vagalume', indice: i })
    }
    expect(em(pontos.chegada)).toEqual({ tipo: 'chegou' })
    expect(estrelasDaCorrida(c, PERCURSO_DOS_TELHADOS)).toEqual({
      chegada: true,
      tempo: true,
      vagalumes: true,
    })
    const melhor = juntarResultado(undefined, c, PERCURSO_DOS_TELHADOS)
    expect(melhor?.melhorTempoMs).toBe(c.tempoMs)
  })

  test('o tempo da estrela é o da entrega, não o das copas', () => {
    const c = criarCorrida(0)
    c.situacao = 'chegou'
    c.tempoMs = PERCURSO_DOS_TELHADOS.tempoAlvoMs + 1
    expect(estrelasDaCorrida(c, PERCURSO_DOS_TELHADOS).tempo).toBe(false)
    expect(estrelasDaCorrida(c, PERCURSO_DAS_COPAS).tempo).toBe(true)
  })
})
