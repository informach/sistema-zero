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
import { SAFARI_DE_MONSTROS_PROFISSIONAL_SOURCE as SOURCE } from '../__gen_safariDeMonstrosProfissional'
import { gameKitBlocks } from '../blocks'
import { safariDeMonstrosProfissionalExample } from '../examples'

/**
 * Drift do exemplo "Safári de Monstros Profissional" — o nível 2 da trilogia de
 * overworld de captura sobre o motor avançado (Kit RPG). A IR embutida em
 * examples/ foi GERADA pelo parser real a partir do SOURCE (que mora no
 * __gen_safariDeMonstrosProfissional.ts, importado aqui para que fonte e teste
 * NUNCA possam divergir).
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameKitBlocks)
})

describe('Exemplo Safári de Monstros Profissional — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d-advanced', () => {
    expect(gameKitExamples).toContain(safariDeMonstrosProfissionalExample)
    expect(safariDeMonstrosProfissionalExample.ir.extensions).toEqual([
      { extensionId: 'game-2d-advanced' },
    ])
    expect(safariDeMonstrosProfissionalExample.name).toBe('Safári de Monstros Profissional')
    expect(safariDeMonstrosProfissionalExample.experience).toBe('game')
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE, true))
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(parsed).toEqual(
      stripIds(behaviorStatements(safariDeMonstrosProfissionalExample.ir)) as JSStatement[],
    )
  })

  it('⭐ usa o Kit RPG: mundo em grade + NPCs que conversam + dois biomas ligados', () => {
    const types = collectTypes(behaviorStatements(safariDeMonstrosProfissionalExample.ir))
    for (const t of [
      'gk:rpgSetStartMap',
      'gk:rpgCreateMap', // Floresta e Caverna
      'gk:rpgOnEnterMap',
      'gk:rpgConnectEdge', // ⭐ os dois biomas ligados pela borda (Zelda-style)
      'gk:rpgCreateNpc', // sábio, guarda e os monstros selvagens
      'gk:rpgBlockCell', // paredes da grade
      'gk:rpgOnTalk', // ⭐ captura NO overworld, apertando Espaço de frente
      'gk:rpgSay', // caixa de fala
      'gk:rpgHasFlag', // não capturar o mesmo monstro duas vezes
      'gk:rpgAddFlag',
      'gk:rpgMoveGrid', // andar por células
      'gk:rpgDrawNpcs',
      'gk:cameraFollow', // mundo maior que a tela
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('captura + evolução do parceiro (sem tela de batalha)', () => {
    const statements = behaviorStatements(safariDeMonstrosProfissionalExample.ir)
    const types = collectTypes(statements)
    for (const t of [
      'gk:createCharacter',
      'gk:defineLook', // herói, sábio e monstros por código
      'gk:drawLook', // grama, árvores e o parceiro que segue
      'gk:charX', // o parceiro segue o herói pelo mundo
      'gk:charY',
      'gk:drawByDepth',
      'gk:setState', // ligar a vitória
      'gk:playEffect', // rede + evolução
    ]) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(statements)
    // O laço do diferencial: capturar e evoluir (não há barra de vida de batalha).
    expect(raw).toContain('"capturados"')
    expect(raw).toContain('"evoluido"')
    // Cinco monstros distintos em dois biomas.
    for (const monster of ['"verdinho"', '"azulao"', '"flamil"', '"rochoso"', '"sombrio"']) {
      expect(raw).toContain(monster)
    }
    // Dois biomas ligados.
    for (const map of ['"floresta"', '"caverna"']) {
      expect(raw).toContain(map)
    }
    for (const screen of ['"menu"', '"vitoria"']) {
      expect(raw).toContain(screen)
    }
  })

  it('nenhum texto visível usa travessão', () => {
    expect(JSON.stringify(safariDeMonstrosProfissionalExample.ir)).not.toContain('—')
    expect(safariDeMonstrosProfissionalExample.name).not.toContain('—')
    expect(safariDeMonstrosProfissionalExample.description ?? '').not.toContain('—')
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(safariDeMonstrosProfissionalExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR preserva o jogo inteiro', () => {
    const state = buildWorkspaceStateFromIR(
      safariDeMonstrosProfissionalExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = behaviorStatements(buildIRFromWorkspace(ws))
      const embedded = behaviorStatements(safariDeMonstrosProfissionalExample.ir)
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
