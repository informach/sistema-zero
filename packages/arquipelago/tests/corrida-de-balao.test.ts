import { beforeAll, describe, expect, test } from 'bun:test'
import { type Object3D, Vector3 } from 'three'
import { lerColisores } from '../src/mundo/colisores-da-ilha'
import { BALAO, criarVoo, passoDoBalao, subirNoBalao, type Voo } from '../src/sistemas/balao'
import type { Ponto } from '../src/sistemas/cipo'
import {
  ARGOLAS,
  type Argola,
  argolasNaIlha,
  type CorridaDeBalao,
  fitasNaIlha,
  passoDaCorridaDeBalao,
  passouPelaArgola,
} from '../src/sistemas/corrida-de-balao'
import { estrelasDaCorrida, PERCURSO_DO_BALAO, percursoGravado } from '../src/sistemas/percurso'
import { arquivoDaIlha, bate, carregarGlb, type Forma, TAMPO } from './ajuda-colisores'

/** No arquivo, o meio da ilha em (0, 0) e o tampo em y = 1 (no jogo a ilha sobe 7 m). */
const argolas = argolasNaIlha(TAMPO)
const fitas = fitasNaIlha(TAMPO)
const dt = 1 / 60

let raiz: Object3D
let formas: Forma[]
let casa: Ponto

beforeAll(async () => {
  raiz = await carregarGlb(arquivoDaIlha('nuvens.glb'))
  raiz.updateMatrixWorld(true)
  formas = lerColisores(raiz).filter((c): c is Forma => c.forma !== 'malha')
  const no = raiz.getObjectByName('balao')
  if (!no) throw new Error('sem a âncora balao')
  casa = { x: no.position.x, y: no.position.y, z: no.position.z }
}, 120_000)

describe('passar pela argola', () => {
  const g: Argola = { x: 0, y: 5, z: 0, rumo: 0 }
  test('cruzando o plano perto do meio conta, nos dois sentidos', () => {
    expect(passouPelaArgola(g, { x: 0.5, y: 5, z: -0.2 }, { x: 0.5, y: 5.1, z: 0.2 })).toBe(true)
    expect(passouPelaArgola(g, { x: 0, y: 5, z: 0.3 }, { x: 0, y: 5, z: -0.3 })).toBe(true)
  })
  test('por fora do meio, sem cruzar ou parado no plano, não conta', () => {
    expect(passouPelaArgola(g, { x: 2, y: 5, z: -0.2 }, { x: 2, y: 5, z: 0.2 })).toBe(false)
    expect(passouPelaArgola(g, { x: 0, y: 5, z: 0.2 }, { x: 0, y: 5, z: 0.5 })).toBe(false)
    expect(passouPelaArgola(g, { x: 0, y: 5, z: 0 }, { x: 0, y: 5, z: 0 })).toBe(false)
  })
})

describe('a corrida', () => {
  /** Leva o meio do balão por dentro da argola `i`, no rumo dela. */
  const atravessar = (e: CorridaDeBalao, i: number, ms = 1000) => {
    const g = argolas[i] as Argola
    const nx = Math.sin(g.rumo)
    const nz = Math.cos(g.rumo)
    return passoDaCorridaDeBalao(
      e,
      { x: g.x - nx * 0.2, y: g.y, z: g.z - nz * 0.2 },
      { x: g.x + nx * 0.2, y: g.y, z: g.z + nz * 0.2 },
      argolas,
      fitas,
      PERCURSO_DO_BALAO.raioDoVagalume,
      ms,
    )
  }

  test('só a primeira argola começa; depois vale a próxima da ordem; a sexta chega', () => {
    const e: CorridaDeBalao = { corrida: null }
    expect(atravessar(e, 2)).toBeNull()
    expect(e.corrida).toBeNull()
    expect(atravessar(e, 0)).toEqual({ tipo: 'comecou' })
    expect(atravessar(e, 3)).toBeNull()
    for (let i = 1; i < 5; i++) expect(atravessar(e, i)).toEqual({ tipo: 'argola', indice: i })
    expect(atravessar(e, 5)).toEqual({ tipo: 'chegou' })
    expect(e.corrida?.situacao).toBe('chegou')
    // O começo não conta tempo; cada passo depois dele, sim (seis passos de 1 s).
    expect(e.corrida?.tempoMs).toBe(6000)
    expect(percursoGravado('nuvens-balao')).toBe(false)
  })

  test('as fitas pegam a 1,6 m do meio do balão', () => {
    const e: CorridaDeBalao = { corrida: null }
    atravessar(e, 0)
    const f = fitas[1] as Ponto
    const perto = { x: f.x + 1.5, y: f.y, z: f.z }
    expect(passoDaCorridaDeBalao(e, perto, perto, argolas, fitas, 1.6, 16)).toEqual({
      tipo: 'fita',
      indice: 1,
    })
    const longe = { x: f.x + 1.7, y: f.y, z: f.z }
    expect(passoDaCorridaDeBalao(e, longe, longe, argolas, fitas, 1.6, 16)).toBeNull()
  })
})

/**
 * Um piloto como uma criança: vai para cada ponto pedindo a velocidade que quer (freia chegando),
 * acende o fogo abaixo da altura e solta acima. Pelas regras do balão de verdade (`passoDoBalao`).
 */
function pilotar(v: Voo, alvos: readonly Ponto[], cadaPasso: (de: Ponto, ate: Ponto) => boolean) {
  const pes: Ponto = { ...v.pe }
  const de = { x: 0, y: 0, z: 0 }
  const ate = { x: 0, y: 0, z: 0 }
  let k = 0
  for (let passo = 0; passo < 60 * 600; passo++) {
    const alvo = alvos[k]
    if (!alvo) return
    const dx = alvo.x - v.pe.x
    const dz = alvo.z - v.pe.z
    const d = Math.hypot(dx, dz)
    const querX = (dx / (d || 1)) * Math.min(BALAO.lado.maxima, d) - v.vel.x
    const querZ = (dz / (d || 1)) * Math.min(BALAO.lado.maxima, d) - v.vel.z
    const q = Math.max(1, Math.hypot(querX, querZ))
    const pesAlvo = alvo.y - ARGOLAS.meioDoBalao
    de.x = v.pe.x
    de.y = v.pe.y + ARGOLAS.meioDoBalao
    de.z = v.pe.z
    passoDoBalao(v, {
      dt,
      parado: false,
      // Solta o fogo antes, contando o embalo que ainda sobe depois de soltar.
      subir: v.pe.y + Math.max(0, v.vel.y) ** 2 / (2 * BALAO.descida.freio) < pesAlvo,
      pedidoX: querX / q,
      pedidoZ: querZ / q,
      pes,
    })
    pes.x = v.pe.x
    pes.z = v.pe.z
    pes.y = Math.max(v.pe.y, Math.hypot(v.pe.x, v.pe.z) <= BALAO.raioDoChao ? TAMPO : -100)
    ate.x = pes.x
    ate.y = pes.y + ARGOLAS.meioDoBalao
    ate.z = pes.z
    if (cadaPasso(de, ate)) k++
  }
  throw new Error(`O piloto não chegou ao ponto ${k}`)
}

describe('a volta das argolas no arquivo', () => {
  test('as argolas e as fitas não encostam em nada da ilha, e cabem no voo do balão', () => {
    const p = new Vector3()
    for (const [i, g] of argolas.entries()) {
      // A volta da argola inteira, e o balão inteiro passando pelo meio dela.
      for (let a = 0; a < 360; a += 10) {
        const r = (a * Math.PI) / 180
        const lado = Math.cos(r) * ARGOLAS.raio
        p.set(
          g.x + Math.cos(g.rumo) * lado,
          g.y + Math.sin(r) * ARGOLAS.raio,
          g.z - Math.sin(g.rumo) * lado,
        )
        expect([i, a, formas.find((c) => bate(c, p))?.nome ?? null]).toEqual([i, a, null])
      }
      expect(g.y - ARGOLAS.meioDoBalao + BALAO.teto).toBeGreaterThan(g.y)
      expect(g.y - ARGOLAS.raio).toBeGreaterThan(TAMPO + 0.5)
      expect(Math.hypot(g.x, g.z) + ARGOLAS.raio).toBeLessThan(BALAO.raio)
    }
    for (const f of fitas) {
      p.set(f.x, f.y, f.z)
      expect(formas.find((c) => bate(c, p))?.nome ?? null).toBeNull()
    }
  })

  test('um piloto sai do lugar do balão, passa por todas e pega as três fitas', () => {
    const v = criarVoo(casa, { x: 0, z: 0 }, TAMPO)
    subirNoBalao(v, casa)
    // O passo de entrar no cesto.
    for (let t = 0; t <= BALAO.embarque + dt; t += dt)
      passoDoBalao(v, { dt, parado: false, subir: false, pedidoX: 0, pedidoZ: 0, pes: v.pe })
    // Antes da argola, de frente para ela; depois dela, um pouco adiante (cruza o plano).
    const antesE = (g: Argola, m: number) => ({
      x: g.x + Math.sin(g.rumo) * m,
      y: g.y,
      z: g.z + Math.cos(g.rumo) * m,
    })
    const alvos: Ponto[] = []
    for (const [i, g] of argolas.entries()) {
      alvos.push(antesE(g, -3), antesE(g, 3))
      const f = fitas[[0, 2, 4].indexOf(i)]
      if (f) alvos.push(f)
    }
    const e: CorridaDeBalao = { corrida: null }
    let k = 0
    let corrida = 0
    pilotar(v, alvos, (de, ate) => {
      const ev = passoDaCorridaDeBalao(
        e,
        de,
        ate,
        argolas,
        fitas,
        PERCURSO_DO_BALAO.raioDoVagalume,
        dt * 1000,
      )
      if (e.corrida) corrida++
      const alvo = alvos[k] as Ponto
      const chegou =
        Math.hypot(ate.x - alvo.x, ate.z - alvo.z) < 1 && Math.abs(ate.y - alvo.y) < 1.2
      // No meio do balão também nada da ilha: só o ar em volta do cesto e do corpo.
      expect(
        formas.find((c) => bate(c, new Vector3(ate.x, ate.y - ARGOLAS.meioDoBalao + 0.96, ate.z)))
          ?.nome ?? null,
      ).toBeNull()
      if (ev?.tipo === 'chegou') return true
      if (chegou) k++
      return chegou
    })
    expect(e.corrida?.situacao).toBe('chegou')
    const estrelas = e.corrida ? estrelasDaCorrida(e.corrida, PERCURSO_DO_BALAO) : null
    expect(estrelas?.vagalumes).toBe(true)
    // O tempo-alvo dá folga a quem pilota sem errar: o piloto leva bem menos, mas não a metade.
    const segundos = corrida * dt
    expect(segundos * 1.25).toBeLessThan(PERCURSO_DO_BALAO.tempoAlvoMs / 1000)
    expect(segundos * 2).toBeGreaterThan(PERCURSO_DO_BALAO.tempoAlvoMs / 1000)
  })
})
