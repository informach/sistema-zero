import { describe, expect, it } from 'bun:test'
import { behaviorStatements, type JSStatement } from '#ir'
import { collectTypes } from '../__gen_dinoCorredor'
import { DUELO_DE_HEROIS_SOURCE as SOURCE } from '../__gen_dueloDeHerois'
import { dueloDeHeroisExample } from '../examples'
import { gameTwoDManifest } from '../manifest'
import { registerExampleContractTests, setupGameTwoDExampleTests } from './exampleContractHarness'

/**
 * Drift do exemplo "Duelo de Heróis" — a recriação BÁSICA da luta 1v1 do
 * fighting-game do Chris Courses. A IR embutida em examples/gamesTwoD/dueloDeHerois.ts foi
 * GERADA pelo parser real a partir do SOURCE (que mora no __gen_dueloDeHerois.ts,
 * importado aqui para que fonte e teste NUNCA possam divergir). O preparo do
 * palco (setupStage + setStageDescription) é injetado pelo wrapper
 * `beginnerGameExample` e conferido à parte.
 */

setupGameTwoDExampleTests()

describe('Exemplo Duelo de Heróis — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d', () => {
    expect(gameTwoDManifest.examples).toContain(dueloDeHeroisExample)
    expect(dueloDeHeroisExample.ir.extensions).toEqual([{ extensionId: 'game-2d' }])
    expect(dueloDeHeroisExample.name).toBe('Duelo de Heróis')
    expect(dueloDeHeroisExample.experience).toBe('game')
    expect((dueloDeHeroisExample.description ?? '').length).toBeLessThanOrEqual(200)
  })

  registerExampleContractTests({
    example: dueloDeHeroisExample,
    source: SOURCE,
    stage: { width: 480, height: 300, bg: '#2a2140' },
  })

  it('exercita a mecânica prometida da luta 1v1', () => {
    const types = collectTypes(behaviorStatements(dueloDeHeroisExample.ir))
    for (const t of [
      'g2d:createShapeSprite', // os dois lutadores desenhados por código
      'g2d:defineShape', // heróis procedurais (sem PNG)
      'g2d:createGroup', // o chão sólido
      'g2d:setGravity', // gravidade do mundo (o gravity 0.7 do original)
      'g2d:applyVelocity', // integra a queda
      'g2d:collideGroup', // pousa no chão
      'g2d:setHealth', // vida cheia dos dois no começo
      'g2d:getHealth', // as barras leem a vida
      'g2d:changeHealth', // o golpe tira vida (o takeHit)
      'g2d:drawBar', // barras de vida no topo
      'g2d:onKey', // teclas dos dois jogadores
      'g2d:keyDown', // andar lido a cada quadro
      'g2d:cooldownReady', // recarga do golpe por lutador
      'g2d:touches', // a caixa de ataque encosta no oponente
      'g2d:centerX', // decide para que lado o golpe vai
      'g2d:spriteX',
      'g2d:spriteVy', // pula só no chão
      'g2d:explode', // faísca ao acertar
      'g2d:shake',
      'g2d:everySeconds', // o cronômetro regressivo
      'g2d:setScene',
      'g2d:sceneIs',
      'g2d:showScreen',
      'g2d:restart',
      'g2d:playMusic',
      'g2d:playFx',
      'g2d:drawScore',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    // É luta em chão plano: sem tilemap, sem câmera, sem inimigos automáticos.
    expect(types.has('g2d:collideTileMap')).toBe(false)
    expect(types.has('g2d:cameraFollow')).toBe(false)
    expect(types.has('g2d:createEnemyType')).toBe(false)
  })

  it('tem só uma cadência: o cronômetro de 1 em 1 segundo', () => {
    const loops = dueloDeHeroisExample.ir.behavior.loops
    const everyRoots = loops.filter(
      (statement): statement is Extract<JSStatement, { type: 'g2d:everySeconds' }> =>
        statement.type === 'g2d:everySeconds',
    )
    expect(everyRoots).toHaveLength(1)
    const relogio = everyRoots[0]
    const rawRelogio = JSON.stringify(relogio)
    expect(rawRelogio).toContain('"type":"g2d:sceneIs","name":"jogando"')
    expect(rawRelogio).toContain(
      '"name":"tempo","value":{"type":"binop","op":"-","left":{"type":"var","name":"tempo"},"right":{"type":"num","value":1}}',
    )
    // Nenhuma cadência escondida dentro do "a cada quadro".
    const frameLoop = loops.find((statement) => statement.type === 'g2d:updateEachFrame')
    expect(collectTypes(frameLoop).has('g2d:everySeconds')).toBe(false)
  })
})
