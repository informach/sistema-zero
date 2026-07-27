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
import { VILA_NINJA_SOURCE as SOURCE } from '../__gen_vilaNinja'
import { gameTwoDBlocks } from '../blocks'
import { vilaNinjaExample } from '../examples'
import { gameTwoDManifest } from '../manifest'

/**
 * Drift do exemplo "Vila Ninja" — a recriação BÁSICA e MINI do ninja-adventure do
 * Chris Courses. A IR embutida em examples/gamesTwoD.ts foi GERADA pelo parser
 * real a partir do SOURCE (que mora no __gen_vilaNinja.ts, importado aqui para que
 * fonte e teste NUNCA possam divergir). O preparo do palco (setupStage +
 * setStageDescription) é injetado pelo wrapper `beginnerGameExample` e conferido à
 * parte.
 */

/** O mesmo contrato de ciclo de vida dos exemplos, com a extensão game-2d. */
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

describe('Exemplo Vila Ninja — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d', () => {
    expect(gameTwoDManifest.examples).toContain(vilaNinjaExample)
    expect(vilaNinjaExample.ir.extensions).toEqual([{ extensionId: 'game-2d' }])
    expect(vilaNinjaExample.name).toBe('Vila Ninja')
    expect(vilaNinjaExample.experience).toBe('game')
    expect((vilaNinjaExample.description ?? '').length).toBeLessThanOrEqual(200)
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall), fora a dupla do wrapper', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE))
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)

    const embedded = stripIds(behaviorStatements(vilaNinjaExample.ir)) as JSStatement[]
    expect(embedded[0]).toEqual({
      type: 'g2d:setupStage',
      width: 480,
      height: 270,
      bg: '#3a5a3e',
    } as JSStatement)
    expect(embedded[1]).toEqual({
      type: 'g2d:setStageDescription',
      description: vilaNinjaExample.description ?? '',
    } as JSStatement)
    expect(parsed).toEqual(embedded.slice(2))
  })

  it('exercita a mecânica prometida da aventura top-down com ataque', () => {
    const types = collectTypes(behaviorStatements(vilaNinjaExample.ir))
    for (const t of [
      'g2d:createShapeSprite', // o ninja desenhado por código (sem PNG)
      'g2d:defineShape', // ninja e monstro procedurais
      'g2d:topDown', // andar nas 4 direções (o WASD do original)
      'g2d:setHitboxScale', // colisão perdoadora de 80%
      'g2d:setHealth', // as vidas do ninja
      'g2d:createGroup', // muros, corações e golpes
      'g2d:spawnInGroup', // os muros de pedra e o coração
      'g2d:collideGroup', // colisão sólida contra os muros (sem tilemap PNG)
      'g2d:cameraFollow', // a câmera segue no mundo maior que a tela
      'g2d:keyDown', // a mira (última direção olhada) para o ataque
      'g2d:flipSprite',
      'g2d:centerX', // o golpe sai do centro do ninja na direção olhada
      'g2d:centerY',
      'g2d:defineEnemyType', // os monstros que patrulham
      'g2d:spawnEnemy',
      'g2d:updateEnemyType',
      'g2d:drawEnemyType',
      'g2d:onEnemyDefeated',
      'g2d:onGroupOverlap', // o golpe fere o monstro
      'g2d:changeHealth', // 3 golpes derrubam o monstro; o coração cura
      'g2d:pruneOld', // o golpe some sozinho (hitbox temporária)
      'g2d:onSpriteGroupOverlap', // dano por contato e pegar coração
      'g2d:hurtByEnemy',
      'g2d:isInvincible',
      'g2d:countGroup', // conta os monstros restantes (a vitória)
      'g2d:healthDepleted', // a derrota
      'g2d:emitParticles',
      'g2d:drawParticles',
      'g2d:drawSpriteHealth',
      'g2d:setScene',
      'g2d:sceneIs',
      'g2d:showScreen',
      'g2d:restart',
      'g2d:drawScore',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    // Aventura com câmera e ataque na mão: sem tilemap, sem plataforma, sem tiros.
    expect(types.has('g2d:collideTileMap')).toBe(false)
    expect(types.has('g2d:platformer')).toBe(false)
    expect(types.has('g2d:spawnBullet')).toBe(false)
  })

  it('a câmera segue num mundo maior que a tela e os monstros patrulham', () => {
    const raw = JSON.stringify(behaviorStatements(vilaNinjaExample.ir))
    // O mundo tem 720×540 (maior que os 480×270 do palco): a câmera rola.
    expect(raw).toContain(
      '"type":"g2d:cameraFollow","spriteVar":"heroi","worldW":{"type":"num","value":720},"worldH":{"type":"num","value":540}',
    )
    // Uma família de inimigo: monstros que patrulham (3 de vida).
    expect(raw).toContain('"behavior":"patrulha"')
    expect(raw).toContain('"hp":{"type":"num","value":3}')
  })

  it('nenhum texto visível usa travessão', () => {
    expect(JSON.stringify(vilaNinjaExample.ir)).not.toContain('—')
    expect(vilaNinjaExample.name).not.toContain('—')
    expect(vilaNinjaExample.description ?? '').not.toContain('—')
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(vilaNinjaExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR preserva o jogo inteiro', () => {
    const state = buildWorkspaceStateFromIR(
      vilaNinjaExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = behaviorStatements(buildIRFromWorkspace(ws))
      const embedded = behaviorStatements(vilaNinjaExample.ir)
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
