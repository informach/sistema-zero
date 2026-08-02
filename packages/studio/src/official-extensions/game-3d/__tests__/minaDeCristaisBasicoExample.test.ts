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
import { MINA_DE_CRISTAIS_SOURCE as SOURCE } from '../__gen_minaDeCristais'
import { gameThreeDBlocks } from '../blocks'
import { minaDeCristaisBasicoExample } from '../examples'
import { parseExampleLifecycleSource } from './exampleLifecycleSource'

/**
 * Drift do exemplo "Mina de Cristais" — o Minecraft do SimonDev de NÍVEL BÁSICO
 * montado só com genéricos do Jogo 3D: câmera ISOMÉTRICA (mouse livre, então
 * pickAtMouse é permitido) sobre um campo de blocos gerado com forRange. Clicar
 * num bloco CAVA: a pedra some, os cristais valem ponto; veias novas surgem em
 * ondas (everySeconds) e um relógio corre. A IR embutida em examples.ts foi
 * GERADA pelo parser real a partir do SOURCE (que mora no __gen_minaDeCristais.ts,
 * importado aqui para que fonte e teste NUNCA divirjam). ⭐ Distinto da trilogia
 * "Mundo de Blocos" (também blocos estilo Minecraft): lá você CONSTRÓI uma torre
 * (cursor na grade + espaço planta + vitória por altura). Aqui NÃO há cursor nem
 * plantar: o clique só REMOVE, a meta é uma QUANTIDADE de cristais e o tempo corre.
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameThreeDBlocks)
})

describe('Exemplo Mina de Cristais — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-3d', () => {
    expect(gameThreeDExamples).toContain(minaDeCristaisBasicoExample)
    expect(minaDeCristaisBasicoExample.experience).toBe('game')
    expect(minaDeCristaisBasicoExample.ir.extensions).toEqual([{ extensionId: 'game-3d' }])
  })

  it('a IR embutida passa no schema (ciclo de vida + escopos)', () => {
    expect(SZIRV2Schema.safeParse(minaDeCristaisBasicoExample.ir).success).toBe(true)
  })

  it('nenhum texto visível usa travessão', () => {
    expect(minaDeCristaisBasicoExample.name).toBe('Mina de Cristais')
    expect(minaDeCristaisBasicoExample.description ?? '').not.toContain('—')
    expect((minaDeCristaisBasicoExample.description ?? '').length).toBeLessThanOrEqual(200)
    expect(JSON.stringify(minaDeCristaisBasicoExample.ir.html)).not.toContain('—')
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE)) as JSStatement[]
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(types.has('memberCallExpr')).toBe(false)
    expect(parsed).toEqual(
      stripIds(behaviorStatements(minaDeCristaisBasicoExample.ir)) as JSStatement[],
    )
  })

  it('exercita as mecânicas prometidas (iso, clique-cavar, dois enxames, ondas, tempo)', () => {
    const statements = behaviorStatements(minaDeCristaisBasicoExample.ir)
    const types = collectTypes(statements)
    for (const t of [
      'g3d:isometricCamera', // câmera isométrica, mouse livre
      'g3d:pickAtMouse', // clicar num bloco para cavar
      'g3d:createSwarm', // os enxames de pedra e de cristal
      'g3d:spawnInSwarm',
      'g3d:removeFromSwarm', // cavar = remover
      'g3d:countSwarm', // saber se removeu (pedra x cristal)
      'g3d:everySeconds', // veias novas + o relógio
      'g3d:setMaterial', // o brilho dos cristais
      'forRange', // o campo inicial de blocos
      'event', // clique + botão Minerar de novo
      'setProperty', // placar/tempo no HUD
    ]) {
      expect(types.has(t)).toBe(true)
    }
    // Dois enxames (pedra e cristal), placar e um RELÓGIO vivem em variáveis.
    const raw = JSON.stringify(statements)
    expect(raw).toContain('"pedras"')
    expect(raw).toContain('"cristais"')
    expect(raw).toContain('"pontos"')
    expect(raw).toContain('"tempo"')
  })

  it('⭐ DISTINTO da trilogia Mundo de Blocos: CAVAR, não CONSTRUIR', () => {
    const statements = behaviorStatements(minaDeCristaisBasicoExample.ir)
    const types = collectTypes(statements)
    // O Mundo de Blocos tem um CURSOR translúcido na grade (gridPosition +
    // setOpacity) e VENCE por ALTURA (a variável "recorde" da torre). Nada disso
    // existe na mina: o clique só remove e a meta é uma quantidade de cristais.
    expect(types.has('g3d:gridPosition')).toBe(false)
    expect(types.has('g3d:setOpacity')).toBe(false)
    const raw = JSON.stringify(statements)
    expect(raw).not.toContain('"recorde"')
    expect(raw).toContain('"tempo"')
  })

  it('⭐ é montado com GENÉRICOS (dois enxames + iso), não com um kit pronto', () => {
    const types = collectTypes(behaviorStatements(minaDeCristaisBasicoExample.ir))
    expect(types.has('g3d:createFullscreenScene')).toBe(true)
    expect(types.has('g3d:createRaceScene')).toBe(false)
    expect(types.has('g3d:createCrossingScene')).toBe(false)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(minaDeCristaisBasicoExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      minaDeCristaisBasicoExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(minaDeCristaisBasicoExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})

import { gameThreeDExamples } from '../exampleCatalog'
