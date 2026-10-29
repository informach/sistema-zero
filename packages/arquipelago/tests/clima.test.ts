import { describe, expect, test } from 'bun:test'
import { type Canteiro, CRESCIMENTO_MS, ILHAS, progresso } from '@sistemazero/arquipelago-contracts'
import {
  CLIMA,
  CLIMAS,
  chuvaNaHorta,
  climaLiberado,
  FALA_DA_SEDE,
  FALA_DO_BONUS,
  FALA_DO_CLIMA,
  pedeAgua,
  regarComSede,
} from '../src/sistemas/clima'
import { APRESENTACAO_DA_IRIE } from '../src/sistemas/irie'

const T0 = Date.parse('2026-10-29T12:00:00.000Z')
const ALFACE = CRESCIMENTO_MS.alface

/** Um canteiro de alface regado em T0 (ou só plantado, sem `regadoEm`). */
function canteiro(regado = true): Canteiro {
  return {
    id: 'c1',
    semente: 'alface',
    plantadoEm: new Date(T0).toISOString(),
    regadoEm: regado ? new Date(T0).toISOString() : null,
  }
}
/** O instante em que a alface chega à fração `f` do crescimento. */
const em = (f: number) => T0 + f * ALFACE

describe('quando vale', () => {
  test('com a Ilha das Nuvens aberta (a Iriê ensina lá)', () => {
    const nuvens = ILHAS.find((i) => i.id === 'nuvens')
    if (!nuvens) throw new Error('sem as Nuvens no contrato')
    expect(climaLiberado(nuvens.posicao - 1)).toBe(false)
    expect(climaLiberado(nuvens.posicao)).toBe(true)
    expect(APRESENTACAO_DA_IRIE.at(-1)).toContain('clima da sua ilha')
  })
})

describe('a horta pede água (sem castigo)', () => {
  test('com sol pede mais cedo que nublado; na chuva não pede; sem regar não pede', () => {
    const c = canteiro()
    expect(pedeAgua(c, em(0.29), 'sol')).toBe(false)
    expect(pedeAgua(c, em(0.31), 'sol')).toBe(true)
    expect(pedeAgua(c, em(0.46), 'sol')).toBe(false)
    expect(pedeAgua(c, em(0.31), 'nublado')).toBe(false)
    expect(pedeAgua(c, em(0.61), 'nublado')).toBe(true)
    expect(pedeAgua(c, em(0.61), 'chuva')).toBe(false)
    expect(pedeAgua(canteiro(false), em(0.31), 'sol')).toBe(false)
    expect(CLIMA.pedeAgua.sol).toBeLessThan(CLIMA.pedeAgua.nublado)
  })

  test('regar quando pede adianta 15% e não pede de novo', () => {
    const c = canteiro()
    const agora = new Date(em(0.35))
    const regado = regarComSede(c, agora, 'sol')
    if (!regado) throw new Error('devia regar')
    expect(progresso(regado, agora.getTime())).toBeCloseTo(0.35 + CLIMA.bonus, 6)
    expect(pedeAgua(regado, agora.getTime(), 'sol')).toBe(false)
    expect(regarComSede(regado, agora, 'sol')).toBeNull()
    // Fora da janela, regar não faz nada.
    expect(regarComSede(c, new Date(em(0.1)), 'sol')).toBeNull()
  })

  test('sem regar, a planta cresce como sempre: madura no mesmo tempo de antes', () => {
    const c = canteiro()
    expect(progresso(c, em(1))).toBe(1)
    expect(progresso(c, em(0.5))).toBeCloseTo(0.5, 9)
  })
})

describe('a chuva rega a horta', () => {
  test('rega o que foi plantado e dá o bônus a quem está na janela do sol', () => {
    const agora = new Date(em(0.32))
    const plantado = canteiro(false)
    const pedindo = canteiro()
    const vazio: Canteiro = { id: 'c3', semente: null, plantadoEm: null, regadoEm: null }
    const nova = chuvaNaHorta([plantado, pedindo, vazio], agora)
    if (!nova) throw new Error('a chuva devia mudar a horta')
    expect(nova[0]?.regadoEm).toBe(agora.toISOString())
    expect(progresso(nova[1] as Canteiro, agora.getTime())).toBeCloseTo(0.32 + CLIMA.bonus, 6)
    expect(nova[2]).toBe(vazio)
    // Logo depois, nada mais a regar.
    expect(chuvaNaHorta(nova, agora)).toBeNull()
  })

  test('nunca tira crescimento de ninguém', () => {
    // Em qualquer ponto do crescimento, o progresso de cada canteiro depois da chuva é maior ou igual.
    for (let f = 0; f <= 1; f += 0.05) {
      const agora = new Date(em(f))
      const antes = [canteiro(), canteiro(false)]
      const depois = chuvaNaHorta(antes, agora) ?? antes
      for (const [i, c] of antes.entries())
        expect(progresso(depois[i] as Canteiro, agora.getTime())).toBeGreaterThanOrEqual(
          progresso(c, agora.getTime()),
        )
    }
  })
})

describe('os números e as falas', () => {
  test('menos gotas no modo leve; o tempo fechado tira luz', () => {
    expect(CLIMA.gotas.leve).toBeLessThan(CLIMA.gotas.medio)
    expect(CLIMA.gotas.medio).toBeLessThan(CLIMA.gotas.completo)
    expect(CLIMA.luz.chuva).toBeLessThan(CLIMA.luz.nublado)
    expect(CLIMA.luz.sol).toBe(1)
    expect(CLIMA.bonus).toBeGreaterThanOrEqual(CLIMA.janela)
  })

  test('as falas seguem as regras dos textos da criança', () => {
    for (const f of [
      ...CLIMAS.map((c) => FALA_DO_CLIMA[c]),
      FALA_DA_SEDE,
      FALA_DO_BONUS,
      ...APRESENTACAO_DA_IRIE,
    ]) {
      expect(f).not.toContain('—')
      expect(f).not.toContain('!')
      expect(f.split('.')[0]).not.toContain('?')
    }
  })
})
