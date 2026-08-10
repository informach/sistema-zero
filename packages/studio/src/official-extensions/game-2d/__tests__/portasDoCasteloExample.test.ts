import { describe, expect, it } from 'bun:test'
import { behaviorStatements } from '#ir'
import { collectTypes } from '../__gen_dinoCorredor'
import { PORTAS_DO_CASTELO_SOURCE as SOURCE } from '../__gen_portasDoCastelo'
import { portasDoCasteloExample } from '../examples'
import { registerExampleContractTests, setupGameTwoDExampleTests } from './exampleContractHarness'

/**
 * Drift do exemplo "Portas do Castelo" — a recriação BÁSICA do plataforma por
 * fases do kings-and-pigs do Chris Courses. A IR embutida em examples/gamesTwoD/portasDoCastelo.ts
 * foi GERADA pelo parser real a partir do SOURCE (que mora no
 * __gen_portasDoCastelo.ts, importado aqui para que fonte e teste NUNCA possam
 * divergir). O preparo do palco (setupStage + setStageDescription) é injetado
 * pelo wrapper `beginnerGameExample` e conferido à parte.
 */

setupGameTwoDExampleTests()

describe('Exemplo Portas do Castelo — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d', () => {
    expect(gameTwoDExamples).toContain(portasDoCasteloExample)
    expect(portasDoCasteloExample.ir.extensions).toEqual([{ extensionId: 'game-2d' }])
    expect(portasDoCasteloExample.name).toBe('Portas do Castelo')
    expect(portasDoCasteloExample.experience).toBe('game')
    expect((portasDoCasteloExample.description ?? '').length).toBeLessThanOrEqual(200)
    expect(portasDoCasteloExample.concepts).toEqual(['plataformas', 'fases', 'transições'])
    expect(portasDoCasteloExample.genre).toBe('plataforma')
  })

  registerExampleContractTests({
    example: portasDoCasteloExample,
    source: SOURCE,
    stage: { width: 480, height: 300, bg: '#243050' },
  })

  it('exercita a mecânica prometida do plataforma por fases', () => {
    const types = collectTypes(behaviorStatements(portasDoCasteloExample.ir))
    for (const t of [
      'g2d:createShapeSprite', // o rei desenhado por código
      'g2d:defineShape', // rei procedural (sem PNG)
      'g2d:createGroup', // os blocos de colisão
      'g2d:createSprite', // a porta
      'g2d:setGravity', // gravidade do mundo
      'g2d:applyVelocity', // integra a queda
      'g2d:createWorld', // cada salão é uma área jogável independente
      'g2d:addSolidGroupToWorld',
      'g2d:createLevel', // Fases reais, não apenas um contador com esse nome
      'g2d:enterLevel',
      'g2d:collideCurrentLevel', // pousa no Mundo da Fase atual
      'g2d:drawCurrentLevel',
      'g2d:clampToScreen',
      'g2d:setHitboxScale',
      'g2d:arrowsX', // anda com as setas
      'g2d:spriteVy', // pula só no chão
      'g2d:touches', // encosta na porta
      'g2d:flash', // o clarão da transição (o fade do original)
      'g2d:clearGroup', // remonta as plataformas ao trocar de fase
      'g2d:spawnInGroup', // nascem os blocos de cada fase
      'g2d:setPosition', // reposiciona rei e porta
      'g2d:setVelocity',
      'g2d:onKey',
      'g2d:setScene',
      'g2d:sceneIs',
      'g2d:showScreen',
      'g2d:restart',
      'g2d:playMusic',
      'g2d:playFx',
      'g2d:drawScore',
      'g2d:drawLabel',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    // É plataforma de fila plana com fade: sem tilemap, sem câmera, sem inimigos.
    expect(types.has('g2d:collideTileMap')).toBe(false)
    expect(types.has('g2d:cameraFollow')).toBe(false)
    expect(types.has('g2d:createEnemyType')).toBe(false)
  })

  it('a transição é toda no "a cada quadro": nenhuma cadência de tempo', () => {
    const loops = portasDoCasteloExample.ir.behavior.loops
    // Nenhum "A cada N segundos/quadros": a fase troca por um contador de quadros.
    expect(loops.some((statement) => statement.type === 'g2d:everySeconds')).toBe(false)
    expect(loops.some((statement) => statement.type === 'g2d:everyFrames')).toBe(false)
    // O clarão e a troca de fase vivem no loop principal.
    const frameLoop = loops.find((statement) => statement.type === 'g2d:updateEachFrame')
    const frameTypes = collectTypes(frameLoop)
    expect(frameTypes.has('g2d:flash')).toBe(true)
    expect(frameTypes.has('g2d:clearGroup')).toBe(true)
    expect(frameTypes.has('g2d:touches')).toBe(true)
  })
})

import { gameTwoDExamples } from '../exampleCatalog'
