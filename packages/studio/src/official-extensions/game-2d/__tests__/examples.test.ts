import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import { behaviorStatements, SZIRV2Schema } from '#ir'
import 'blockly/blocks'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { parseJS } from '../../../parsers/js'
import { gameTwoDBlocks } from '../blocks'
import { gameTwoDExamples } from '../exampleCatalog'
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
 * T2 — VARREDURA de TODOS os exemplos do catálogo (os cards da vitrine). Antes,
 * "Equilibrista" e "Balão" (stickHero/balloon) tinham ZERO teste e nenhum teste
 * iterava o catálogo — um exemplo com IR obsoleta ou rawJS vazando chegava
 * à vitrine sem alarme. Cada card agora prova: schema válido, 0 rawJS, round-trip
 * por BLOCOS (IR→blocos→IR sem rawJS, com todos os statements) e a Ponte
 * (JS→IR sem rawJS). Cobre por CONSTRUÇÃO qualquer exemplo NOVO adicionado.
 */
describe('game-2d — todos os exemplos da vitrine', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
    registerExtensionBlocks(gameTwoDBlocks)
  })

  it('a vitrine tem os 33 exemplos (anti-vácuo)', () => {
    expect(gameTwoDExamples.length).toBe(33)
    expect(gameTwoDExtension.examples.count).toBe(33)
  })

  it('todos ensinam início e preparo explícitos, sem canvas escondido no HTML', () => {
    for (const example of gameTwoDExamples) {
      expect(example.ir.html.some((node) => node.type === 'canvas')).toBe(false)
      expect(example.ir.behavior.start[0]?.type).toBe('g2d:setupStage')
      expect(
        (example.ir.behavior.start[0] as { description?: string } | undefined)?.description,
      ).toBeUndefined()
      expect(collectTypes(example.ir).has('g2d:onStart')).toBe(false)
    }
  })

  it('mantém a classificação prometida: 27 jogos, 5 demonstrações e 1 exploração', () => {
    const counts = { game: 0, demo: 0, exploration: 0 }
    for (const example of gameTwoDExamples) counts[example.experience] += 1
    expect(counts).toEqual({ game: 27, demo: 5, exploration: 1 })
  })

  it('não ensina os blocos ambíguos de câmera e desenho mantidos só para projetos antigos', () => {
    for (const example of gameTwoDExamples) {
      const types = collectTypes(example.ir)
      expect(types.has('g2d:cameraFollow')).toBe(false)
      expect(types.has('g2d:drawTileMap')).toBe(false)
    }
  })

  for (const ex of gameTwoDExamples) {
    describe(ex.name, () => {
      it('IR válido no SZIRSchema, sem rawJS', () => {
        expect(SZIRV2Schema.safeParse(ex.ir).success).toBe(true)
        expect(collectTypes(ex.ir).has('rawJS')).toBe(false)
      })

      it('round-trip por blocos (IR→blocos→IR) preserva os statements, sem rawJS', () => {
        const state = buildWorkspaceStateFromIR(
          ex.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
        )
        const ws = new Blockly.Workspace()
        try {
          Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
          const back = behaviorStatements(buildIRFromWorkspace(ws))
          expect(collectTypes(back).has('rawJS')).toBe(false)
          // Nenhum statement se perde na volta (bloco obsoleto sumiria aqui).
          expect(back.length).toBe(behaviorStatements(ex.ir).length)
        } finally {
          ws.dispose()
        }
      }, 20_000) // suíte roda em paralelo — é volume de exemplo, não lentidão de código. // e monta um workspace inteiro do Blockly aqui. Passa dos 5s padrão quando a // O Reino Zero carrega 32 grades de 15×72 mais as posições seguras de cada fase,

      it('a Ponte (JS→IR) não engole nada em rawJS', () => {
        const code = compileStatements(behaviorStatements(ex.ir), 0)
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
        const roundTripped = behaviorStatements(buildIRFromWorkspace(workspace))
        const serialized = JSON.stringify(saved)

        for (const scene of expectedScenes) {
          expect(serialized).toContain(`"SCENE":"${scene}"`)
        }
        expect(roundTripped.length).toBe(behaviorStatements(example.ir).length)
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

  it('Aventura com câmera mostra casas e árvores reconhecíveis, não retângulos genéricos', () => {
    expect(cameraAdventureExample.assets?.map((asset) => asset.name)).toEqual([
      'casa-aventura',
      'arvore-aventura',
    ])
    const code = compileStatements(behaviorStatements(cameraAdventureExample.ir), 0)
    expect(code).toContain('image: "casa-aventura"')
    expect(code).toContain('image: "arvore-aventura"')
  })
})

describe('game-2d — demonstrações explicam os controles no próprio palco', () => {
  for (const example of [
    animatedHeroExample,
    gameTwoDExamples.find((candidate) => candidate.name === 'Mini plataforma'),
    tilemapExample,
    codeDrawnExample,
  ]) {
    it(example?.name ?? 'exemplo ausente', () => {
      expect(example).toBeDefined()
      const labels = JSON.stringify(example?.ir).match(/"type":"g2d:drawLabel"/g) ?? []
      expect(labels.length).toBeGreaterThan(0)
      const serialized = JSON.stringify(example?.ir).toLocaleLowerCase('pt-BR')
      expect(serialized).toContain('setas')
      expect(serialized).toContain('"type":"g2d:setstagedescription"')
      const description = example?.ir.behavior.start.find(
        (statement) => statement.type === 'g2d:setStageDescription',
      )
      expect(description?.type).toBe('g2d:setStageDescription')
      expect(
        description?.type === 'g2d:setStageDescription' ? description.description : '',
      ).toContain('setas')
    })
  }
})

describe('game-2d — exemplos com vidas usam o fluxo automático por sprite', () => {
  for (const example of [asteroidsExample, dinoRunExample, enemyPlatformerExample]) {
    it(example.name, () => {
      const serialized = JSON.stringify(example.ir)
      expect(serialized).toContain('"type":"g2d:drawSpriteHealth"')
      expect(serialized).toContain('"type":"g2d:healthDepleted"')
      expect(serialized).not.toContain('"type":"g2d:drawHearts"')
    })
  }
})

describe('game-2d — Nave contra Asteroides respeita a cena ativa', () => {
  it('mantém o gerador periódico na raiz e protege o spawn pela cena jogando', () => {
    const periodicSpawner = asteroidsExample.ir.behavior.loops.find(
      (statement) => statement.type === 'g2d:everyFrames',
    )

    expect(periodicSpawner).toMatchObject({
      type: 'g2d:everyFrames',
      body: [
        {
          type: 'if',
          cond: { type: 'g2d:sceneIs', name: 'jogando' },
          then: [{ type: 'g2d:spawnAsteroid', groupVar: 'asteroides' }],
        },
      ],
    })
  })
})

describe('pongExample (game-2d)', () => {
  it('tem IR válido contra o SZIRSchema', () => {
    expect(SZIRV2Schema.safeParse(pongExample.ir).success).toBe(true)
  })

  it('NÃO usa bloco de código avançado (rawJS) — tudo vira bloco', () => {
    const types = collectTypes(pongExample.ir)
    expect(types.has('rawJS')).toBe(false)
  })
})

describe('pongExample (game-2d) — partida completa', () => {
  // Guarda de regressão do freeze de ~11s: com `z.union` (não-discriminada) o
  // safeParse desta IR ~107 nós fazia BACKTRACKING exponencial e congelava o
  // editor na carga/import. Com `z.discriminatedUnion('type', …)` é O(nós).
  // Teto FOLGADO (2s) p/ não flakar em CI lento, mas pega a regressão (era ~15s).
  it('valida e parseia em tempo linear (< 2s, não exponencial)', () => {
    const t0 = performance.now()
    const result = SZIRV2Schema.safeParse(asteroidsExample.ir)
    const elapsed = performance.now() - t0
    expect(result.success).toBe(true)
    expect(elapsed).toBeLessThan(2000)
  })

  it('tem adversário, placar, estados de conclusão e novo jogo', () => {
    const code = compileStatements(behaviorStatements(pongExample.ir), 0)
    expect(code).toContain('SZGame2D.applyVelocity(bola)')
    expect(code).toContain('SZGame2D.touches(jogador, bola)')
    expect(code).toContain('SZGame2D.touches(computador, bola)')
    // O rebote virou bloco: eram ~110 linhas de IR com `Math.abs` e o ângulo no braço.
    expect(code).toContain('SZGame2D.paddleBounce(bola, jogador, 8)')
    expect(code).toContain('SZGame2D.paddleBounce(bola, computador, 8)')
    expect(code).toContain('SZGame2D.bounceOnEdgePair(bola, ctx, "top-bottom")')
    expect(code).toContain('SZGame2D.arrowsY(jogador, 5)')
    expect(code).toContain('pontosComputador = pontosComputador + 1')
    expect(code).toContain('SZGame2D.setScene("vitoria")')
    expect(code).toContain('SZGame2D.setScene("derrota")')
    expect(code).toContain('SZGame2D.restart()')
    expect(code).toContain('O primeiro a 5 pontos vence!')
  })
})

describe('enemyPlatformerExample (game-2d) — tipos de inimigo', () => {
  it('tem IR válido contra o SZIRSchema', () => {
    expect(SZIRV2Schema.safeParse(enemyPlatformerExample.ir).success).toBe(true)
  })

  it('NÃO usa bloco de código avançado (rawJS) — tudo vira bloco', () => {
    expect(collectTypes(enemyPlatformerExample.ir).has('rawJS')).toBe(false)
  })

  it('gera os três comportamentos, o auto-animar e a compat tipo=grupo', () => {
    const code = compileStatements(behaviorStatements(enemyPlatformerExample.ir), 0)
    expect(code).toContain('SZGame2D.createEnemyType({ behavior: "patrulha"')
    expect(code).toContain('SZGame2D.createEnemyType({ behavior: "saltador"')
    expect(code).toContain('SZGame2D.createEnemyType({ behavior: "atirador"')
    expect(code).toContain('SZGame2D.setEnemyTypeParam(canhao, "cadencia", 120)')
    expect(code).toContain('SZGame2D.updateEnemyType(goomba, ctx, heroi)')
    expect(code).toContain('SZGame2D.drawEnemyType(ctx, canhao)')
    expect(code).toContain('SZGame2D.autoAnimate(heroi)')
    expect(code).toContain('SZGame2D.onEnemyDefeated(goomba, (inimigo) =>')
    expect(code).toContain('SZGame2D.onEnemyDefeated(sapinho, (inimigo) =>')
    expect(code).toContain('SZGame2D.onEnemyDefeated(canhao, (inimigo) =>')
    expect(code).toContain('SZGame2D.overlapEnemyShots(() => heroi, canhao, (tiro) =>')
    expect(code).toContain('SZGame2D.hurtByEnemy(heroi, inimigo)')
    // tipo funciona nos blocos de GRUPO: colisão grupo×tipo direto no nome
    expect(code).toContain('SZGame2D.overlapGroups(tiros, goomba,')
    expect(code).toContain('SZGame2D.overlapGroups(tiros, sapinho,')
    expect(code).toContain('SZGame2D.overlapGroups(tiros, canhao,')
    expect(code).toContain('SZGame2D.setScene("vitoria")')
    expect(code).toContain('SZGame2D.setScene("derrota")')
    expect(code).toContain('SZGame2D.restart()')
  })
})

describe('codeDrawnExample (game-2d) — sprite desenhado por código', () => {
  it('tem IR válido contra o SZIRSchema', () => {
    const parsed = SZIRV2Schema.safeParse(codeDrawnExample.ir)
    expect(parsed.success, parsed.success ? '' : JSON.stringify(parsed.error.issues)).toBe(true)
  })

  it('NÃO usa bloco de código avançado (rawJS) — tudo vira bloco', () => {
    expect(collectTypes(codeDrawnExample.ir).has('rawJS')).toBe(false)
  })

  it('NÃO usa nenhuma imagem — o jogo é 100% desenhado por código', () => {
    const code = compileStatements(behaviorStatements(codeDrawnExample.ir), 0)
    expect(code).toContain('SZGame2D.defineShape("heroi", (ctx) =>')
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
    expect(SZIRV2Schema.safeParse(dinoRunExample.ir).success).toBe(true)
  })

  it('NÃO usa bloco de código avançado (rawJS) — tudo vira bloco', () => {
    expect(collectTypes(dinoRunExample.ir).has('rawJS')).toBe(false)
  })

  it('gera as chamadas do Kit dino + recorde persistente (localStorage)', () => {
    const code = compileStatements(behaviorStatements(dinoRunExample.ir), 0)
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
    expect(SZIRV2Schema.safeParse(gorilasExample.ir).success).toBe(true)
  })

  it('NÃO usa bloco de código avançado (rawJS) — tudo vira bloco', () => {
    expect(collectTypes(gorilasExample.ir).has('rawJS')).toBe(false)
  })

  it('gera as chamadas do Kit gorilas', () => {
    const code = compileStatements(behaviorStatements(gorilasExample.ir), 0)
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
    expect(code).toContain('SZGame2D.playExplosion()')
  })
})

describe('gorilasVsRobotExample (game-2d) — Kit gorilas vs Robô', () => {
  it('tem IR válido contra o SZIRSchema', () => {
    expect(SZIRV2Schema.safeParse(gorilasVsRobotExample.ir).success).toBe(true)
  })

  it('NÃO usa bloco de código avançado (rawJS) — tudo vira bloco', () => {
    expect(collectTypes(gorilasVsRobotExample.ir).has('rawJS')).toBe(false)
  })

  it('gera as chamadas do robô (IA) + leitura de mira', () => {
    const code = compileStatements(behaviorStatements(gorilasVsRobotExample.ir), 0)
    expect(code).toContain('SZGame2D.computerTurn(gorila2, cidade, gorila1)')
    expect(code).toContain('SZGame2D.drawAimReadout(ctx)')
  })
})

describe('cameraAdventureExample (game-2d) — câmera + som (v0.16.0)', () => {
  it('tem IR válido contra o SZIRSchema', () => {
    expect(SZIRV2Schema.safeParse(cameraAdventureExample.ir).success).toBe(true)
  })

  it('NÃO usa bloco de código avançado (rawJS) — tudo vira bloco', () => {
    expect(collectTypes(cameraAdventureExample.ir).has('rawJS')).toBe(false)
  })

  it('gera câmera, paisagem, música, coleta, instruções e conclusão', () => {
    const code = compileStatements(behaviorStatements(cameraAdventureExample.ir), 0)
    expect(code).toContain('SZGame2D.playMusic("adventure")')
    expect(code).toContain('const areaJogo = SZGame2D.createWorld(1600, 320)')
    expect(code).toContain('SZGame2D.followCameraInWorld(heroi, areaJogo)')
    expect(code).toContain('SZGame2D.playFx("coin")')
    expect(code).toContain('const paisagem = SZGame2D.createGroup()')
    expect(code).toContain('SZGame2D.drawGroup(ctx, paisagem)')
    expect(code).toContain('SZGame2D.drawScore(ctx, "Moedas:", pontos,')
    expect(code).toContain('Exploração completa! Você encontrou as 4 moedas.')
  })
})
