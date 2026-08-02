import { describe, expect, it } from 'bun:test'
import { behaviorStatements } from '#ir'
import { collectTypes } from '../__gen_dinoCorredor'
import { MUNDO_PIRATA_SOURCE as SOURCE } from '../__gen_mundoPirata'
import { mundoPirataExample } from '../examples'
import { registerExampleContractTests, setupGameTwoDExampleTests } from './exampleContractHarness'

/**
 * Drift do exemplo "Mundo Pirata" — o degrau BÁSICO da trilogia de plataforma
 * lateral do Clear Code (Super Pirate World). A IR embutida em clearcode.ts foi
 * GERADA pelo parser real a partir do SOURCE (que mora no __gen_mundoPirata.ts,
 * importado aqui para que fonte e teste NUNCA divirjam). O preparo do palco
 * (setupStage + setStageDescription) é injetado pelo wrapper beginnerGameExample.
 */

setupGameTwoDExampleTests()

describe('Exemplo Mundo Pirata — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d', () => {
    expect(gameTwoDExamples).toContain(mundoPirataExample)
    expect(mundoPirataExample.ir.extensions).toEqual([{ extensionId: 'game-2d' }])
    expect(mundoPirataExample.name).toBe('Mundo Pirata')
    expect(mundoPirataExample.experience).toBe('game')
  })

  registerExampleContractTests({
    example: mundoPirataExample,
    source: SOURCE,
    stage: { width: 480, height: 300, bg: '#8ecae6' },
  })

  it('exercita a mecânica prometida do side-scroller', () => {
    const statements = behaviorStatements(mundoPirataExample.ir)
    const types = collectTypes(statements)
    for (const t of [
      'g2d:setGravity', // a gravidade da plataforma
      'g2d:defineShape', // pirata e caranguejo desenhados por código
      'g2d:createShapeSprite',
      'g2d:createGroup', // plataformas, moedas e inimigos
      'g2d:spawnInGroup',
      'g2d:cameraFollow', // ⭐ o mundo LARGO com a câmera seguindo o herói
      'g2d:arrowsX', // andar para os lados
      'g2d:applyGravity', // só o herói recebe a gravidade do mundo
      'g2d:applyVelocity', // integra a velocidade, sem gravidade escondida
      'g2d:collideGroup', // pousa nas plataformas
      'g2d:forEachInGroup', // caranguejos patrulham
      'g2d:onSpriteGroupOverlap', // pegar moeda + pisar/encostar no inimigo
      'g2d:removeFromGroup', // some com a moeda pega e o inimigo pisado
      'g2d:spriteVy', // o pisão exige estar CAINDO (vy > 0)
      'g2d:spriteY', // cair no buraco (y grande)
      'g2d:spriteX', // chegar na bandeira (x do fim)
      'g2d:setHitboxScale', // colisão perdoadora
      'g2d:drawScore',
      'g2d:setScene',
      'g2d:sceneIs',
      'g2d:showScreen',
      'g2d:restart',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(statements)
    expect(raw).toContain('"pontos"')
    // Três telas: início, vitória e derrota.
    for (const screen of ['"inicio"', '"venceu"', '"perdeu"']) {
      expect(raw).toContain(screen)
    }
  })
})

import { gameTwoDExamples } from '../exampleCatalog'
