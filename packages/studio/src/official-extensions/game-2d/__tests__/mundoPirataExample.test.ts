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
import { MUNDO_PIRATA_SOURCE as SOURCE } from '../__gen_mundoPirata'
import { gameTwoDBlocks } from '../blocks'
import { mundoPirataExample } from '../examples'
import { gameTwoDManifest } from '../manifest'

/**
 * Drift do exemplo "Mundo Pirata" — o degrau BÁSICO da trilogia de plataforma
 * lateral do Clear Code (Super Pirate World). A IR embutida em clearcode.ts foi
 * GERADA pelo parser real a partir do SOURCE (que mora no __gen_mundoPirata.ts,
 * importado aqui para que fonte e teste NUNCA divirjam). O preparo do palco
 * (setupStage + setStageDescription) é injetado pelo wrapper beginnerGameExample.
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

describe('Exemplo Mundo Pirata — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d', () => {
    expect(gameTwoDManifest.examples).toContain(mundoPirataExample)
    expect(mundoPirataExample.ir.extensions).toEqual([{ extensionId: 'game-2d' }])
    expect(mundoPirataExample.name).toBe('Mundo Pirata')
    expect(mundoPirataExample.experience).toBe('game')
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall), fora a dupla do wrapper', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE))
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)

    const embedded = stripIds(behaviorStatements(mundoPirataExample.ir)) as JSStatement[]
    expect(embedded[0]).toEqual({
      type: 'g2d:setupStage',
      width: 480,
      height: 300,
      bg: '#8ecae6',
    } as JSStatement)
    expect(embedded[1]).toEqual({
      type: 'g2d:setStageDescription',
      description: mundoPirataExample.description ?? '',
    } as JSStatement)
    expect(parsed).toEqual(embedded.slice(2))
  })

  it('exercita a mecânica prometida do side-scroller', () => {
    const statements = behaviorStatements(mundoPirataExample.ir)
    const types = collectTypes(statements)
    for (const t of [
      'g2d:setGravity', // a gravidade da plataforma
      'g2d:defineShape', // pirata e caranguejo desenhados por código
      'g2d:createShapeSprite',
      'g2d:createGroup', // plataformas, moedas e inimigos
      'g2d:spawnInGroup',
      'g2d:cameraFollow', // ⭐ o mundo LARGO com a câmera seguindo o herói
      'g2d:arrowsX', // andar para os lados
      'g2d:applyVelocity', // integra velocidade + gravidade + preserva "no chão"
      'g2d:collideGroup', // pousa nas plataformas
      'g2d:forEachInGroup', // caranguejos patrulham
      'g2d:onSpriteGroupOverlap', // pegar moeda + pisar/encostar no inimigo
      'g2d:removeFromGroup', // some com a moeda pega e o inimigo pisado
      'g2d:spriteVy', // o pisão exige estar CAINDO (vy > 0)
      'g2d:spriteY', // cair no buraco (y grande)
      'g2d:spriteX', // chegar na bandeira (x do fim)
      'g2d:setHitboxScale', // colisão perdoadora
      'g2d:drawScore',
      'g2d:setScene',
      'g2d:sceneIs',
      'g2d:showScreen',
      'g2d:restart',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(statements)
    expect(raw).toContain('"pontos"')
    // Três telas: início, vitória e derrota.
    for (const screen of ['"inicio"', '"venceu"', '"perdeu"']) {
      expect(raw).toContain(screen)
    }
  })

  it('nenhum texto visível usa travessão', () => {
    expect(JSON.stringify(mundoPirataExample.ir)).not.toContain('—')
    expect(mundoPirataExample.name).not.toContain('—')
    expect(mundoPirataExample.description ?? '').not.toContain('—')
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(mundoPirataExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR preserva o jogo inteiro', () => {
    const state = buildWorkspaceStateFromIR(
      mundoPirataExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = behaviorStatements(buildIRFromWorkspace(ws))
      const embedded = behaviorStatements(mundoPirataExample.ir)
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
