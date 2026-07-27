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
import { LABIRINTO_ROBOS_SOURCE as SOURCE } from '../__gen_labirintoRobos'
import { gameThreeDBlocks } from '../blocks'
import { labirintoRobosExample } from '../examples'
import { gameThreeDManifest } from '../manifest'
import { parseExampleLifecycleSource } from './exampleLifecycleSource'

/**
 * Drift do exemplo "Labirinto dos Robôs" — o FPS estilo Doom básico (nível 1 da
 * família Labirinto): câmera em primeira pessoa com pointer lock, paredes
 * sólidas, robôs em enxame que perseguem e tiro por MIRA (aimAhead). A IR
 * embutida em examples.ts foi GERADA pelo parser real a partir do SOURCE (que
 * mora no __gen_labirintoRobos.ts, importado aqui para que fonte e teste NUNCA
 * possam divergir — duas cópias do fonte é como um drift passa despercebido).
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameThreeDBlocks)
})

describe('Exemplo Labirinto dos Robôs — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-3d', () => {
    expect(gameThreeDManifest.examples).toContain(labirintoRobosExample)
    expect(labirintoRobosExample.experience).toBe('game')
    expect(labirintoRobosExample.ir.extensions).toEqual([{ extensionId: 'game-3d' }])
  })

  it('a IR embutida passa no schema (ciclo de vida + escopos)', () => {
    expect(SZIRV2Schema.safeParse(labirintoRobosExample.ir).success).toBe(true)
  })

  it('nenhum texto visível usa travessão', () => {
    expect(labirintoRobosExample.name).toBe('Labirinto dos Robôs')
    expect(labirintoRobosExample.description ?? '').not.toContain('—')
    expect((labirintoRobosExample.description ?? '').length).toBeLessThanOrEqual(200)
    expect(JSON.stringify(labirintoRobosExample.ir.html)).not.toContain('—')
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE)) as JSStatement[]
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(types.has('memberCallExpr')).toBe(false)
    expect(parsed).toEqual(stripIds(behaviorStatements(labirintoRobosExample.ir)) as JSStatement[])
  })

  it('exercita as mecânicas prometidas do FPS de labirinto', () => {
    const statements = behaviorStatements(labirintoRobosExample.ir)
    const types = collectTypes(statements)
    for (const t of [
      'g3d:fpsCamera', // câmera em primeira pessoa (clique trava o ponteiro)
      'g3d:fpsControls', // WASD anda na direção do olhar (funciona SEM lock)
      'g3d:body', // o jogador tem corpo físico
      'g3d:setSolid', // as paredes do labirinto seguram o jogador
      'g3d:aimAhead', // ⭐ o hitscan do tiro (raio na direção do olhar)
      'g3d:createSwarm', // os robôs vivem em enxames (um por velocidade)
      'g3d:spawnInSwarm', // os robôs nascem em posições explícitas do labirinto
      'g3d:forEachInSwarm', // perseguição + checagem do alvo mirado
      'g3d:moveTowards', // a perseguição (velocidade por tipo de robô)
      'g3d:collides', // robô encostou no jogador = dano
      'g3d:removeFromSwarm', // acertou o tiro = robô some
      'g3d:countSwarm', // vitória quando os dois enxames zeram
      'g3d:setFog', // clima de masmorra
      'g3d:setSky', // céu em degradê
      'g3d:playEffect', // tiro/dano/vitória soam
      'event', // clique atira; R e o botão recomeçam
      'eventProp', // a tecla do evento (event.key)
      'funcDecl', // recomeçar() monta e reinicia a partida
      'callFunction', // chamado no início, no clique do botão e na tecla R
      'setProperty', // HUD de vida e pontos por textContent
      'setStyle', // overlay de dano por opacity
      'classOp', // a tela de fim aparece/some por classe
    ]) {
      expect(types.has(t)).toBe(true)
    }
    // Vida com i-frames simples (variável de recarga) e placar por variável.
    const raw = JSON.stringify(statements)
    expect(raw).toContain('"vida"')
    expect(raw).toContain('"recarga"')
    expect(raw).toContain('"pontos"')
  })

  it('⭐ veredito do spike: sob pointer lock o mouse interno congela', () => {
    // O clientX do runtime PARA de atualizar sob pointer lock, então o jogo 1
    // NÃO pode depender de pickAtMouse/pointerOver — o hitscan é aimAhead.
    const types = collectTypes(behaviorStatements(labirintoRobosExample.ir))
    expect(types.has('g3d:pickAtMouse')).toBe(false)
    expect(types.has('g3d:pointerOver')).toBe(false)
    expect(types.has('g3d:aimAhead')).toBe(true)
    expect(types.has('g3d:fpsCamera')).toBe(true)
  })

  it('⭐ é DIFERENTE do "Desvie dos blocos": FPS com mira, sem andar de fora', () => {
    // O Desvie anda livre em terceira visão (controlWithKeys) e usa o Kit
    // (spawnEnemy). Aqui NÃO: o corpo anda pelo preset de primeira pessoa e os
    // robôs nascem em posições explícitas do labirinto via enxame.
    const types = collectTypes(behaviorStatements(labirintoRobosExample.ir))
    expect(types.has('g3d:controlWithKeys')).toBe(false)
    expect(types.has('g3d:spawnEnemy')).toBe(false)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(labirintoRobosExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      labirintoRobosExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(labirintoRobosExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})
