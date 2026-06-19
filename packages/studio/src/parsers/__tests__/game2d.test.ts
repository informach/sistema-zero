import { describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import {
  animatedHeroExample,
  asteroidsExample,
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

  it('reconhece grupos de sprites (v0.6.0): criar/atualizar/desenhar/esvaziar/tirar', () => {
    expect(parseJS('const asteroides = SZGame2D.createGroup();')).toEqual([
      { type: 'g2d:createGroup', varName: 'asteroides' },
    ])
    expect(parseJS('SZGame2D.updateGroup(asteroides);')).toEqual([
      { type: 'g2d:updateGroup', groupVar: 'asteroides' },
    ])
    expect(parseJS('SZGame2D.drawGroup(ctx, asteroides);')).toEqual([
      { type: 'g2d:drawGroup', groupVar: 'asteroides', ctxVar: 'ctx' },
    ])
    expect(parseJS('SZGame2D.clearGroup(asteroides);')).toEqual([
      { type: 'g2d:clearGroup', groupVar: 'asteroides' },
    ])
    expect(parseJS('SZGame2D.removeFromGroup(asteroides, a);')).toEqual([
      { type: 'g2d:removeFromGroup', spriteVar: 'a', groupVar: 'asteroides' },
    ])
  })

  it('reconhece spawn no grupo (colorido e com imagem), com x/y/vx/vy como expressões', () => {
    expect(
      parseJS(
        'SZGame2D.spawn(asteroides, { x: 10, y: 20, w: 24, h: 24, color: "#9ca3af", vx: 0, vy: 3 });',
      ),
    ).toEqual([
      {
        type: 'g2d:spawnInGroup',
        groupVar: 'asteroides',
        x: { type: 'num', value: 10 },
        y: { type: 'num', value: 20 },
        w: 24,
        h: 24,
        color: '#9ca3af',
        vx: { type: 'num', value: 0 },
        vy: { type: 'num', value: 3 },
      },
    ])
    // x aleatório (expressão) é preservado.
    const ir = parseJS(
      'SZGame2D.spawn(asteroides, { x: SZRandom, y: 0, w: 24, h: 24, color: "#fff", vx: 0, vy: 3 });',
    )
    const spawn = ir[0] as Extract<import('#ir').JSStatement, { type: 'g2d:spawnInGroup' }>
    expect(spawn.x).toEqual({ type: 'var', name: 'SZRandom' })
    // com `image` → spawnImageInGroup.
    expect(
      parseJS(
        'SZGame2D.spawn(inimigos, { x: 0, y: 0, w: 32, h: 32, image: "inimigo", vx: 0, vy: 2 });',
      ),
    ).toEqual([
      {
        type: 'g2d:spawnImageInGroup',
        groupVar: 'inimigos',
        x: { type: 'num', value: 0 },
        y: { type: 'num', value: 0 },
        w: 32,
        h: 32,
        image: 'inimigo',
        vx: { type: 'num', value: 0 },
        vy: { type: 'num', value: 2 },
      },
    ])
  })

  it('reconhece "para cada do grupo", colisão de grupo e tirar fora da tela (com corpo)', () => {
    expect(
      parseJS('SZGame2D.forEachInGroup(asteroides, function (a) { SZGame2D.applyVelocity(a); });'),
    ).toEqual([
      {
        type: 'g2d:forEachInGroup',
        groupVar: 'asteroides',
        itemName: 'a',
        body: [{ type: 'g2d:applyVelocity', spriteVar: 'a' }],
      },
    ])
    expect(
      parseJS(
        'SZGame2D.overlapGroups(tiros, asteroides, function (tiro, asteroide) { SZGame2D.removeFromGroup(asteroides, asteroide); });',
      ),
    ).toEqual([
      {
        type: 'g2d:onGroupOverlap',
        aGroup: 'tiros',
        aName: 'tiro',
        bGroup: 'asteroides',
        bName: 'asteroide',
        body: [{ type: 'g2d:removeFromGroup', spriteVar: 'asteroide', groupVar: 'asteroides' }],
      },
    ])
    expect(
      parseJS(
        'SZGame2D.pruneOffscreen(ctx, asteroides, 40, function (a) { SZGame2D.shake(ctx, 4); });',
      ),
    ).toEqual([
      {
        type: 'g2d:pruneOffscreen',
        groupVar: 'asteroides',
        ctxVar: 'ctx',
        itemName: 'a',
        body: [{ type: 'g2d:shake', ctxVar: 'ctx', intensity: 4 }],
      },
    ])
  })

  it('reconhece "a cada N quadros/segundos" (if SZGame2D.everyX) e quantidade do grupo', () => {
    expect(parseJS('if (SZGame2D.everyFrames("k", 30)) { SZGame2D.playSound(440, 50); }')).toEqual([
      {
        type: 'g2d:everyFrames',
        n: { type: 'num', value: 30 },
        body: [{ type: 'g2d:playSound', freq: 440, durationMs: 50 }],
      },
    ])
    expect(parseJS('if (SZGame2D.everySeconds("k", 2)) { SZGame2D.playSound(440, 50); }')).toEqual([
      {
        type: 'g2d:everySeconds',
        seconds: 2,
        body: [{ type: 'g2d:playSound', freq: 440, durationMs: 50 }],
      },
    ])
    // countGroup como valor numa comparação dentro de um "se".
    expect(
      parseJS('if (SZGame2D.countGroup(asteroides) >= 5) { SZGame2D.clearGroup(asteroides); }'),
    ).toEqual([
      {
        type: 'if',
        cond: {
          type: 'binop',
          op: '>=',
          left: { type: 'g2d:countGroup', groupVar: 'asteroides' },
          right: { type: 'num', value: 5 },
        },
        then: [{ type: 'g2d:clearGroup', groupVar: 'asteroides' }],
        else: undefined,
      },
    ])
  })
})

describe('roundtrip de um mini-shooter (grupos + spawner + colisão de grupo)', () => {
  it('o código gerado volta a virar blocos (sem rawJS), preservando os blocos de grupo', () => {
    const ir: import('#ir').JSStatement[] = [
      { type: 'g2d:createGroup', varName: 'asteroides' },
      { type: 'g2d:createGroup', varName: 'tiros' },
      {
        type: 'g2d:updateEachFrame',
        body: [
          { type: 'g2d:clear' },
          {
            type: 'g2d:everyFrames',
            n: { type: 'num', value: 30 },
            body: [
              {
                type: 'g2d:spawnInGroup',
                groupVar: 'asteroides',
                x: {
                  type: 'random',
                  min: { type: 'num', value: 0 },
                  max: { type: 'num', value: 300 },
                },
                y: { type: 'num', value: 0 },
                w: 24,
                h: 24,
                color: '#9ca3af',
                vx: { type: 'num', value: 0 },
                vy: { type: 'num', value: 3 },
              },
            ],
          },
          { type: 'g2d:updateGroup', groupVar: 'asteroides' },
          { type: 'g2d:drawGroup', groupVar: 'asteroides', ctxVar: 'ctx' },
          {
            type: 'g2d:onGroupOverlap',
            aGroup: 'tiros',
            aName: 'tiro',
            bGroup: 'asteroides',
            bName: 'asteroide',
            body: [
              { type: 'g2d:removeFromGroup', spriteVar: 'tiro', groupVar: 'tiros' },
              { type: 'g2d:removeFromGroup', spriteVar: 'asteroide', groupVar: 'asteroides' },
            ],
          },
          {
            type: 'g2d:pruneOffscreen',
            groupVar: 'asteroides',
            ctxVar: 'ctx',
            itemName: 'a',
            body: [{ type: 'g2d:shake', ctxVar: 'ctx', intensity: 4 }],
          },
        ],
      },
    ]
    const code = compileStatements(ir, 0)
    const parsed = parseJS(code)
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    for (const expected of [
      'g2d:createGroup',
      'g2d:updateEachFrame',
      'g2d:everyFrames',
      'g2d:spawnInGroup',
      'g2d:updateGroup',
      'g2d:drawGroup',
      'g2d:onGroupOverlap',
      'g2d:pruneOffscreen',
      'g2d:removeFromGroup',
    ]) {
      expect(types.has(expected)).toBe(true)
    }
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

describe('parseJS — HUD no canvas + estado/telas (v0.6.0)', () => {
  it('reconhece o HUD: placar, texto, vidas (corações) e barra', () => {
    expect(parseJS('SZGame2D.drawScore(ctx, "Pontos:", pontos, 12, 30, "#ffffff", 24);')).toEqual([
      {
        type: 'g2d:drawScore',
        ctxVar: 'ctx',
        label: 'Pontos:',
        value: { type: 'var', name: 'pontos' },
        x: 12,
        y: 30,
        color: '#ffffff',
        size: 24,
      },
    ])
    expect(parseJS('SZGame2D.drawLabel(ctx, "Oi", 12, 30, "#ffffff", 20, "center");')).toEqual([
      {
        type: 'g2d:drawLabel',
        ctxVar: 'ctx',
        text: 'Oi',
        x: 12,
        y: 30,
        color: '#ffffff',
        size: 20,
        align: 'center',
      },
    ])
    expect(parseJS('SZGame2D.drawHearts(ctx, vidas, 12, 48, 22, "#ff5d5d");')).toEqual([
      {
        type: 'g2d:drawHearts',
        ctxVar: 'ctx',
        count: { type: 'var', name: 'vidas' },
        x: 12,
        y: 48,
        size: 22,
        color: '#ff5d5d',
      },
    ])
    expect(parseJS('SZGame2D.drawBar(ctx, vida, 100, 12, 48, 160, 14, "#35e8ff");')).toEqual([
      {
        type: 'g2d:drawBar',
        ctxVar: 'ctx',
        value: { type: 'var', name: 'vida' },
        max: { type: 'num', value: 100 },
        x: 12,
        y: 48,
        w: 160,
        h: 14,
        color: '#35e8ff',
      },
    ])
  })

  it('reconhece cenas: setScene, sceneIs (valor), showScreen e restart', () => {
    expect(parseJS('SZGame2D.setScene("jogando");')).toEqual([
      { type: 'g2d:setScene', name: 'jogando' },
    ])
    expect(parseJS('SZGame2D.showScreen(ctx, "Titulo", "Sub", "Dica", "#02111f");')).toEqual([
      {
        type: 'g2d:showScreen',
        ctxVar: 'ctx',
        title: 'Titulo',
        subtitle: 'Sub',
        hint: 'Dica',
        bg: '#02111f',
      },
    ])
    expect(parseJS('SZGame2D.restart();')).toEqual([{ type: 'g2d:restart' }])
    // sceneIs como valor booleano dentro de um "se".
    expect(parseJS('if (SZGame2D.sceneIs("jogando")) { SZGame2D.setScene("ganhou"); }')).toEqual([
      {
        type: 'if',
        cond: { type: 'g2d:sceneIs', name: 'jogando' },
        then: [{ type: 'g2d:setScene', name: 'ganhou' }],
        else: undefined,
      },
    ])
  })
})

describe('roundtrip de HUD + cenas (gerar → parsear)', () => {
  it('o código gerado volta a virar blocos (sem rawJS)', () => {
    const ir: import('#ir').JSStatement[] = [
      { type: 'g2d:setScene', name: 'inicio' },
      {
        type: 'g2d:updateEachFrame',
        body: [
          { type: 'g2d:clear' },
          {
            type: 'if',
            cond: { type: 'g2d:sceneIs', name: 'inicio' },
            then: [
              {
                type: 'g2d:showScreen',
                ctxVar: 'ctx',
                title: 'Jogo',
                subtitle: 'Pronto?',
                hint: 'Enter',
                bg: '#02111f',
              },
            ],
            else: [
              {
                type: 'g2d:drawScore',
                ctxVar: 'ctx',
                label: 'Pontos:',
                value: { type: 'var', name: 'pontos' },
                x: 12,
                y: 30,
                color: '#fff',
                size: 24,
              },
              {
                type: 'g2d:drawHearts',
                ctxVar: 'ctx',
                count: { type: 'var', name: 'vidas' },
                x: 12,
                y: 48,
                size: 22,
                color: '#ff5d5d',
              },
              {
                type: 'g2d:drawBar',
                ctxVar: 'ctx',
                value: { type: 'var', name: 'pontos' },
                max: { type: 'num', value: 25 },
                x: 12,
                y: 78,
                w: 160,
                h: 14,
                color: '#35e8ff',
              },
            ],
          },
        ],
      },
    ]
    const code = compileStatements(ir, 0)
    const types = collectTypes(parseJS(code))
    expect(types.has('rawJS')).toBe(false)
    for (const expected of [
      'g2d:setScene',
      'g2d:sceneIs',
      'g2d:showScreen',
      'g2d:drawScore',
      'g2d:drawHearts',
      'g2d:drawBar',
    ]) {
      expect(types.has(expected)).toBe(true)
    }
  })
})

describe('roundtrip do asteroidsExample (jogo de tiro completo)', () => {
  it('o código gerado volta a virar blocos (sem rawJS), com grupos + colisão + HUD + cenas', () => {
    const code = compileStatements(asteroidsExample.ir.js, 0)
    const ir = parseJS(code)
    const types = collectTypes(ir)
    expect(types.has('rawJS')).toBe(false)
    for (const expected of [
      'g2d:createShip',
      'g2d:createGroup',
      'g2d:updateEachFrame',
      'g2d:onKey',
      'g2d:spawnInGroup',
      'g2d:spawnAsteroid',
      'g2d:everyFrames',
      'g2d:onGroupOverlap',
      'g2d:onSpriteGroupOverlap',
      'g2d:explode',
      'g2d:playShoot',
      'g2d:playExplosion',
      'g2d:pruneOffscreen',
      'g2d:drawScore',
      'g2d:drawHearts',
      'g2d:starfield',
      'g2d:dragX',
      'g2d:setScene',
      'g2d:sceneIs',
      'g2d:showScreen',
      'g2d:restart',
    ]) {
      expect(types.has(expected)).toBe(true)
    }
  })
})

describe('parseJS — Kit espaço (v0.7.0): nave, asteroide, explosão, sons, colisão sprite×grupo', () => {
  it('reconhece a nave (createShip) e o asteroide do grupo (spawnAsteroid)', () => {
    expect(
      parseJS(
        'const nave = SZGame2D.createShip({ x: 180, y: 250, w: 54, h: 62, body: "#35e8ff", wings: "#2568ff" });',
      ),
    ).toEqual([
      {
        type: 'g2d:createShip',
        varName: 'nave',
        x: 180,
        y: 250,
        w: 54,
        h: 62,
        bodyColor: '#35e8ff',
        wingColor: '#2568ff',
      },
    ])
    expect(
      parseJS(
        'SZGame2D.spawnAsteroid(asteroides, { x: 100, y: -30, size: 40, color: "#8d8f9b", vx: 0, vy: 3 });',
      ),
    ).toEqual([
      {
        type: 'g2d:spawnAsteroid',
        groupVar: 'asteroides',
        x: { type: 'num', value: 100 },
        y: { type: 'num', value: -30 },
        size: 40,
        color: '#8d8f9b',
        vx: { type: 'num', value: 0 },
        vy: { type: 'num', value: 3 },
      },
    ])
  })

  it('reconhece explosão, sons e colisão sprite×grupo (com corpo)', () => {
    expect(parseJS('SZGame2D.explodeSprite(asteroide, "#ffb13b");')).toEqual([
      { type: 'g2d:explode', spriteVar: 'asteroide', color: '#ffb13b' },
    ])
    expect(parseJS('SZGame2D.playShoot();')).toEqual([{ type: 'g2d:playShoot' }])
    expect(parseJS('SZGame2D.playExplosion();')).toEqual([{ type: 'g2d:playExplosion' }])
    expect(
      parseJS(
        'SZGame2D.overlapSpriteGroup(() => nave, asteroides, function (asteroide) { SZGame2D.removeFromGroup(asteroides, asteroide); });',
      ),
    ).toEqual([
      {
        type: 'g2d:onSpriteGroupOverlap',
        spriteVar: 'nave',
        groupVar: 'asteroides',
        itemName: 'asteroide',
        body: [{ type: 'g2d:removeFromGroup', spriteVar: 'asteroide', groupVar: 'asteroides' }],
      },
    ])
  })
})

describe('parseJS — tela responsiva (fitScreen)', () => {
  it('reconhece SZGame2D.fitScreen(percent)', () => {
    expect(parseJS('SZGame2D.fitScreen(100);')).toEqual([{ type: 'g2d:fitScreen', percent: 100 }])
    expect(parseJS('SZGame2D.fitScreen(90);')).toEqual([{ type: 'g2d:fitScreen', percent: 90 }])
  })
})

describe('parseJS — lacunas fechadas (tiro redondo, setas, piscar, intervalo variável)', () => {
  it('spawnBullet / arrowsX / blink', () => {
    expect(
      parseJS(
        'SZGame2D.spawnBullet(tiros, { x: 10, y: 20, radius: 5, color: "#9cff57", vx: 0, vy: -11 });',
      ),
    ).toEqual([
      {
        type: 'g2d:spawnBullet',
        groupVar: 'tiros',
        x: { type: 'num', value: 10 },
        y: { type: 'num', value: 20 },
        radius: 5,
        color: '#9cff57',
        vx: { type: 'num', value: 0 },
        vy: { type: 'num', value: -11 },
      },
    ])
    expect(parseJS('SZGame2D.arrowsX(nave, 6);')).toEqual([
      { type: 'g2d:arrowsX', spriteVar: 'nave', speed: 6 },
    ])
    expect(parseJS('SZGame2D.blink(nave, 90);')).toEqual([
      { type: 'g2d:blinkSprite', spriteVar: 'nave', frames: 90 },
    ])
  })
  it('everyFrames aceita variável no intervalo', () => {
    expect(parseJS('if (SZGame2D.everyFrames("k", intervalo)) { SZGame2D.playShoot(); }')).toEqual([
      {
        type: 'g2d:everyFrames',
        n: { type: 'var', name: 'intervalo' },
        body: [{ type: 'g2d:playShoot' }],
      },
    ])
  })
})
