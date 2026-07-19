import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import { SZIRSchema } from '#ir'
import 'blockly/blocks'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { parseJS } from '../../../parsers/js'
import { gameTwoDBlocks } from '../blocks'
import {
  animatedHeroExample,
  asteroidsExample,
  cameraAdventureExample,
  codeDrawnExample,
  dinoRunExample,
  enemyPlatformerExample,
  gorilasExample,
  gorilasVsRobotExample,
  pongExample,
  tilemapExample,
} from '../examples'
import { gameTwoDExtension } from '../index'
import { gameTwoDManifest } from '../manifest'

describe('game-2d — definição da extensão', () => {
  it('nível iniciante-2d — Kit facilitador, já aparece na paleta do iniciante', () => {
    expect(gameTwoDExtension.manifest.id).toBe('game-2d')
    expect(gameTwoDExtension.minLevel).toBe('iniciante-2d')
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

/**
 * T2 — VARREDURA de TODOS os exemplos do manifest (os cards da vitrine). Antes,
 * "Equilibrista" e "Balão" (stickHero/balloon) tinham ZERO teste e nenhum teste
 * iterava manifest.examples — um exemplo com IR obsoleta ou rawJS vazando chegava
 * à vitrine sem alarme. Cada card agora prova: schema válido, 0 rawJS, round-trip
 * por BLOCOS (IR→blocos→IR sem rawJS, com todos os statements) e a Ponte
 * (JS→IR sem rawJS). Cobre por CONSTRUÇÃO qualquer exemplo NOVO adicionado.
 */
describe('game-2d — todos os exemplos da vitrine (manifest.examples)', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
    registerExtensionBlocks(gameTwoDBlocks)
  })

  it('a vitrine tem os 14 exemplos (anti-vácuo)', () => {
    expect(gameTwoDManifest.examples.length).toBe(14)
  })

  for (const ex of gameTwoDManifest.examples) {
    describe(ex.name, () => {
      it('IR válido no SZIRSchema, sem rawJS', () => {
        expect(SZIRSchema.safeParse(ex.ir).success).toBe(true)
        expect(collectTypes(ex.ir).has('rawJS')).toBe(false)
      })

      it('round-trip por blocos (IR→blocos→IR) preserva os statements, sem rawJS', () => {
        const state = buildWorkspaceStateFromIR(
          ex.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
        )
        const ws = new Blockly.Workspace()
        try {
          Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
          const back = buildIRFromWorkspace(ws).js
          expect(collectTypes(back).has('rawJS')).toBe(false)
          // Nenhum statement se perde na volta (bloco obsoleto sumiria aqui).
          expect(back.length).toBe(ex.ir.js.length)
        } finally {
          ws.dispose()
        }
      })

      it('a Ponte (JS→IR) não engole nada em rawJS', () => {
        const code = compileStatements(ex.ir.js, 0)
        expect(code.trim().length).toBeGreaterThan(0)
        expect(collectTypes(parseJS(code)).has('rawJS')).toBe(false)
      })
    })
  }
})

describe('game-2d — cenas com nomes livres', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
    registerExtensionBlocks(gameTwoDBlocks)
  })

  for (const [example, expectedScenes] of [
    [gorilasExample, ['ganhou1', 'ganhou2']],
    [gorilasVsRobotExample, ['ganhou1', 'ganhou2']],
  ] as const) {
    it(`${example.name} serializa cenas personalizadas sem warnings`, () => {
      const warnings: string[] = []
      const originalWarn = console.warn
      console.warn = (...args: unknown[]) => warnings.push(args.map(String).join(' '))

      const workspace = new Blockly.Workspace()
      try {
        const state = buildWorkspaceStateFromIR(
          example.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
        )
        Blockly.serialization.workspaces.load(
          state as unknown as Record<string, unknown>,
          workspace,
        )

        const saved = Blockly.serialization.workspaces.save(workspace)
        const roundTripped = buildIRFromWorkspace(workspace).js
        const serialized = JSON.stringify(saved)

        for (const scene of expectedScenes) {
          expect(serialized).toContain(`"SCENE":"${scene}"`)
        }
        expect(roundTripped.length).toBe(example.ir.js.length)
        expect(collectTypes(roundTripped).has('rawJS')).toBe(false)
      } finally {
        workspace.dispose()
        console.warn = originalWarn
      }

      expect(warnings).toEqual([])
    })
  }
})

describe('game-2d — exemplos com imagem são autossuficientes', () => {
  it('Herói que anda embute imagem e folha de quatro quadros', () => {
    expect(animatedHeroExample.assets?.map((asset) => asset.name)).toEqual([
      'heroi',
      'heroi-andando',
    ])
    expect(animatedHeroExample.assets?.find((asset) => asset.name === 'heroi')?.width).toBe(32)
    expect(animatedHeroExample.assets?.find((asset) => asset.name === 'heroi-andando')?.width).toBe(
      128,
    )
  })

  it('Sala com paredes embute tileset e herói', () => {
    expect(tilemapExample.assets?.map((asset) => asset.name)).toEqual(['tileset', 'heroi'])
    for (const asset of tilemapExample.assets ?? []) {
      expect(asset.dataUrl.startsWith('data:image/')).toBe(true)
    }
  })
})

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

describe('enemyPlatformerExample (game-2d) — tipos de inimigo', () => {
  it('tem IR válido contra o SZIRSchema', () => {
    expect(SZIRSchema.safeParse(enemyPlatformerExample.ir).success).toBe(true)
  })

  it('NÃO usa bloco de código avançado (rawJS) — tudo vira bloco', () => {
    expect(collectTypes(enemyPlatformerExample.ir).has('rawJS')).toBe(false)
  })

  it('gera os três comportamentos, o auto-animar e a compat tipo=grupo', () => {
    const code = compileStatements(enemyPlatformerExample.ir.js, 0)
    expect(code).toContain('SZGame2D.createEnemyType({ behavior: "patrulha"')
    expect(code).toContain('SZGame2D.createEnemyType({ behavior: "saltador"')
    expect(code).toContain('SZGame2D.createEnemyType({ behavior: "atirador"')
    expect(code).toContain('SZGame2D.setEnemyTypeParam(canhao, "cadencia", 120)')
    expect(code).toContain('SZGame2D.updateEnemyType(goomba, ctx, heroi)')
    expect(code).toContain('SZGame2D.drawEnemyType(ctx, canhao)')
    expect(code).toContain('SZGame2D.autoAnimate(heroi)')
    expect(code).toContain('SZGame2D.onEnemyDefeated(goomba, function (inimigo)')
    expect(code).toContain('SZGame2D.overlapEnemyShots(() => heroi, canhao, function (tiro)')
    expect(code).toContain('SZGame2D.hurtByEnemy(heroi, inimigo)')
    // tipo funciona nos blocos de GRUPO: colisão grupo×tipo direto no nome
    expect(code).toContain('SZGame2D.overlapGroups(tiros, goomba,')
  })
})

describe('codeDrawnExample (game-2d) — sprite desenhado por código', () => {
  it('tem IR válido contra o SZIRSchema', () => {
    expect(SZIRSchema.safeParse(codeDrawnExample.ir).success).toBe(true)
  })

  it('NÃO usa bloco de código avançado (rawJS) — tudo vira bloco', () => {
    expect(collectTypes(codeDrawnExample.ir).has('rawJS')).toBe(false)
  })

  it('NÃO usa nenhuma imagem — o jogo é 100% desenhado por código', () => {
    const code = compileStatements(codeDrawnExample.ir.js, 0)
    expect(code).toContain('SZGame2D.defineShape("heroi", function (ctx)')
    expect(code).toContain('SZGame2D.paintRect(ctx,')
    expect(code).toContain('SZGame2D.paintCircle(ctx,')
    expect(code).toContain('SZGame2D.createShapeSprite("heroi",')
    expect(code).toContain('SZGame2D.createShapeSprite("moeda",')
    expect(code).not.toContain('createImageSprite')
    expect(code).not.toContain('setImage')
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
