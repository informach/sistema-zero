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
import { HEROI_QUE_EVOLUI_SOURCE as SOURCE } from '../__gen_heroiQueEvolui'
import { gameTwoDBlocks } from '../blocks'
import { heroiQueEvoluiExample } from '../examples'
import { gameTwoDManifest } from '../manifest'

/**
 * Drift do exemplo "Herói que Evolui" — o degrau BÁSICO da família Zelda do
 * Clear Code, focado na economia de EXP + subir de nível. A IR embutida foi
 * GERADA pelo parser real a partir do SOURCE (que mora no __gen_heroiQueEvolui.ts,
 * importado aqui para que fonte e teste NUNCA possam divergir).
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

describe('Exemplo Herói que Evolui — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d', () => {
    expect(gameTwoDManifest.examples).toContain(heroiQueEvoluiExample)
    expect(heroiQueEvoluiExample.ir.extensions).toEqual([{ extensionId: 'game-2d' }])
    expect(heroiQueEvoluiExample.name).toBe('Herói que Evolui')
    expect(heroiQueEvoluiExample.experience).toBe('game')
    expect((heroiQueEvoluiExample.description ?? '').length).toBeLessThanOrEqual(200)
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall), fora a dupla do wrapper', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE))
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)

    const embedded = stripIds(behaviorStatements(heroiQueEvoluiExample.ir)) as JSStatement[]
    expect(embedded[0]).toEqual({
      type: 'g2d:setupStage',
      width: 480,
      height: 300,
      bg: '#1d2f4d',
    } as JSStatement)
    expect(embedded[1]).toEqual({
      type: 'g2d:setStageDescription',
      description: heroiQueEvoluiExample.description ?? '',
    } as JSStatement)
    expect(parsed).toEqual(embedded.slice(2))
  })

  it('espada na direção olhada + ondas de monstros que perseguem', () => {
    const types = collectTypes(behaviorStatements(heroiQueEvoluiExample.ir))
    for (const t of [
      'g2d:createShapeSprite',
      'g2d:defineShape',
      'g2d:spawnInGroup', // a espada é um golpe temporário no grupo
      'g2d:keyDown', // as setas alimentam a direção olhada (miraX/miraY)
      'g2d:flipSprite',
      'g2d:defineEnemyType', // horda do Kit (perseguidor)
      'g2d:spawnEnemy',
      'g2d:updateEnemyType',
      'g2d:onGroupOverlap', // golpe x monstro
      'g2d:changeHealth',
      'g2d:onSpriteGroupOverlap', // encostar no herói
      'g2d:hurtByEnemy',
      'g2d:isInvincible',
      'g2d:drawSpriteHealth',
      'g2d:pruneOld',
      'g2d:everySeconds',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    // Degrau básico: arena de uma tela, sem câmera nem tilemap.
    expect(types.has('g2d:cameraFollow')).toBe(false)
    expect(types.has('g2d:createTileMap')).toBe(false)
  })

  it('O DIFERENCIAL: EXP por inimigo, subir de nível (mais veloz + cura) e vencer no nível 5', () => {
    const raw = JSON.stringify(heroiQueEvoluiExample.ir.behavior.events)
    // subir de nível quando a EXP enche (exp >= nivel * 3)
    expect(raw).toContain(
      '"op":">=","left":{"type":"var","name":"exp"},"right":{"type":"binop","op":"*","left":{"type":"var","name":"nivel"},"right":{"type":"num","value":3}}',
    )
    // o nível aumenta a velocidade...
    expect(raw).toContain(
      '"name":"velocidade","value":{"type":"binop","op":"+","left":{"type":"var","name":"velocidade"},"right":{"type":"num","value":0.4}}',
    )
    // ...e CURA o herói (changeHealth positivo)
    expect(raw).toContain('"type":"g2d:changeHealth","spriteVar":"heroi"')
    // vencer é chegar ao nível 5 (no laço principal)
    const frame = JSON.stringify(heroiQueEvoluiExample.ir.behavior.loops)
    expect(frame).toContain(
      '"op":">=","left":{"type":"var","name":"nivel"},"right":{"type":"num","value":5}',
    )
  })

  it('nenhum texto visível usa travessão', () => {
    expect(JSON.stringify(heroiQueEvoluiExample.ir)).not.toContain('—')
    expect(heroiQueEvoluiExample.name).not.toContain('—')
    expect(heroiQueEvoluiExample.description ?? '').not.toContain('—')
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(heroiQueEvoluiExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR preserva o jogo inteiro', () => {
    const state = buildWorkspaceStateFromIR(
      heroiQueEvoluiExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = behaviorStatements(buildIRFromWorkspace(ws))
      const embedded = behaviorStatements(heroiQueEvoluiExample.ir)
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
