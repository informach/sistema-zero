import { describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import { type JSStatement, SZIRV2Schema } from '#ir'
import { isLifecycleRootAllowed } from '../../../ir/lifecycle'
import { parseJS } from '../../../parsers/js'
import { gameKitDrawingRuntime } from '../drawingRuntime'
import { gameKitExamples } from '../exampleCatalog'
import { collectTypes, stripIds } from './exampleContractHarness'

const drawing: JSStatement[] = [
  {
    type: 'gk:drawRectangle',
    x: { type: 'num', value: 4 },
    y: { type: 'num', value: 8 },
    w: { type: 'num', value: 40 },
    h: { type: 'num', value: 20 },
    color: { type: 'color', value: '#ff8800' },
  },
  {
    type: 'gk:drawCircle',
    x: { type: 'num', value: 20 },
    y: { type: 'num', value: 20 },
    r: { type: 'num', value: 8 },
    color: { type: 'color', value: '#ffffff' },
  },
  {
    type: 'gk:drawTriangle',
    x1: { type: 'num', value: 0 },
    y1: { type: 'num', value: 10 },
    x2: { type: 'num', value: 10 },
    y2: { type: 'num', value: 0 },
    x3: { type: 'num', value: 20 },
    y3: { type: 'num', value: 10 },
    color: { type: 'color', value: '#00ff00' },
  },
  {
    type: 'gk:drawText',
    text: { type: 'num', value: 42 },
    x: { type: 'num', value: 12 },
    y: { type: 'num', value: 24 },
    size: { type: 'num', value: 18 },
    color: { type: 'color', value: '#eeeeee' },
  },
]

describe('desenho nativo do Jogo 2D Avançado', () => {
  it('a API de contrato também recusa figuras soltas nas raízes das áreas', () => {
    for (const statement of drawing) {
      for (const area of ['start', 'events', 'loops', 'molds'] as const) {
        expect(isLifecycleRootAllowed(statement, area), `${statement.type}/${area}`).toBe(false)
      }
    }
  })
  it('a Ponte preserva figuras completas, valores e texto numérico sem comandos Canvas', () => {
    const code = compileStatements(drawing, 0)
    expect(stripIds(parseJS(code))).toEqual(drawing)
    expect(code).not.toMatch(/\bctx\./)
    expect(code).toContain('SZGameKit.drawText(42, 12, 24, 18, "#eeeeee")')
  })

  it('o desenho é permitido no mapa visual e recusado no evento que cria as regras do mapa', () => {
    const map = {
      type: 'gk:rpgCreateMap',
      map: 'vila',
      cols: { type: 'num', value: 10 },
      rows: { type: 'num', value: 10 },
      ctxName: 'ctx',
      body: drawing,
    }
    const document = {
      version: 2,
      html: [],
      css: [],
      extensions: [{ extensionId: 'game-2d-advanced' }],
      behavior: { start: [map], events: [], loops: [] },
    }
    expect(SZIRV2Schema.safeParse(document).success).toBe(true)
    expect(
      SZIRV2Schema.safeParse({
        ...document,
        behavior: {
          ...document.behavior,
          events: [{ type: 'gk:rpgOnEnterMap', map: 'vila', body: drawing }],
        },
      }).success,
    ).toBe(false)
  })

  it('todos os exemplos usam recursos da extensão para desenhar, inclusive as aparências', () => {
    expect(gameKitExamples.length).toBeGreaterThanOrEqual(38)
    for (const example of gameKitExamples) {
      const types = [...collectTypes(example.ir)]
      expect(
        types.filter((type) => type.startsWith('canvas')),
        example.name,
      ).toEqual([])
      expect(example.ir.html, example.name).toEqual([])
      expect(example.ir.css, example.name).toEqual([])
      expect(JSON.stringify(example.ir), example.name).not.toMatch(
        /"object":\{"type":"var","name":"ctx"\}/,
      )
    }
  })

  it('o contexto de desenho atravessa condições, mas não autoriza início, atualização ou eventos', () => {
    const document = (behavior: unknown) => ({
      version: 2,
      html: [],
      css: [],
      extensions: [{ extensionId: 'game-2d-advanced' }],
      behavior,
    })
    const nested = [{ type: 'if', cond: { type: 'bool', value: true }, then: drawing }]
    for (const type of ['gk:onDraw', 'gk:onDrawHud']) {
      expect(
        SZIRV2Schema.safeParse(
          document({ start: [], events: [], loops: [{ type, ctxName: 'ctx', body: nested }] }),
        ).success,
      ).toBe(true)
    }
    expect(
      SZIRV2Schema.safeParse(
        document({
          molds: [{ type: 'gk:defineLook', name: 'heroi', ctxName: 'ctx', body: nested }],
          start: [],
          events: [],
          loops: [],
        }),
      ).success,
    ).toBe(true)
    expect(
      SZIRV2Schema.safeParse(document({ start: drawing, events: [], loops: [] })).success,
    ).toBe(false)
    expect(
      SZIRV2Schema.safeParse(
        document({
          start: [],
          events: [],
          loops: [{ type: 'gk:onUpdate', dtName: 'dt', body: drawing }],
        }),
      ).success,
    ).toBe(false)
    expect(
      SZIRV2Schema.safeParse(
        document({
          start: [],
          events: [{ type: 'gk:onEnterState', name: 'jogando', body: drawing }],
          loops: [],
        }),
      ).success,
    ).toBe(false)
  })

  it('desenha a geometria pedida, usa a fonte do jogo e restaura o estado mesmo se o desenho falhar', () => {
    const calls: Array<[string, unknown[]]> = []
    const stack: Array<{
      fillStyle: string
      font: string
      textAlign: string
      textBaseline: string
    }> = []
    const context = {
      fillStyle: '#123456',
      font: '10px original',
      textAlign: 'right',
      textBaseline: 'top',
      save() {
        stack.push({
          fillStyle: this.fillStyle,
          font: this.font,
          textAlign: this.textAlign,
          textBaseline: this.textBaseline,
        })
      },
      restore() {
        Object.assign(this, stack.pop())
      },
      fillRect(...args: number[]) {
        calls.push(['rectangle', [...args, this.fillStyle]])
      },
      beginPath() {},
      closePath() {},
      fill() {},
      moveTo(...args: number[]) {
        calls.push(['move', args])
      },
      lineTo(...args: number[]) {
        calls.push(['line', args])
      },
      arc(...args: number[]) {
        calls.push(['circle', [...args, this.fillStyle]])
      },
      fillText(...args: unknown[]) {
        calls.push([
          'text',
          [...args, this.font, this.fillStyle, this.textAlign, this.textBaseline],
        ])
        throw new Error('falha de desenho')
      },
    }
    const api: {
      drawRectangle(...values: unknown[]): void
      drawCircle(...values: unknown[]): void
      drawTriangle(...values: unknown[]): void
      drawText(...values: unknown[]): void
    } = new Function(
      'ctx2d',
      'num',
      'text',
      '_szGameUIFont',
      `${gameKitDrawingRuntime}; return {drawRectangle, drawCircle, drawTriangle, drawText};`,
    )(
      context,
      (value: unknown, fallback: number) =>
        typeof value === 'number' && Number.isFinite(value) ? value : fallback,
      (value: unknown, fallback: string) => (typeof value === 'string' ? value : fallback),
      'Baloo 2',
    )
    api.drawRectangle(4, 8, 40, 20, '#ff8800')
    api.drawCircle(20, 20, 8, '#ffffff')
    api.drawTriangle(0, 10, 10, 0, 20, 10, '#00ff00')
    expect(() => api.drawText(42, 12, 24, 18, '#eeeeee')).toThrow('falha de desenho')
    expect(calls).toEqual([
      ['rectangle', [4, 8, 40, 20, '#ff8800']],
      ['circle', [20, 20, 8, 0, Math.PI * 2, '#ffffff']],
      ['move', [0, 10]],
      ['line', [10, 0]],
      ['line', [20, 10]],
      ['text', ['42', 12, 24, '18px Baloo 2', '#eeeeee', 'left', 'alphabetic']],
    ])
    expect(context.fillStyle).toBe('#123456')
    expect(context.font).toBe('10px original')
    expect(context.textAlign).toBe('right')
    expect(context.textBaseline).toBe('top')
    expect(stack).toEqual([])
  })
})
