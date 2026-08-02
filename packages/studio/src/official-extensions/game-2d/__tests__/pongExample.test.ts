import { describe, expect, it } from 'bun:test'
import { behaviorStatements } from '#ir'
import { collectTypes } from '../__gen_dinoCorredor'
import { PONG_SOURCE as SOURCE } from '../__gen_pong'
import { pongExample } from '../examples'
import { gameTwoDManifest } from '../manifest'
import { registerExampleContractTests, setupGameTwoDExampleTests } from './exampleContractHarness'

/**
 * Drift do exemplo "Pong" — o degrau BÁSICO da trilogia Pong do Clear Code (refaz
 * o antigo card isolado "Pong simples", que era verboso em member-set cru). A IR
 * embutida em examples/clearcode/pong.ts foi GERADA pelo parser real a partir do
 * SOURCE (que mora no __gen_pong.ts, importado aqui para que fonte e teste NUNCA
 * possam divergir). O preparo do palco (setupStage + setStageDescription) não
 * faz parte do SOURCE: quem o injeta é o wrapper `beginnerGameExample`.
 */

setupGameTwoDExampleTests()

describe('Exemplo Pong — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d', () => {
    expect(gameTwoDManifest.examples).toContain(pongExample)
    expect(pongExample.ir.extensions).toEqual([{ extensionId: 'game-2d' }])
    expect(pongExample.name).toBe('Pong')
    expect(pongExample.experience).toBe('game')
  })

  registerExampleContractTests({
    example: pongExample,
    source: SOURCE,
    stage: { width: 440, height: 300, bg: '#11172a' },
  })

  it('exercita a mecânica prometida do Pong', () => {
    const statements = behaviorStatements(pongExample.ir)
    const types = collectTypes(statements)
    for (const t of [
      'g2d:createSprite', // raquetes + bola como retângulos
      'g2d:setVelocity', // a bola ganha velocidade (fusão de vx/vy)
      'g2d:keyDown', // raquete do jogador pelas setas
      'g2d:clampToScreen', // as raquetes não saem do campo
      'g2d:applyVelocity', // a bola anda pela própria velocidade
      'g2d:touches', // rebate ao encostar na raquete
      'g2d:setPosition', // reset da bola ao centro após o ponto (fusão x/y)
      'g2d:randomBetween', // o saque com ângulo levemente sorteado
      'g2d:drawSprite',
      'g2d:drawScore', // os dois placares
      'g2d:playFx',
      'g2d:setScene', // telas início → jogando → vitória/derrota
      'g2d:sceneIs',
      'g2d:showScreen',
      'g2d:restart',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(statements)
    expect(raw).toContain('"pontos"')
    expect(raw).toContain('"pontosComputador"')
  })

  it('o computador segue a bola sozinho (uma IA simples de raquete)', () => {
    // Sem tecla do jogador, a raquete do PC se move comparando bola.y com a
    // própria posição: é a "IA" do Pong. Prova que há um oponente autônomo.
    const raw = JSON.stringify(behaviorStatements(pongExample.ir))
    expect(raw).toContain('"computador"')
    // A bola quica na parede invertendo vy (abs para cima/baixo).
    expect(raw).toContain('"fn":"abs"')
  })
})
