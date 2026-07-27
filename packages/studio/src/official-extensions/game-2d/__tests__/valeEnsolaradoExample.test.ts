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
import { VALE_ENSOLARADO_SOURCE as SOURCE } from '../__gen_valeEnsolarado'
import { gameTwoDBlocks } from '../blocks'
import { valeEnsolaradoExample } from '../examples'
import { gameTwoDManifest } from '../manifest'

/**
 * Drift do exemplo "Vale Ensolarado" — a recriação BÁSICA do sunnyland-platformer
 * do Chris Courses. A IR embutida em examples/gamesTwoD.ts foi GERADA pelo parser
 * real a partir do SOURCE (que mora no __gen_valeEnsolarado.ts, importado aqui
 * para que fonte e teste NUNCA possam divergir). O preparo do palco (setupStage +
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

describe('Exemplo Vale Ensolarado — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d', () => {
    expect(gameTwoDManifest.examples).toContain(valeEnsolaradoExample)
    expect(valeEnsolaradoExample.ir.extensions).toEqual([{ extensionId: 'game-2d' }])
    expect(valeEnsolaradoExample.name).toBe('Vale Ensolarado')
    expect(valeEnsolaradoExample.experience).toBe('game')
    expect((valeEnsolaradoExample.description ?? '').length).toBeLessThanOrEqual(200)
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall), fora a dupla do wrapper', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE))
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)

    const embedded = stripIds(behaviorStatements(valeEnsolaradoExample.ir)) as JSStatement[]
    expect(embedded[0]).toEqual({
      type: 'g2d:setupStage',
      width: 480,
      height: 270,
      bg: '#8fd0a8',
    } as JSStatement)
    expect(embedded[1]).toEqual({
      type: 'g2d:setStageDescription',
      description: valeEnsolaradoExample.description ?? '',
    } as JSStatement)
    expect(parsed).toEqual(embedded.slice(2))
  })

  it('exercita a mecânica prometida do platformer de coleta', () => {
    const types = collectTypes(behaviorStatements(valeEnsolaradoExample.ir))
    for (const t of [
      'g2d:createShapeSprite', // o herói desenhado por código (sem PNG)
      'g2d:defineShape', // herói, gambá e águia procedurais
      'g2d:setGravity', // a gravidade do mundo (o 580 do original)
      'g2d:arrowsX', // andar para os lados (o A/D do original)
      'g2d:applyVelocity', // integra a queda
      'g2d:spriteVy', // o pulo só age parado na vertical (no chão)
      'g2d:setHitboxScale', // colisão perdoadora de 80%
      'g2d:setHealth', // as vidas do herói (as 3 do original)
      'g2d:createGroup', // chão, gemas e corações
      'g2d:spawnInGroup', // plataformas, gemas e coração no mundo
      'g2d:collideGroup', // colisão sólida com as plataformas
      'g2d:cameraFollow', // a câmera segue no vale maior que a tela
      'g2d:defineEnemyType', // o gambá e a águia
      'g2d:spawnEnemy',
      'g2d:updateEnemyType',
      'g2d:drawEnemyType',
      'g2d:onSpriteGroupOverlap', // pegar gema/coração e levar dano
      'g2d:hurtByEnemy', // dano com invencibilidade de piscar
      'g2d:isInvincible',
      'g2d:changeHealth', // o coração cura
      'g2d:drawSpriteHealth', // as vidas em corações
      'g2d:emitParticles',
      'g2d:drawParticles',
      'g2d:healthDepleted', // a derrota
      'g2d:playMusic',
      'g2d:playFx',
      'g2d:setScene',
      'g2d:sceneIs',
      'g2d:showScreen',
      'g2d:restart',
      'g2d:drawScore',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    // Plataforma de coleta feita na mão: sem tilemap, sem ataque, sem tiros.
    expect(types.has('g2d:collideTileMap')).toBe(false)
    expect(types.has('g2d:topDown')).toBe(false)
    expect(types.has('g2d:spawnBullet')).toBe(false)
  })

  it('a câmera segue num vale mais largo que a tela e há duas famílias de inimigo', () => {
    const raw = JSON.stringify(behaviorStatements(valeEnsolaradoExample.ir))
    // O mundo tem 960 de largura (maior que os 480 do palco): a câmera rola.
    expect(raw).toContain(
      '"type":"g2d:cameraFollow","spriteVar":"heroi","worldW":{"type":"num","value":960},"worldH":{"type":"num","value":270}',
    )
    // Duas famílias de inimigo: o gambá que patrulha e a águia que voa.
    expect(raw).toContain('"behavior":"patrulha"')
    expect(raw).toContain('"behavior":"voador"')
  })

  it('nenhum texto visível usa travessão', () => {
    expect(JSON.stringify(valeEnsolaradoExample.ir)).not.toContain('—')
    expect(valeEnsolaradoExample.name).not.toContain('—')
    expect(valeEnsolaradoExample.description ?? '').not.toContain('—')
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(valeEnsolaradoExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR preserva o jogo inteiro', () => {
    const state = buildWorkspaceStateFromIR(
      valeEnsolaradoExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = behaviorStatements(buildIRFromWorkspace(ws))
      const embedded = behaviorStatements(valeEnsolaradoExample.ir)
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
