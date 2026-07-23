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
  setupStage: (width: number, height: number, background: string) => void
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
  drawWind: (ctx: unknown, city: { W: number; H: number; wind: number }) => void
  drawAimReadout: (ctx: unknown) => void
}

function loadRuntime(devicePixelRatio = 1): Game2DApi {
  const win = {
    addEventListener() {},
    SZGame2D: undefined,
    performance: { now: () => 0 },
    devicePixelRatio,
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

  it('expõe placar e estado do Equilibrista no HUD acessível', async () => {
    document.body.innerHTML = ''
    const api = loadRuntime()
    const jogo = api.createStickHero(mockCtx(360, 480)) as { phase: string; score: number }
    jogo.score = 2
    jogo.phase = 'over'

    api.updateStickHero(jogo)
    await Promise.resolve()

    const hud = document.getElementById('sz-game-hud-status')
    expect(hud?.textContent).toContain('Pontos: 2')
    expect(hud?.textContent).toContain('Caiu! Toque para recomeçar')
  })

  it('expõe distância, combustível e estado do Balão no HUD acessível', async () => {
    document.body.innerHTML = ''
    const api = loadRuntime()
    const jogo = api.createBalloon(mockCtx(560, 360)) as {
      fuel: number
      meters: number
      over: boolean
    }
    jogo.fuel = 27
    jogo.meters = 12
    jogo.over = true

    api.updateBalloon(jogo)
    await Promise.resolve()

    const hud = document.getElementById('sz-game-hud-status')
    expect(hud?.textContent).toContain('Distância: 12 metros')
    expect(hud?.textContent).toContain('Combustível: 27 de 100')
    expect(hud?.textContent).toContain('Fim! Toque para recomeçar')
  })

  it('expõe vento e leitura da mira do kit Gorilas no HUD acessível', async () => {
    document.body.innerHTML = ''
    let api = loadRuntime()
    api.drawWind(mockCtx(480, 270), { W: 480, H: 270, wind: 0.03 })
    await Promise.resolve()
    expect(document.getElementById('sz-game-hud-status')?.textContent).toContain(
      'Vento para a direita: 50%',
    )

    document.body.innerHTML = ''
    api = loadRuntime()
    api.drawAimReadout(mockCtx(480, 270))
    await Promise.resolve()
    expect(document.getElementById('sz-game-hud-status')?.textContent).toContain(
      'Ângulo: 0 graus. Força: 0',
    )
  })

  it('Stick Hero acompanha a mudança do palco sem zerar fase, placar ou progresso', () => {
    const api = loadRuntime()
    const ctx = mockCtx(360, 480) as { canvas: { width: number; height: number } }
    const jogo = api.createStickHero(ctx) as {
      w: number
      h: number
      score: number
      phase: string
      heroX: number
      platforms: Array<{ x: number; w: number }>
    }
    jogo.score = 7
    jogo.phase = 'waiting'
    const oldHeroX = jogo.heroX
    const oldPlatformX = jogo.platforms[0]?.x ?? 0
    ctx.canvas.width = 720
    ctx.canvas.height = 960

    api.updateStickHero(jogo)

    expect([jogo.w, jogo.h]).toEqual([720, 960])
    expect(jogo.score).toBe(7)
    expect(jogo.phase).toBe('waiting')
    expect(jogo.heroX).toBeCloseTo(oldHeroX * 2)
    expect(jogo.platforms[0]?.x).toBeCloseTo(oldPlatformX * 2)
  })

  it('Balão acompanha a mudança do palco preservando combustível e distância relativa', () => {
    const api = loadRuntime()
    const ctx = mockCtx(560, 360) as { canvas: { width: number; height: number } }
    const jogo = api.createBalloon(ctx) as {
      w: number
      h: number
      fuel: number
      dist: number
      meters: number
      by: number
      groundY: number
    }
    jogo.fuel = 63
    jogo.dist = 168
    jogo.meters = 10
    jogo.by = jogo.groundY * 0.5
    ctx.canvas.width = 1_120
    ctx.canvas.height = 720

    api.updateBalloon(jogo)

    expect([jogo.w, jogo.h]).toEqual([1_120, 720])
    expect(jogo.fuel).toBe(63)
    expect(jogo.dist).toBeCloseTo(336)
    expect(jogo.meters).toBe(10)
    expect(jogo.by / jogo.groundY).toBeCloseTo(0.5)
  })

  it.each([2, 3])('usa dimensões lógicas no DPR %i', (devicePixelRatio) => {
    document.body.innerHTML = '<canvas id="tela"></canvas>'
    const canvas = document.querySelector('canvas')
    if (!canvas) throw new Error('canvas do teste não foi criado')
    canvas.getBoundingClientRect = () =>
      ({ width: 800, height: 480, x: 0, y: 0, top: 0, left: 0, right: 800, bottom: 480 }) as DOMRect
    const api = loadRuntime(devicePixelRatio)
    api.setupStage(800, 480, '#000000')
    expect(canvas.width).toBe(800 * devicePixelRatio)
    expect(canvas.height).toBe(480 * devicePixelRatio)

    const stickHero = api.createStickHero(mockCtx(canvas.width, canvas.height)) as {
      w: number
      h: number
    }
    const balloon = api.createBalloon(mockCtx(canvas.width, canvas.height)) as {
      w: number
      h: number
    }
    expect([stickHero.w, stickHero.h]).toEqual([800, 480])
    expect([balloon.w, balloon.h]).toEqual([800, 480])
  })
})
