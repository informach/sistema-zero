import { describe, expect, test } from 'bun:test'
import { PERCURSOS } from '@sistemazero/arquipelago-contracts'
import { PORTOS_DA_ARTE } from '../src/mundo/portos-da-arte'
import { ILHA_DO_PERCURSO } from '../src/sistemas/album'
import {
  amostrarRota,
  BARCO,
  criarRotaDaRegata,
  criarTravessia,
  embarcar,
  passoDaTravessia,
  REGATA,
} from '../src/sistemas/barco'
import { PERCURSO_DA_REGATA, PERCURSOS_DO_JOGO } from '../src/sistemas/percurso'
import { BOIAS_DA_REGATA, boiasDaRegata, RAIO_DA_BOIA } from '../src/sistemas/regata'

/**
 * A volta das boias (lacunas, 01/11/2026; a proposta: o barco é "um minijogo e um jeito de chegar"):
 * a regata do cais da sua ilha em volta dela, remando e guiando o barco para os lados.
 */
const porto = PORTOS_DA_ARTE['sua-ilha']
const rota = criarRotaDaRegata(porto)

function regata() {
  const v = criarTravessia(
    [porto, porto],
    { x: 0, y: 0.5, z: 0 },
    [null, null],
    ['sua-ilha', 'sua-ilha'],
    rota,
  )
  v.regata = { lado: 0, remo: 0 }
  v.prontos = [true, true]
  embarcar(v, 0, porto.embarque)
  // Passa o embarque.
  for (let i = 0; i < 40; i++) passoDaTravessia(v, 0.05, false)
  expect(v.fase).toBe('viagem')
  return v
}

describe('a volta das boias', () => {
  test('a rota sai do cais da sua ilha, dá a volta por fora do anel e volta ao mesmo cais', () => {
    const inicio = rota.pontos[0]
    const fim = rota.pontos.at(-1)
    if (!inicio || !fim) throw new Error('rota vazia')
    expect(Math.hypot(inicio.x - porto.barco.x, inicio.z - porto.barco.z)).toBeLessThan(0.01)
    expect(Math.hypot(fim.x - porto.barco.x, fim.z - porto.barco.z)).toBeLessThan(0.01)
    // A volta passa por fora do anel (82 m mais as ilhas) em todos os rumos.
    const rumos = new Set<number>()
    for (const p of rota.pontos)
      if (Math.hypot(p.x, p.z) > BARCO.raioExterno - 5)
        rumos.add(Math.round((Math.atan2(p.z, p.x) * 180) / Math.PI / 30))
    expect(rumos.size).toBeGreaterThanOrEqual(12)
    expect(rota.comprimento).toBeGreaterThan(1000)
    expect(rota.comprimento).toBeLessThan(1400)
  })

  test('as boias ficam para os lados da rota: reto pelo meio não pega nenhuma', () => {
    const boias = boiasDaRegata(rota)
    expect(boias).toHaveLength(BOIAS_DA_REGATA)
    expect(PERCURSO_DA_REGATA.vagalumes).toBe(BOIAS_DA_REGATA)
    for (const b of boias) {
      const perto = Math.min(...rota.pontos.map((p) => Math.hypot(p.x - b.x, p.z - b.z)))
      expect(perto).toBeGreaterThan(RAIO_DA_BOIA)
      // E o barco alcança guiando para o lado.
      expect(perto).toBeLessThan(REGATA.lado + RAIO_DA_BOIA)
    }
  })

  test('para o lado, o barco sai da linha; remando, vai mais rápido; nada disso nos cais', () => {
    const solto = regata()
    const remando = regata()
    // Longe do cais: avança até o meio da rota sem pedir nada.
    const longe = rota.comprimento * 0.4
    for (const v of [solto, remando]) v.distancia = longe
    const linha = { x: 0, y: 0, z: 0, giro: 0 }
    for (let i = 0; i < 40; i++) {
      // Para a frente na direção do barco, um pouco para a direita.
      const g = remando.pose.giro
      passoDaTravessia(remando, 0.05, false, Math.cos(g) + Math.sin(g), -Math.sin(g) + Math.cos(g))
      passoDaTravessia(solto, 0.05, false)
    }
    expect(remando.distancia - longe).toBeGreaterThan((solto.distancia - longe) * 1.2)
    amostrarRota(rota, remando.distancia, linha)
    expect(Math.hypot(remando.pose.x - linha.x, remando.pose.z - linha.z)).toBeGreaterThan(1)
    expect(Math.abs(remando.regata?.lado ?? 0)).toBeLessThanOrEqual(REGATA.lado)
    // Perto do cais o barco segue a linha (a manobra de atracar continua a mesma).
    const noCais = regata()
    for (let i = 0; i < 20; i++) passoDaTravessia(noCais, 0.05, false, 1, 1)
    expect(Math.abs(noCais.regata?.lado ?? 1)).toBeLessThan(0.01)
  })

  test('o percurso novo tem configuração, a sua ilha no álbum e fala de criança', () => {
    expect(PERCURSOS).toContain('barco-regata')
    expect(PERCURSOS_DO_JOGO['barco-regata']).toBe(PERCURSO_DA_REGATA)
    expect(ILHA_DO_PERCURSO['barco-regata']).toBe('sua-ilha')
    for (const fala of [
      PERCURSO_DA_REGATA.falaDoComeco,
      PERCURSO_DA_REGATA.falaDoFim,
      PERCURSO_DA_REGATA.falaDasTresEstrelas,
    ])
      expect(fala).not.toMatch(/[—–!?]/)
  })
})
