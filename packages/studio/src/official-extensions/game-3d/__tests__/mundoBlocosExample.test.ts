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
import { MUNDO_BLOCOS_SOURCE as SOURCE } from '../__gen_mundoBlocos'
import { gameThreeDBlocks } from '../blocks'
import { mundoBlocosExample } from '../examples'
import { parseExampleLifecycleSource } from './exampleLifecycleSource'

/**
 * Drift do exemplo "Mundo de Blocos" — o construtor estilo Minecraft (nível 1
 * da família Mundo de Blocos): câmera isométrica com o mouse LIVRE, cursor em
 * grade, geração inicial com forRange e quebra por pickAtMouse + clique. A IR
 * embutida em examples.ts foi GERADA pelo parser real a partir do SOURCE (que
 * mora no __gen_mundoBlocos.ts, importado aqui para que fonte e teste NUNCA
 * possam divergir — duas cópias do fonte é como um drift passa despercebido).
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameThreeDBlocks)
})

describe('Exemplo Mundo de Blocos — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-3d', () => {
    expect(gameThreeDExamples).toContain(mundoBlocosExample)
    expect(mundoBlocosExample.experience).toBe('game')
    expect(mundoBlocosExample.ir.extensions).toEqual([{ extensionId: 'game-3d' }])
  })

  it('a IR embutida passa no schema (ciclo de vida + escopos)', () => {
    expect(SZIRV2Schema.safeParse(mundoBlocosExample.ir).success).toBe(true)
  })

  it('nenhum texto visível usa travessão', () => {
    expect(mundoBlocosExample.name).toBe('Mundo de Blocos')
    expect(mundoBlocosExample.description ?? '').not.toContain('—')
    expect((mundoBlocosExample.description ?? '').length).toBeLessThanOrEqual(200)
    expect(JSON.stringify(mundoBlocosExample.ir.html)).not.toContain('—')
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE)) as JSStatement[]
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(types.has('memberCallExpr')).toBe(false)
    expect(parsed).toEqual(stripIds(behaviorStatements(mundoBlocosExample.ir)) as JSStatement[])
  })

  it('exercita as mecânicas prometidas do construtor', () => {
    const statements = behaviorStatements(mundoBlocosExample.ir)
    const types = collectTypes(statements)
    for (const t of [
      'g3d:isometricCamera', // a câmera isométrica (mouse livre, sem lock)
      'g3d:gridPosition', // o cursor anda pela GRADE (linha/coluna por setas)
      'forRange', // ⭐ geração inicial do núcleo (chão + muralha baixa)
      'g3d:spawnInSwarm', // colocar bloco = cópia do molde do tipo escolhido
      'g3d:pickAtMouse', // ⭐ quebrar bloco = objeto sob o mouse + clique
      'g3d:removeFromSwarm', // o bloco apontado some do enxame
      'g3d:countSwarm', // só toca o som de quebra se algo saiu de verdade
      'g3d:setOpacity', // o cursor é translúcido
      'g3d:setPosition', // o cursor fica no TOPO da coluna (não rouba o clique do térreo)
      'g3d:getPos', // empilhar: acha a altura livre da célula ocupada
      'g3d:spin', // o cursor gira devagar (a cena fica viva)
      'g3d:playEffect', // colocar/quebrar/vitória soam
      'event', // setas, 1/2/3, espaço e clique
      'eventProp', // a tecla do evento (event.key)
      'funcDecl', // colocarBloco() concentra a regra de empilhar
      'callFunction', // chamada no espaço
      'setProperty', // HUD do tipo atual e da torre por textContent
      'classOp', // a festa da torre de 5 aparece por classe
      'setTimeout', // e some sozinha depois de um tempinho
    ]) {
      expect(types.has(t)).toBe(true)
    }
    // Tipo selecionado por teclas 1/2/3 e objetivo leve da torre de 5 blocos.
    const raw = JSON.stringify(statements)
    expect(raw).toContain('"tipo"')
    expect(raw).toContain('"recorde"')
    expect(raw).toContain('"alturaAlvo"')
    // Enter saiu do jogo: espaço é o ÚNICO botão de colocar (o gesto de "start"
    // do QA apertava Enter e colocava um bloco sem querer).
    expect(raw).not.toContain('"Enter"')
  })

  it('⭐ veredito do spike: sem FPS o mouse é livre e o pick é permitido', () => {
    // Este é o par do Labirinto dos Robôs: aqui NÃO há câmera de primeira
    // pessoa nem pointer lock, então pickAtMouse funciona e é o caminho certo.
    const types = collectTypes(behaviorStatements(mundoBlocosExample.ir))
    expect(types.has('g3d:fpsCamera')).toBe(false)
    expect(types.has('g3d:fpsControls')).toBe(false)
    expect(types.has('g3d:aimAhead')).toBe(false)
    expect(types.has('g3d:pickAtMouse')).toBe(true)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(mundoBlocosExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      mundoBlocosExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(mundoBlocosExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})

import { gameThreeDExamples } from '../exampleCatalog'
