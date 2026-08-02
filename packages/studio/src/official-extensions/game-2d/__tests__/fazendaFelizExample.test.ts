import { describe, expect, it } from 'bun:test'
import { behaviorStatements } from '#ir'
import { collectTypes } from '../__gen_dinoCorredor'
import { FAZENDA_FELIZ_SOURCE as SOURCE } from '../__gen_fazendaFeliz'
import { fazendaFelizExample } from '../examples'
import { registerExampleContractTests, setupGameTwoDExampleTests } from './exampleContractHarness'

/**
 * Drift do exemplo "Fazenda Feliz" — o degrau BÁSICO da família farming/Stardew
 * do Clear Code. A IR embutida foi GERADA pelo parser real a partir do SOURCE
 * (que mora no __gen_fazendaFeliz.ts, importado aqui para que fonte e teste
 * NUNCA possam divergir). O preparo do palco é injetado pelo `beginnerGameExample`.
 */

setupGameTwoDExampleTests()

describe('Exemplo Fazenda Feliz — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d', () => {
    expect(gameTwoDExamples).toContain(fazendaFelizExample)
    expect(fazendaFelizExample.ir.extensions).toEqual([{ extensionId: 'game-2d' }])
    expect(fazendaFelizExample.name).toBe('Fazenda Feliz')
    expect(fazendaFelizExample.experience).toBe('game')
    expect((fazendaFelizExample.description ?? '').length).toBeLessThanOrEqual(200)
  })

  registerExampleContractTests({
    example: fazendaFelizExample,
    source: SOURCE,
    stage: { width: 480, height: 320, bg: '#4a6b3a' },
  })

  it('modela os canteiros numa LISTA e desenha por estágio (sem tilemap)', () => {
    const types = collectTypes(behaviorStatements(fazendaFelizExample.ir))
    for (const t of [
      'g2d:createShapeSprite', // o fazendeiro desenhado por código
      'g2d:defineShape',
      'g2d:topDown', // anda nas 4 direções
      'g2d:clampToScreen', // arena de uma tela
      'g2d:paintRect', // canteiros desenhados por código...
      'g2d:paintCircle', // ...com os brotos por estágio
      'g2d:everySeconds', // os brotos crescem no relógio do jogo
      'g2d:drawScore', // placar de moedas
      'g2d:setScene',
      'g2d:sceneIs',
      'g2d:showScreen',
      'g2d:restart',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    // o MODELO dos canteiros é uma LISTA do núcleo (arrays + índice), não tilemap
    for (const t of ['array', 'arrayPush', 'index', 'indexSet', 'forRange']) {
      expect(types.has(t)).toBe(true)
    }
    expect(types.has('g2d:createTileMap')).toBe(false)
    expect(types.has('g2d:cameraFollow')).toBe(false)
  })

  it('espaço PLANTA (0 vira 1) e COLHE o maduro (3 vira moedas)', () => {
    const raw = JSON.stringify(fazendaFelizExample.ir.behavior.events)
    // plantar: canteiro[i] == 0 vira 1
    expect(raw).toContain('"index":{"type":"var","name":"i"},"value":{"type":"num","value":1}')
    // colher: soma 3 moedas
    expect(raw).toContain(
      '"name":"moedas","value":{"type":"binop","op":"+","left":{"type":"var","name":"moedas"},"right":{"type":"num","value":3}}',
    )
    // crescer: a cadência de 3s avança os brotos
    const loops = fazendaFelizExample.ir.behavior.loops
    const every = loops.filter((s) => s.type === 'g2d:everySeconds')
    expect(every).toHaveLength(1)
    expect(JSON.stringify(every)).toContain('"type":"g2d:sceneIs","name":"jogando"')
  })
})

import { gameTwoDExamples } from '../exampleCatalog'
