import { describe, expect, it } from 'bun:test'
import { behaviorStatements, type JSStatement } from '#ir'
import { collectTypes } from '../__gen_dinoCorredor'
import { MURALHA_DO_REINO_SOURCE as SOURCE } from '../__gen_muralhaDoReino'
import { muralhaDoReinoExample } from '../examples'
import { gameTwoDManifest } from '../manifest'
import { registerExampleContractTests, setupGameTwoDExampleTests } from './exampleContractHarness'

/**
 * Drift do exemplo "Muralha do Reino" — a recriação BÁSICA do tower-defense do
 * Chris Courses. A IR embutida em examples/gamesTwoD/muralhaDoReino.ts foi GERADA pelo parser
 * real a partir do SOURCE (que mora no __gen_muralhaDoReino.ts, importado aqui
 * para que fonte e teste NUNCA possam divergir). O preparo do palco (setupStage +
 * setStageDescription) é injetado pelo wrapper `beginnerGameExample` e conferido
 * à parte.
 */

setupGameTwoDExampleTests()

describe('Exemplo Muralha do Reino — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d', () => {
    expect(gameTwoDManifest.examples).toContain(muralhaDoReinoExample)
    expect(muralhaDoReinoExample.ir.extensions).toEqual([{ extensionId: 'game-2d' }])
    expect(muralhaDoReinoExample.name).toBe('Muralha do Reino')
    expect(muralhaDoReinoExample.experience).toBe('game')
    expect((muralhaDoReinoExample.description ?? '').length).toBeLessThanOrEqual(200)
  })

  registerExampleContractTests({
    example: muralhaDoReinoExample,
    source: SOURCE,
    stage: { width: 480, height: 300, bg: '#33502f' },
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
})
