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
import { SOBREVIVENTE_SOURCE as SOURCE } from '../__gen_sobrevivente'
import { gameTwoDBlocks } from '../blocks'
import { sobreviventeExample } from '../examples'
import { gameTwoDManifest } from '../manifest'

/**
 * Drift do exemplo "Sobrevivente" — o degrau BÁSICO da família Vampire Survivor
 * do Clear Code. A IR embutida em examples/clearcode.ts foi GERADA pelo parser
 * real a partir do SOURCE (que mora no __gen_sobrevivente.ts, importado aqui
 * para que fonte e teste NUNCA possam divergir). O preparo do palco (setupStage
 * + setStageDescription) é injetado pelo wrapper `beginnerGameExample`.
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

describe('Exemplo Sobrevivente — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d', () => {
    expect(gameTwoDManifest.examples).toContain(sobreviventeExample)
    expect(sobreviventeExample.ir.extensions).toEqual([{ extensionId: 'game-2d' }])
    expect(sobreviventeExample.name).toBe('Sobrevivente')
    expect(sobreviventeExample.experience).toBe('game')
    expect((sobreviventeExample.description ?? '').length).toBeLessThanOrEqual(200)
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall), fora a dupla do wrapper', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE))
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)

    const embedded = stripIds(behaviorStatements(sobreviventeExample.ir)) as JSStatement[]
    expect(embedded[0]).toEqual({
      type: 'g2d:setupStage',
      width: 480,
      height: 300,
      bg: '#2c2140',
    } as JSStatement)
    expect(embedded[1]).toEqual({
      type: 'g2d:setStageDescription',
      description: sobreviventeExample.description ?? '',
    } as JSStatement)
    expect(parsed).toEqual(embedded.slice(2))
  })

  it('exercita a mecânica prometida do atirador de sobrevivência', () => {
    const types = collectTypes(behaviorStatements(sobreviventeExample.ir))
    for (const t of [
      'g2d:createShapeSprite', // herói desenhado por código (círculo + cano)
      'g2d:defineShape',
      'g2d:setHitboxScale', // colisão de dano perdoadora
      'g2d:setHealth', // corações
      'g2d:defineEnemyType', // horda do Kit (perseguidor)
      'g2d:spawnEnemy',
      'g2d:updateEnemyType', // inimigos perseguem o herói
      'g2d:onEnemyDefeated',
      'g2d:forEachInGroup', // varre a horda...
      'g2d:distance', // ...pela distância...
      'g2d:aimAt', // ...para mirar no mais perto...
      'g2d:cooldownReady', // ...e atirar no ritmo do cooldown
      'g2d:shootFrom', // a arma dispara sozinha
      'g2d:topDown', // 4 direções
      'g2d:clampToScreen', // arena de uma tela (sem câmera)
      'g2d:onGroupOverlap', // tiro x monstrinho
      'g2d:changeHealth',
      'g2d:removeFromGroup',
      'g2d:onSpriteGroupOverlap', // encostar no herói
      'g2d:hurtByEnemy',
      'g2d:isInvincible', // i-frames
      'g2d:drawSpriteHealth',
      'g2d:healthDepleted', // acabar os corações = fim
      'g2d:updateGroupNoGravity', // jogo SEM gravidade
      'g2d:pruneOffscreen',
      'g2d:everySeconds', // spawn + placar por tempo
      'g2d:randomBetween',
      'g2d:randomChance',
      'g2d:drawScore',
      'g2d:setScene',
      'g2d:sceneIs',
      'g2d:showScreen',
      'g2d:restart',
      'g2d:playShoot',
      'g2d:playExplosion',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    // Degrau básico: arena de UMA tela, sem câmera nem gravidade.
    expect(types.has('g2d:cameraFollow')).toBe(false)
    expect(types.has('g2d:setGravity')).toBe(false)
    expect(types.has('g2d:updateGroup')).toBe(false)
    expect(types.has('g2d:createTileMap')).toBe(false)
  })

  it('placar POR TEMPO + bônus por inimigo, e a horda nasce nas bordas', () => {
    const loops = sobreviventeExample.ir.behavior.loops
    const everyRoots = loops.filter(
      (statement): statement is Extract<JSStatement, { type: 'g2d:everySeconds' }> =>
        statement.type === 'g2d:everySeconds',
    )
    expect(everyRoots).toHaveLength(2)
    const pontoPorSegundo = everyRoots.find(
      (statement) => JSON.stringify(statement.seconds) === '{"type":"num","value":1}',
    )
    expect(JSON.stringify(pontoPorSegundo)).toContain(
      '"name":"pontos","value":{"type":"binop","op":"+","left":{"type":"var","name":"pontos"},"right":{"type":"num","value":1}}',
    )
    const spawner = everyRoots.find(
      (statement) => JSON.stringify(statement.seconds) === '{"type":"num","value":0.8}',
    )
    const rawSpawner = JSON.stringify(spawner)
    expect(rawSpawner).toContain('"type":"g2d:sceneIs","name":"jogando"')
    expect(rawSpawner).toContain('"type":"g2d:spawnEnemy"')
    // Bônus de 3 pontos por inimigo derrotado mora no onEnemyDefeated.
    expect(JSON.stringify(sobreviventeExample.ir.behavior.events)).toContain(
      '"name":"pontos","value":{"type":"binop","op":"+","left":{"type":"var","name":"pontos"},"right":{"type":"num","value":3}}',
    )
  })

  it('nenhum texto visível usa travessão', () => {
    expect(JSON.stringify(sobreviventeExample.ir)).not.toContain('—')
    expect(sobreviventeExample.name).not.toContain('—')
    expect(sobreviventeExample.description ?? '').not.toContain('—')
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(sobreviventeExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR preserva o jogo inteiro', () => {
    const state = buildWorkspaceStateFromIR(
      sobreviventeExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = behaviorStatements(buildIRFromWorkspace(ws))
      const embedded = behaviorStatements(sobreviventeExample.ir)
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
