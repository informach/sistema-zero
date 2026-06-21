import { describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import { SZIRSchema } from '#ir'
import {
  asteroidsExample,
  cameraAdventureExample,
  dinoRunExample,
  gorilasExample,
  gorilasVsRobotExample,
  pongExample,
} from '../examples'
import { gameTwoDExtension } from '../index'

describe('game-2d — definição da extensão', () => {
  it('nível intermediário — NÃO aparece na paleta do iniciante', () => {
    expect(gameTwoDExtension.manifest.id).toBe('game-2d')
    expect(gameTwoDExtension.minLevel).toBe('intermediario')
  })
})

/** Coleta todos os `type` de nós do IR (deep-walk) para detectar `rawJS`. */
function collectTypes(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectTypes(item, out)
  } else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.type === 'string') out.add(obj.type)
    for (const v of Object.values(obj)) collectTypes(v, out)
  }
  return out
}

describe('pongExample (game-2d)', () => {
  it('tem IR válido contra o SZIRSchema', () => {
    expect(SZIRSchema.safeParse(pongExample.ir).success).toBe(true)
  })

  it('NÃO usa bloco de código avançado (rawJS) — tudo vira bloco', () => {
    const types = collectTypes(pongExample.ir)
    expect(types.has('rawJS')).toBe(false)
  })
})

describe('asteroidsExample (game-2d) — perf do SZIRSchema', () => {
  // Guarda de regressão do freeze de ~11s: com `z.union` (não-discriminada) o
  // safeParse desta IR ~107 nós fazia BACKTRACKING exponencial e congelava o
  // editor na carga/import. Com `z.discriminatedUnion('type', …)` é O(nós).
  // Teto FOLGADO (2s) p/ não flakar em CI lento, mas pega a regressão (era ~15s).
  it('valida e parseia em tempo linear (< 2s, não exponencial)', () => {
    const t0 = performance.now()
    const result = SZIRSchema.safeParse(asteroidsExample.ir)
    const elapsed = performance.now() - t0
    expect(result.success).toBe(true)
    expect(elapsed).toBeLessThan(2000)
  })

  it('a física usa os blocos do motor + if/memberSet (gera o código esperado)', () => {
    const code = compileStatements(pongExample.ir.js, 0)
    expect(code).toContain('SZGame2D.applyVelocity(bola)')
    expect(code).toContain('SZGame2D.bounceOnEdges(bola, ctx)')
    expect(code).toContain('SZGame2D.isColliding(jogador, bola)')
    expect(code).toContain('bola.vx = Math.abs(bola.vx)')
    // A física crua antiga (integração manual da velocidade) sumiu.
    expect(code).not.toContain('bola.x += bola.vx')
  })
})

describe('dinoRunExample (game-2d) — Kit dino', () => {
  it('tem IR válido contra o SZIRSchema', () => {
    expect(SZIRSchema.safeParse(dinoRunExample.ir).success).toBe(true)
  })

  it('NÃO usa bloco de código avançado (rawJS) — tudo vira bloco', () => {
    expect(collectTypes(dinoRunExample.ir).has('rawJS')).toBe(false)
  })

  it('gera as chamadas do Kit dino + recorde persistente (localStorage)', () => {
    const code = compileStatements(dinoRunExample.ir.js, 0)
    expect(code).toContain('SZGame2D.createDino(')
    expect(code).toContain('SZGame2D.controlDino(dino, ctx, 15)')
    expect(code).toContain('SZGame2D.spawnObstacle(obstaculos, ctx,')
    expect(code).toContain('SZGame2D.spawnEgg(ovos,')
    expect(code).toContain('SZGame2D.drawForest(ctx, 5)')
    expect(code).toContain('SZGame2D.playDinoHurt()')
    expect(code).toContain('SZGame2D.playCollect()')
    // recorde persiste com os blocos genéricos de armazenamento (sem bloco novo).
    expect(code).toContain('localStorage.getItem("dinoRecorde")')
    expect(code).toContain('localStorage.setItem("dinoRecorde"')
  })
})

describe('gorilasExample (game-2d) — Kit gorilas', () => {
  it('tem IR válido contra o SZIRSchema', () => {
    expect(SZIRSchema.safeParse(gorilasExample.ir).success).toBe(true)
  })

  it('NÃO usa bloco de código avançado (rawJS) — tudo vira bloco', () => {
    expect(collectTypes(gorilasExample.ir).has('rawJS')).toBe(false)
  })

  it('gera as chamadas do Kit gorilas', () => {
    const code = compileStatements(gorilasExample.ir.js, 0)
    expect(code).toContain('SZGame2D.createCity()')
    expect(code).toContain('SZGame2D.placeThrower(cidade, { side: "left"')
    expect(code).toContain('SZGame2D.placeThrower(cidade, { side: "right"')
    expect(code).toContain('SZGame2D.drawCity(ctx, cidade)')
    expect(code).toContain('SZGame2D.newWind(cidade)')
    expect(code).toContain('SZGame2D.drawWind(ctx, cidade)')
    expect(code).toContain('SZGame2D.aimDrag(ctx, gorila1)')
    expect(code).toContain('SZGame2D.aimReleased(gorila1)')
    expect(code).toContain('SZGame2D.throwBanana(gorila1, cidade)')
    expect(code).toContain('SZGame2D.updateBanana(cidade)')
    expect(code).toContain('SZGame2D.drawBanana(ctx, cidade)')
    expect(code).toContain('SZGame2D.bananaHitThrower(cidade, gorila2)')
    expect(code).toContain('SZGame2D.bananaHitCity(cidade)')
    expect(code).toContain('SZGame2D.playWhistle()')
    expect(code).toContain('SZGame2D.playBoom()')
  })
})

describe('gorilasVsRobotExample (game-2d) — Kit gorilas vs Robô', () => {
  it('tem IR válido contra o SZIRSchema', () => {
    expect(SZIRSchema.safeParse(gorilasVsRobotExample.ir).success).toBe(true)
  })

  it('NÃO usa bloco de código avançado (rawJS) — tudo vira bloco', () => {
    expect(collectTypes(gorilasVsRobotExample.ir).has('rawJS')).toBe(false)
  })

  it('gera as chamadas do robô (IA) + leitura de mira', () => {
    const code = compileStatements(gorilasVsRobotExample.ir.js, 0)
    expect(code).toContain('SZGame2D.computerTurn(gorila2, cidade, gorila1)')
    expect(code).toContain('SZGame2D.drawAimReadout(ctx)')
  })
})

describe('cameraAdventureExample (game-2d) — câmera + som (v0.16.0)', () => {
  it('tem IR válido contra o SZIRSchema', () => {
    expect(SZIRSchema.safeParse(cameraAdventureExample.ir).success).toBe(true)
  })

  it('NÃO usa bloco de código avançado (rawJS) — tudo vira bloco', () => {
    expect(collectTypes(cameraAdventureExample.ir).has('rawJS')).toBe(false)
  })

  it('gera as chamadas dos blocos novos (câmera, música, efeito, FPS, placar)', () => {
    const code = compileStatements(cameraAdventureExample.ir.js, 0)
    expect(code).toContain('SZGame2D.playMusic("adventure")')
    expect(code).toContain('SZGame2D.cameraFollow(heroi, 1600, 320)')
    expect(code).toContain('SZGame2D.playFx("coin")')
    expect(code).toContain('SZGame2D.showFps(12, 56)')
    expect(code).toContain('SZGame2D.drawScore(ctx, "Moedas:", pontos,')
  })
})
