import { describe, expect, it } from 'bun:test'
import { behaviorStatements } from '#ir'
import { collectTypes } from '../__gen_dinoCorredor'
import { SAFARI_DE_MONSTROS_SOURCE as SOURCE } from '../__gen_safariDeMonstros'
import { safariDeMonstrosExample } from '../examples'
import { registerExampleContractTests, setupGameTwoDExampleTests } from './exampleContractHarness'

/**
 * Drift do exemplo "Safári de Monstros" — o degrau BÁSICO da trilogia de
 * overworld de captura do Clear Code (Monster Hunter / Python-Monsters). A IR
 * embutida em clearcode.ts foi GERADA pelo parser real a partir do SOURCE (que
 * mora no __gen_safariDeMonstros.ts, importado aqui para que fonte e teste nunca
 * divirjam). O preparo do palco é injetado pelo wrapper beginnerGameExample.
 */

setupGameTwoDExampleTests()

describe('Exemplo Safári de Monstros — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d', () => {
    expect(gameTwoDExamples).toContain(safariDeMonstrosExample)
    expect(safariDeMonstrosExample.ir.extensions).toEqual([{ extensionId: 'game-2d' }])
    expect(safariDeMonstrosExample.name).toBe('Safári de Monstros')
    expect(safariDeMonstrosExample.experience).toBe('game')
  })

  registerExampleContractTests({
    example: safariDeMonstrosExample,
    source: SOURCE,
    stage: { width: 480, height: 270, bg: '#3a7d44' },
  })

  it('exercita a mecânica prometida do overworld de captura', () => {
    const statements = behaviorStatements(safariDeMonstrosExample.ir)
    const types = collectTypes(statements)
    for (const t of [
      'g2d:defineShape', // herói, parceiro (filhote/adulto), selvagem e sábio por código
      'g2d:createShapeSprite',
      'g2d:createGroup', // muros e matos
      'g2d:spawnInGroup',
      'g2d:topDown', // ⭐ andar nas 4 direções pelo mundo
      'g2d:collideGroup', // bater nos muros
      'g2d:onSpriteGroupOverlap', // ⭐ pisar no mato dispara o encontro selvagem
      'g2d:randomChance', // chance do monstro aparecer e da captura
      'g2d:setPosition', // o selvagem aparece colado no herói; o parceiro segue
      'g2d:touches', // capturar exige estar encostado no selvagem; dica do sábio
      'g2d:spriteX',
      'g2d:spriteY',
      'g2d:setHitboxScale',
      'g2d:drawScore', // caderno de monstros + mensagem
      'g2d:setScene',
      'g2d:sceneIs',
      'g2d:showScreen',
      'g2d:restart',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(statements)
    // O laço do diferencial: capturar e evoluir (não há barra de vida de batalha).
    expect(raw).toContain('"capturados"')
    expect(raw).toContain('"evoluido"')
    expect(raw).toContain('"selvagemAtivo"')
    // Três telas: início, mundo e vitória.
    for (const screen of ['"inicio"', '"mundo"', '"vitoria"']) {
      expect(raw).toContain(screen)
    }
  })
})

import { gameTwoDExamples } from '../exampleCatalog'
