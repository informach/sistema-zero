import { describe, expect, test } from 'bun:test'
import {
  criarSalvamentoInicial,
  juntarMapas,
  MAPA_VAZIO,
  MAPAS_DAS_ILHAS,
  MapaDaIlhaSchema,
} from '@sistemazero/arquipelago-contracts'
import {
  alcanceNoRumo,
  MEDIDAS_DO_MAPA,
  meioDaParte,
  partesAVista,
  partesDeTerra,
  partesVistas,
  parteVista,
  porcentoDoMapa,
  registrarNoMapa,
  revelar,
  temMapa,
  VISTA,
} from '../src/sistemas/mapa-da-ilha'

const AGORA = new Date('2026-10-30T12:00:00Z')

describe('o mapa que se revela andando (E02)', () => {
  test('só as ilhas com mapa; o Farol fica no da sua ilha', () => {
    expect(temMapa('farol')).toBe(false)
    for (const i of MAPAS_DAS_ILHAS) expect(temMapa(i)).toBe(true)
  })

  test('as partes de terra ficam dentro do quadrado e cobrem a ilha', () => {
    for (const ilha of MAPAS_DAS_ILHAS) {
      const terra = partesDeTerra(ilha)
      // Nas do anel o quadrado vai até o porto e a caverna (01/11/2026): a ilha ocupa menos dele.
      expect(terra.length).toBeGreaterThan(ilha === 'sua-ilha' ? 30 : 20)
      expect(terra.length).toBeLessThanOrEqual(64)
      const { meioLado, terra: raio } = MEDIDAS_DO_MAPA[ilha]
      expect(meioLado).toBeGreaterThanOrEqual(raio)
      // As partes à vista do meio da ilha são todas de terra.
      for (const i of partesAVista(ilha, { x: 0, z: 0 })) expect(terra).toContain(i)
    }
  })

  test('revelar liga só as partes pedidas, e juntar dois aparelhos não perde nada', () => {
    const a = revelar(undefined, [0, 9, 63])
    expect(MapaDaIlhaSchema.safeParse(a).success).toBe(true)
    expect([0, 9, 63].every((i) => parteVista(a, i))).toBe(true)
    expect(parteVista(a, 1)).toBe(false)
    const b = revelar(MAPA_VAZIO, [1])
    const junto = juntarMapas(a, b)
    expect([0, 1, 9, 63].every((i) => parteVista(junto, i))).toBe(true)
  })

  test('andar no meio da sua ilha revela as partes à vista, e repetir não muda o salvamento', () => {
    const s = criarSalvamentoInicial(AGORA)
    const um = registrarNoMapa(s, 'sua-ilha', { x: 0, z: 0 }, { x: 0, z: 0 })
    expect(um).not.toBe(s)
    const vistas = partesVistas('sua-ilha', um.mapa['sua-ilha'])
    expect(vistas.vistas).toBeGreaterThan(0)
    expect(vistas.vistas).toBeLessThan(vistas.total)
    expect(registrarNoMapa(um, 'sua-ilha', { x: 0, z: 0 }, { x: 0, z: 0 })).toBe(um)
    for (const i of partesAVista('sua-ilha', { x: 0, z: 0 })) {
      const p = meioDaParte('sua-ilha', i)
      const meia = MEDIDAS_DO_MAPA['sua-ilha'].meioLado / 8
      expect(
        Math.hypot(Math.max(0, Math.abs(p.x) - meia), Math.max(0, Math.abs(p.z) - meia)),
      ).toBeLessThanOrEqual(VISTA)
    }
  })

  test('nas ilhas do anel o centro conta, e longe da ilha nada muda', () => {
    const s = criarSalvamentoInicial(AGORA)
    const centro = { x: 82, z: 0 }
    const la = registrarNoMapa(s, 'bosque', centro, { x: 84, z: 1 })
    expect(porcentoDoMapa('bosque', la.mapa.bosque)).toBeGreaterThan(0)
    expect(registrarNoMapa(s, 'bosque', centro, { x: 0, z: 0 })).toBe(s)
    expect(registrarNoMapa(s, 'bosque', centro, { x: Number.NaN, z: 0 })).toBe(s)
  })

  test('andar pela ilha toda chega a 100 por cento', () => {
    let s = criarSalvamentoInicial(AGORA)
    const { meioLado } = MEDIDAS_DO_MAPA.recife
    for (let x = -meioLado; x <= meioLado; x += 3)
      for (let z = -meioLado; z <= meioLado; z += 3)
        s = registrarNoMapa(s, 'recife', { x: 0, z: 0 }, { x, z })
    expect(porcentoDoMapa('recife', s.mapa.recife)).toBe(100)
  })
})

describe('o mapa cobre a ilha inteira (lacunas, 01/11/2026)', () => {
  test('o quadrado de cada ilha do anel vai até o alcance real dela', () => {
    for (const ilha of MAPAS_DAS_ILHAS) {
      if (ilha === 'sua-ilha') continue
      const { meioLado, terra } = MEDIDAS_DO_MAPA[ilha]
      expect(terra).toBeGreaterThanOrEqual(14.4)
      expect(meioLado).toBeGreaterThanOrEqual(terra)
    }
    // O Recife vai até o labirinto e o navio (24 m); o Bosque, até a cabana e o porto.
    expect(MEDIDAS_DO_MAPA.recife.terra).toBeGreaterThanOrEqual(24)
    expect(MEDIDAS_DO_MAPA.bosque.terra).toBeGreaterThan(22)
  })

  test('em cada rumo, o ponto mais longe que se pisa cai numa parte de terra', () => {
    for (const ilha of MAPAS_DAS_ILHAS) {
      if (ilha === 'sua-ilha') continue
      const terra = new Set(partesDeTerra(ilha))
      const { meioLado } = MEDIDAS_DO_MAPA[ilha]
      for (let g = 0; g < 360; g += 15) {
        const a = (g * Math.PI) / 180
        const r = alcanceNoRumo(ilha, Math.cos(a), Math.sin(a)) - 0.5
        const p = { x: Math.cos(a) * r, z: Math.sin(a) * r }
        const col = Math.min(7, Math.floor(((p.x + meioLado) / (2 * meioLado)) * 8))
        const lin = Math.min(7, Math.floor(((p.z + meioLado) / (2 * meioLado)) * 8))
        expect(terra.has(lin * 8 + col)).toBe(true)
      }
    }
  })

  test('andar até a borda do Recife revela o canto do navio no mapa', () => {
    const s = criarSalvamentoInicial(AGORA)
    const longe = registrarNoMapa(s, 'recife', { x: 0, z: 0 }, { x: 20, z: 0 })
    expect(partesVistas('recife', longe.mapa.recife).vistas).toBeGreaterThan(0)
  })
})
