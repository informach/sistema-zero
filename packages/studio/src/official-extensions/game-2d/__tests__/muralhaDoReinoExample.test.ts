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
import { MURALHA_DO_REINO_SOURCE as SOURCE } from '../__gen_muralhaDoReino'
import { gameTwoDBlocks } from '../blocks'
import { muralhaDoReinoExample } from '../examples'
import { gameTwoDManifest } from '../manifest'

/**
 * Drift do exemplo "Muralha do Reino" — a recriação BÁSICA do tower-defense do
 * Chris Courses. A IR embutida em examples/gamesTwoD.ts foi GERADA pelo parser
 * real a partir do SOURCE (que mora no __gen_muralhaDoReino.ts, importado aqui
 * para que fonte e teste NUNCA possam divergir). O preparo do palco (setupStage +
 * setStageDescription) é injetado pelo wrapper `beginnerGameExample` e conferido
 * à parte.
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

describe('Exemplo Muralha do Reino — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d', () => {
    expect(gameTwoDManifest.examples).toContain(muralhaDoReinoExample)
    expect(muralhaDoReinoExample.ir.extensions).toEqual([{ extensionId: 'game-2d' }])
    expect(muralhaDoReinoExample.name).toBe('Muralha do Reino')
    expect(muralhaDoReinoExample.experience).toBe('game')
    expect((muralhaDoReinoExample.description ?? '').length).toBeLessThanOrEqual(200)
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall), fora a dupla do wrapper', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE))
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)

    const embedded = stripIds(behaviorStatements(muralhaDoReinoExample.ir)) as JSStatement[]
    expect(embedded[0]).toEqual({
      type: 'g2d:setupStage',
      width: 480,
      height: 300,
      bg: '#33502f',
    } as JSStatement)
    expect(embedded[1]).toEqual({
      type: 'g2d:setStageDescription',
      description: muralhaDoReinoExample.description ?? '',
    } as JSStatement)
    expect(parsed).toEqual(embedded.slice(2))
  })

  it('exercita a mecânica prometida do tower-defense', () => {
    const types = collectTypes(behaviorStatements(muralhaDoReinoExample.ir))
    for (const t of [
      'g2d:createShapeSprite', // o castelo desenhado por código
      'g2d:defineShape', // torre e castelo procedurais (sem PNG)
      'g2d:createGroup', // inimigos, torres e tiros
      'g2d:onPointer', // comprar torre clicando (o canvas click do original)
      'g2d:spawnInGroup', // torre nasce no clique
      'g2d:spawnBullet', // torre atira para a esquerda
      'g2d:updateGroup', // inimigos marcham e tiros voam
      'g2d:onGroupOverlap', // tiro x invasor = explode + moedas
      'g2d:onSpriteGroupOverlap', // invasor x castelo = tira vida
      'g2d:explode', // explosão nos dois casos
      'g2d:removeFromGroup',
      'g2d:pruneOffscreen', // o culling do original nos tiros
      'g2d:forEachInGroup', // cada torre atira
      'g2d:everySeconds', // nasce invasor + torres atiram + próxima onda
      'g2d:centerX', // o tiro sai do centro da torre
      'g2d:playExplosion',
      'g2d:playMusic',
      'g2d:playFx',
      'g2d:setScene',
      'g2d:sceneIs',
      'g2d:showScreen',
      'g2d:restart',
      'g2d:drawScore',
      'g2d:drawLabel',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    // É tower-defense de fila reta: sem gravidade, sem tilemap, sem mira homing.
    expect(types.has('g2d:setGravity')).toBe(false)
    expect(types.has('g2d:collideTileMap')).toBe(false)
    expect(types.has('g2d:moveToward')).toBe(false)
    expect(types.has('g2d:aimAt')).toBe(false)
  })

  it('tem três cadências: nascimento, tiro das torres e onda que cresce', () => {
    const loops = muralhaDoReinoExample.ir.behavior.loops
    const everyRoots = loops.filter(
      (statement): statement is Extract<JSStatement, { type: 'g2d:everySeconds' }> =>
        statement.type === 'g2d:everySeconds',
    )
    expect(everyRoots).toHaveLength(3)
    // O invasor nasce fora da tela numa FILA reta (y fixo na faixa dos tiros das
    // torres, senão a bala horizontal nunca encostaria) e marcha para a direita.
    const spawner = everyRoots.find(
      (statement) => JSON.stringify(statement.seconds) === '{"type":"num","value":1.2}',
    )
    const rawSpawner = JSON.stringify(spawner)
    expect(rawSpawner).toContain('"type":"g2d:sceneIs","name":"jogando"')
    expect(rawSpawner).toContain('"type":"g2d:spawnInGroup","groupVar":"inimigos"')
    expect(rawSpawner).toContain('"y":{"type":"num","value":168}')
    // As torres atiram a cada 0,5 s: um forEach solta um tiro por torre.
    const atira = everyRoots.find(
      (statement) => JSON.stringify(statement.seconds) === '{"type":"num","value":0.5}',
    )
    const rawAtira = JSON.stringify(atira)
    expect(rawAtira).toContain('"type":"g2d:forEachInGroup","groupVar":"torres"')
    expect(rawAtira).toContain('"type":"g2d:spawnBullet","groupVar":"tiros"')
    // A onda sobe a cada 8 s.
    const onda = everyRoots.find(
      (statement) => JSON.stringify(statement.seconds) === '{"type":"num","value":8}',
    )
    expect(JSON.stringify(onda)).toContain(
      '"name":"onda","value":{"type":"binop","op":"+","left":{"type":"var","name":"onda"},"right":{"type":"num","value":1}}',
    )
    // A compra da torre gasta 25? não: 50 moedas, dentro do onPointer.
    const events = muralhaDoReinoExample.ir.behavior.events
    const pointer = events.find((statement) => statement.type === 'g2d:onPointer')
    expect(JSON.stringify(pointer)).toContain(
      '"name":"moedas","value":{"type":"binop","op":"-","left":{"type":"var","name":"moedas"},"right":{"type":"num","value":50}}',
    )
    // Nenhuma cadência escondida dentro do "a cada quadro".
    const frameLoop = loops.find((statement) => statement.type === 'g2d:updateEachFrame')
    expect(collectTypes(frameLoop).has('g2d:everySeconds')).toBe(false)
  })

  it('nenhum texto visível usa travessão', () => {
    expect(JSON.stringify(muralhaDoReinoExample.ir)).not.toContain('—')
    expect(muralhaDoReinoExample.name).not.toContain('—')
    expect(muralhaDoReinoExample.description ?? '').not.toContain('—')
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(muralhaDoReinoExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR preserva o jogo inteiro', () => {
    const state = buildWorkspaceStateFromIR(
      muralhaDoReinoExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = behaviorStatements(buildIRFromWorkspace(ws))
      const embedded = behaviorStatements(muralhaDoReinoExample.ir)
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
