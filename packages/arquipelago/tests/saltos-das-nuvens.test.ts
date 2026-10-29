import { beforeAll, describe, expect, test } from 'bun:test'
import type { Mesh, Object3D } from 'three'
import { type ColisorDaIlha, lerColisores } from '../src/mundo/colisores-da-ilha'
import { GRAVIDADE } from '../src/mundo/medidas'
import {
  LARGADA_DOS_SALTOS,
  saltosNoModelo,
  type TampoDosSaltos,
  tamposDosSaltos,
} from '../src/mundo/saltos-das-nuvens'
import { CORPO } from '../src/sistemas/corpo'
import {
  criarCorrida,
  PERCURSO_DOS_SALTOS,
  type PontosDoPercurso,
  passoDaCorrida,
  percursoGravado,
} from '../src/sistemas/percurso'
import {
  elevacaoDaPlataforma,
  PLATAFORMAS_DAS_NUVENS,
} from '../src/sistemas/plataformas-das-nuvens'
import { arquivoDaIlha, carregarGlb, type Forma, gradeDeAndar, topoEm } from './ajuda-colisores'

/**
 * Os saltos entre nuvens (fase4-07) contra a arte das Nuvens (`nuvens.glb`, no referencial do
 * arquivo: tampo em y = 1). As plataformas sobem e descem (fase4-06): a regra do ciclo é a mesma do
 * jogo (`elevacaoDaPlataforma`).
 */
let raiz: Object3D
let colisores: ColisorDaIlha[]
let formas: Forma[]
let tampos: TampoDosSaltos[]
let pontos: PontosDoPercurso
let grade: ReturnType<typeof gradeDeAndar>

beforeAll(async () => {
  raiz = await carregarGlb(arquivoDaIlha('nuvens.glb'))
  raiz.updateMatrixWorld(true)
  colisores = lerColisores(raiz)
  formas = colisores.filter((c): c is Forma => c.forma !== 'malha')
  const t = tamposDosSaltos(colisores)
  if (!t) throw new Error('nuvens.glb sem os tampos dos saltos')
  tampos = t
  pontos = saltosNoModelo(tampos)
  const terreno = raiz.getObjectByName('col-terreno') as Mesh | undefined
  if (!terreno?.isMesh) throw new Error('nuvens.glb sem col-terreno')
  grade = gradeDeAndar(terreno, formas, 19.2)
}, 120_000)

const CENTRO = CORPO.doCentroAoPe + CORPO.folga
const elevacao = (t: TampoDosSaltos, s: number) =>
  t.plataforma === null ? 0 : elevacaoDaPlataforma(t.plataforma, s)

describe('o caminho dos saltos', () => {
  test('com a ilha girada no jogo, os tampos voltam ao referencial do modelo', () => {
    const giro = 1.1
    const raizGirada = raiz.clone()
    raizGirada.rotation.y = giro
    const girados = tamposDosSaltos(lerColisores(raizGirada), giro)
    for (const [i, t] of tampos.entries()) {
      expect(girados?.[i]?.x).toBeCloseTo(t.x, 5)
      expect(girados?.[i]?.z).toBeCloseTo(t.z, 5)
    }
  })

  test('o degrau mais alto, as quatro plataformas, e o percurso fica fora do salvamento', () => {
    expect(tampos.map((t) => t.plataforma)).toEqual([null, 0, 1, 2, 3])
    expect(pontos.deques).toHaveLength(4)
    expect(pontos.vagalumes).toHaveLength(PERCURSO_DOS_SALTOS.vagalumes)
    expect(percursoGravado('nuvens-saltos')).toBe(false)
    expect(percursoGravado('pico-cume')).toBe(true)
  })

  test('a largada é chão livre que se alcança a pé da chegada da ponte', () => {
    const chegada = raiz.getObjectByName('chegada')?.position
    if (!chegada) throw new Error('sem a âncora chegada')
    const i = grade.indice(LARGADA_DOS_SALTOS.x, LARGADA_DOS_SALTOS.z)
    expect(grade.celulas[i]?.livre).toBe(true)
    expect(grade.alcance(chegada.x, chegada.z).has(i)).toBe(true)
    // Do primeiro degrau a largada fica perto (andar para longe antes da primeira parada desiste).
    const degrau1 = formas.find((c) => c.nome === 'col-cil-degrau-nuvem-1')
    if (!degrau1) throw new Error('sem o primeiro degrau')
    expect(
      Math.hypot(
        degrau1.posicao[0] - LARGADA_DOS_SALTOS.x,
        degrau1.posicao[2] - LARGADA_DOS_SALTOS.z,
      ),
    ).toBeLessThan(PERCURSO_DOS_SALTOS.distanciaParaDesistir / 2)
  })

  test('cada fita fica no pulo correndo, feito na hora certa, mesmo saindo um pouco antes', () => {
    // As fitas ficam nos vãos entre as plataformas (do degrau para a 1 é só um passo).
    expect(pontos.vagalumes).toHaveLength(3)
    for (let i = 0; i < pontos.vagalumes.length; i++) {
      const a = tampos[i + 1] as TampoDosSaltos
      const b = tampos[i + 2] as TampoDosSaltos
      const fita = pontos.vagalumes[i] as { x: number; y: number; z: number }
      const alto = PLATAFORMAS_DAS_NUVENS.altura
      const dx = b.x - a.x
      const dz = b.z - a.z
      const d = Math.hypot(dx, dz)
      // Sai da beirada (ou até 0,3 m antes dela) correndo, no pulo inteiro.
      for (const antes of [0, 0.15, 0.3]) {
        let perto = Number.POSITIVE_INFINITY
        for (let t = 0; t < 1.2; t += 0.005) {
          const andou = a.raio - antes + CORPO.correr * t
          const y = a.y + alto + CENTRO + CORPO.pulo * t - (GRAVIDADE * t * t) / 2
          const p = { x: a.x + (dx / d) * andou, y, z: a.z + (dz / d) * andou }
          perto = Math.min(perto, Math.hypot(p.x - fita.x, p.y - fita.y, p.z - fita.z))
        }
        expect([i, antes, perto < PERCURSO_DOS_SALTOS.raioDoVagalume * 0.8]).toEqual([
          i,
          antes,
          true,
        ])
      }
      // No vão: nenhum tampo embaixo dela até o chão (a fita fica no ar, entre as beiradas).
      const embaixo = formas.filter(
        (c) => c.nome !== 'col-terreno' && topoEm(c, fita.x, fita.z) !== undefined,
      )
      expect([i, embaixo.map((c) => c.nome)]).toEqual([i, []])
    }
  })

  test('a chegada vale no tampo da plataforma 4 em qualquer altura do ciclo', () => {
    const chegada = tampos[4] as TampoDosSaltos
    for (let s = 0; s < PLATAFORMAS_DAS_NUVENS.ciclo; s += 0.25) {
      const c = criarCorrida(pontos.vagalumes.length)
      c.deque = pontos.deques.length - 1
      const pes = chegada.y + elevacao(chegada, s)
      const ev = passoDaCorrida(
        c,
        { x: chegada.x + 0.5, y: pes + CENTRO, z: chegada.z, pes, noChaoDaIlha: false },
        pontos,
        16,
        PERCURSO_DOS_SALTOS,
      )
      expect([s, ev?.tipo]).toEqual([s, 'chegou'])
    }
  })

  test('em pé numa plataforma, a parada conta em qualquer altura dela', () => {
    for (let k = 1; k < 4; k++) {
      const t = tampos[k] as TampoDosSaltos
      for (const s of [0, 5, 8, 15]) {
        const c = criarCorrida(pontos.vagalumes.length)
        c.deque = k - 1
        const pes = t.y + elevacao(t, s)
        const ev = passoDaCorrida(
          c,
          { x: t.x, y: pes + CENTRO, z: t.z, pes, noChaoDaIlha: false },
          pontos,
          16,
          PERCURSO_DOS_SALTOS,
        )
        expect([k, s, ev]).toEqual([k, s, { tipo: 'deque', indice: k }])
      }
    }
  })

  test('caindo no chão da ilha depois de uma parada, volta para ela', () => {
    const c = criarCorrida(pontos.vagalumes.length)
    c.deque = 2
    const ev = passoDaCorrida(
      c,
      { x: -12, y: 1 + CENTRO, z: 4, pes: 1, noChaoDaIlha: true },
      pontos,
      16,
      PERCURSO_DOS_SALTOS,
    )
    expect(ev).toEqual({ tipo: 'caiu', deque: 2 })
    expect(pontos.deques[2]?.volta.y).toBeGreaterThan(pontos.deques[2]?.y ?? 0)
  })

  test('quem não perde nenhuma janela das plataformas ganha a estrela do tempo', () => {
    /** O primeiro instante a partir de `s` em que `cabe` vale (passos de 0,05 s). */
    const proximo = (s: number, cabe: (t: number) => boolean) => {
      for (let t = s; t < s + 60; t += 0.05) if (cabe(t)) return t
      throw new Error('janela que não chega')
    }
    const parada = (k: number, t: number) => elevacaoDaPlataforma(k, t)
    let pior = 0
    for (let s0 = 0; s0 < PLATAFORMAS_DAS_NUVENS.ciclo; s0 += 0.5) {
      // Uns 6 s da largada ao alto dos degraus, correndo e pulando.
      let t = s0 + 6
      // Do degrau para a plataforma 1 embaixo; depois, cada uma no alto para a seguinte embaixo.
      t = proximo(t, (x) => parada(0, x) === 0 && parada(0, x + 1.2) === 0) + 1.5
      for (let k = 0; k < 3; k++)
        t =
          proximo(
            t,
            (x) =>
              parada(k, x) === PLATAFORMAS_DAS_NUVENS.altura &&
              parada(k + 1, x) === 0 &&
              parada(k + 1, x + 1.2) === 0,
          ) + 1.5
      pior = Math.max(pior, t - s0)
    }
    expect(pior).toBeLessThan(PERCURSO_DOS_SALTOS.tempoAlvoMs / 1000)
    expect(pior).toBeGreaterThan(PERCURSO_DOS_SALTOS.tempoAlvoMs / 1000 - 10)
  })
})
