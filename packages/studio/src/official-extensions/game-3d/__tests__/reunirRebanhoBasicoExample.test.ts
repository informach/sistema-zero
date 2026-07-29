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
import { REUNIR_REBANHO_SOURCE as SOURCE } from '../__gen_reunirRebanho'
import { gameThreeDBlocks } from '../blocks'
import { reunirRebanhoBasicoExample } from '../examples'
import { gameThreeDManifest } from '../manifest'
import { parseExampleLifecycleSource } from './exampleLifecycleSource'

/**
 * Drift do exemplo "Reunir o Rebanho" — o Entity Management de NÍVEL BÁSICO
 * montado só com genéricos do Jogo 3D: o herói (setas/WASD) reúne os bichinhos
 * que vagam (giram parados) e os leva ao curral. O bichinho muda de ESTADO ao
 * ser alcançado (sai do enxame "errantes" e entra no "seguidores", passando a
 * moveTowards o herói). A IR embutida em examples.ts foi GERADA pelo parser real
 * a partir do SOURCE (que mora no __gen_reunirRebanho.ts, importado aqui para que
 * fonte e teste NUNCA divirjam).
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameThreeDBlocks)
})

describe('Exemplo Reunir o Rebanho — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-3d', () => {
    expect(gameThreeDManifest.examples).toContain(reunirRebanhoBasicoExample)
    expect(reunirRebanhoBasicoExample.experience).toBe('game')
    expect(reunirRebanhoBasicoExample.ir.extensions).toEqual([{ extensionId: 'game-3d' }])
  })

  it('a IR embutida passa no schema (ciclo de vida + escopos)', () => {
    expect(SZIRV2Schema.safeParse(reunirRebanhoBasicoExample.ir).success).toBe(true)
  })

  it('nenhum texto visível usa travessão', () => {
    expect(reunirRebanhoBasicoExample.name).toBe('Reunir o Rebanho')
    expect(reunirRebanhoBasicoExample.description ?? '').not.toContain('—')
    expect((reunirRebanhoBasicoExample.description ?? '').length).toBeLessThanOrEqual(200)
    expect(JSON.stringify(reunirRebanhoBasicoExample.ir.html)).not.toContain('—')
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE)) as JSStatement[]
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(types.has('memberCallExpr')).toBe(false)
    expect(parsed).toEqual(
      stripIds(behaviorStatements(reunirRebanhoBasicoExample.ir)) as JSStatement[],
    )
  })

  it('exercita as mecânicas prometidas do Entity Management', () => {
    const statements = behaviorStatements(reunirRebanhoBasicoExample.ir)
    const types = collectTypes(statements)
    for (const t of [
      'g3d:createSwarm', // dois enxames: errantes e seguidores
      'g3d:spawnInSwarm', // bichinhos nascem (errantes) e mudam de estado (seguidores)
      'g3d:countSwarm', // teto do enxame de errantes
      'g3d:everySeconds', // cadência de spawn + relógio
      'randomFloat', // o ângulo sorteado da posição de nascimento
      'g3d:keyDown', // controle do herói pelas setas/WASD
      'g3d:moveBy', // o herói anda no campo
      'g3d:isNear', // alcançar bichinho + chegar no curral
      'g3d:moveTowards', // os seguidores vão atrás do herói
      'g3d:forEachInSwarm', // varre errantes e seguidores por quadro
      'g3d:removeFromSwarm', // sai de um enxame ao mudar de estado / ser entregue
      'g3d:spin', // os bichinhos errantes giram (vagam)
      'g3d:getPos', // posição do herói e do bichinho
      'g3d:animate', // o laço de quadro 3D
      'event', // o botão Jogar de novo
      'setProperty', // placar e relógio no HUD
      'classOp', // mostra/esconde a tela de fim
    ]) {
      expect(types.has(t)).toBe(true)
    }
    // Dois enxames distintos e o estado do jogo vivem em variáveis.
    const raw = JSON.stringify(statements)
    expect(raw).toContain('"errantes"')
    expect(raw).toContain('"seguidores"')
    expect(raw).toContain('"pontos"')
    expect(raw).toContain('"tempo"')
    expect(raw).toContain('"rodando"')
  })

  it('⭐ é montado com GENÉRICOS (dois enxames), não com um kit pronto', () => {
    const types = collectTypes(behaviorStatements(reunirRebanhoBasicoExample.ir))
    expect(types.has('g3d:createFullscreenScene')).toBe(true)
    expect(types.has('g3d:createRaceScene')).toBe(false)
    expect(types.has('g3d:createCrossingScene')).toBe(false)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(reunirRebanhoBasicoExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      reunirRebanhoBasicoExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(reunirRebanhoBasicoExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})
