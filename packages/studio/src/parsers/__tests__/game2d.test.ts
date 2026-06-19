import { describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import {
  animatedHeroExample,
  platformerExample,
  pongExample,
  tilemapExample,
} from '../../official-extensions/game-2d/examples'
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

  it('reconhece os helpers de imagem/spritesheet/animação (v0.3.0)', () => {
    // createSprite com `image` → createImageSprite (sem image segue createSprite).
    expect(
      parseJS('const heroi = SZGame2D.createSprite({ x: 1, y: 2, w: 3, h: 4, image: "heroi" });'),
    ).toEqual([
      { type: 'g2d:createImageSprite', varName: 'heroi', x: 1, y: 2, w: 3, h: 4, image: 'heroi' },
    ])
    expect(parseJS('SZGame2D.setImage(heroi, "vilao");')).toEqual([
      { type: 'g2d:setImage', spriteVar: 'heroi', image: 'vilao' },
    ])
    expect(parseJS('const andar = SZGame2D.loadSpriteSheet("folha", 32, 48);')).toEqual([
      { type: 'g2d:loadSpritesheet', varName: 'andar', image: 'folha', frameW: 32, frameH: 48 },
    ])
    expect(parseJS('SZGame2D.setAnimation(heroi, andar, 0, 3, 8);')).toEqual([
      { type: 'g2d:animateSprite', spriteVar: 'heroi', sheetVar: 'andar', from: 0, to: 3, fps: 8 },
    ])
    expect(parseJS('SZGame2D.drawFrame(ctx, andar, 2, 10, 20, 32, 32);')).toEqual([
      {
        type: 'g2d:drawFrame',
        ctxVar: 'ctx',
        sheetVar: 'andar',
        index: 2,
        x: 10,
        y: 20,
        w: 32,
        h: 32,
      },
    ])
  })

  it('reconhece os helpers de movimento e efeitos (v0.4.0)', () => {
    expect(parseJS('SZGame2D.platformer(heroi, ctx, 4, 11);')).toEqual([
      { type: 'g2d:platformer', spriteVar: 'heroi', ctxVar: 'ctx', speed: 4, jump: 11 },
    ])
    expect(parseJS('SZGame2D.topDown(heroi, 3);')).toEqual([
      { type: 'g2d:topDown', spriteVar: 'heroi', speed: 3 },
    ])
    expect(parseJS('SZGame2D.followPointer(heroi, 3);')).toEqual([
      { type: 'g2d:followPointer', spriteVar: 'heroi', speed: 3 },
    ])
    expect(parseJS('SZGame2D.clampToScreen(heroi, ctx);')).toEqual([
      { type: 'g2d:clampToScreen', spriteVar: 'heroi', ctxVar: 'ctx' },
    ])
    expect(parseJS('SZGame2D.flash(ctx, "#ffffff");')).toEqual([
      { type: 'g2d:flash', ctxVar: 'ctx', color: '#ffffff' },
    ])
    expect(parseJS('SZGame2D.shake(ctx, 8);')).toEqual([
      { type: 'g2d:shake', ctxVar: 'ctx', intensity: 8 },
    ])
    expect(parseJS('SZGame2D.emitParticles(150, 100, 14, "#fbbf24");')).toEqual([
      { type: 'g2d:emitParticles', x: 150, y: 100, count: 14, color: '#fbbf24' },
    ])
    expect(parseJS('SZGame2D.drawParticles(ctx);')).toEqual([
      { type: 'g2d:drawParticles', ctxVar: 'ctx' },
    ])
  })

  it('reconhece os helpers de tiles/tilemaps (v0.5.0)', () => {
    expect(
      parseJS(
        'const mapa = SZGame2D.createTileMap({ image: "tileset", tile: 32, solid: "1", grid: "1 0;0 1" });',
      ),
    ).toEqual([
      {
        type: 'g2d:createTileMap',
        varName: 'mapa',
        image: 'tileset',
        tile: 32,
        solid: '1',
        grid: '1 0;0 1',
      },
    ])
    expect(parseJS('SZGame2D.drawTileMap(ctx, mapa, 0, 0);')).toEqual([
      { type: 'g2d:drawTileMap', ctxVar: 'ctx', mapVar: 'mapa', x: 0, y: 0 },
    ])
    expect(parseJS('SZGame2D.collideTileMap(heroi, mapa);')).toEqual([
      { type: 'g2d:tileMapCollide', spriteVar: 'heroi', mapVar: 'mapa' },
    ])
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

describe('roundtrip do animatedHeroExample (imagem + animação)', () => {
  it('o código gerado volta a virar blocos (sem rawJS), preservando os blocos de imagem', () => {
    const code = compileStatements(animatedHeroExample.ir.js, 0)
    const ir = parseJS(code)
    const types = collectTypes(ir)
    expect(types.has('rawJS')).toBe(false)
    for (const expected of [
      'g2d:createImageSprite',
      'g2d:loadSpritesheet',
      'g2d:animateSprite',
      'g2d:updateEachFrame',
      'g2d:topDown',
      'g2d:drawSprite',
    ]) {
      expect(types.has(expected)).toBe(true)
    }
  })
})

describe('roundtrip do platformerExample (movimento)', () => {
  it('o código gerado volta a virar blocos (sem rawJS), com platformer + clamp', () => {
    const code = compileStatements(platformerExample.ir.js, 0)
    const ir = parseJS(code)
    const types = collectTypes(ir)
    expect(types.has('rawJS')).toBe(false)
    for (const expected of [
      'g2d:createSprite',
      'g2d:updateEachFrame',
      'g2d:platformer',
      'g2d:clampToScreen',
      'g2d:drawSprite',
    ]) {
      expect(types.has(expected)).toBe(true)
    }
  })
})

describe('roundtrip do tilemapExample (tiles)', () => {
  it('o código gerado volta a virar blocos (sem rawJS), com tilemap + colisão', () => {
    const code = compileStatements(tilemapExample.ir.js, 0)
    const ir = parseJS(code)
    const types = collectTypes(ir)
    expect(types.has('rawJS')).toBe(false)
    for (const expected of [
      'g2d:createTileMap',
      'g2d:drawTileMap',
      'g2d:tileMapCollide',
      'g2d:updateEachFrame',
      'g2d:topDown',
    ]) {
      expect(types.has(expected)).toBe(true)
    }
  })
})
