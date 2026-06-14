import { describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import { G2D_STATEMENT_TYPES, type JSStatement, SZIRSchema } from '#ir'
import { gameTwoDRuntime } from '../runtime'

interface Sprite {
  x: number
  y: number
  w: number
  h: number
  vx: number
  vy: number
}
interface Engine {
  createSprite: (opts: Partial<Sprite>) => Sprite
  setGravity: (g: number) => void
  applyVelocity: (s: Sprite) => void
  bounceOnEdges: (s: Sprite, ctx: { canvas: { width: number; height: number } }) => void
  circleCollides: (a: Sprite, b: Sprite) => boolean
  onPointer: (fn: (x: number, y: number) => void) => void
  pointer: { x: number; y: number; down: boolean }
}
function loadRuntime(): Engine {
  const win = { addEventListener() {}, SZGame2D: undefined } as unknown as Record<string, unknown>
  new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, () => 0)
  return (win as { SZGame2D: Engine }).SZGame2D
}

describe('game-2d — gerador dos novos statements', () => {
  const gen = (stmt: JSStatement) => compileStatements([stmt], 0)

  it('física', () => {
    expect(gen({ type: 'g2d:setGravity', value: 0.5 })).toBe('SZGame2D.setGravity(0.5);')
    expect(gen({ type: 'g2d:applyVelocity', spriteVar: 'jogador' })).toBe(
      'SZGame2D.applyVelocity(jogador);',
    )
    expect(gen({ type: 'g2d:bounceOnEdges', spriteVar: 'bola', ctxVar: 'ctx' })).toBe(
      'SZGame2D.bounceOnEdges(bola, ctx);',
    )
    expect(gen({ type: 'g2d:circleCollides', aVar: 'a', bVar: 'b', varName: 'bateu' })).toBe(
      'const bateu = SZGame2D.circleCollides(a, b);',
    )
  })

  it('áudio e ponteiro', () => {
    expect(gen({ type: 'g2d:playSound', freq: 440, durationMs: 200 })).toBe(
      'SZGame2D.playSound(440, 200);',
    )
    const pointer = gen({
      type: 'g2d:onPointer',
      xName: 'px',
      yName: 'py',
      body: [{ type: 'consoleLog', value: { type: 'var', name: 'px' } }],
    })
    expect(pointer).toContain('SZGame2D.onPointer((px, py) => {')
    expect(pointer).toContain('console.log(px);')
  })

  it('os novos tipos estão em G2D_STATEMENT_TYPES e validam no schema', () => {
    for (const t of [
      'g2d:setGravity',
      'g2d:applyVelocity',
      'g2d:bounceOnEdges',
      'g2d:circleCollides',
      'g2d:playSound',
      'g2d:onPointer',
    ]) {
      expect(G2D_STATEMENT_TYPES.has(t)).toBe(true)
    }
    const parsed = SZIRSchema.safeParse({
      html: [],
      css: [],
      js: [
        { type: 'g2d:setGravity', value: 0.5 },
        { type: 'g2d:onPointer', xName: 'px', yName: 'py', body: [] },
      ],
      extensions: [{ extensionId: 'game-2d' }],
    })
    expect(parsed.success).toBe(true)
  })
})

describe('game-2d — runtime de física', () => {
  it('applyVelocity integra velocidade e soma gravidade ao vy', () => {
    const api = loadRuntime()
    api.setGravity(1)
    const s = api.createSprite({ x: 0, y: 0, w: 10, h: 10 })
    s.vx = 2
    api.applyVelocity(s)
    expect(s.x).toBe(2)
    expect(s.vy).toBe(1)
    api.applyVelocity(s)
    expect(s.y).toBe(1)
    expect(s.vy).toBe(2)
  })

  it('bounceOnEdges quica e inverte a velocidade na borda', () => {
    const api = loadRuntime()
    const ctx = { canvas: { width: 100, height: 100 } }
    const s = api.createSprite({ x: -5, y: 50, w: 10, h: 10 })
    s.vx = -3
    api.bounceOnEdges(s, ctx)
    expect(s.x).toBe(0)
    expect(s.vx).toBe(3)
  })

  it('circleCollides detecta proximidade por círculo', () => {
    const api = loadRuntime()
    const a = api.createSprite({ x: 0, y: 0, w: 20, h: 20 })
    const b = api.createSprite({ x: 5, y: 5, w: 20, h: 20 })
    const c = api.createSprite({ x: 100, y: 100, w: 20, h: 20 })
    expect(api.circleCollides(a, b)).toBe(true)
    expect(api.circleCollides(a, c)).toBe(false)
  })

  it('onPointer registra sem erro e expõe o estado pointer', () => {
    const api = loadRuntime()
    expect(typeof api.onPointer).toBe('function')
    expect(() => api.onPointer(() => {})).not.toThrow()
    expect(api.pointer).toMatchObject({ x: 0, y: 0, down: false })
  })
})
