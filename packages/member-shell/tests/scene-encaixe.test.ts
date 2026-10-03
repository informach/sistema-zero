import { describe, expect, test } from 'bun:test'
import { ALTURA_MINIMA_DO_DESENHO, larguraDoEncaixe } from '../src/lib/scene-encaixe'

/**
 * O encaixe pela altura do palco no console ampliado (01/10/2026): a moldura nunca passa do mundo,
 * a borda entra na conta e, abaixo do piso, o palco para de encolher (aí o cartão rola).
 */
const altura = (largura: number, m: { proporcao: number; bordasX: number; fixo: number }) =>
  (largura - m.bordasX) / m.proporcao + m.fixo

describe('a largura do encaixe', () => {
  test('cabe na altura com a borda incluída (o rolinho de 4px que ela viu)', () => {
    // A nave a 1366×657: o mundo tinha 199px e a regra antiga dava 203 à moldura.
    const m = {
      alturaDisponivel: 199,
      larguraDisponivel: 726,
      fixo: 8,
      proporcao: 560 / 300,
      bordasX: 8,
    }
    const largura = larguraDoEncaixe(m)
    expect(largura).not.toBeNull()
    expect(altura(largura as number, m)).toBeLessThanOrEqual(199)
    expect(altura(largura as number, m)).toBeGreaterThan(195)
  })

  test('a legenda e o texto do rodapé entram no que não escala', () => {
    const m = {
      alturaDisponivel: 300,
      larguraDisponivel: 900,
      fixo: 8 + 30,
      proporcao: 1 / (1 / (560 / 300) + 40 / 560),
      bordasX: 8,
    }
    const largura = larguraDoEncaixe(m) as number
    expect(altura(largura, m)).toBeLessThanOrEqual(300)
    expect(altura(largura, m)).toBeGreaterThan(296)
  })

  test('a largura do mundo é o teto', () => {
    expect(
      larguraDoEncaixe({
        alturaDisponivel: 2000,
        larguraDisponivel: 726,
        fixo: 8,
        proporcao: 2,
        bordasX: 8,
      }),
    ).toBe(726)
  })

  test('abaixo do piso o desenho para de encolher: aí o cartão rola', () => {
    const m = { alturaDisponivel: 120, larguraDisponivel: 900, fixo: 8, proporcao: 2, bordasX: 8 }
    expect(larguraDoEncaixe(m)).toBe(ALTURA_MINIMA_DO_DESENHO * 2 + 8)
  })

  test('a largura mínima do palco (a comparação lado a lado) segura o encaixe: aí o cartão rola', () => {
    const m = {
      alturaDisponivel: 281,
      larguraDisponivel: 726,
      fixo: 38,
      proporcao: 1.87,
      bordasX: 8,
      larguraMinima: 432,
    }
    // Pela altura caberia em (281 − 38 − 1) × 1,87 + 8 ≈ 460: acima do mínimo, vale a altura.
    expect(larguraDoEncaixe(m)).toBeCloseTo(460.5, 0)
    // Com menos altura a conta pediria 311, mas o palco empilharia: fica no mínimo.
    expect(larguraDoEncaixe({ ...m, alturaDisponivel: 200 })).toBe(432)
    // E o mínimo nunca passa do mundo.
    expect(larguraDoEncaixe({ ...m, alturaDisponivel: 200, larguraDisponivel: 400 })).toBe(400)
  })

  test('a largura máxima (o palco estreito não sai do estreito) prende o encaixe', () => {
    // Estreito a 1280×600: o recorte é largo (2,86) e pela altura caberia em 465; o limiar é 475.
    const m = {
      alturaDisponivel: 300,
      larguraDisponivel: 669,
      fixo: 70,
      proporcao: 2.86,
      bordasX: 8,
      larguraMaxima: 475,
    }
    expect(larguraDoEncaixe(m)).toBe(475)
    expect(larguraDoEncaixe({ ...m, alturaDisponivel: 200 })).toBeCloseTo(160 * 2.86 + 8, 5)
  })

  test('sem proporção ou sem largura não há encaixe', () => {
    expect(
      larguraDoEncaixe({
        alturaDisponivel: 300,
        larguraDisponivel: 700,
        fixo: 0,
        proporcao: 0,
        bordasX: 0,
      }),
    ).toBeNull()
    expect(
      larguraDoEncaixe({
        alturaDisponivel: 300,
        larguraDisponivel: 0,
        fixo: 0,
        proporcao: 2,
        bordasX: 0,
      }),
    ).toBeNull()
  })

  test('nunca estoura a altura disponível acima do piso (varredura)', () => {
    let casos = 0
    for (const alturaDisponivel of [200, 255, 310, 406, 622])
      for (const proporcao of [0.8, 1, 560 / 300, 2.4])
        for (const fixo of [0, 8, 38, 90])
          for (const bordasX of [0, 8]) {
            const m = { alturaDisponivel, larguraDisponivel: 1280, fixo, proporcao, bordasX }
            const largura = larguraDoEncaixe(m) as number
            const h = altura(largura, m)
            if (alturaDisponivel - fixo - 1 >= ALTURA_MINIMA_DO_DESENHO)
              expect(h).toBeLessThanOrEqual(alturaDisponivel)
            expect(largura).toBeLessThanOrEqual(1280)
            casos++
          }
    expect(casos).toBe(160)
  })
})
