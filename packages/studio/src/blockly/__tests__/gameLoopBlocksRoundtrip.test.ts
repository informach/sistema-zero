import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import { behaviorStatements, type JSStatement } from '#ir'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { parseJS } from '../../parsers/js'
import { buildIRFromWorkspace } from '../buildIR'
import { ensureBlocklyInitialized } from '../setup'
import { buildWorkspaceStateFromIR } from '../workspaceState'

/**
 * Blocos novos do núcleo para fazer jogos canvas "na mão": tempo de quadro
 * (performance.now + tempo/delta no "a cada frame"), apertar/soltar o mouse,
 * textBaseline, arcTo e os utilitários de lista (último item / achar).
 */
function bridgeCycleJS(js: string): string {
  const jsIR = parseJS(js)
  const ir = { html: [], css: [], js: jsIR, extensions: [] }
  const state = buildWorkspaceStateFromIR(ir as Parameters<typeof buildWorkspaceStateFromIR>[0])
  const ws = new Blockly.Workspace()
  Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
  const ir2 = buildIRFromWorkspace(ws)
  return compileStatements(behaviorStatements(ir2), 0)
}

/** Remove os `__id` (ids de bloco) que o round-trip injeta, para comparar IR puro. */
function stripIds<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripIds) as unknown as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === '__id') continue
      out[k] = stripIds(v)
    }
    return out as T
  }
  return value
}

/** Round-trip por BLOCOS (sem passar pelo parser de JS): IR -> blocos -> IR. */
function irThroughBlocks(js: JSStatement[]): JSStatement[] {
  const ir = { html: [], css: [], js, extensions: [] }
  const state = buildWorkspaceStateFromIR(ir as Parameters<typeof buildWorkspaceStateFromIR>[0])
  const ws = new Blockly.Workspace()
  Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
  return stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
}

describe('tempo do quadro: performance.now + a cada frame com tempo/delta', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
  })

  it('gerador: performance.now()', () => {
    const out = compileStatements([{ type: 'var', name: 'agora', value: { type: 'perfNow' } }], 0)
    expect(out).toContain('performance.now()')
  })

  it('parser: performance.now() vira perfNow', () => {
    expect(JSON.stringify(parseJS('let agora = performance.now();'))).toContain('"perfNow"')
  })

  it('gerador: "a cada frame" com tempo e delta', () => {
    const out = compileStatements(
      [{ type: 'animationLoop', body: [], timeVar: 'tempo', deltaVar: 'dt' }],
      0,
    )
    expect(out).toContain('function frame(tempo) {')
    expect(out).toContain(
      'const dt = lastFrameTime === undefined ? 0 : (tempo - lastFrameTime) / 1000;',
    )
    expect(out).toContain('lastFrameTime = tempo;')
    // O loop é iniciado com requestAnimationFrame (não frame()) p/ o 1º tempo ser real.
    expect(out).toContain('requestAnimationFrame(frame);')
    expect(out).not.toContain('frame();')
  })

  it('round-trip por blocos preserva tempo/delta do "a cada frame"', () => {
    const back = irThroughBlocks([
      { type: 'animationLoop', body: [], timeVar: 'tempo', deltaVar: 'dt' },
    ])
    expect(back).toEqual([{ type: 'animationLoop', body: [], timeVar: 'tempo', deltaVar: 'dt' }])
  })

  it('"a cada frame" sem tempo segue idêntico (sem regressão)', () => {
    const out = compileStatements([{ type: 'animationLoop', body: [] }], 0)
    expect(out).toContain('function frame() {')
    expect(out).toContain('requestAnimationFrame(frame);')
  })
})

describe('apertar/soltar o mouse (corpo embutido)', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
  })

  it('parser: window.addEventListener mousedown/mouseup', () => {
    expect(parseJS('window.addEventListener("mousedown", (event) => {});')).toEqual([
      { type: 'event', target: 'window', targetKind: 'window', event: 'mousedown', body: [] },
    ])
    expect(parseJS('window.addEventListener("mouseup", (event) => {});')).toEqual([
      { type: 'event', target: 'window', targetKind: 'window', event: 'mouseup', body: [] },
    ])
  })

  it('os blocos sobrevivem ao ciclo blocos<->código (sem rawJS)', () => {
    const js = [
      'window.addEventListener("mousedown", (event) => {',
      '  alert("apertou");',
      '});',
      'window.addEventListener("mouseup", (event) => {',
      '  alert("soltou");',
      '});',
    ].join('\n')
    const out = bridgeCycleJS(js)
    expect(out).toContain('window.addEventListener("mousedown"')
    expect(out).toContain('window.addEventListener("mouseup"')
    expect(out).not.toContain('rawJS')
  })
})

describe('canvas: textBaseline e arcTo', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
  })

  /** Coleta todos os `type` de uma árvore IR. */
  function collectTypes(value: unknown, out: Set<string> = new Set()): Set<string> {
    if (Array.isArray(value)) for (const item of value) collectTypes(item, out)
    else if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>
      if (typeof obj.type === 'string') out.add(obj.type)
      for (const v of Object.values(obj)) collectTypes(v, out)
    }
    return out
  }

  it('gerador: textBaseline', () => {
    const out = compileStatements(
      [{ type: 'canvasTextBaseline', ctxVar: 'ctx', baseline: 'top' }],
      0,
    )
    expect(out).toBe('ctx.textBaseline = "top";')
  })

  it('gerador: arcTo', () => {
    const stmt: JSStatement = {
      type: 'canvasArcTo',
      ctxVar: 'ctx',
      x1: { type: 'num', value: 10 },
      y1: { type: 'num', value: 20 },
      x2: { type: 'num', value: 30 },
      y2: { type: 'num', value: 40 },
      r: { type: 'num', value: 5 },
    }
    expect(compileStatements([stmt], 0)).toBe('ctx.arcTo(10, 20, 30, 40, 5);')
  })

  it('round-trip por código (com setup do ctx): textBaseline + arcTo, sem rawJS', () => {
    const ir: JSStatement[] = [
      { type: 'canvasSetup', canvasId: 'tela', varName: 'ctx' },
      { type: 'canvasBeginPath', ctxVar: 'ctx' },
      {
        type: 'canvasArcTo',
        ctxVar: 'ctx',
        x1: { type: 'num', value: 10 },
        y1: { type: 'num', value: 20 },
        x2: { type: 'num', value: 30 },
        y2: { type: 'num', value: 40 },
        r: { type: 'num', value: 5 },
      },
      { type: 'canvasTextBaseline', ctxVar: 'ctx', baseline: 'top' },
    ]
    const types = collectTypes(parseJS(compileStatements(ir, 0)))
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('canvasArcTo')).toBe(true)
    expect(types.has('canvasTextBaseline')).toBe(true)
  })

  it('arcTo + textBaseline sobrevivem ao ciclo por blocos', () => {
    const stmts: JSStatement[] = [
      {
        type: 'canvasArcTo',
        ctxVar: 'ctx',
        x1: { type: 'num', value: 10 },
        y1: { type: 'num', value: 20 },
        x2: { type: 'num', value: 30 },
        y2: { type: 'num', value: 40 },
        r: { type: 'num', value: 5 },
      },
      { type: 'canvasTextBaseline', ctxVar: 'ctx', baseline: 'top' },
    ]
    expect(irThroughBlocks(stmts)).toEqual(stmts)
  })
})

describe('listas: último item e achar', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
  })

  it('gerador + parser: último item', () => {
    const out = compileStatements(
      [{ type: 'var', name: 'fim', value: { type: 'arrayLast', arrayVar: 'lista' } }],
      0,
    )
    expect(out).toContain('lista[lista.length - 1]')
    expect(JSON.stringify(parseJS('let fim = lista[lista.length - 1];'))).toContain('"arrayLast"')
  })

  it('gerador + parser: achar na lista', () => {
    const out = compileStatements(
      [
        {
          type: 'var',
          name: 'achado',
          value: {
            type: 'arrayFind',
            arrayVar: 'plataformas',
            itemName: 'p',
            cond: {
              type: 'binop',
              op: '>',
              left: { type: 'memberGet', object: { type: 'var', name: 'p' }, name: 'x' },
              right: { type: 'num', value: 0 },
            },
          },
        },
      ],
      0,
    )
    expect(out).toContain('plataformas.find((p) => p.x > 0)')
    const parsed = parseJS('let achado = plataformas.find((p) => p.x > 0);')
    expect(JSON.stringify(parsed)).toContain('"arrayFind"')
  })
})
