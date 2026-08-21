import { describe, expect, test } from 'bun:test'
import {
  DEFAULT_STAGE_ASPECT,
  fittedStageBox,
  rotatedStageBox,
  STAGE_FILL,
  sanitizeStageAspect,
  shouldRotateStage,
  uprightStageBox,
} from '@/lib/stage-fit'

/** Celular em pé, com a barra do navegador na tela. */
const CELULAR = { viewportW: 393, viewportH: 660 }
/** Um jogo em pé, do tamanho que o palco nasce sem "preparar em tela cheia". */
const JOGO_EM_PE = 320 / 480

describe('formato do palco que o iframe informa', () => {
  test('a proporção sai da resolução interna do canvas', () => {
    expect(sanitizeStageAspect({ type: 'sz:stage', w: 800, h: 480 })).toBeCloseTo(5 / 3, 10)
    // Depois do resize de nitidez o canvas vale DPR vezes o lógico; a proporção não muda.
    expect(sanitizeStageAspect({ type: 'sz:stage', w: 1600, h: 960 })).toBeCloseTo(5 / 3, 10)
  })

  test('0 por 0 é "não tenho palco", não é lixo', () => {
    expect(sanitizeStageAspect({ w: 0, h: 0 })).toBe(STAGE_FILL)
  })

  test('recusa o que o jogo da criança pode mandar de torto ou hostil', () => {
    for (const torto of [
      { w: -800, h: 480 },
      { w: 800, h: 0 },
      { w: Number.NaN, h: 480 },
      { w: Number.POSITIVE_INFINITY, h: 480 },
      { w: '800', h: '480' },
      { w: 800 },
      null,
      'sz:stage',
      // Fora da faixa sã: uma fita de 100 por 1 deixaria o palco com 1px de altura.
      { w: 10_000, h: 10 },
      { w: 10, h: 10_000 },
    ]) {
      expect(sanitizeStageAspect(torto)).toBeNull()
    }
  })
})

describe('o palco cabendo na caixa', () => {
  test('o jogo deitado num celular em pé é limitado pela LARGURA', () => {
    const caixa = uprightStageBox({ ...CELULAR, aspect: DEFAULT_STAGE_ASPECT, coarsePointer: true })
    const palco = fittedStageBox(caixa, DEFAULT_STAGE_ASPECT)

    expect(caixa).toEqual({ w: 393, h: 600 })
    // Sobra a tela quase toda vazia: 236 de 600 disponíveis.
    expect(Math.round(palco.width)).toBe(393)
    expect(Math.round(palco.height)).toBe(236)
  })

  test('girado, o mesmo jogo usa o lado comprido do aparelho', () => {
    const caixa = rotatedStageBox({ ...CELULAR, aspect: DEFAULT_STAGE_ASPECT, coarsePointer: true })
    const palco = fittedStageBox(caixa, DEFAULT_STAGE_ASPECT)

    expect(caixa).toEqual({ w: 660, h: 349 })
    expect(Math.round(palco.width)).toBe(582)
    expect(Math.round(palco.height)).toBe(349)
    // 2,2x a área de antes é o motivo de tudo isto existir.
    expect(palco.width * palco.height).toBeGreaterThan(393 * 236 * 2.1)
  })

  test('sem palco, a página fica com a caixa inteira', () => {
    expect(fittedStageBox({ w: 393, h: 600 }, STAGE_FILL)).toEqual({ width: 393, height: 600 })
  })
})

describe('quando vale a pena girar', () => {
  test('jogo deitado num celular em pé: gira', () => {
    expect(
      shouldRotateStage({ ...CELULAR, aspect: DEFAULT_STAGE_ASPECT, coarsePointer: true }),
    ).toBe(true)
  })

  test('jogo EM PÉ no mesmo celular: NÃO gira, porque girar o encolheria', () => {
    // A metade que precisa falhar: sem ela a regra poderia ser "celular gira".
    expect(shouldRotateStage({ ...CELULAR, aspect: JOGO_EM_PE, coarsePointer: true })).toBe(false)
  })

  test('desktop deitado nunca gira, nem com tela sensível ao toque', () => {
    expect(
      shouldRotateStage({
        viewportW: 1440,
        viewportH: 800,
        aspect: DEFAULT_STAGE_ASPECT,
        coarsePointer: true,
      }),
    ).toBe(false)
  })

  test('sem ponteiro grosso não gira: ninguém vira um monitor', () => {
    expect(
      shouldRotateStage({ ...CELULAR, aspect: DEFAULT_STAGE_ASPECT, coarsePointer: false }),
    ).toBe(false)
  })

  test('tablet em pé gira (1,3x de lado, quase o dobro de área)', () => {
    expect(
      shouldRotateStage({
        viewportW: 768,
        viewportH: 1024,
        aspect: DEFAULT_STAGE_ASPECT,
        coarsePointer: true,
      }),
    ).toBe(true)
  })

  test('tela quase quadrada não gira: o ganho não paga virar o aparelho', () => {
    expect(
      shouldRotateStage({
        viewportW: 1000,
        viewportH: 1050,
        aspect: DEFAULT_STAGE_ASPECT,
        coarsePointer: true,
      }),
    ).toBe(false)
  })

  test('página sem palco não gira: não há o que ganhar', () => {
    expect(shouldRotateStage({ ...CELULAR, aspect: STAGE_FILL, coarsePointer: true })).toBe(false)
  })

  test('viewport ainda não medida (servidor, antes do mount) não gira', () => {
    expect(
      shouldRotateStage({
        viewportW: 0,
        viewportH: 0,
        aspect: DEFAULT_STAGE_ASPECT,
        coarsePointer: true,
      }),
    ).toBe(false)
  })
})
