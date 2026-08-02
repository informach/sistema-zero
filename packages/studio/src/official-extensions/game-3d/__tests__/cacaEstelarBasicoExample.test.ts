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
import { CACA_ESTELAR_SOURCE as SOURCE } from '../__gen_cacaEstelar'
import { gameThreeDBlocks } from '../blocks'
import { cacaEstelarBasicoExample } from '../examples'
import { parseExampleLifecycleSource } from './exampleLifecycleSource'

/**
 * Drift do exemplo "Caça Estelar" — a batalha espacial do SimonDev de NÍVEL
 * BÁSICO montada só com genéricos do Jogo 3D: uma nave que VOA LIVRE pela arena
 * (setas/WASD, câmera de cima) e DISPARA no inimigo mais perto (barra de espaço).
 * As naves inimigas nascem na borda, vagam (giram) e, ao te avistar, PERSEGUEM
 * (moveTowards). Encostar tira um escudo; abata 10 antes que os 3 escudos acabem.
 * A IR embutida em examples.ts foi GERADA pelo parser real a partir do SOURCE
 * (que mora no __gen_cacaEstelar.ts, importado aqui para que fonte e teste NUNCA
 * divirjam).
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameThreeDBlocks)
})

describe('Exemplo Caça Estelar — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-3d', () => {
    expect(gameThreeDExamples).toContain(cacaEstelarBasicoExample)
    expect(cacaEstelarBasicoExample.experience).toBe('game')
    expect(cacaEstelarBasicoExample.ir.extensions).toEqual([{ extensionId: 'game-3d' }])
  })

  it('a IR embutida passa no schema (ciclo de vida + escopos)', () => {
    expect(SZIRV2Schema.safeParse(cacaEstelarBasicoExample.ir).success).toBe(true)
  })

  it('nenhum texto visível usa travessão', () => {
    expect(cacaEstelarBasicoExample.name).toBe('Caça Estelar')
    expect(cacaEstelarBasicoExample.description ?? '').not.toContain('—')
    expect((cacaEstelarBasicoExample.description ?? '').length).toBeLessThanOrEqual(200)
    expect(JSON.stringify(cacaEstelarBasicoExample.ir.html)).not.toContain('—')
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE)) as JSStatement[]
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(types.has('memberCallExpr')).toBe(false)
    expect(parsed).toEqual(
      stripIds(behaviorStatements(cacaEstelarBasicoExample.ir)) as JSStatement[],
    )
  })

  it('exercita as mecânicas prometidas (voar livre, disparar de perto, perseguir)', () => {
    const statements = behaviorStatements(cacaEstelarBasicoExample.ir)
    const types = collectTypes(statements)
    for (const t of [
      'g3d:createSwarm', // o enxame de naves inimigas
      'g3d:spawnInSwarm', // nascem na borda
      'g3d:countSwarm', // teto do enxame
      'g3d:everySeconds', // cadência de spawn
      'randomFloat', // o ângulo sorteado da posição de nascimento
      'g3d:keyDown', // setas/WASD + o disparo (barra de espaço)
      'g3d:setPosition', // a nave voa livre no plano (com clamp na tela)
      'g3d:isNear', // alcance do tiro + contato + raio de perseguição
      'g3d:moveTowards', // as naves inimigas perseguem
      'g3d:forEachInSwarm', // varre as inimigas por quadro
      'g3d:removeFromSwarm', // abatida pelo tiro ou some ao encostar
      'g3d:spin', // as inimigas longe vagam (giram)
      'g3d:getPos', // posição da nave
      'g3d:animate', // o laço de quadro 3D
      'event', // o botão Jogar de novo
      'setProperty', // placar e escudos no HUD
      'classOp', // mostra a tela de fim
    ]) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(statements)
    expect(raw).toContain('"cacas"')
    expect(raw).toContain('"pontos"')
    expect(raw).toContain('"escudo"')
    expect(raw).toContain('"rodando"')
  })

  it('⭐ é montado com GENÉRICOS (um enxame), não com um kit pronto', () => {
    const types = collectTypes(behaviorStatements(cacaEstelarBasicoExample.ir))
    expect(types.has('g3d:createFullscreenScene')).toBe(true)
    expect(types.has('g3d:createRaceScene')).toBe(false)
    expect(types.has('g3d:createCrossingScene')).toBe(false)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(cacaEstelarBasicoExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      cacaEstelarBasicoExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(cacaEstelarBasicoExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})

import { gameThreeDExamples } from '../exampleCatalog'
