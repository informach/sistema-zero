import { describe, expect, it } from 'bun:test'
import { behaviorStatements, type JSStatement } from '#ir'
import { collectTypes } from '../__gen_dinoCorredor'
import { TREINADOR_DE_CRIATURAS_SOURCE as SOURCE } from '../__gen_treinadorDeCriaturas'
import { treinadorDeCriaturasExample } from '../examples'
import { registerExampleContractTests, setupGameTwoDExampleTests } from './exampleContractHarness'

/**
 * Drift do exemplo "Treinador de Criaturas" — a recriação BÁSICA e ENXUTA do
 * pokemon-style-game do Chris Courses (RPG top-down + batalha por turnos). A IR
 * embutida em examples/gamesTwoD/treinadorDeCriaturas.ts foi GERADA pelo parser real a partir do
 * SOURCE (que mora no __gen_treinadorDeCriaturas.ts, importado aqui para que
 * fonte e teste NUNCA possam divergir). O preparo do palco (setupStage +
 * setStageDescription) é injetado pelo wrapper `beginnerGameExample` e conferido
 * à parte.
 */

setupGameTwoDExampleTests()

describe('Exemplo Treinador de Criaturas — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d', () => {
    expect(gameTwoDExamples).toContain(treinadorDeCriaturasExample)
    expect(treinadorDeCriaturasExample.ir.extensions).toEqual([{ extensionId: 'game-2d' }])
    expect(treinadorDeCriaturasExample.name).toBe('Treinador de Criaturas')
    expect(treinadorDeCriaturasExample.experience).toBe('game')
    expect((treinadorDeCriaturasExample.description ?? '').length).toBeLessThanOrEqual(200)
  })

  registerExampleContractTests({
    example: treinadorDeCriaturasExample,
    source: SOURCE,
    stage: { width: 480, height: 270, bg: '#3f7d4f' },
  })

  it('exercita a mecânica prometida do RPG top-down com batalha por turnos', () => {
    const types = collectTypes(behaviorStatements(treinadorDeCriaturasExample.ir))
    for (const t of [
      'g2d:createShapeSprite', // herói e criatura desenhados por código (sem PNG)
      'g2d:defineShape', // as duas figuras procedurais
      'g2d:topDown', // andar nas 4 direções no mapa (o WASD do original)
      'g2d:setHitboxScale', // colisão perdoadora do herói
      'g2d:createGroup', // os muros do mapa
      'g2d:spawnInGroup', // os muros de pedra
      'g2d:collideGroup', // colisão sólida contra os muros (sem tilemap PNG)
      'g2d:createSprite', // o mato alto (a zona de batalha)
      'g2d:touches', // encostar no mato dispara a batalha (o battleZones)
      'g2d:setHealth', // vida cheia dos dois no começo
      'g2d:getHealth', // as barras leem a vida
      'g2d:getMaxHealth',
      'g2d:changeHealth', // os golpes tiram vida; o Foco cura
      'g2d:drawBar', // barras de vida na batalha
      'g2d:drawLabel', // menu por teclas escrito na tela
      'g2d:blinkSprite', // a criatura/herói pisca ao levar o golpe
      'g2d:shake',
      'g2d:randomChance', // a criatura sorteia o golpe dela
      'g2d:everySeconds', // a vez da criatura (turno automático)
      'g2d:healthDepleted', // vencer e perder a batalha
      'g2d:setScene',
      'g2d:sceneIs',
      'g2d:showScreen',
      'g2d:restart',
      'g2d:playFx',
      'g2d:drawScore',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    // RPG top-down + batalha na mão: sem tilemap PNG, sem plataforma, sem tiros,
    // sem câmera (o mundo cabe no palco) e sem inimigos automáticos.
    expect(types.has('g2d:collideTileMap')).toBe(false)
    expect(types.has('g2d:platformer')).toBe(false)
    expect(types.has('g2d:spawnBullet')).toBe(false)
    expect(types.has('g2d:cameraFollow')).toBe(false)
    expect(types.has('g2d:createEnemyType')).toBe(false)
  })

  it('tem só uma cadência: a vez da criatura de 1,2 em 1,2 segundos', () => {
    const loops = treinadorDeCriaturasExample.ir.behavior.loops
    const everyRoots = loops.filter(
      (statement): statement is Extract<JSStatement, { type: 'g2d:everySeconds' }> =>
        statement.type === 'g2d:everySeconds',
    )
    expect(everyRoots).toHaveLength(1)
    const raw = JSON.stringify(everyRoots[0])
    expect(raw).toContain('"type":"g2d:sceneIs","name":"batalha"')
    // Nenhuma cadência escondida dentro do "a cada quadro".
    const frameLoop = loops.find((statement) => statement.type === 'g2d:updateEachFrame')
    expect(collectTypes(frameLoop).has('g2d:everySeconds')).toBe(false)
  })
})

import { gameTwoDExamples } from '../exampleCatalog'
