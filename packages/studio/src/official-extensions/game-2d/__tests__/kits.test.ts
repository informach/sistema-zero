import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import { behaviorStatements, G2D_STATEMENT_TYPES, type JSStatement, SZIRSchema } from '#ir'
import 'blockly/blocks'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { gameTwoDBlocks } from '../blocks'
import { gameTwoDRuntime } from '../runtime'

/**
 * Kits equilibrista (Stick Hero) e balão (Hot-Air-Balloon): geração de código,
 * round-trip por blocos e fumaça do runtime (create/update não estouram).
 */

interface Game2DApi {
  createStickHero: (ctx: unknown) => unknown
  updateStickHero: (g: unknown) => void
  stickHeroScore: (g: unknown) => number
  stickHeroOver: (g: unknown) => boolean
  restartStickHero: (g: unknown) => void
  createBalloon: (ctx: unknown) => unknown
  updateBalloon: (g: unknown) => void
  balloonScore: (g: unknown) => number
  balloonFuel: (g: unknown) => number
  balloonOver: (g: unknown) => boolean
  restartBalloon: (g: unknown) => void
}

function loadRuntime(): Game2DApi {
  const win = {
    addEventListener() {},
    SZGame2D: undefined,
    performance: { now: () => 0 },
    devicePixelRatio: 1,
  } as unknown as Record<string, unknown>
  new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, () => 0)
  return (win as { SZGame2D: Game2DApi }).SZGame2D
}

function mockCtx(w: number, h: number): unknown {
  const ctx: Record<string, unknown> = {
    canvas: { width: w, height: h },
    createLinearGradient: () => ({ addColorStop() {} }),
    measureText: () => ({ width: 10 }),
  }
  const noop = () => {}
  for (const m of [
    'save',
    'restore',
    'clearRect',
    'fillRect',
    'strokeRect',
    'beginPath',
    'moveTo',
    'lineTo',
    'arc',
    'arcTo',
    'quadraticCurveTo',
    'bezierCurveTo',
    'closePath',
    'fill',
    'stroke',
    'translate',
    'rotate',
    'scale',
    'fillText',
    'strokeText',
    'setTransform',
    'setLineDash',
    'clip',
    'rect',
  ]) {
    ctx[m] = noop
  }
  return ctx
}

/** Round-trip por BLOCOS (sem o parser de JS), sem os `__id`. */
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
function irThroughBlocks(js: JSStatement[]): JSStatement[] {
  const ir = { html: [], css: [], js, extensions: [{ extensionId: 'game-2d' }] }
  const state = buildWorkspaceStateFromIR(ir as Parameters<typeof buildWorkspaceStateFromIR>[0])
  const ws = new Blockly.Workspace()
  Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
  return stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
}

describe('Kit equilibrista / Kit balão — geração', () => {
  it('gera as chamadas SZGame2D dos dois kits', () => {
    const gen = (s: JSStatement) => compileStatements([s], 0)
    expect(gen({ type: 'g2d:createStickHero', varName: 'jogo', ctxVar: 'ctx' })).toBe(
      'const jogo = SZGame2D.createStickHero(ctx);',
    )
    expect(gen({ type: 'g2d:updateStickHero', gameVar: 'jogo' })).toBe(
      'SZGame2D.updateStickHero(jogo);',
    )
    expect(gen({ type: 'g2d:restartStickHero', gameVar: 'jogo' })).toBe(
      'SZGame2D.restartStickHero(jogo);',
    )
    expect(gen({ type: 'g2d:createBalloon', varName: 'jogo', ctxVar: 'ctx' })).toBe(
      'const jogo = SZGame2D.createBalloon(ctx);',
    )
    expect(gen({ type: 'g2d:updateBalloon', gameVar: 'jogo' })).toBe(
      'SZGame2D.updateBalloon(jogo);',
    )
  })

  it('os novos statements estão em G2D_STATEMENT_TYPES e validam no schema', () => {
    for (const t of [
      'g2d:createStickHero',
      'g2d:updateStickHero',
      'g2d:restartStickHero',
      'g2d:createBalloon',
      'g2d:updateBalloon',
      'g2d:restartBalloon',
    ]) {
      expect(G2D_STATEMENT_TYPES.has(t)).toBe(true)
    }
    const parsed = SZIRSchema.safeParse({
      html: [],
      css: [],
      js: [
        { type: 'g2d:createStickHero', varName: 'jogo', ctxVar: 'ctx' },
        { type: 'g2d:createBalloon', varName: 'jogo2', ctxVar: 'ctx' },
      ],
      extensions: [{ extensionId: 'game-2d' }],
    })
    expect(parsed.success).toBe(true)
  })
})

describe('Kit equilibrista / Kit balão — round-trip por blocos', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
    registerExtensionBlocks(gameTwoDBlocks)
  })

  it('statements + valores dos kits sobrevivem IR -> blocos -> IR', () => {
    const js: JSStatement[] = [
      { type: 'g2d:createStickHero', varName: 'jogo', ctxVar: 'ctx' },
      { type: 'g2d:updateStickHero', gameVar: 'jogo' },
      {
        type: 'if',
        cond: { type: 'g2d:stickHeroOver', gameVar: 'jogo' },
        then: [{ type: 'g2d:restartStickHero', gameVar: 'jogo' }],
        else: [],
      },
      { type: 'g2d:createBalloon', varName: 'b', ctxVar: 'ctx' },
      { type: 'g2d:updateBalloon', gameVar: 'b' },
      {
        type: 'if',
        cond: { type: 'g2d:balloonOver', gameVar: 'b' },
        then: [{ type: 'g2d:restartBalloon', gameVar: 'b' }],
        else: [],
      },
    ]
    expect(irThroughBlocks(js)).toEqual(js)
  })
})

describe('Kit equilibrista / Kit balão — fumaça do runtime', () => {
  it('createStickHero monta o jogo e updateStickHero não estoura', () => {
    const api = loadRuntime()
    const jogo = api.createStickHero(mockCtx(360, 480)) as { phase: string; score: number }
    expect(jogo).toBeTruthy()
    expect(jogo.score).toBe(0)
    expect(api.stickHeroScore(jogo)).toBe(0)
    expect(api.stickHeroOver(jogo)).toBe(false)
    expect(() => api.updateStickHero(jogo)).not.toThrow()
    expect(() => api.restartStickHero(jogo)).not.toThrow()
  })

  it('createBalloon monta o jogo e updateBalloon não estoura', () => {
    const api = loadRuntime()
    const jogo = api.createBalloon(mockCtx(560, 360)) as { fuel: number }
    expect(jogo).toBeTruthy()
    expect(api.balloonFuel(jogo)).toBe(100)
    expect(api.balloonScore(jogo)).toBe(0)
    expect(api.balloonOver(jogo)).toBe(false)
    expect(() => api.updateBalloon(jogo)).not.toThrow()
    expect(() => api.restartBalloon(jogo)).not.toThrow()
  })
})
