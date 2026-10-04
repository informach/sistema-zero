import { describe, expect, test } from 'bun:test'
import {
  defaultFloatGeometry,
  FLOAT_BAR_HEIGHT,
  FLOAT_DEFAULT,
  FLOAT_FRAME,
  FLOAT_MARGIN,
  FLOAT_TOP_INSET,
  floatHeight,
  floatMaxWidth,
  floatRect,
  floatSizeSteps,
  floatStepOf,
  floatStorageKey,
  moveCorner,
  nearestCorner,
  nextCorner,
  readFloatGeometry,
  resizedFloat,
  serializeFloatGeometry,
  topInsetBelow,
} from '../src/lib/lesson-video-float'

/** O vídeo flutuante da aula (03/10/2026): canto, tamanho e o que fica guardado por perfil. */

const COMPUTADOR = { width: 1366, height: 768 }
const CELULAR = { width: 390, height: 844 }
/** O "Voltar à aula" do jogo pronto termina em 153px (medido no navegador). */
const COM_SAIDA = { ...COMPUTADOR, topInset: topInsetBelow(153) }

const larguras = (viewport: Parameters<typeof floatSizeSteps>[0]) =>
  floatSizeSteps(viewport).map((step) => [step.size, step.width])

describe('o tamanho: três degraus', () => {
  test('no computador: pequeno, médio e um grande de VERDADE (2/3 da tela)', () => {
    expect(larguras(COMPUTADOR)).toEqual([
      ['small', 300],
      ['medium', 480],
      ['large', 901],
    ])
    // A alça antiga parava em 560px, um terço desta tela: era o "aumenta um pouquinho e trava".
    expect(floatMaxWidth(COMPUTADOR)).toBeGreaterThan(COMPUTADOR.width * 0.6)
  })

  test('no celular: degraus menores, e o grande ocupa a largura menos o respiro', () => {
    expect(larguras(CELULAR)).toEqual([
      ['small', 176],
      ['medium', 260],
      ['large', CELULAR.width - 2 * FLOAT_MARGIN],
    ])
  })

  test('⚠️ degraus quase iguais viram um só: o + nunca cresce 10px', () => {
    // A 760px o grande daria 501, colado nos 480 do médio.
    expect(larguras({ width: 760, height: 768 })).toEqual([
      ['small', 300],
      ['medium', 480],
    ])
    // E o guardado "grande" desta janela é o médio, com o + apagado.
    const { steps, index } = floatStepOf('large', { width: 760, height: 768 })
    expect(steps[index]?.size).toBe('medium')
    expect(resizedFloat('large', 'grow', { width: 760, height: 768 })).toBeNull()
  })

  test('⚠️⚠️ o grande cabe abaixo da SAÍDA da tela ampliada em QUALQUER canto', () => {
    for (const corner of ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const) {
      const rect = floatRect({ corner, size: 'large' }, COM_SAIDA)
      expect(rect.top).toBeGreaterThanOrEqual(COM_SAIDA.topInset)
      expect(rect.top + rect.height).toBeLessThanOrEqual(COMPUTADOR.height - FLOAT_MARGIN)
    }
  })

  test('− e + andam um degrau; nas pontas não há para onde ir', () => {
    expect(resizedFloat('small', 'grow', COMPUTADOR)).toBe('medium')
    expect(resizedFloat('medium', 'grow', COMPUTADOR)).toBe('large')
    expect(resizedFloat('large', 'grow', COMPUTADOR)).toBeNull()
    expect(resizedFloat('large', 'shrink', COMPUTADOR)).toBe('medium')
    expect(resizedFloat('small', 'shrink', COMPUTADOR)).toBeNull()
  })

  test('16:9 dentro da moldura, mais a barra de cima', () => {
    const video = 300 - 2 * FLOAT_FRAME
    expect(floatHeight(300)).toBe(Math.round((video * 9) / 16) + FLOAT_BAR_HEIGHT + FLOAT_FRAME)
  })
})

describe('o lugar', () => {
  test('o padrão é em cima, à direita, abaixo da barra da tela ampliada, no pequeno', () => {
    expect(floatRect(FLOAT_DEFAULT, COMPUTADOR)).toEqual({
      left: COMPUTADOR.width - 300 - FLOAT_MARGIN,
      top: FLOAT_TOP_INSET,
      width: 300,
      height: floatHeight(300),
      corner: 'top-right',
    })
  })

  test('⚠️ nos cantos de cima, logo abaixo da SAÍDA da tela ampliada (achado no navegador)', () => {
    // Com o número fixo, o vídeo cobria o "Voltar à aula" do jogo pronto em qualquer largura.
    const rect = floatRect(FLOAT_DEFAULT, COM_SAIDA)
    expect(rect.top).toBeGreaterThan(153)
    expect(rect.top).toBe(165)
    // Sem saída medida, a reserva de sempre.
    expect(topInsetBelow(null)).toBe(FLOAT_TOP_INSET)
    expect(topInsetBelow(Number.NaN)).toBe(FLOAT_TOP_INSET)
  })

  test('⚠️ janela BAIXA: o degrau encolhe para caber abaixo da saída, no mesmo canto', () => {
    // Celular deitado no Safari: ~340px úteis, e a saída do jogo pronto termina em 150.
    const deitado = { width: 844, height: 340, topInset: topInsetBelow(150) }
    const rect = floatRect(FLOAT_DEFAULT, deitado)
    expect(rect.corner).toBe('top-right')
    expect(rect.top).toBeGreaterThanOrEqual(162)
    expect(rect.top + rect.height).toBeLessThanOrEqual(deitado.height - FLOAT_MARGIN)
    expect(rect.width).toBeLessThan(300)
  })

  test('⚠️ se nem o tamanho mínimo cabe abaixo da saída, ele desce para o canto de baixo', () => {
    const apertado = { width: 844, height: 300, topInset: topInsetBelow(150) }
    const rect = floatRect({ corner: 'top-left', size: 'small' }, apertado)
    expect(rect.corner).toBe('bottom-left')
    expect(rect.top + rect.height).toBe(apertado.height - FLOAT_MARGIN)
  })

  test('quem ainda não escolheu: em cima à direita no computador, embaixo no celular', () => {
    expect(defaultFloatGeometry(COMPUTADOR.width)).toEqual(FLOAT_DEFAULT)
    expect(defaultFloatGeometry(CELULAR.width)).toEqual({ corner: 'bottom-right', size: 'small' })
    // No Estúdio e no Pinta a barra de ferramentas mora logo abaixo da saída.
    expect(defaultFloatGeometry(COMPUTADOR.width, true)).toEqual({
      corner: 'bottom-right',
      size: 'small',
    })
    // O guardado torto cai no padrão DESTA tela, não no do computador.
    expect(readFloatGeometry(null, defaultFloatGeometry(CELULAR.width))).toEqual({
      corner: 'bottom-right',
      size: 'small',
    })
  })

  test('embaixo à esquerda encosta nas duas bordas com o respiro', () => {
    const rect = floatRect({ corner: 'bottom-left', size: 'medium' }, COMPUTADOR)
    expect(rect.left).toBe(FLOAT_MARGIN)
    expect(rect.top + rect.height).toBe(COMPUTADOR.height - FLOAT_MARGIN)
  })

  test('janela baixa (celular deitado): o vídeo nunca sai da tela, em nenhum degrau', () => {
    const baixa = { width: 844, height: 300 }
    for (const corner of ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const) {
      for (const size of ['small', 'medium', 'large'] as const) {
        const rect = floatRect({ corner, size }, baixa)
        expect(rect.top).toBeGreaterThanOrEqual(FLOAT_MARGIN)
        expect(rect.top + rect.height).toBeLessThanOrEqual(baixa.height - FLOAT_MARGIN)
        expect(rect.left).toBeGreaterThanOrEqual(FLOAT_MARGIN)
        expect(rect.left + rect.width).toBeLessThanOrEqual(baixa.width - FLOAT_MARGIN)
      }
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
})

describe('o que fica guardado', () => {
  test('por perfil (v2, desde os degraus); sem perfil, nada', () => {
    expect(floatStorageKey('perfil-1')).toBe('sz:lesson-video-float:v2:perfil-1')
    expect(floatStorageKey(null)).toBeNull()
  })

  test('ida e volta', () => {
    const geometry = { corner: 'bottom-left' as const, size: 'large' as const }
    expect(readFloatGeometry(serializeFloatGeometry(geometry))).toEqual(geometry)
  })

  test('guardado torto volta ao padrão, campo a campo, sem quebrar a aula', () => {
    expect(readFloatGeometry(null)).toEqual(FLOAT_DEFAULT)
    expect(readFloatGeometry('{nao é json')).toEqual(FLOAT_DEFAULT)
    expect(readFloatGeometry('42')).toEqual(FLOAT_DEFAULT)
    expect(readFloatGeometry('{"corner":"meio","size":"medium"}')).toEqual({
      corner: FLOAT_DEFAULT.corner,
      size: 'medium',
    })
    expect(readFloatGeometry('{"corner":"bottom-right","size":"gigante"}')).toEqual({
      corner: 'bottom-right',
      size: FLOAT_DEFAULT.size,
    })
    // O formato antigo, em pixels, não vira degrau por conta própria.
    expect(readFloatGeometry('{"corner":"top-left","width":320}')).toEqual({
      corner: 'top-left',
      size: FLOAT_DEFAULT.size,
    })
  })
})
