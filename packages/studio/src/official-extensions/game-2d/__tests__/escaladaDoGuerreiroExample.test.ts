import { describe, expect, it } from 'bun:test'
import { behaviorStatements } from '#ir'
import { collectTypes } from '../__gen_dinoCorredor'
import { ESCALADA_DO_GUERREIRO_SOURCE as SOURCE } from '../__gen_escaladaDoGuerreiro'
import { escaladaDoGuerreiroExample } from '../examples'
import { registerExampleContractTests, setupGameTwoDExampleTests } from './exampleContractHarness'

/**
 * Drift do exemplo "Escalada do Guerreiro" — a recriação BÁSICA do
 * vertical-platformer do Chris Courses. A IR embutida em examples/gamesTwoD/escaladaDoGuerreiro.ts foi
 * GERADA pelo parser real a partir do SOURCE (que mora no
 * __gen_escaladaDoGuerreiro.ts, importado aqui para que fonte e teste NUNCA possam
 * divergir). O preparo do palco (setupStage + setStageDescription) é injetado pelo
 * wrapper `beginnerGameExample` e conferido à parte.
 */

setupGameTwoDExampleTests()

describe('Exemplo Escalada do Guerreiro — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d', () => {
    expect(gameTwoDExamples).toContain(escaladaDoGuerreiroExample)
    expect(escaladaDoGuerreiroExample.ir.extensions).toEqual([{ extensionId: 'game-2d' }])
    expect(escaladaDoGuerreiroExample.name).toBe('Escalada do Guerreiro')
    expect(escaladaDoGuerreiroExample.experience).toBe('game')
    expect((escaladaDoGuerreiroExample.description ?? '').length).toBeLessThanOrEqual(200)
  })

  registerExampleContractTests({
    example: escaladaDoGuerreiroExample,
    source: SOURCE,
    stage: { width: 320, height: 480, bg: '#8fc0e8' },
  })

  it('exercita a mecânica prometida do platformer vertical', () => {
    const types = collectTypes(behaviorStatements(escaladaDoGuerreiroExample.ir))
    for (const t of [
      'g2d:createShapeSprite', // o guerreiro desenhado por código
      'g2d:defineShape', // guerreiro procedural (sem PNG do warrior)
      'g2d:setGravity', // a queda leve (o gravity = 0.1 do original)
      'g2d:arrowsX', // andar para os lados (o a/d do original)
      'g2d:applyGravity', // só o guerreiro recebe a gravidade do mundo
      'g2d:applyVelocity', // integra a velocidade sem força escondida
      'g2d:setVelocity', // o pulo (o velocity.y = -4 do original)
      'g2d:spriteVy', // o pulo só age parado na vertical (truque do Dino)
      'g2d:setHitboxScale', // colisão perdoadora de 80%
      'g2d:createGroup', // as plataformas
      'g2d:spawnInGroup', // cada plataforma é um retângulo do grupo
      'g2d:collideGroup', // colisão sólida com as plataformas (pousa em cima)
      'g2d:clampToScreen', // não deixa o herói sair da coluna do mundo
      'g2d:cameraFollow', // a câmera sobe com o herói (o pan do original)
      'g2d:createSprite', // a bandeira do topo
      'g2d:spriteY', // detecta a chegada ao topo
      'g2d:playMusic',
      'g2d:playFx',
      'g2d:setScene',
      'g2d:sceneIs',
      'g2d:showScreen',
      'g2d:restart',
      'g2d:drawLabel',
      'g2d:drawGroup',
      'g2d:drawSprite',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    // Climb de plataforma feito na mão: sem o helper platformer (que ancora o chão
    // na borda da tela), sem tiros, sem inimigos, sem tilemap nem top-down.
    expect(types.has('g2d:platformer')).toBe(false)
    expect(types.has('g2d:topDown')).toBe(false)
    expect(types.has('g2d:collideTileMap')).toBe(false)
    expect(types.has('g2d:spawnBullet')).toBe(false)
    expect(types.has('g2d:createEnemyType')).toBe(false)
  })

  it('a câmera segue num mundo mais alto que a tela e o topo vence', () => {
    const loops = escaladaDoGuerreiroExample.ir.behavior.loops
    const frameLoop = loops.find((statement) => statement.type === 'g2d:updateEachFrame')
    const rawFrame = JSON.stringify(frameLoop)
    // O mundo tem 960 de altura (maior que os 480 do palco): a câmera sobe.
    expect(rawFrame).toContain(
      '"type":"g2d:cameraFollow","spriteVar":"heroi","worldW":{"type":"num","value":320},"worldH":{"type":"num","value":960}',
    )
    // A vitória dispara quando o herói passa da linha do topo (spriteY < 90).
    expect(rawFrame).toContain(
      '"op":"<","left":{"type":"g2d:spriteY","spriteVar":"heroi"},"right":{"type":"num","value":90}',
    )
    // Nenhuma cadência periódica: o climb é só o quadro (sem "A cada").
    expect(loops.every((statement) => statement.type === 'g2d:updateEachFrame')).toBe(true)
    expect(collectTypes(frameLoop).has('g2d:everySeconds')).toBe(false)
  })
})

import { gameTwoDExamples } from '../exampleCatalog'
