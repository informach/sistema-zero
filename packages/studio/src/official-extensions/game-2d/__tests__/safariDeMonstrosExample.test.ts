import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import { behaviorStatements, type JSStatement, normalizeSZIR } from '#ir'
import 'blockly/blocks'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { parseJS } from '../../../parsers/js'
import { collectTypes, stripIds } from '../__gen_dinoCorredor'
import { SAFARI_DE_MONSTROS_SOURCE as SOURCE } from '../__gen_safariDeMonstros'
import { gameTwoDBlocks } from '../blocks'
import { safariDeMonstrosExample } from '../examples'
import { gameTwoDManifest } from '../manifest'

/**
 * Drift do exemplo "Safári de Monstros" — o degrau BÁSICO da trilogia de
 * overworld de captura do Clear Code (Monster Hunter / Python-Monsters). A IR
 * embutida em clearcode.ts foi GERADA pelo parser real a partir do SOURCE (que
 * mora no __gen_safariDeMonstros.ts, importado aqui para que fonte e teste nunca
 * divirjam). O preparo do palco é injetado pelo wrapper beginnerGameExample.
 */

function parseExampleLifecycleSource(source: string): JSStatement[] {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(source),
    extensions: [{ extensionId: 'game-2d' }],
  })
  return JSON.parse(JSON.stringify(behaviorStatements(normalized))) as JSStatement[]
}

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameTwoDBlocks)
})

describe('Exemplo Safári de Monstros — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d', () => {
    expect(gameTwoDManifest.examples).toContain(safariDeMonstrosExample)
    expect(safariDeMonstrosExample.ir.extensions).toEqual([{ extensionId: 'game-2d' }])
    expect(safariDeMonstrosExample.name).toBe('Safári de Monstros')
    expect(safariDeMonstrosExample.experience).toBe('game')
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall), fora a dupla do wrapper', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE))
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)

    const embedded = stripIds(behaviorStatements(safariDeMonstrosExample.ir)) as JSStatement[]
    expect(embedded[0]).toEqual({
      type: 'g2d:setupStage',
      width: 480,
      height: 270,
      bg: '#3a7d44',
    } as JSStatement)
    expect(embedded[1]).toEqual({
      type: 'g2d:setStageDescription',
      description: safariDeMonstrosExample.description ?? '',
    } as JSStatement)
    expect(parsed).toEqual(embedded.slice(2))
  })

  it('exercita a mecânica prometida do overworld de captura', () => {
    const statements = behaviorStatements(safariDeMonstrosExample.ir)
    const types = collectTypes(statements)
    for (const t of [
      'g2d:defineShape', // herói, parceiro (filhote/adulto), selvagem e sábio por código
      'g2d:createShapeSprite',
      'g2d:createGroup', // muros e matos
      'g2d:spawnInGroup',
      'g2d:topDown', // ⭐ andar nas 4 direções pelo mundo
      'g2d:collideGroup', // bater nos muros
      'g2d:onSpriteGroupOverlap', // ⭐ pisar no mato dispara o encontro selvagem
      'g2d:randomChance', // chance do monstro aparecer e da captura
      'g2d:setPosition', // o selvagem aparece colado no herói; o parceiro segue
      'g2d:touches', // capturar exige estar encostado no selvagem; dica do sábio
      'g2d:spriteX',
      'g2d:spriteY',
      'g2d:setHitboxScale',
      'g2d:drawScore', // caderno de monstros + mensagem
      'g2d:setScene',
      'g2d:sceneIs',
      'g2d:showScreen',
      'g2d:restart',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(statements)
    // O laço do diferencial: capturar e evoluir (não há barra de vida de batalha).
    expect(raw).toContain('"capturados"')
    expect(raw).toContain('"evoluido"')
    expect(raw).toContain('"selvagemAtivo"')
    // Três telas: início, mundo e vitória.
    for (const screen of ['"inicio"', '"mundo"', '"vitoria"']) {
      expect(raw).toContain(screen)
    }
  })

  it('nenhum texto visível usa travessão', () => {
    expect(JSON.stringify(safariDeMonstrosExample.ir)).not.toContain('—')
    expect(safariDeMonstrosExample.name).not.toContain('—')
    expect(safariDeMonstrosExample.description ?? '').not.toContain('—')
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(safariDeMonstrosExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR preserva o jogo inteiro', () => {
    const state = buildWorkspaceStateFromIR(
      safariDeMonstrosExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = behaviorStatements(buildIRFromWorkspace(ws))
      const embedded = behaviorStatements(safariDeMonstrosExample.ir)
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
