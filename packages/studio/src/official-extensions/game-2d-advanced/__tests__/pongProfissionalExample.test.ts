import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import { behaviorStatements, type JSStatement } from '#ir'
import { collectTypes, parseExampleLifecycleSource, stripIds } from './exampleContractHarness'
import 'blockly/blocks'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { parseJS } from '../../../parsers/js'
import { PONG_PROFISSIONAL_SOURCE as SOURCE } from '../__gen_pongProfissional'
import { gameKitBlocks } from '../blocks'
import { pongProfissionalExample } from '../examples'

/**
 * Drift do exemplo "Pong Profissional" — o nível 2 da trilogia Pong sobre o motor
 * avançado. A IR embutida em examples/ foi GERADA pelo parser real a partir do
 * SOURCE (que mora no __gen_pongProfissional.ts, importado aqui para que fonte e
 * teste NUNCA possam divergir).
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameKitBlocks)
})

describe('Exemplo Pong Profissional — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d-advanced', () => {
    expect(gameKitExamples).toContain(pongProfissionalExample)
    expect(pongProfissionalExample.ir.extensions).toEqual([{ extensionId: 'game-2d-advanced' }])
    expect(pongProfissionalExample.name).toBe('Pong Profissional')
    expect(pongProfissionalExample.experience).toBe('game')
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE, true))
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(parsed).toEqual(
      stripIds(behaviorStatements(pongProfissionalExample.ir)) as JSStatement[],
    )
  })

  it('exercita a mecânica prometida do Pong Profissional', () => {
    const statements = behaviorStatements(pongProfissionalExample.ir)
    const types = collectTypes(statements)
    for (const t of [
      'gk:setup',
      'gk:setScreenText', // telas menu/vitória/derrota
      'gk:createCharacter', // raquetes + bola como personagens
      'gk:placeCharacter', // posicionar e mover a raquete
      'gk:keyDown', // ⭐ tecla SEGURADA (raquete contínua, não edge)
      'gk:keepOnScreen', // raquetes presas ao campo
      'gk:setVelocity', // a bola anda pela física do motor
      'gk:moveByVelocity',
      'gk:charactersTouch', // rebate ao encostar na raquete
      'gk:charX', // ponto e reset pela posição da bola
      'gk:charY', // IA do PC + ângulo por contato
      'gk:cameraShake', // tremor de câmera no ponto
      'gk:playEffect',
      'gk:setState', // vitória/derrota
      'gk:stateIs',
      'gk:onDrawHud', // o HUD dos placares + trocas
    ]) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(statements)
    expect(raw).toContain('"pontos"')
    expect(raw).toContain('"pontosComputador"')
    expect(raw).toContain('"trocas"') // o contador de rally (diferencial)
    for (const screen of ['"menu"', '"vitoria"', '"fim"']) {
      expect(raw).toContain(screen)
    }
  })

  it('nenhum texto visível usa travessão', () => {
    expect(JSON.stringify(pongProfissionalExample.ir)).not.toContain('—')
    expect(pongProfissionalExample.name).not.toContain('—')
    expect(pongProfissionalExample.description ?? '').not.toContain('—')
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(pongProfissionalExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR preserva o jogo inteiro', () => {
    const state = buildWorkspaceStateFromIR(
      pongProfissionalExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = behaviorStatements(buildIRFromWorkspace(ws))
      const embedded = behaviorStatements(pongProfissionalExample.ir)
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

import { gameKitExamples } from '../exampleCatalog'
