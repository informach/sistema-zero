import { describe, expect, it } from 'bun:test'
import { behaviorStatements, type JSStatement } from '#ir'
import { collectTypes, DINO_CORREDOR_SOURCE as SOURCE } from '../__gen_dinoCorredor'
import { dinoCorredorExample } from '../examples'
import { registerExampleContractTests, setupGameTwoDExampleTests } from './exampleContractHarness'

/**
 * Drift do exemplo "Dino Corredor" — o degrau BÁSICO da família Clear Code. A
 * IR embutida em examples/clearcode/dinoCorredor.ts foi GERADA pelo parser real a partir do
 * SOURCE (que mora no __gen_dinoCorredor.ts, importado aqui para que fonte e
 * teste NUNCA possam divergir — duas cópias do fonte é como um drift passa
 * despercebido). O preparo do palco (setupStage + setStageDescription) não faz
 * parte do SOURCE: quem o injeta é o wrapper `beginnerGameExample`, e a dupla é
 * conferida à parte.
 */

setupGameTwoDExampleTests()

describe('Exemplo Dino Corredor — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d', () => {
    expect(gameTwoDExamples).toContain(dinoCorredorExample)
    expect(dinoCorredorExample.ir.extensions).toEqual([{ extensionId: 'game-2d' }])
    expect(dinoCorredorExample.name).toBe('Dino Corredor')
    expect(dinoCorredorExample.experience).toBe('game')
  })

  registerExampleContractTests({
    example: dinoCorredorExample,
    source: SOURCE,
    stage: { width: 480, height: 270, bg: '#bdf4ff' },
  })

  it('exercita a mecânica prometida do degrau básico', () => {
    const types = collectTypes(behaviorStatements(dinoCorredorExample.ir))
    for (const t of [
      'g2d:setHitboxScale', // ⭐ a colisão PERDOADORA (dial Clear Code) no dino
      'g2d:createDino', // o dino do kit (100% procedural)
      'g2d:controlDino', // pulo com espaço (gravidade + impulso, sem pulo duplo)
      'g2d:forest', // o cenário de floresta do kit
      'g2d:spawnObstacle', // cactos na borda direita
      'g2d:randomBetween', // posição/velocidade levemente sorteadas
      'g2d:pruneOffscreen', // limpar quem saiu da tela
      'g2d:everySeconds', // raízes periódicas (spawn, +1 ponto/s, acelerar)
      'g2d:drawScore', // o placar no HUD
      'g2d:playFx', // som no pulo e no game over
      'g2d:setScene', // telas: início → jogando → perdeu
      'g2d:sceneIs',
      'g2d:showScreen',
      'g2d:restart',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    // A colisão perdoadora usa ~80% (a vitrine do dial de dificuldade).
    const raw = JSON.stringify(behaviorStatements(dinoCorredorExample.ir))
    expect(raw).toContain('"type":"g2d:setHitboxScale","spriteVar":"dino"')
    expect(raw).toContain('"fx":"jump"')
    expect(raw).toContain('"fx":"gameover"')
  })

  it('as cadências são raízes periódicas próprias, com o "se a tela atual é jogando?" dentro', () => {
    const periodicRoots = dinoCorredorExample.ir.behavior.loops.filter(
      (statement): statement is Extract<JSStatement, { type: 'g2d:everySeconds' }> =>
        statement.type === 'g2d:everySeconds',
    )
    expect(periodicRoots.length).toBe(3)
    for (const root of periodicRoots) {
      expect(root.body[0]).toMatchObject({
        type: 'if',
        cond: { type: 'g2d:sceneIs', name: 'jogando' },
      })
    }
    // Nenhuma cadência escondida dentro do "a cada quadro".
    const frameLoop = dinoCorredorExample.ir.behavior.loops.find(
      (statement) => statement.type === 'g2d:updateEachFrame',
    )
    expect(frameLoop).toBeDefined()
    expect(collectTypes(frameLoop).has('g2d:everySeconds')).toBe(false)
  })
})

import { gameTwoDExamples } from '../exampleCatalog'
