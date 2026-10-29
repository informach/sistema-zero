import { beforeAll, describe, expect, test } from 'bun:test'
import type { Mesh, Object3D } from 'three'
import { Vector3 } from 'three'
import { lerColisores } from '../src/mundo/colisores-da-ilha'
import { meioDasEstrelas } from '../src/mundo/constelacoes-das-nuvens'
import { MIRANTE_DAS_NUVENS, MIRANTE_NO_ARQUIVO } from '../src/mundo/nuvens'
import type { Ponto } from '../src/sistemas/cipo'
import {
  type Busca,
  direcaoDaMira,
  ESTRELAS,
  estrelasAcesas,
  FALA_DA_LUNETA,
  FALA_DE_DIA,
  FALA_DE_TODAS,
  FIGURAS,
  figuraNaMira,
  type Mira,
  passoDaBusca,
  passoDaMira,
  quantasAchadas,
} from '../src/sistemas/constelacoes'
import { CORPO } from '../src/sistemas/corpo'
import {
  arquivoDaIlha,
  bate,
  CENTRO_DO_CORPO,
  carregarGlb,
  type Forma,
  gradeDeAndar,
  TAMPO,
} from './ajuda-colisores'

describe('a mira e a busca (regras puras)', () => {
  test('o direcional gira e sobe a mira, sem passar do baixo nem do alto', () => {
    const m: Mira = { giro: 0, inclinacao: ESTRELAS.inclinacao.inicial }
    passoDaMira(m, 1, 0, 1)
    expect(m.giro).toBeCloseTo(-ESTRELAS.velocidade, 6)
    passoDaMira(m, 0, 1, 10)
    expect(m.inclinacao).toBe(ESTRELAS.inclinacao.maxima)
    passoDaMira(m, 0, -1, 10)
    expect(m.inclinacao).toBe(ESTRELAS.inclinacao.minima)
    const d = direcaoDaMira({ giro: 0.3, inclinacao: 0.6 }, { x: 0, y: 0, z: 0 })
    expect(Math.hypot(d.x, d.y, d.z)).toBeCloseTo(1, 9)
    expect(d.y).toBeCloseTo(Math.sin(0.6), 9)
  })

  test('na mira fica a figura mais perto do centro, dentro de 7°', () => {
    const de = { x: 0, y: 0, z: 0 }
    const frente = { x: 0, y: 0, z: 1 }
    const perto = { x: Math.tan((5 * Math.PI) / 180) * 30, y: 0, z: 30 }
    const longe = { x: Math.tan((9 * Math.PI) / 180) * 30, y: 0, z: 30 }
    expect(figuraNaMira(de, frente, [longe, perto])).toBe(1)
    expect(figuraNaMira(de, frente, [longe])).toBe(-1)
  })

  test('segurar a mira 1,2 s acende; tirar recomeça; a achada não acende de novo', () => {
    const b: Busca = { figura: -1, segundos: 0 }
    expect(passoDaBusca(b, 2, 0, 0.7)).toBe(-1)
    expect(passoDaBusca(b, -1, 0, 0.1)).toBe(-1)
    expect(passoDaBusca(b, 2, 0, 0.7)).toBe(-1)
    expect(passoDaBusca(b, 2, 0, 0.6)).toBe(2)
    expect(passoDaBusca(b, 2, 1 << 2, 5)).toBe(-1)
    expect(passoDaBusca(b, 3, 0, 0.6)).toBe(-1)
    expect(passoDaBusca(b, 1, 0, 0.6)).toBe(-1)
  })

  test('as estrelas aparecem uma por uma em 1 s, ou todas com menos movimento', () => {
    expect(estrelasAcesas(0, 10, false)).toBe(1)
    expect(estrelasAcesas(0.55, 10, false)).toBe(6)
    expect(estrelasAcesas(5, 10, false)).toBe(10)
    expect(estrelasAcesas(0, 10, true)).toBe(10)
    expect(quantasAchadas(0b101001)).toBe(3)
  })

  test('as falas seguem as regras dos textos da criança', () => {
    const falas = [FALA_DE_DIA, FALA_DA_LUNETA, FALA_DE_TODAS, ...FIGURAS.map((f) => f.fala)]
    for (const f of falas) {
      expect(f).not.toContain('—')
      expect(f).not.toContain('!')
      expect(f.split('.')[0]).not.toContain('?')
    }
  })
})

/** O mirante e as figuras do arquivo, no referencial das Nuvens (tampo em y = 1). */
let constelacoes: Object3D
let nuvens: Object3D
let formas: Forma[]
let formasDoMirante: Forma[]
let grade: ReturnType<typeof gradeDeAndar>

beforeAll(async () => {
  nuvens = await carregarGlb(arquivoDaIlha('nuvens.glb'))
  nuvens.updateMatrixWorld(true)
  constelacoes = await carregarGlb(arquivoDaIlha('nuvens-constelacoes.glb'))
  constelacoes.updateMatrixWorld(true)
  formas = lerColisores(nuvens).filter((c): c is Forma => c.forma !== 'malha')
  formasDoMirante = lerColisores(constelacoes).filter((c): c is Forma => c.forma !== 'malha')
  const terreno = nuvens.getObjectByName('col-terreno') as Mesh | undefined
  if (!terreno?.isMesh) throw new Error('nuvens.glb sem col-terreno')
  grade = gradeDeAndar(terreno, [...formas, ...formasDoMirante], 19.2)
}, 120_000)

const posicao = (nome: string): Ponto => {
  const o = constelacoes.getObjectByName(nome)
  if (!o) throw new Error(`sem o nó ${nome}`)
  const p = o.getWorldPosition(new Vector3())
  return { x: p.x, y: p.y, z: p.z }
}

describe('o mirante e as seis figuras no arquivo', () => {
  test('o mirante fica na constante, sem nada das Nuvens em cima do deque', () => {
    // O arquivo já vem no referencial das Nuvens: a constante é o meio do deque dele.
    expect(MIRANTE_DAS_NUVENS).toEqual(MIRANTE_NO_ARQUIVO)
    const deque = formasDoMirante.find((c) => c.nome === 'col-cil-deque-1')
    expect(deque?.posicao[0]).toBeCloseTo(MIRANTE_DAS_NUVENS.x, 2)
    expect(deque?.posicao[2]).toBeCloseTo(MIRANTE_DAS_NUVENS.z, 2)
    const p = new Vector3()
    for (let a = 0; a < 360; a += 20)
      for (const r of [0, 0.8, 1.6])
        for (const y of [0.5, 1.2, 2]) {
          const ang = (a * Math.PI) / 180
          p.set(
            MIRANTE_DAS_NUVENS.x + Math.cos(ang) * r,
            TAMPO + y,
            MIRANTE_DAS_NUVENS.z + Math.sin(ang) * r,
          )
          expect([a, r, y, formas.find((c) => bate(c, p))?.nome ?? null]).toEqual([a, r, y, null])
        }
  })

  test('da chegada da ponte, a pé, sobe no deque e fica atrás da luneta', () => {
    const chegada = nuvens.getObjectByName('chegada')?.position
    if (!chegada) throw new Error('sem a âncora chegada')
    const luneta = posicao('luneta')
    const andou = grade.alcance(chegada.x, chegada.z)
    expect(grade.chegaPerto(andou, luneta.x, luneta.z, 0.5)).toBe(true)
    const celula = grade.celulas[grade.indice(luneta.x, luneta.z)]
    expect(Math.abs((celula?.y ?? 0) - luneta.y)).toBeLessThan(0.1)
    // Em pé ali, o corpo não encosta no tripé, no banco nem no guarda-corpo.
    const corpo = new Vector3(luneta.x, luneta.y + CENTRO_DO_CORPO + 0.05, luneta.z)
    expect(formasDoMirante.find((c) => bate(c, corpo))?.nome ?? null).toBeNull()
    expect(CORPO.raio).toBeLessThan(1)
  })

  test('as seis figuras, longe umas das outras na mira, todas alcançáveis pela inclinação', () => {
    const tubo = posicao('luneta-tubo')
    const direcoes = FIGURAS.map((_, i) => {
      // A mira aponta para o centro das estrelas (o pivô do nó fica fora do desenho).
      const f = constelacoes.getObjectByName(`constelacao-${i + 1}`)
      const m = meioDasEstrelas(f?.children.filter((c) => c.name.includes('-estrela-')) ?? [])
      const d = new Vector3(m.x - tubo.x, m.y - tubo.y, m.z - tubo.z).normalize()
      const inclinacao = Math.asin(d.y)
      expect([i, inclinacao > ESTRELAS.inclinacao.minima]).toEqual([i, true])
      expect([i, inclinacao < ESTRELAS.inclinacao.maxima]).toEqual([i, true])
      return d
    })
    for (let i = 0; i < direcoes.length; i++)
      for (let k = i + 1; k < direcoes.length; k++) {
        const a = direcoes[i] as Vector3
        const b = direcoes[k] as Vector3
        expect([i, k, a.angleTo(b) > 2 * ESTRELAS.angulo]).toEqual([i, k, true])
      }
  })

  test('cada figura tem as linhas e as estrelas como filhas (57 estrelas)', () => {
    let total = 0
    for (let i = 1; i <= FIGURAS.length; i++) {
      const f = constelacoes.getObjectByName(`constelacao-${i}`) as Mesh | undefined
      expect(f?.isMesh).toBe(true)
      const estrelas = f?.children.filter((c) => c.name.includes('-estrela-')) ?? []
      expect(estrelas.length).toBeGreaterThan(3)
      total += estrelas.length
    }
    expect(total).toBe(57)
  })
})
