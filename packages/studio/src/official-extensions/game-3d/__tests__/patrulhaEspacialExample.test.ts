import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import { behaviorStatements, type JSStatement, SZIRV2Schema } from '#ir'
import 'blockly/blocks'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { parseJS } from '../../../parsers/js'
import { collectTypes, stripIds } from '../../game-3d-advanced/exampleSourceUtils'
import { PATRULHA_ESPACIAL_SOURCE as SOURCE } from '../__gen_patrulhaEspacial'
import { gameThreeDBlocks } from '../blocks'
import { patrulhaEspacialExample } from '../examples'
import { parseExampleLifecycleSource } from './exampleLifecycleSource'

/**
 * Drift do exemplo "Patrulha Espacial" — a recriação do Space Shooter 3D do
 * curso raylib (nível 1 da família Patrulha Espacial): nave em modelo composto
 * vista de trás, andando SÓ no eixo X com inclinação ao virar e balanço
 * senoidal, laser com cooldown por quadros e meteoros-esfera de dois tamanhos
 * vindo à câmera girando. A IR embutida em examples.ts foi GERADA pelo parser
 * real a partir do SOURCE (que mora no __gen_patrulhaEspacial.ts, importado
 * aqui para que fonte e teste NUNCA possam divergir — duas cópias do fonte é
 * como um drift passa despercebido).
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameThreeDBlocks)
})

describe('Exemplo Patrulha Espacial — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-3d', () => {
    expect(gameThreeDExamples).toContain(patrulhaEspacialExample)
    expect(patrulhaEspacialExample.experience).toBe('game')
    expect(patrulhaEspacialExample.ir.extensions).toEqual([{ extensionId: 'game-3d' }])
  })

  it('a IR embutida passa no schema (ciclo de vida + escopos)', () => {
    expect(SZIRV2Schema.safeParse(patrulhaEspacialExample.ir).success).toBe(true)
  })

  it('nenhum texto visível usa travessão', () => {
    expect(patrulhaEspacialExample.name).toBe('Patrulha Espacial')
    expect(patrulhaEspacialExample.description ?? '').not.toContain('—')
    expect((patrulhaEspacialExample.description ?? '').length).toBeLessThanOrEqual(200)
    expect(JSON.stringify(patrulhaEspacialExample.ir.html)).not.toContain('—')
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE)) as JSStatement[]
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(types.has('memberCallExpr')).toBe(false)
    expect(parsed).toEqual(
      stripIds(behaviorStatements(patrulhaEspacialExample.ir)) as JSStatement[],
    )
  })

  it('exercita as mecânicas prometidas do shooter espacial', () => {
    const statements = behaviorStatements(patrulhaEspacialExample.ir)
    const types = collectTypes(statements)
    for (const t of [
      'g3d:createModel', // a nave é um modelo COMPOSTO (corpo + asas + bico)
      'g3d:addToModel',
      'g3d:setRotation', // ⭐ a inclinação ao virar (roll em Z, decaindo sozinha)
      'g3d:keyDown', // andar contínuo com as setas + atirar com espaço
      'g3d:dt', // o movimento no X é por dt (mesma velocidade em 60/120 Hz)
      'mathUnary', // ⭐ o balanço senoidal (Math.sin sobre o relógio somado)
      'g3d:spawnInSwarm', // lasers e meteoros nascem em enxames
      'g3d:forEachInSwarm',
      'g3d:moveBy', // meteoros vêm à câmera; lasers vão embora no -Z
      'g3d:spin', // ⭐ os meteoros giram enquanto voam (como no original)
      'g3d:collides', // laser×meteoro = a caixa×esfera do original
      'g3d:isNear', // ⭐ nave×meteoro = a colisão de esferas do original
      'g3d:removeFromSwarm', // acertou = os dois somem
      'g3d:pruneSwarm', // higiene de quem passou da câmera
      'g3d:everySeconds', // cadência do spawn + relógio da dificuldade
      'randomFloat', // o sorteio da pista e do tamanho do meteoro
      'g3d:playNote', // o pew do laser
      'g3d:playEffect', // acerto e explosão final
      'g3d:setSky', // o espaço escuro
      'g3d:setFog',
      'g3d:setMaterial', // bico e laser brilham (glow)
      'setProperty', // HUD DOM de tempo e pontos
      'classOp', // a tela de fim aparece/some por classe
      'event', // o botão de recomeçar
    ]) {
      expect(types.has(t)).toBe(true)
    }
    // O clamp do X, a inclinação, o cooldown do tiro e o placar duplo vivem em
    // variáveis nomeadas na IR.
    const raw = JSON.stringify(statements)
    for (const nome of [
      '"naveX"',
      '"inclinacao"',
      '"relogio"',
      '"recarga"',
      '"velocidade"',
      '"tempo"',
      '"pontos"',
      '"rodando"',
    ]) {
      expect(raw).toContain(nome)
    }
  })

  it('⭐ é DIFERENTE do "Desvie dos blocos": eixo X puro, sem chão e sem kit', () => {
    // O Desvie anda livre no plano (controlWithKeys), pula com gravidade sobre
    // um chão e usa o kit (spawnEnemy). Aqui NÃO: a nave desliza só no X por
    // variável clampada, o espaço é aberto (sem chão, sem gravidade) e os
    // meteoros são enxames de moldes próprios.
    const types = collectTypes(behaviorStatements(patrulhaEspacialExample.ir))
    expect(types.has('g3d:controlWithKeys')).toBe(false)
    expect(types.has('g3d:spawnEnemy')).toBe(false)
    expect(types.has('g3d:applyGravity')).toBe(false)
    expect(types.has('g3d:jump')).toBe(false)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(patrulhaEspacialExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      patrulhaEspacialExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(patrulhaEspacialExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})

import { gameThreeDExamples } from '../exampleCatalog'
