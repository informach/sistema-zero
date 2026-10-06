import { describe, expect, test } from 'bun:test'
import {
  FAROL_ASSETS,
  FAROL_BARCOS,
  FAROL_CENARIOS,
  FAROL_CHAVES,
  FAROL_FAROIS,
  FAROL_HITBOXES,
  FAROL_LAYOUT,
  FAROL_PERSONAGENS,
  FAROL_POSICOES_CHAVE,
  type FarolAssetName,
} from '../farol-assets'
import { caixaDasFormas, lerFormas, pintado } from './silhuetaSvg'

const categorias = [
  { nomes: FAROL_PERSONAGENS, caixa: FAROL_LAYOUT.personagem },
  { nomes: FAROL_CENARIOS, caixa: FAROL_LAYOUT.palco },
  { nomes: FAROL_BARCOS, caixa: FAROL_LAYOUT.barco },
  { nomes: FAROL_CHAVES, caixa: FAROL_LAYOUT.chave },
  {
    nomes: FAROL_FAROIS.flatMap(({ apagado, aceso }) => [apagado, aceso]),
    caixa: FAROL_LAYOUT.farol,
  },
]

const elementos = (nome: FarolAssetName) => FAROL_ASSETS[nome].body.match(/<[^>]+\/>/g) ?? []
const semCor = (s: string) => s.replace(/(fill|stroke)="#[a-f\d]+"/g, '$1="cor"')

describe('a personalização do Farol conserva as caixas e o percurso', () => {
  test('as 27 escolhas visuais correspondem à caixa usada no projeto', () => {
    const todos = categorias.flatMap(({ nomes }) => [...nomes])
    expect(todos).toHaveLength(27)
    expect(new Set(todos).size).toBe(todos.length)
    for (const { nomes, caixa } of categorias) {
      const contato = FAROL_HITBOXES[nomes[0] as FarolAssetName]
      for (const nome of nomes) {
        expect(nome).toMatch(/^[a-z]+(?:-[a-z]+)*$/)
        expect([FAROL_ASSETS[nome].width, FAROL_ASSETS[nome].height], nome).toEqual([
          caixa.w,
          caixa.h,
        ])
        expect(FAROL_HITBOXES[nome], nome).toEqual(contato)
      }
    }
  })

  test('faróis acesos só acrescentam luz: torre, porta e contato não mudam', () => {
    const portaOriginal = elementos('farol-listrado-apagado').filter((s) =>
      /d="M (69\.42125|70\.02688|79\.99) /.test(s),
    )
    expect(portaOriginal).toHaveLength(3)
    for (const par of FAROL_FAROIS) {
      const apagado = elementos(par.apagado)
      const aceso = elementos(par.aceso)
      expect(aceso.length, par.nome).toBe(apagado.length + 2)
      expect(aceso.slice(2).map(semCor), par.nome).toEqual(apagado.map(semCor))
      for (const porta of portaOriginal) {
        expect(apagado, par.apagado).toContain(porta)
        expect(aceso, par.aceso).toContain(porta)
      }
      const caixa = caixaDasFormas(lerFormas(FAROL_ASSETS[par.apagado].body))
      expect(caixa.y1, par.nome).toBeCloseTo(151.905142, 4)
      expect(FAROL_HITBOXES[par.apagado]).toEqual(FAROL_HITBOXES['farol-apagado'])
    }
  })

  test('barcos ficam dentro da caixa e apoiam o casco na linha do veleiro', () => {
    const base = caixaDasFormas(lerFormas(FAROL_ASSETS.veleiro.body)).y1
    for (const nome of FAROL_BARCOS) {
      const caixa = caixaDasFormas(lerFormas(FAROL_ASSETS[nome].body))
      expect(caixa.x0, nome).toBeGreaterThanOrEqual(0)
      expect(caixa.y0, nome).toBeGreaterThanOrEqual(0)
      expect(caixa.x1, nome).toBeLessThanOrEqual(FAROL_LAYOUT.barco.w)
      expect(caixa.y1, nome).toBeLessThanOrEqual(FAROL_LAYOUT.barco.h)
      expect(Math.abs(caixa.y1 - base), nome).toBeLessThan(1)
    }
  })

  test('as chaves cabem na caixa de coleta e continuam usando o contato original', () => {
    for (const nome of FAROL_CHAVES) {
      const caixa = caixaDasFormas(lerFormas(FAROL_ASSETS[nome].body))
      expect(caixa.x0, nome).toBeGreaterThanOrEqual(0)
      expect(caixa.y0, nome).toBeGreaterThanOrEqual(0)
      expect(caixa.x1, nome).toBeLessThanOrEqual(32)
      expect(caixa.y1, nome).toBeLessThanOrEqual(32)
      expect(caixa.x1 - caixa.x0, nome).toBeGreaterThan(20)
      expect(FAROL_HITBOXES[nome]).toEqual(FAROL_HITBOXES.chave)
    }
  })

  test('os cenários mantêm a geometria da terra, do caminho, da ponte e do mar', () => {
    const original = elementos('cenario')
    const primeiroDetalhe = original.findIndex((e) => e.includes('cx="291.51"'))
    expect(primeiroDetalhe).toBeGreaterThan(25)
    const mapa = original.slice(0, primeiroDetalhe).map(semCor)
    for (const nome of FAROL_CENARIOS) {
      expect(elementos(nome).slice(0, primeiroDetalhe).map(semCor), nome).toEqual(mapa)
      expect(FAROL_ASSETS[nome].body, nome).not.toBe(FAROL_ASSETS.cenario.body)
    }
    expect(new Set(FAROL_CENARIOS.map((nome) => FAROL_ASSETS[nome].body)).size).toBe(4)
  })

  test('os três pontos da chave ficam no palco, separados do início e da porta', () => {
    const cruzam = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
    expect(FAROL_POSICOES_CHAVE).toHaveLength(3)
    for (const posicao of FAROL_POSICOES_CHAVE) {
      const caixa = { ...FAROL_LAYOUT.chave, ...posicao }
      expect(caixa.x).toBeGreaterThanOrEqual(0)
      expect(caixa.y).toBeGreaterThanOrEqual(0)
      expect(caixa.x + caixa.w).toBeLessThanOrEqual(FAROL_LAYOUT.palco.w)
      expect(caixa.y + caixa.h).toBeLessThanOrEqual(FAROL_LAYOUT.palco.h)
      expect(cruzam(caixa, FAROL_LAYOUT.personagem)).toBe(false)
      expect(cruzam(caixa, FAROL_LAYOUT.personagemNaPorta)).toBe(false)
    }
  })

  test('os aliases antigos conservam a dimensão e continuam fora das novas escolhas', () => {
    const todos = categorias.flatMap(({ nomes }) => [...nomes])
    for (const nome of [
      'personagem',
      'menina',
      'menino',
      'exploradora',
      'cenario',
      'barco',
      'chave',
      'farol-apagado',
      'farol-aceso',
    ] as const) {
      expect(FAROL_ASSETS[nome]).toBeDefined()
      expect(todos).not.toContain(nome)
    }
    expect(FAROL_ASSETS['farol-apagado'].width).toBe(128)
    expect(FAROL_ASSETS.barco.width).toBe(64)
  })

  test('a régua de silhueta enxerga um aro vazio e não pinta seu centro', () => {
    const formas = lerFormas(
      '<ellipse cx="12" cy="12" rx="6" ry="6" fill="none" stroke="#f3b123" stroke-width="3"/>',
    )
    expect(pintado(formas, 18, 12)).toBe(true)
    expect(pintado(formas, 12, 12)).toBe(false)
    expect(caixaDasFormas(formas)).toEqual({ x0: 4.5, y0: 4.5, x1: 19.5, y1: 19.5 })
  })
})
