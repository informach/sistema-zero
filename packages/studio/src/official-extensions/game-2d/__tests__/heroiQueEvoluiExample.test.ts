import { describe, expect, it } from 'bun:test'
import { behaviorStatements } from '#ir'
import { collectTypes } from '../__gen_dinoCorredor'
import { HEROI_QUE_EVOLUI_SOURCE as SOURCE } from '../__gen_heroiQueEvolui'
import { heroiQueEvoluiExample } from '../examples'
import { gameTwoDManifest } from '../manifest'
import { registerExampleContractTests, setupGameTwoDExampleTests } from './exampleContractHarness'

/**
 * Drift do exemplo "Herói que Evolui" — o degrau BÁSICO da família Zelda do
 * Clear Code, focado na economia de EXP + subir de nível. A IR embutida foi
 * GERADA pelo parser real a partir do SOURCE (que mora no __gen_heroiQueEvolui.ts,
 * importado aqui para que fonte e teste NUNCA possam divergir).
 */

setupGameTwoDExampleTests()

describe('Exemplo Herói que Evolui — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d', () => {
    expect(gameTwoDManifest.examples).toContain(heroiQueEvoluiExample)
    expect(heroiQueEvoluiExample.ir.extensions).toEqual([{ extensionId: 'game-2d' }])
    expect(heroiQueEvoluiExample.name).toBe('Herói que Evolui')
    expect(heroiQueEvoluiExample.experience).toBe('game')
    expect((heroiQueEvoluiExample.description ?? '').length).toBeLessThanOrEqual(200)
  })

  registerExampleContractTests({
    example: heroiQueEvoluiExample,
    source: SOURCE,
    stage: { width: 480, height: 300, bg: '#1d2f4d' },
  })

  it('espada na direção olhada + ondas de monstros que perseguem', () => {
    const types = collectTypes(behaviorStatements(heroiQueEvoluiExample.ir))
    for (const t of [
      'g2d:createShapeSprite',
      'g2d:defineShape',
      'g2d:spawnInGroup', // a espada é um golpe temporário no grupo
      'g2d:keyDown', // as setas alimentam a direção olhada (miraX/miraY)
      'g2d:flipSprite',
      'g2d:defineEnemyType', // horda do Kit (perseguidor)
      'g2d:spawnEnemy',
      'g2d:updateEnemyType',
      'g2d:onGroupOverlap', // golpe x monstro
      'g2d:changeHealth',
      'g2d:onSpriteGroupOverlap', // encostar no herói
      'g2d:hurtByEnemy',
      'g2d:isInvincible',
      'g2d:drawSpriteHealth',
      'g2d:pruneOld',
      'g2d:everySeconds',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    // Degrau básico: arena de uma tela, sem câmera nem tilemap.
    expect(types.has('g2d:cameraFollow')).toBe(false)
    expect(types.has('g2d:createTileMap')).toBe(false)
  })

  it('O DIFERENCIAL: EXP por inimigo, subir de nível (mais veloz + cura) e vencer no nível 5', () => {
    const raw = JSON.stringify(heroiQueEvoluiExample.ir.behavior.events)
    // subir de nível quando a EXP enche (exp >= nivel * 3)
    expect(raw).toContain(
      '"op":">=","left":{"type":"var","name":"exp"},"right":{"type":"binop","op":"*","left":{"type":"var","name":"nivel"},"right":{"type":"num","value":3}}',
    )
    // o nível aumenta a velocidade...
    expect(raw).toContain(
      '"name":"velocidade","value":{"type":"binop","op":"+","left":{"type":"var","name":"velocidade"},"right":{"type":"num","value":0.4}}',
    )
    // ...e CURA o herói (changeHealth positivo)
    expect(raw).toContain('"type":"g2d:changeHealth","spriteVar":"heroi"')
    // vencer é chegar ao nível 5 (no laço principal)
    const frame = JSON.stringify(heroiQueEvoluiExample.ir.behavior.loops)
    expect(frame).toContain(
      '"op":">=","left":{"type":"var","name":"nivel"},"right":{"type":"num","value":5}',
    )
  })
})
