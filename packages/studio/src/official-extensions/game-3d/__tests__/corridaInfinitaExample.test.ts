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
import { CORRIDA_INFINITA_SOURCE as SOURCE } from '../__gen_corridaInfinita'
import { gameThreeDBlocks } from '../blocks'
import { corridaInfinitaExample } from '../examples'
import { gameThreeDManifest } from '../manifest'
import { parseExampleLifecycleSource } from './exampleLifecycleSource'

/**
 * Drift do exemplo "Corrida Infinita 3D" — o runner de 3 pistas (nível 1 da
 * família Corrida Infinita): herói parado no Z, mundo vem até ele. A IR
 * embutida em examples.ts foi GERADA pelo parser real a partir do SOURCE (que
 * mora no __gen_corridaInfinita.ts, importado aqui para que fonte e teste NUNCA
 * possam divergir — duas cópias do fonte é como um drift passa despercebido).
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameThreeDBlocks)
})

describe('Exemplo Corrida Infinita 3D — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-3d', () => {
    expect(gameThreeDManifest.examples).toContain(corridaInfinitaExample)
    expect(corridaInfinitaExample.experience).toBe('game')
    expect(corridaInfinitaExample.ir.extensions).toEqual([{ extensionId: 'game-3d' }])
  })

  it('a IR embutida passa no schema (ciclo de vida + escopos)', () => {
    expect(SZIRV2Schema.safeParse(corridaInfinitaExample.ir).success).toBe(true)
  })

  it('nenhum texto visível usa travessão', () => {
    expect(corridaInfinitaExample.name).toBe('Corrida Infinita 3D')
    expect(corridaInfinitaExample.description ?? '').not.toContain('—')
    expect((corridaInfinitaExample.description ?? '').length).toBeLessThanOrEqual(200)
    expect(JSON.stringify(corridaInfinitaExample.ir.html)).not.toContain('—')
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE)) as JSStatement[]
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(types.has('memberCallExpr')).toBe(false)
    expect(parsed).toEqual(stripIds(behaviorStatements(corridaInfinitaExample.ir)) as JSStatement[])
  })

  it('exercita as mecânicas prometidas do runner', () => {
    const statements = behaviorStatements(corridaInfinitaExample.ir)
    const types = collectTypes(statements)
    for (const t of [
      'event', // setas esquerda/direita trocam de pista (keydown do núcleo)
      'eventProp', // a tecla do evento (event.key)
      'g3d:moveTowards', // o deslize suave até a pista da vez
      'g3d:keyDown', // espaço/seta para cima seguram o pulo no loop
      'g3d:jump', // o pulo com física do g3d
      'g3d:applyGravity', // a gravidade sobre o chão longo
      'g3d:everySeconds', // cadência periódica (spawn + relógio da dificuldade)
      'g3d:spawnInSwarm', // obstáculo nasce LONGE numa pista sorteada
      'randomFloat', // o sorteio da pista
      'g3d:moveBy', // o mundo vem até o herói
      'g3d:collides', // herói × obstáculo = fim de jogo
      'g3d:pruneSwarm', // limpeza de quem passou do herói
      'setProperty', // o placar por tempo no HUD
    ]) {
      expect(types.has(t)).toBe(true)
    }
    // O placar é TEMPO de sobrevivência e a dificuldade CRESCE: as variáveis
    // aparecem na IR (tempo somado e velocidade somada num "A cada 1 segundo").
    const raw = JSON.stringify(statements)
    expect(raw).toContain('"tempo"')
    expect(raw).toContain('"velocidade"')
    expect(raw).toContain('"pista"')
  })

  it('⭐ é DIFERENTE do "Desvie dos blocos": pistas fixas, sem andar livre', () => {
    // O Desvie anda livre no plano (controlWithKeys) e usa grupo + spawnEnemy
    // (posição aleatória contínua). Aqui NÃO: a troca é por PISTA (variável
    // clampada nas setas) e o spawn é por ENXAME numa das 3 pistas sorteadas.
    const types = collectTypes(behaviorStatements(corridaInfinitaExample.ir))
    expect(types.has('g3d:controlWithKeys')).toBe(false)
    expect(types.has('g3d:spawnEnemy')).toBe(false)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(corridaInfinitaExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      corridaInfinitaExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(corridaInfinitaExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})
