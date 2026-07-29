import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import { behaviorStatements, type JSStatement, normalizeSZIR } from '#ir'
import 'blockly/blocks'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { collectTypes, stripIds } from '../__gen_dinoCorredor'
import { FAZENDA_FELIZ_SOURCE as SOURCE } from '../__gen_fazendaFeliz'
import { gameTwoDBlocks } from '../blocks'
import { fazendaFelizExample } from '../examples'
import { gameTwoDManifest } from '../manifest'

/**
 * Drift do exemplo "Fazenda Feliz" — o degrau BÁSICO da família farming/Stardew
 * do Clear Code. A IR embutida foi GERADA pelo parser real a partir do SOURCE
 * (que mora no __gen_fazendaFeliz.ts, importado aqui para que fonte e teste
 * NUNCA possam divergir). O preparo do palco é injetado pelo `beginnerGameExample`.
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

import { parseJS } from '../../../parsers/js'

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameTwoDBlocks)
})

describe('Exemplo Fazenda Feliz — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d', () => {
    expect(gameTwoDManifest.examples).toContain(fazendaFelizExample)
    expect(fazendaFelizExample.ir.extensions).toEqual([{ extensionId: 'game-2d' }])
    expect(fazendaFelizExample.name).toBe('Fazenda Feliz')
    expect(fazendaFelizExample.experience).toBe('game')
    expect((fazendaFelizExample.description ?? '').length).toBeLessThanOrEqual(200)
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall), fora a dupla do wrapper', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE))
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)

    const embedded = stripIds(behaviorStatements(fazendaFelizExample.ir)) as JSStatement[]
    expect(embedded[0]).toEqual({
      type: 'g2d:setupStage',
      width: 480,
      height: 320,
      bg: '#4a6b3a',
    } as JSStatement)
    expect(embedded[1]).toEqual({
      type: 'g2d:setStageDescription',
      description: fazendaFelizExample.description ?? '',
    } as JSStatement)
    expect(parsed).toEqual(embedded.slice(2))
  })

  it('modela os canteiros numa LISTA e desenha por estágio (sem tilemap)', () => {
    const types = collectTypes(behaviorStatements(fazendaFelizExample.ir))
    for (const t of [
      'g2d:createShapeSprite', // o fazendeiro desenhado por código
      'g2d:defineShape',
      'g2d:topDown', // anda nas 4 direções
      'g2d:clampToScreen', // arena de uma tela
      'g2d:paintRect', // canteiros desenhados por código...
      'g2d:paintCircle', // ...com os brotos por estágio
      'g2d:everySeconds', // os brotos crescem no relógio do jogo
      'g2d:drawScore', // placar de moedas
      'g2d:setScene',
      'g2d:sceneIs',
      'g2d:showScreen',
      'g2d:restart',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    // o MODELO dos canteiros é uma LISTA do núcleo (arrays + índice), não tilemap
    for (const t of ['array', 'arrayPush', 'index', 'indexSet', 'forRange']) {
      expect(types.has(t)).toBe(true)
    }
    expect(types.has('g2d:createTileMap')).toBe(false)
    expect(types.has('g2d:cameraFollow')).toBe(false)
  })

  it('espaço PLANTA (0 vira 1) e COLHE o maduro (3 vira moedas)', () => {
    const raw = JSON.stringify(fazendaFelizExample.ir.behavior.events)
    // plantar: canteiro[i] == 0 vira 1
    expect(raw).toContain('"index":{"type":"var","name":"i"},"value":{"type":"num","value":1}')
    // colher: soma 3 moedas
    expect(raw).toContain(
      '"name":"moedas","value":{"type":"binop","op":"+","left":{"type":"var","name":"moedas"},"right":{"type":"num","value":3}}',
    )
    // crescer: a cadência de 3s avança os brotos
    const loops = fazendaFelizExample.ir.behavior.loops
    const every = loops.filter((s) => s.type === 'g2d:everySeconds')
    expect(every).toHaveLength(1)
    expect(JSON.stringify(every)).toContain('"type":"g2d:sceneIs","name":"jogando"')
  })

  it('nenhum texto visível usa travessão', () => {
    expect(JSON.stringify(fazendaFelizExample.ir)).not.toContain('—')
    expect(fazendaFelizExample.name).not.toContain('—')
    expect(fazendaFelizExample.description ?? '').not.toContain('—')
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(fazendaFelizExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR preserva o jogo inteiro', () => {
    const state = buildWorkspaceStateFromIR(
      fazendaFelizExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = behaviorStatements(buildIRFromWorkspace(ws))
      const embedded = behaviorStatements(fazendaFelizExample.ir)
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
