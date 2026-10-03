import { describe, expect, test } from 'bun:test'
import {
  clampFloatWidth,
  defaultFloatGeometry,
  FLOAT_BAR_HEIGHT,
  FLOAT_DEFAULT,
  FLOAT_MARGIN,
  FLOAT_TOP_INSET,
  floatHeight,
  floatRect,
  floatStorageKey,
  floatWidthLimits,
  gripSide,
  moveCorner,
  nearestCorner,
  nextCorner,
  readFloatGeometry,
  resizedWidth,
  serializeFloatGeometry,
  topInsetBelow,
} from '../src/lib/lesson-video-float'

/** O vídeo flutuante da aula (03/10/2026): canto, tamanho e o que fica guardado por perfil. */

const COMPUTADOR = { width: 1366, height: 768 }
const CELULAR = { width: 390, height: 844 }

describe('o tamanho', () => {
  test('celular aceita um vídeo menor; o teto é a metade e pouco da janela, até 560', () => {
    expect(floatWidthLimits(CELULAR.width)).toEqual({ min: 160, max: 214 })
    expect(floatWidthLimits(COMPUTADOR.width)).toEqual({ min: 200, max: 560 })
    expect(floatWidthLimits(800)).toEqual({ min: 200, max: 440 })
  })

  test('largura fora da faixa (ou torta) volta para dentro dela', () => {
    expect(clampFloatWidth(50, COMPUTADOR.width)).toBe(200)
    expect(clampFloatWidth(9000, COMPUTADOR.width)).toBe(560)
    expect(clampFloatWidth(Number.NaN, COMPUTADOR.width)).toBe(FLOAT_DEFAULT.width)
  })

  test('16:9 mais a barra de cima', () => {
    expect(floatHeight(320)).toBe(180 + FLOAT_BAR_HEIGHT)
  })
})

describe('o lugar', () => {
  test('o padrão é em cima, à direita, abaixo da barra da tela ampliada', () => {
    const rect = floatRect(FLOAT_DEFAULT, COMPUTADOR)
    expect(rect).toEqual({
      left: COMPUTADOR.width - 320 - FLOAT_MARGIN,
      top: FLOAT_TOP_INSET,
      width: 320,
      height: floatHeight(320),
      corner: 'top-right',
    })
  })

  test('⚠️ nos cantos de cima, logo abaixo da SAÍDA da tela ampliada (achado no navegador)', () => {
    // Com o número fixo, o vídeo cobria o "Voltar à aula" do jogo pronto em qualquer largura.
    const saidaTerminaEm = 153
    const rect = floatRect(FLOAT_DEFAULT, {
      ...COMPUTADOR,
      topInset: topInsetBelow(saidaTerminaEm),
    })
    expect(rect.top).toBeGreaterThan(saidaTerminaEm)
    expect(rect.top).toBe(165)
    // Sem saída medida, a reserva de sempre.
    expect(topInsetBelow(null)).toBe(FLOAT_TOP_INSET)
    expect(topInsetBelow(Number.NaN)).toBe(FLOAT_TOP_INSET)
  })

  test('⚠️ janela BAIXA: num canto de cima o vídeo encolhe para caber abaixo da saída', () => {
    // Celular deitado no Safari: ~340px úteis, e a saída do jogo pronto termina em 150.
    const deitado = { width: 844, height: 340, topInset: topInsetBelow(150) }
    const rect = floatRect(FLOAT_DEFAULT, deitado)
    expect(rect.corner).toBe('top-right')
    expect(rect.top).toBeGreaterThanOrEqual(162)
    expect(rect.top + rect.height).toBeLessThanOrEqual(deitado.height - FLOAT_MARGIN)
    expect(rect.width).toBeLessThan(320)
  })

  test('⚠️ se nem o tamanho mínimo cabe abaixo da saída, ele desce para o canto de baixo', () => {
    const apertado = { width: 844, height: 300, topInset: topInsetBelow(150) }
    const rect = floatRect({ corner: 'top-left', width: 320 }, apertado)
    expect(rect.corner).toBe('bottom-left')
    expect(rect.top + rect.height).toBe(apertado.height - FLOAT_MARGIN)
  })

  test('quem ainda não escolheu: em cima à direita no computador, embaixo e menor no celular', () => {
    expect(defaultFloatGeometry(COMPUTADOR.width)).toEqual(FLOAT_DEFAULT)
    expect(defaultFloatGeometry(CELULAR.width)).toEqual({ corner: 'bottom-right', width: 176 })
    // No Estúdio e no Pinta a barra de ferramentas mora logo abaixo da saída.
    expect(defaultFloatGeometry(COMPUTADOR.width, true)).toEqual({
      corner: 'bottom-right',
      width: 320,
    })
    // O guardado torto cai no padrão DESTA tela, não no do computador.
    expect(readFloatGeometry(null, defaultFloatGeometry(CELULAR.width))).toEqual({
      corner: 'bottom-right',
      width: 176,
    })
  })

  test('embaixo à esquerda encosta nas duas bordas com o respiro', () => {
    const rect = floatRect({ corner: 'bottom-left', width: 320 }, COMPUTADOR)
    expect(rect.left).toBe(FLOAT_MARGIN)
    expect(rect.top + rect.height).toBe(COMPUTADOR.height - FLOAT_MARGIN)
  })

  test('janela baixa (celular deitado): o vídeo nunca sai da tela', () => {
    const baixa = { width: 844, height: 300 }
    for (const corner of ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const) {
      const rect = floatRect({ corner, width: 400 }, baixa)
      expect(rect.top).toBeGreaterThanOrEqual(FLOAT_MARGIN)
      expect(rect.left).toBeGreaterThanOrEqual(FLOAT_MARGIN)
      expect(rect.left + rect.width).toBeLessThanOrEqual(baixa.width - FLOAT_MARGIN)
    }
  })

  test('ao soltar, encaixa no canto do quadrante em que o centro parou', () => {
    expect(nearestCorner({ x: 100, y: 100 }, COMPUTADOR)).toBe('top-left')
    expect(nearestCorner({ x: 1200, y: 100 }, COMPUTADOR)).toBe('top-right')
    expect(nearestCorner({ x: 100, y: 700 }, COMPUTADOR)).toBe('bottom-left')
    expect(nearestCorner({ x: 1200, y: 700 }, COMPUTADOR)).toBe('bottom-right')
  })

  test('as setas andam um canto (na borda, ficam); Enter gira no sentido do relógio', () => {
    expect(moveCorner('top-right', 'left')).toBe('top-left')
    expect(moveCorner('top-right', 'right')).toBe('top-right')
    expect(moveCorner('top-right', 'down')).toBe('bottom-right')
    expect(moveCorner('bottom-left', 'up')).toBe('top-left')
    expect(nextCorner('top-left')).toBe('top-right')
    expect(nextCorner('top-right')).toBe('bottom-right')
    expect(nextCorner('bottom-right')).toBe('bottom-left')
    expect(nextCorner('bottom-left')).toBe('top-left')
  })

  test('a alça de tamanho fica do lado do meio da tela, e puxar para o meio aumenta', () => {
    expect(gripSide('top-right')).toBe('left')
    expect(gripSide('bottom-left')).toBe('right')
    expect(resizedWidth('top-right', 320, -40)).toBe(360)
    expect(resizedWidth('top-left', 320, 40)).toBe(360)
  })
})

describe('o que fica guardado', () => {
  test('por perfil; sem perfil, nada', () => {
    expect(floatStorageKey('perfil-1')).toBe('sz:lesson-video-float:v1:perfil-1')
    expect(floatStorageKey(null)).toBeNull()
  })

  test('ida e volta', () => {
    const geometry = { corner: 'bottom-left' as const, width: 287.6 }
    expect(readFloatGeometry(serializeFloatGeometry(geometry))).toEqual({
      corner: 'bottom-left',
      width: 288,
    })
  })

  test('guardado torto volta ao padrão, campo a campo, sem quebrar a aula', () => {
    expect(readFloatGeometry(null)).toEqual(FLOAT_DEFAULT)
    expect(readFloatGeometry('{nao é json')).toEqual(FLOAT_DEFAULT)
    expect(readFloatGeometry('42')).toEqual(FLOAT_DEFAULT)
    expect(readFloatGeometry('{"corner":"meio","width":300}')).toEqual({
      corner: FLOAT_DEFAULT.corner,
      width: 300,
    })
    expect(readFloatGeometry('{"corner":"bottom-right","width":"grande"}')).toEqual({
      corner: 'bottom-right',
      width: FLOAT_DEFAULT.width,
    })
  })
})
