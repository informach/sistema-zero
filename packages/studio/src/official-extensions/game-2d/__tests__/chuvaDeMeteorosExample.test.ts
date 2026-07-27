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
import { CHUVA_DE_METEOROS_SOURCE as SOURCE } from '../__gen_chuvaDeMeteoros'
import { collectTypes, stripIds } from '../__gen_dinoCorredor'
import { gameTwoDBlocks } from '../blocks'
import { chuvaDeMeteorosExample } from '../examples'
import { gameTwoDManifest } from '../manifest'

/**
 * Drift do exemplo "Chuva de Meteoros" — o degrau BÁSICO da família Space
 * Shooter do curso raylib_intro. A IR embutida em examples/clearcode.ts foi
 * GERADA pelo parser real a partir do SOURCE (que mora no
 * __gen_chuvaDeMeteoros.ts, importado aqui para que fonte e teste NUNCA possam
 * divergir). O preparo do palco (setupStage + setStageDescription) é injetado
 * pelo wrapper `beginnerGameExample` e conferido à parte.
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

describe('Exemplo Chuva de Meteoros — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d', () => {
    expect(gameTwoDManifest.examples).toContain(chuvaDeMeteorosExample)
    expect(chuvaDeMeteorosExample.ir.extensions).toEqual([{ extensionId: 'game-2d' }])
    expect(chuvaDeMeteorosExample.name).toBe('Chuva de Meteoros')
    expect(chuvaDeMeteorosExample.experience).toBe('game')
    expect((chuvaDeMeteorosExample.description ?? '').length).toBeLessThanOrEqual(200)
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall), fora a dupla do wrapper', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE))
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)

    const embedded = stripIds(behaviorStatements(chuvaDeMeteorosExample.ir)) as JSStatement[]
    expect(embedded[0]).toEqual({
      type: 'g2d:setupStage',
      width: 480,
      height: 300,
      bg: '#0f0a19',
    } as JSStatement)
    expect(embedded[1]).toEqual({
      type: 'g2d:setStageDescription',
      description: chuvaDeMeteorosExample.description ?? '',
    } as JSStatement)
    expect(parsed).toEqual(embedded.slice(2))
  })

  it('exercita a mecânica prometida do Space Shooter', () => {
    const types = collectTypes(behaviorStatements(chuvaDeMeteorosExample.ir))
    for (const t of [
      'g2d:createShip', // a nave desenhada do Kit espaço
      'g2d:topDown', // 4 direções com diagonal normalizada (o input original)
      'g2d:clampToScreen', // o constraint() do original
      'g2d:setHitboxScale', // colisão perdoadora de 75% na nave
      'g2d:spawnBullet', // laser para CIMA (vy negativo)
      'g2d:spawnAsteroid', // o meteoro girando do Kit espaço
      'g2d:starfield', // as 30 estrelas de fundo
      'g2d:updateGroup', // jogo espacial SEM gravidade: updateGroup puro
      'g2d:onGroupOverlap', // laser × meteoro
      'g2d:onSpriteGroupOverlap', // nave × meteoro = fim
      'g2d:explode', // explosão nos dois casos
      'g2d:removeFromGroup',
      'g2d:pruneOffscreen', // o culling do original, nos DOIS grupos
      'g2d:everySeconds', // spawn 0,5s + placar por tempo + aceleração
      'g2d:randomBetween',
      'g2d:randomX',
      'g2d:centerX', // o laser nasce no centro da nave
      'g2d:playShoot',
      'g2d:playExplosion',
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
    // SEM gravidade e SEM vidas: um toque de meteoro encerra a partida.
    expect(types.has('g2d:setGravity')).toBe(false)
    expect(types.has('g2d:updateGroupNoGravity')).toBe(false)
    expect(types.has('g2d:setHealth')).toBe(false)
    // Diferente do "Nave contra Asteroides": aqui a nave voa nas 4 direções.
    expect(types.has('g2d:dragX')).toBe(false)
  })

  it('placar POR TEMPO + bônus por meteoro, e a chuva acelera até um teto', () => {
    const loops = chuvaDeMeteorosExample.ir.behavior.loops
    const everyRoots = loops.filter(
      (statement): statement is Extract<JSStatement, { type: 'g2d:everySeconds' }> =>
        statement.type === 'g2d:everySeconds',
    )
    expect(everyRoots).toHaveLength(3)
    // 1 ponto por segundo (o int(get_time()) do original), só na cena jogando.
    const pontoPorSegundo = everyRoots.find(
      (statement) => JSON.stringify(statement.seconds) === '{"type":"num","value":1}',
    )
    expect(JSON.stringify(pontoPorSegundo)).toContain(
      '"name":"pontos","value":{"type":"binop","op":"+","left":{"type":"var","name":"pontos"},"right":{"type":"num","value":1}}',
    )
    // O spawn de 0,5s sorteia x, tamanho, diagonal e velocidade do meteoro.
    const spawner = everyRoots.find(
      (statement) => JSON.stringify(statement.seconds) === '{"type":"num","value":0.5}',
    )
    const rawSpawner = JSON.stringify(spawner)
    expect(rawSpawner).toContain('"type":"g2d:sceneIs","name":"jogando"')
    expect(rawSpawner).toContain('"type":"g2d:spawnAsteroid","groupVar":"meteoros"')
    expect(rawSpawner).toContain('"x":{"type":"g2d:randomX"}')
    expect(rawSpawner).toContain(
      '"vy":{"type":"binop","op":"+","left":{"type":"var","name":"velocidade"}',
    )
    // A aceleração tem TETO (velocidade < 4) — a chuva não vira parede.
    const acelera = everyRoots.find(
      (statement) => JSON.stringify(statement.seconds) === '{"type":"num","value":6}',
    )
    const rawAcelera = JSON.stringify(acelera)
    expect(rawAcelera).toContain(
      '"op":"<","left":{"type":"var","name":"velocidade"},"right":{"type":"num","value":4}',
    )
    // Bônus de 2 pontos por meteoro destruído mora no overlap laser × meteoro.
    const frameLoop = loops.find((statement) => statement.type === 'g2d:updateEachFrame')
    expect(JSON.stringify(frameLoop)).toContain(
      '"name":"pontos","value":{"type":"binop","op":"+","left":{"type":"var","name":"pontos"},"right":{"type":"num","value":2}}',
    )
    // Nenhuma cadência escondida dentro do "a cada quadro".
    expect(collectTypes(frameLoop).has('g2d:everySeconds')).toBe(false)
  })

  it('nenhum texto visível usa travessão', () => {
    expect(JSON.stringify(chuvaDeMeteorosExample.ir)).not.toContain('—')
    expect(chuvaDeMeteorosExample.name).not.toContain('—')
    expect(chuvaDeMeteorosExample.description ?? '').not.toContain('—')
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(chuvaDeMeteorosExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR preserva o jogo inteiro', () => {
    const state = buildWorkspaceStateFromIR(
      chuvaDeMeteorosExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = behaviorStatements(buildIRFromWorkspace(ws))
      const embedded = behaviorStatements(chuvaDeMeteorosExample.ir)
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
