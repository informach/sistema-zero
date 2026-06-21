import { describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import type { JSStatement } from '#ir'
import { parseJS } from '../js'

function collectTypes(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) for (const item of value) collectTypes(item, out)
  else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.type === 'string') out.add(obj.type)
    for (const v of Object.values(obj)) collectTypes(v, out)
  }
  return out
}

describe('canvas — traçado/contorno/fonte/transparência (caminho na mão)', () => {
  it('round-trip: setup + polígono (begin/move/line/close/fill/stroke) + estilo + fonte', () => {
    const ir: JSStatement[] = [
      { type: 'canvasSetup', canvasId: 'tela', varName: 'ctx' },
      { type: 'canvasStrokeStyle', ctxVar: 'ctx', color: { type: 'color', value: '#35e8ff' } },
      { type: 'canvasLineWidth', ctxVar: 'ctx', width: { type: 'num', value: 2 } },
      { type: 'canvasGlobalAlpha', ctxVar: 'ctx', alpha: { type: 'num', value: 0.5 } },
      { type: 'canvasBeginPath', ctxVar: 'ctx' },
      {
        type: 'canvasMoveTo',
        ctxVar: 'ctx',
        x: { type: 'num', value: 10 },
        y: { type: 'num', value: 10 },
      },
      {
        type: 'canvasLineTo',
        ctxVar: 'ctx',
        x: { type: 'num', value: 30 },
        y: { type: 'num', value: 40 },
      },
      {
        type: 'canvasLineTo',
        ctxVar: 'ctx',
        x: { type: 'num', value: 50 },
        y: { type: 'num', value: 10 },
      },
      { type: 'canvasClosePath', ctxVar: 'ctx' },
      { type: 'canvasFill', ctxVar: 'ctx' },
      { type: 'canvasStroke', ctxVar: 'ctx' },
      { type: 'canvasFont', ctxVar: 'ctx', size: 24, family: 'sans-serif' },
      { type: 'canvasTextAlign', ctxVar: 'ctx', align: 'center' },
    ]
    const code = compileStatements(ir, 0)
    const types = collectTypes(parseJS(code))
    expect(types.has('rawJS')).toBe(false)
    for (const expected of [
      'canvasBeginPath',
      'canvasMoveTo',
      'canvasLineTo',
      'canvasClosePath',
      'canvasFill',
      'canvasStroke',
      'canvasStrokeStyle',
      'canvasLineWidth',
      'canvasGlobalAlpha',
      'canvasFont',
      'canvasTextAlign',
    ]) {
      expect(types.has(expected)).toBe(true)
    }
  })

  it('round-trip: retângulo + recorte (clip) e ponto-no-traçado/na-linha (booleanos)', () => {
    const ir: JSStatement[] = [
      { type: 'canvasSetup', canvasId: 'tela', varName: 'ctx' },
      { type: 'canvasBeginPath', ctxVar: 'ctx' },
      {
        type: 'canvasRect',
        ctxVar: 'ctx',
        x: { type: 'num', value: 0 },
        y: { type: 'num', value: 0 },
        w: { type: 'num', value: 300 },
        h: { type: 'num', value: 200 },
      },
      { type: 'canvasClip', ctxVar: 'ctx' },
      {
        type: 'if',
        cond: {
          type: 'canvasIsPointInPath',
          ctxVar: 'ctx',
          x: { type: 'num', value: 10 },
          y: { type: 'num', value: 20 },
        },
        then: [{ type: 'canvasFill', ctxVar: 'ctx' }],
      },
      {
        type: 'if',
        cond: {
          type: 'canvasIsPointInStroke',
          ctxVar: 'ctx',
          x: { type: 'num', value: 10 },
          y: { type: 'num', value: 20 },
        },
        then: [{ type: 'canvasStroke', ctxVar: 'ctx' }],
      },
    ]
    const code = compileStatements(ir, 0)
    expect(code).toContain('ctx.rect(0, 0, 300, 200);')
    expect(code).toContain('ctx.clip();')
    expect(code).toContain('ctx.isPointInPath(10, 20)')
    expect(code).toContain('ctx.isPointInStroke(10, 20)')
    const types = collectTypes(parseJS(code))
    expect(types.has('rawJS')).toBe(false)
    for (const expected of [
      'canvasRect',
      'canvasClip',
      'canvasIsPointInPath',
      'canvasIsPointInStroke',
    ]) {
      expect(types.has(expected)).toBe(true)
    }
  })

  it('gera o ctx.font no formato "<size>px <family>" e volta a tamanho+família', () => {
    const code = compileStatements(
      [
        { type: 'canvasSetup', canvasId: 'tela', varName: 'ctx' },
        { type: 'canvasFont', ctxVar: 'ctx', size: 18, family: 'monospace' },
      ],
      0,
    )
    expect(code).toContain('ctx.font = "18px monospace";')
    const ir = parseJS(code)
    expect(ir.at(-1)).toEqual({ type: 'canvasFont', ctxVar: 'ctx', size: 18, family: 'monospace' })
  })
})

describe('entrada na mão — __szInput (tecla apertada? e x/y do mouse)', () => {
  it('reconhece a tecla apertada (booleano) dentro de um "se"', () => {
    expect(parseJS('if (__szInput.key("ArrowRight")) { x = x + 1; }')).toEqual([
      {
        type: 'if',
        cond: { type: 'inputKeyPressed', key: 'ArrowRight' },
        then: [
          {
            type: 'assign',
            name: 'x',
            value: {
              type: 'binop',
              op: '+',
              left: { type: 'var', name: 'x' },
              right: { type: 'num', value: 1 },
            },
          },
        ],
        else: undefined,
      },
    ])
  })

  it('reconhece x/y do mouse como valor', () => {
    expect(parseJS('const px = __szInput.x;')).toEqual([
      { type: 'var', name: 'px', value: { type: 'inputPointer', axis: 'x' }, kind: 'const' },
    ])
    expect(parseJS('const py = __szInput.y;')).toEqual([
      { type: 'var', name: 'py', value: { type: 'inputPointer', axis: 'y' }, kind: 'const' },
    ])
  })
})
