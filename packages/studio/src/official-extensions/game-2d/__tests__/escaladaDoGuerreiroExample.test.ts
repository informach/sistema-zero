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
import { ESCALADA_DO_GUERREIRO_SOURCE as SOURCE } from '../__gen_escaladaDoGuerreiro'
import { gameTwoDBlocks } from '../blocks'
import { escaladaDoGuerreiroExample } from '../examples'
import { gameTwoDManifest } from '../manifest'

/**
 * Drift do exemplo "Escalada do Guerreiro" — a recriação BÁSICA do
 * vertical-platformer do Chris Courses. A IR embutida em examples/gamesTwoD.ts foi
 * GERADA pelo parser real a partir do SOURCE (que mora no
 * __gen_escaladaDoGuerreiro.ts, importado aqui para que fonte e teste NUNCA possam
 * divergir). O preparo do palco (setupStage + setStageDescription) é injetado pelo
 * wrapper `beginnerGameExample` e conferido à parte.
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

describe('Exemplo Escalada do Guerreiro — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d', () => {
    expect(gameTwoDManifest.examples).toContain(escaladaDoGuerreiroExample)
    expect(escaladaDoGuerreiroExample.ir.extensions).toEqual([{ extensionId: 'game-2d' }])
    expect(escaladaDoGuerreiroExample.name).toBe('Escalada do Guerreiro')
    expect(escaladaDoGuerreiroExample.experience).toBe('game')
    expect((escaladaDoGuerreiroExample.description ?? '').length).toBeLessThanOrEqual(200)
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall), fora a dupla do wrapper', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE))
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)

    const embedded = stripIds(behaviorStatements(escaladaDoGuerreiroExample.ir)) as JSStatement[]
    expect(embedded[0]).toEqual({
      type: 'g2d:setupStage',
      width: 320,
      height: 480,
      bg: '#8fc0e8',
    } as JSStatement)
    expect(embedded[1]).toEqual({
      type: 'g2d:setStageDescription',
      description: escaladaDoGuerreiroExample.description ?? '',
    } as JSStatement)
    expect(parsed).toEqual(embedded.slice(2))
  })

  it('exercita a mecânica prometida do platformer vertical', () => {
    const types = collectTypes(behaviorStatements(escaladaDoGuerreiroExample.ir))
    for (const t of [
      'g2d:createShapeSprite', // o guerreiro desenhado por código
      'g2d:defineShape', // guerreiro procedural (sem PNG do warrior)
      'g2d:setGravity', // a queda leve (o gravity = 0.1 do original)
      'g2d:arrowsX', // andar para os lados (o a/d do original)
      'g2d:applyVelocity', // integra a velocidade somando a gravidade
      'g2d:setVelocity', // o pulo (o velocity.y = -4 do original)
      'g2d:spriteVy', // o pulo só age parado na vertical (truque do Dino)
      'g2d:setHitboxScale', // colisão perdoadora de 80%
      'g2d:createGroup', // as plataformas
      'g2d:spawnInGroup', // cada plataforma é um retângulo do grupo
      'g2d:collideGroup', // colisão sólida com as plataformas (pousa em cima)
      'g2d:clampToScreen', // não deixa o herói sair da coluna do mundo
      'g2d:cameraFollow', // a câmera sobe com o herói (o pan do original)
      'g2d:createSprite', // a bandeira do topo
      'g2d:spriteY', // detecta a chegada ao topo
      'g2d:playMusic',
      'g2d:playFx',
      'g2d:setScene',
      'g2d:sceneIs',
      'g2d:showScreen',
      'g2d:restart',
      'g2d:drawLabel',
      'g2d:drawGroup',
      'g2d:drawSprite',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    // Climb de plataforma feito na mão: sem o helper platformer (que ancora o chão
    // na borda da tela), sem tiros, sem inimigos, sem tilemap nem top-down.
    expect(types.has('g2d:platformer')).toBe(false)
    expect(types.has('g2d:topDown')).toBe(false)
    expect(types.has('g2d:collideTileMap')).toBe(false)
    expect(types.has('g2d:spawnBullet')).toBe(false)
    expect(types.has('g2d:createEnemyType')).toBe(false)
  })

  it('a câmera segue num mundo mais alto que a tela e o topo vence', () => {
    const loops = escaladaDoGuerreiroExample.ir.behavior.loops
    const frameLoop = loops.find((statement) => statement.type === 'g2d:updateEachFrame')
    const rawFrame = JSON.stringify(frameLoop)
    // O mundo tem 960 de altura (maior que os 480 do palco): a câmera sobe.
    expect(rawFrame).toContain(
      '"type":"g2d:cameraFollow","spriteVar":"heroi","worldW":{"type":"num","value":320},"worldH":{"type":"num","value":960}',
    )
    // A vitória dispara quando o herói passa da linha do topo (spriteY < 90).
    expect(rawFrame).toContain(
      '"op":"<","left":{"type":"g2d:spriteY","spriteVar":"heroi"},"right":{"type":"num","value":90}',
    )
    // Nenhuma cadência periódica: o climb é só o quadro (sem "A cada").
    expect(loops.every((statement) => statement.type === 'g2d:updateEachFrame')).toBe(true)
    expect(collectTypes(frameLoop).has('g2d:everySeconds')).toBe(false)
  })

  it('nenhum texto visível usa travessão', () => {
    expect(JSON.stringify(escaladaDoGuerreiroExample.ir)).not.toContain('—')
    expect(escaladaDoGuerreiroExample.name).not.toContain('—')
    expect(escaladaDoGuerreiroExample.description ?? '').not.toContain('—')
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(escaladaDoGuerreiroExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR preserva o jogo inteiro', () => {
    const state = buildWorkspaceStateFromIR(
      escaladaDoGuerreiroExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = behaviorStatements(buildIRFromWorkspace(ws))
      const embedded = behaviorStatements(escaladaDoGuerreiroExample.ir)
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
