import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import { behaviorStatements, type JSStatement, normalizeSZIR } from '#ir'
import 'blockly/blocks'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { parseJS } from '../../../parsers/js'
import { collectTypes, stripIds } from '../__gen_dinoCorredor'
import { PONG_SOURCE as SOURCE } from '../__gen_pong'
import { gameTwoDBlocks } from '../blocks'
import { pongExample } from '../examples'
import { gameTwoDManifest } from '../manifest'

/**
 * Drift do exemplo "Pong" — o degrau BÁSICO da trilogia Pong do Clear Code (refaz
 * o antigo card isolado "Pong simples", que era verboso em member-set cru). A IR
 * embutida em examples/clearcode.ts foi GERADA pelo parser real a partir do
 * SOURCE (que mora no __gen_pong.ts, importado aqui para que fonte e teste NUNCA
 * possam divergir). O preparo do palco (setupStage + setStageDescription) não
 * faz parte do SOURCE: quem o injeta é o wrapper `beginnerGameExample`.
 */

function parseExampleLifecycleSource(source: string): JSStatement[] {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(source),
    extensions: [{ extensionId: 'game-2d' }],
  })
  return JSON.parse(JSON.stringify(behaviorStatements(normalized))) as JSStatement[]
}

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameTwoDBlocks)
})

describe('Exemplo Pong — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d', () => {
    expect(gameTwoDManifest.examples).toContain(pongExample)
    expect(pongExample.ir.extensions).toEqual([{ extensionId: 'game-2d' }])
    expect(pongExample.name).toBe('Pong')
    expect(pongExample.experience).toBe('game')
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall), fora a dupla do wrapper', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE))
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)

    const embedded = stripIds(behaviorStatements(pongExample.ir)) as JSStatement[]
    expect(embedded[0]).toEqual({
      type: 'g2d:setupStage',
      width: 440,
      height: 300,
      bg: '#11172a',
    } as JSStatement)
    expect(embedded[1]).toEqual({
      type: 'g2d:setStageDescription',
      description: pongExample.description ?? '',
    } as JSStatement)
    expect(parsed).toEqual(embedded.slice(2))
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

  it('nenhum texto visível usa travessão', () => {
    expect(JSON.stringify(pongExample.ir)).not.toContain('—')
    expect(pongExample.name).not.toContain('—')
    expect(pongExample.description ?? '').not.toContain('—')
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(pongExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR preserva o jogo inteiro', () => {
    const state = buildWorkspaceStateFromIR(
      pongExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = behaviorStatements(buildIRFromWorkspace(ws))
      const embedded = behaviorStatements(pongExample.ir)
      expect(collectTypes(rebuilt).has('rawJS')).toBe(false)
      expect(rebuilt.length).toBe(embedded.length)
      expect(compileStatements(stripIds(rebuilt) as JSStatement[], 0)).toBe(
        compileStatements(stripIds(embedded) as JSStatement[], 0),
      )
    } finally {
      ws.dispose()
    }
  })
})
