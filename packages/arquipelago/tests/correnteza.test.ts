import { describe, expect, test } from 'bun:test'
import { RAIO_DO_ANEL, RAIO_DO_RASO } from '../src/mundo/medidas'
import { CORPO } from '../src/sistemas/corpo'
import {
  BOIAS_DA_ILHA_DO_ANEL,
  CORRENTEZA,
  correnteza,
  ESPACO_ENTRE_BOIAS,
  pontosDasBoias,
  RODA_DA_ILHA_CENTRAL,
  type RodaDeNado,
} from '../src/sistemas/correnteza'
import { RITMO } from '../src/sistemas/necessidades'

const v = { x: 0, z: 0 }
const ilhaDoAnel: RodaDeNado = { x: RAIO_DO_ANEL, z: 0, livre: BOIAS_DA_ILHA_DO_ANEL }

/** Nada reto para fora (+x) da ilha central, como a criança faria, até parar ou passar de `ate`. */
function nadarParaFora(rodas: RodaDeNado[], segundos: number) {
  const dt = 1 / 60
  const nado = CORPO.nadar * RITMO.otimo
  let x = RODA_DA_ILHA_CENTRAL.livre - 1
  let maisLonge = x
  for (let i = 0; i < segundos * 60; i++) {
    correnteza(rodas, x, 0, v)
    x += (nado + v.x) * dt
    maisLonge = Math.max(maisLonge, x)
  }
  return { x, maisLonge }
}

describe('a correnteza mansa', () => {
  test('dentro das boias o mar é livre', () => {
    expect(correnteza([RODA_DA_ILHA_CENTRAL], 10, 5, v)).toBe(0)
    expect(v).toEqual({ x: 0, z: 0 })
    // A linha de boias fica depois da parte rasa.
    expect(RODA_DA_ILHA_CENTRAL.livre).toBeGreaterThan(RAIO_DO_RASO)
  })

  test('passando das boias empurra de volta para a ilha, mais forte quanto mais longe', () => {
    const perto = correnteza([RODA_DA_ILHA_CENTRAL], RODA_DA_ILHA_CENTRAL.livre + 1, 0, v)
    expect(v.x).toBeLessThan(0)
    expect(v.z).toBeCloseTo(0, 9)
    const longe = correnteza([RODA_DA_ILHA_CENTRAL], RODA_DA_ILHA_CENTRAL.livre + 4, 0, v)
    expect(longe).toBeGreaterThan(perto)
    expect(correnteza([RODA_DA_ILHA_CENTRAL], 0, RODA_DA_ILHA_CENTRAL.livre + 50, v)).toBe(1)
    expect(Math.hypot(v.x, v.z)).toBeCloseTo(CORRENTEZA.forca, 9)
    expect(v.z).toBeLessThan(0)
  })

  test('a força toda vence o nado mais rápido: ninguém passa da faixa', () => {
    expect(CORRENTEZA.forca).toBeGreaterThan(CORPO.nadar * RITMO.otimo)
    const { maisLonge } = nadarParaFora([RODA_DA_ILHA_CENTRAL], 60)
    expect(maisLonge).toBeLessThan(RODA_DA_ILHA_CENTRAL.livre + CORRENTEZA.faixa)
  })

  test('o mar aberto entre a sua ilha e uma ilha do anel aberta fica fechado', () => {
    const rodas = [RODA_DA_ILHA_CENTRAL, ilhaDoAnel]
    const { maisLonge } = nadarParaFora(rodas, 60)
    expect(maisLonge).toBeLessThan(ilhaDoAnel.x - ilhaDoAnel.livre)
  })

  test('quem cai no meio do caminho é levado para a beira mais perto', () => {
    const rodas = [RODA_DA_ILHA_CENTRAL, ilhaDoAnel]
    const meio = (RODA_DA_ILHA_CENTRAL.livre + ilhaDoAnel.x - ilhaDoAnel.livre) / 2
    correnteza(rodas, meio - 2, 0, v)
    expect(v.x).toBeLessThan(0)
    correnteza(rodas, meio + 2, 0, v)
    expect(v.x).toBeGreaterThan(0)
    // Perto da ilha do anel aberta, dentro das boias dela, o mar é livre.
    expect(correnteza(rodas, ilhaDoAnel.x - ilhaDoAnel.livre + 1, 0, v)).toBe(0)
  })

  test('as boias ficam em volta da linha, mais ou menos a cada 6 m', () => {
    const boias = pontosDasBoias(RODA_DA_ILHA_CENTRAL)
    for (const b of boias) {
      expect(Math.hypot(b.x, b.z)).toBeCloseTo(RODA_DA_ILHA_CENTRAL.livre, 9)
    }
    const passo = (2 * Math.PI * RODA_DA_ILHA_CENTRAL.livre) / boias.length
    expect(Math.abs(passo - ESPACO_ENTRE_BOIAS)).toBeLessThan(0.5)
  })
})
