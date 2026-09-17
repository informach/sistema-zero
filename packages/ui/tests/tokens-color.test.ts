import { describe, expect, test } from 'bun:test'
import {
  contrast,
  deltaE,
  fitChroma,
  hexToOklab,
  hexToOklch,
  inSrgb,
  mixOklab,
  oklabToHex,
  oklchToHex,
  oklchToOklab,
  solveActionLightness,
} from '../src/tokens/color'

/**
 * As autoverificações vêm do `packages/member-shell/tests/scene-contrast.test.ts`, onde esta
 * matemática nasceu: elas provam que a conta não está inventando, o que é o único jeito de um
 * teste de contraste valer alguma coisa.
 */
describe('a conta confere com o que o navegador faz', () => {
  test('misturar uma cor com ela mesma devolve ela', () => {
    expect(oklabToHex(mixOklab(hexToOklab('#808080'), hexToOklab('#808080'), 0.5))).toBe('#808080')
  })

  test('100% devolve o primeiro termo', () => {
    expect(oklabToHex(mixOklab(hexToOklab('#1b5cf3'), hexToOklab('#ffffff'), 1))).toBe('#1b5cf3')
  })

  test('preto no branco é 21', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 1)
  })

  test('contraste é simétrico e de uma cor com ela mesma é 1', () => {
    expect(contrast('#1b5cf3', '#e9eef6')).toBeCloseTo(contrast('#e9eef6', '#1b5cf3'), 10)
    expect(contrast('#c8246f', '#c8246f')).toBeCloseTo(1, 10)
  })

  test('ida e volta por OKLCH não move a cor', () => {
    for (const hex of ['#1b5cf3', '#c8246f', '#0b7a54', '#ffffff', '#000000', '#e9eef6', '#b55a00'])
      expect(oklchToHex(hexToOklch(hex))).toBe(hex)
  })

  test('hexadecimal torto é recusado, não silenciosamente aceito', () => {
    for (const lixo of ['#fff', 'azul', '#gggggg', '']) expect(() => hexToOklab(lixo)).toThrow()
  })
})

describe('gamute', () => {
  test('uma cor absurda NÃO cabe no sRGB', () => {
    expect(inSrgb(oklchToOklab([0.5, 0.5, 200]))).toBe(false)
  })

  test('`fitChroma` devolve a croma pedida quando ela cabe', () => {
    expect(fitChroma(0.54, 0.05, 263)).toBeCloseTo(0.05, 10)
  })

  test('`fitChroma` corta até caber, e o resultado cabe mesmo', () => {
    const c = fitChroma(0.5, 0.5, 200)
    expect(c).toBeLessThan(0.5)
    expect(inSrgb(oklchToOklab([0.5, c, 200]))).toBe(true)
  })
})

describe('o âncora da cor de ação', () => {
  /** As três cores escolhidas à mão pela dona, e o invariante escondido nelas. */
  const APROVADAS = { azul: '#1b5cf3', rosa: '#c8246f', verde: '#0b7a54' } as const

  test('⭐ as três têm o MESMO contraste com o branco, em luminosidades diferentes', () => {
    const medidas = Object.values(APROVADAS).map((hex) => contrast('#ffffff', hex))
    expect(Math.max(...medidas) - Math.min(...medidas)).toBeLessThan(0.1)
    // E as luminosidades são MESMO distintas: sem isto o invariante acima seria trivial.
    const luzes = Object.values(APROVADAS).map((hex) => hexToOklch(hex)[0])
    expect(Math.max(...luzes) - Math.min(...luzes)).toBeGreaterThan(0.03)
  })

  test('a fórmula reencontra as três a partir só da matiz', () => {
    for (const [nome, hex] of Object.entries(APROVADAS)) {
      const gerado = oklchToHex(solveActionLightness(hexToOklch(hex)[2], 5.35, 0.22))
      expect({ nome, dentro: deltaE(hex, gerado) <= 0.02 }).toEqual({ nome, dentro: true })
    }
  })

  test('⚠️ nenhuma matiz da roda produz uma ação ilegível — nem o amarelo', () => {
    for (let hue = 0; hue < 360; hue += 5) {
      const hex = oklchToHex(solveActionLightness(hue, 5.35, 0.22))
      expect({ hue, ok: contrast('#ffffff', hex) >= 4.5 }).toEqual({ hue, ok: true })
    }
  })
})
