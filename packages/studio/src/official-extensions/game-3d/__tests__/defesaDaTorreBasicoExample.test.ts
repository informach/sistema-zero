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
import { TORRES_DEFENSORAS_SOURCE as SOURCE } from '../__gen_torresDefensoras'
import { gameThreeDBlocks } from '../blocks'
import { defesaDaTorreBasicoExample } from '../examples'
import { parseExampleLifecycleSource } from './exampleLifecycleSource'

/**
 * Drift do exemplo "Defesa da Torre" — o Tower Defense de NÍVEL BÁSICO montado só
 * com genéricos do Jogo 3D (não há kit TD): uma torre no centro zapeia SOZINHA os
 * invasores (enxame) que nascem na beirada e caminham ao meio. A IR embutida em
 * examples.ts foi GERADA pelo parser real a partir do SOURCE (que mora no
 * __gen_torresDefensoras.ts, importado aqui para que fonte e teste NUNCA divirjam).
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameThreeDBlocks)
})

describe('Exemplo Defesa da Torre — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-3d', () => {
    expect(gameThreeDExamples).toContain(defesaDaTorreBasicoExample)
    expect(defesaDaTorreBasicoExample.experience).toBe('game')
    expect(defesaDaTorreBasicoExample.ir.extensions).toEqual([{ extensionId: 'game-3d' }])
  })

  it('a IR embutida passa no schema (ciclo de vida + escopos)', () => {
    expect(SZIRV2Schema.safeParse(defesaDaTorreBasicoExample.ir).success).toBe(true)
  })

  it('nenhum texto visível usa travessão', () => {
    expect(defesaDaTorreBasicoExample.name).toBe('Defesa da Torre')
    expect(defesaDaTorreBasicoExample.description ?? '').not.toContain('—')
    expect((defesaDaTorreBasicoExample.description ?? '').length).toBeLessThanOrEqual(200)
    expect(JSON.stringify(defesaDaTorreBasicoExample.ir.html)).not.toContain('—')
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE)) as JSStatement[]
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(types.has('memberCallExpr')).toBe(false)
    expect(parsed).toEqual(
      stripIds(behaviorStatements(defesaDaTorreBasicoExample.ir)) as JSStatement[],
    )
  })

  it('exercita as mecânicas prometidas do Tower Defense', () => {
    const statements = behaviorStatements(defesaDaTorreBasicoExample.ir)
    const types = collectTypes(statements)
    for (const t of [
      'g3d:createSwarm', // o enxame de invasores
      'g3d:spawnInSwarm', // invasores nascem na beirada
      'g3d:everySeconds', // a cadência de spawn (1.1s)
      'randomFloat', // o ângulo sorteado da borda
      'g3d:moveTowards', // caminham até o centro
      'g3d:forEachInSwarm', // varre os invasores por quadro
      'g3d:isNear', // alcance da torre + colisão com o cristal
      'g3d:removeFromSwarm', // o zap tira o invasor de cena
      'g3d:spin', // a torre e o cristal giram
      'g3d:dt', // a recarga em tempo real do quadro
      'g3d:animate', // o laço de quadro 3D
      'event', // o botão Recomeçar
      'setProperty', // o placar no HUD
      'classOp', // mostra/esconde a tela de fim
    ]) {
      expect(types.has(t)).toBe(true)
    }
    // O placar e a recarga vivem em variáveis de estado.
    const raw = JSON.stringify(statements)
    expect(raw).toContain('"pontos"')
    expect(raw).toContain('"recarga"')
    expect(raw).toContain('"rodando"')
  })

  it('⭐ é montado com GENÉRICOS (enxame), não com um kit pronto', () => {
    // O básico do TD não tem kit próprio: usa createFullscreenScene + enxame +
    // proximidade, NÃO os criadores de cena dos kits Corrida/Travessia.
    const types = collectTypes(behaviorStatements(defesaDaTorreBasicoExample.ir))
    expect(types.has('g3d:createFullscreenScene')).toBe(true)
    expect(types.has('g3d:createRaceScene')).toBe(false)
    expect(types.has('g3d:createCrossingScene')).toBe(false)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(defesaDaTorreBasicoExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      defesaDaTorreBasicoExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(defesaDaTorreBasicoExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})

import { gameThreeDExamples } from '../exampleCatalog'
