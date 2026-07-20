import { describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import type { JSStatement } from '#ir'
import { parseJS } from '../../parsers/js'

function types(v: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(v)) for (const i of v) types(i, out)
  else if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    if (typeof o.type === 'string') out.add(o.type)
    for (const x of Object.values(o)) types(x, out)
  }
  return out
}

const N = (value: number) => ({ type: 'num', value }) as const

describe('Canvas — 11 blocos novos: round-trip Blocos↔Código', () => {
  it('falha com orientação amigável quando a tela não existe e mantém o round-trip', () => {
    const ir: JSStatement[] = [{ type: 'canvasSetup', canvasId: 'jogo', varName: 'ctx' }]
    const code = compileStatements(ir, 0)

    expect(() => new Function('document', code)({ getElementById: () => null })).toThrow(
      'Não foi possível preparar a tela Canvas “jogo”',
    )
    expect(parseJS(code)).toEqual(ir)
  })

  it('todos compilam e voltam SEM rawJS, mantendo o tipo do bloco', () => {
    const ir: JSStatement[] = [
      { type: 'canvasSetup', canvasId: 'tela', varName: 'ctx' },
      { type: 'canvasStrokeRect', ctxVar: 'ctx', x: N(1), y: N(2), w: N(3), h: N(4) },
      { type: 'canvasClearRect', ctxVar: 'ctx', x: N(5), y: N(6), w: N(7), h: N(8) },
      { type: 'canvasRoundRect', ctxVar: 'ctx', x: N(1), y: N(2), w: N(3), h: N(4), r: N(5) },
      { type: 'canvasEllipse', ctxVar: 'ctx', x: N(1), y: N(2), rx: N(3), ry: N(4) },
      { type: 'canvasArcSlice', ctxVar: 'ctx', x: N(1), y: N(2), r: N(3), start: N(0), end: N(2) },
      { type: 'canvasQuadraticCurve', ctxVar: 'ctx', cpx: N(1), cpy: N(2), x: N(3), y: N(4) },
      {
        type: 'canvasBezierCurve',
        ctxVar: 'ctx',
        cp1x: N(1),
        cp1y: N(2),
        cp2x: N(3),
        cp2y: N(4),
        x: N(5),
        y: N(6),
      },
      {
        type: 'canvasShadow',
        ctxVar: 'ctx',
        color: { type: 'color', value: '#9cff57' },
        blur: N(14),
      },
      {
        type: 'canvasStrokeText',
        ctxVar: 'ctx',
        text: { type: 'str', value: 'oi' },
        x: N(1),
        y: N(2),
      },
      { type: 'canvasLineDash', ctxVar: 'ctx', segment: N(8) },
      {
        type: 'var',
        name: 'larg',
        value: { type: 'canvasMeasureText', ctxVar: 'ctx', text: { type: 'str', value: 'oi' } },
        kind: 'const',
      },
    ]
    const code = compileStatements(ir, 0)
    const t = types(parseJS(code))
    expect(t.has('rawJS')).toBe(false)
    for (const expected of [
      'canvasStrokeRect',
      'canvasClearRect',
      'canvasRoundRect',
      'canvasEllipse',
      'canvasArcSlice',
      'canvasQuadraticCurve',
      'canvasBezierCurve',
      'canvasShadow',
      'canvasStrokeText',
      'canvasLineDash',
      'canvasMeasureText',
    ]) {
      expect(t.has(expected)).toBe(true)
    }
  })

  it('limpar tela inteira continua sendo canvasClear (não canvasClearRect)', () => {
    const code = compileStatements(
      [
        { type: 'canvasSetup', canvasId: 'tela', varName: 'ctx' },
        { type: 'canvasClear', ctxVar: 'ctx', canvasVar: 'canvas' },
      ] as JSStatement[],
      0,
    )
    const t = types(parseJS(code))
    expect(t.has('canvasClear')).toBe(true)
    expect(t.has('canvasClearRect')).toBe(false)
  })
})
