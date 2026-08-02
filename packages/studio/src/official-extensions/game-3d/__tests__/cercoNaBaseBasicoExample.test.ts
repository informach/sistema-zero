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
import { CERCO_NA_BASE_SOURCE as SOURCE } from '../__gen_cercoNaBase'
import { gameThreeDBlocks } from '../blocks'
import { cercoNaBaseBasicoExample } from '../examples'
import { parseExampleLifecycleSource } from './exampleLifecycleSource'

/**
 * Drift do exemplo "Cerco na Base" — o FPS do SimonDev de NÍVEL BÁSICO montado só
 * com genéricos do Jogo 3D: câmera em primeira pessoa (fpsCamera + fpsControls)
 * numa ARENA aberta, aliens que nascem em ONDAS (everySeconds) e avançam
 * (moveTowards), tiro por MIRA (aimAhead) com CARGA (segurar o espaço) e MUNIÇÃO
 * limitada que recarrega. A IR embutida em examples.ts foi GERADA pelo parser real
 * a partir do SOURCE (que mora no __gen_cercoNaBase.ts, importado aqui para que
 * fonte e teste NUNCA divirjam). ⭐ Distinto do "Labirinto dos Robôs" (também 1ª
 * pessoa): lá é um labirinto com tiro à vontade; aqui é arena com munição + carga.
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameThreeDBlocks)
})

describe('Exemplo Cerco na Base — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-3d', () => {
    expect(gameThreeDExamples).toContain(cercoNaBaseBasicoExample)
    expect(cercoNaBaseBasicoExample.experience).toBe('game')
    expect(cercoNaBaseBasicoExample.ir.extensions).toEqual([{ extensionId: 'game-3d' }])
  })

  it('a IR embutida passa no schema (ciclo de vida + escopos)', () => {
    expect(SZIRV2Schema.safeParse(cercoNaBaseBasicoExample.ir).success).toBe(true)
  })

  it('nenhum texto visível usa travessão', () => {
    expect(cercoNaBaseBasicoExample.name).toBe('Cerco na Base')
    expect(cercoNaBaseBasicoExample.description ?? '').not.toContain('—')
    expect((cercoNaBaseBasicoExample.description ?? '').length).toBeLessThanOrEqual(200)
    expect(JSON.stringify(cercoNaBaseBasicoExample.ir.html)).not.toContain('—')
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE)) as JSStatement[]
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(types.has('memberCallExpr')).toBe(false)
    expect(parsed).toEqual(
      stripIds(behaviorStatements(cercoNaBaseBasicoExample.ir)) as JSStatement[],
    )
  })

  it('exercita as mecânicas prometidas (1ª pessoa, mira, ondas, munição, carga)', () => {
    const statements = behaviorStatements(cercoNaBaseBasicoExample.ir)
    const types = collectTypes(statements)
    for (const t of [
      'g3d:fpsCamera', // câmera em primeira pessoa
      'g3d:fpsControls', // andar/olhar em 1ª pessoa
      'g3d:aimAhead', // tiro por mira (hitscan)
      'g3d:everySeconds', // os aliens vêm em ONDAS
      'g3d:createSwarm', // o enxame de aliens
      'g3d:spawnInSwarm',
      'g3d:forEachInSwarm',
      'g3d:removeFromSwarm',
      'g3d:moveTowards', // os aliens avançam
      'g3d:collides', // o alien encosta e machuca
      'g3d:keyDown', // segurar o espaço carrega o tiro
      'g3d:isNear', // o estouro carregado limpa os que estão perto
      'g3d:setSolid', // chão e paredes da arena
      'g3d:animate',
      'event', // o botão Jogar de novo
      'setProperty', // placar/vida/munição no HUD
    ]) {
      expect(types.has(t)).toBe(true)
    }
    // Munição, carga, vida e placar vivem em variáveis (o Labirinto não tem munição/carga).
    const raw = JSON.stringify(statements)
    expect(raw).toContain('"cacas"')
    expect(raw).toContain('"municao"')
    expect(raw).toContain('"carga"')
    expect(raw).toContain('"vida"')
    expect(raw).toContain('"pontos"')
  })

  it('⭐ é montado com GENÉRICOS (um enxame + FPS), não com um kit pronto', () => {
    const types = collectTypes(behaviorStatements(cercoNaBaseBasicoExample.ir))
    expect(types.has('g3d:createFullscreenScene')).toBe(true)
    expect(types.has('g3d:createRaceScene')).toBe(false)
    expect(types.has('g3d:createCrossingScene')).toBe(false)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(cercoNaBaseBasicoExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      cercoNaBaseBasicoExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(cercoNaBaseBasicoExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})

import { gameThreeDExamples } from '../exampleCatalog'
