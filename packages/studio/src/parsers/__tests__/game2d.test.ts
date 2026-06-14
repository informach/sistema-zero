import { describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import { pongExample } from '../../official-extensions/game-2d/examples'
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

describe('parseJS — helpers SZGame2D.* (game-2d)', () => {
  it('reconhece os helpers de uma linha como blocos g2d', () => {
    expect(parseJS('SZGame2D.applyVelocity(bola);')).toEqual([
      { type: 'g2d:applyVelocity', spriteVar: 'bola' },
    ])
    // drawSprite: gerador emite (ctx, sprite)
    expect(parseJS('SZGame2D.drawSprite(ctx, bola);')).toEqual([
      { type: 'g2d:drawSprite', spriteVar: 'bola', ctxVar: 'ctx' },
    ])
    expect(parseJS('SZGame2D.moveByKeys(jogador, 4);')).toEqual([
      { type: 'g2d:moveByKeys', spriteVar: 'jogador', speed: 4 },
    ])
    // bounceOnEdges: gerador emite (sprite, ctx)
    expect(parseJS('SZGame2D.bounceOnEdges(bola, ctx);')).toEqual([
      { type: 'g2d:bounceOnEdges', spriteVar: 'bola', ctxVar: 'ctx' },
    ])
    expect(parseJS('SZGame2D.setGravity(0.5);')).toEqual([{ type: 'g2d:setGravity', value: 0.5 }])
    expect(parseJS('SZGame2D.playSound(440, 200);')).toEqual([
      { type: 'g2d:playSound', freq: 440, durationMs: 200 },
    ])
  })

  it('reconhece SZGame2D.gameLoop(function update(){…}) como "a cada frame"', () => {
    const ir = parseJS('SZGame2D.gameLoop(function update() { SZGame2D.applyVelocity(bola); });')
    expect(ir).toEqual([
      {
        type: 'g2d:updateEachFrame',
        body: [{ type: 'g2d:applyVelocity', spriteVar: 'bola' }],
      },
    ])
  })

  it('reconhece SZGame2D.onPointer((px, py) => {…})', () => {
    const ir = parseJS('SZGame2D.onPointer((px, py) => { SZGame2D.playSound(440, 100); });')
    expect(ir).toEqual([
      {
        type: 'g2d:onPointer',
        xName: 'px',
        yName: 'py',
        body: [{ type: 'g2d:playSound', freq: 440, durationMs: 100 }],
      },
    ])
  })

  it('reconhece createSprite / isColliding / circleCollides como var-init', () => {
    expect(
      parseJS('const bola = SZGame2D.createSprite({ x: 1, y: 2, w: 3, h: 4, color: "#fff" });'),
    ).toEqual([
      { type: 'g2d:createSprite', varName: 'bola', x: 1, y: 2, w: 3, h: 4, color: '#fff' },
    ])
    expect(parseJS('const bateu = SZGame2D.isColliding(jogador, bola);')).toEqual([
      { type: 'g2d:collides', aVar: 'jogador', bVar: 'bola', varName: 'bateu' },
    ])
    expect(parseJS('const perto = SZGame2D.circleCollides(a, b);')).toEqual([
      { type: 'g2d:circleCollides', aVar: 'a', bVar: 'b', varName: 'perto' },
    ])
  })

  it('funde s.vx=;s.vy=; → setVelocity e s.x=;s.y=; → setPosition (só para sprites)', () => {
    const ir = parseJS(
      'const bola = SZGame2D.createSprite({ x: 0, y: 0, w: 1, h: 1, color: "#fff" }); bola.vx = 3; bola.vy = 2; bola.x = 10; bola.y = 20;',
    )
    expect(ir[1]).toEqual({
      type: 'g2d:setVelocity',
      spriteVar: 'bola',
      vx: { type: 'num', value: 3 },
      vy: { type: 'num', value: 2 },
    })
    expect(ir[2]).toEqual({
      type: 'g2d:setPosition',
      spriteVar: 'bola',
      x: { type: 'num', value: 10 },
      y: { type: 'num', value: 20 },
    })
  })

  it('NÃO funde x/y de um objeto que não é sprite (vira memberSet)', () => {
    const ir = parseJS('obj.x = 1; obj.y = 2;')
    expect(ir[0]?.type).toBe('memberSet')
    expect(collectTypes(ir).has('g2d:setPosition')).toBe(false)
  })
})

describe('roundtrip do pongExample (gerar → parsear)', () => {
  it('o código gerado volta a virar blocos (sem rawJS)', () => {
    const code = compileStatements(pongExample.ir.js, 0)
    const ir = parseJS(code)
    const types = collectTypes(ir)
    expect(types.has('rawJS')).toBe(false)
    for (const expected of [
      'g2d:updateEachFrame',
      'g2d:createSprite',
      'g2d:setVelocity',
      'g2d:applyVelocity',
      'g2d:bounceOnEdges',
      'g2d:collides',
    ]) {
      expect(types.has(expected)).toBe(true)
    }
  })
})
