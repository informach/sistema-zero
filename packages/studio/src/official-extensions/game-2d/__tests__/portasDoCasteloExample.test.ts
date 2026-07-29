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
import { PORTAS_DO_CASTELO_SOURCE as SOURCE } from '../__gen_portasDoCastelo'
import { gameTwoDBlocks } from '../blocks'
import { portasDoCasteloExample } from '../examples'
import { gameTwoDManifest } from '../manifest'

/**
 * Drift do exemplo "Portas do Castelo" — a recriação BÁSICA do plataforma por
 * fases do kings-and-pigs do Chris Courses. A IR embutida em examples/gamesTwoD.ts
 * foi GERADA pelo parser real a partir do SOURCE (que mora no
 * __gen_portasDoCastelo.ts, importado aqui para que fonte e teste NUNCA possam
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

describe('Exemplo Portas do Castelo — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d', () => {
    expect(gameTwoDManifest.examples).toContain(portasDoCasteloExample)
    expect(portasDoCasteloExample.ir.extensions).toEqual([{ extensionId: 'game-2d' }])
    expect(portasDoCasteloExample.name).toBe('Portas do Castelo')
    expect(portasDoCasteloExample.experience).toBe('game')
    expect((portasDoCasteloExample.description ?? '').length).toBeLessThanOrEqual(200)
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall), fora a dupla do wrapper', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE))
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)

    const embedded = stripIds(behaviorStatements(portasDoCasteloExample.ir)) as JSStatement[]
    expect(embedded[0]).toEqual({
      type: 'g2d:setupStage',
      width: 480,
      height: 300,
      bg: '#243050',
    } as JSStatement)
    expect(embedded[1]).toEqual({
      type: 'g2d:setStageDescription',
      description: portasDoCasteloExample.description ?? '',
    } as JSStatement)
    expect(parsed).toEqual(embedded.slice(2))
  })

  it('exercita a mecânica prometida do plataforma por fases', () => {
    const types = collectTypes(behaviorStatements(portasDoCasteloExample.ir))
    for (const t of [
      'g2d:createShapeSprite', // o rei desenhado por código
      'g2d:defineShape', // rei procedural (sem PNG)
      'g2d:createGroup', // os blocos de colisão
      'g2d:createSprite', // a porta
      'g2d:setGravity', // gravidade do mundo
      'g2d:applyVelocity', // integra a queda
      'g2d:collideGroup', // pousa nas plataformas e bate nas paredes
      'g2d:clampToScreen',
      'g2d:setHitboxScale',
      'g2d:arrowsX', // anda com as setas
      'g2d:spriteVy', // pula só no chão
      'g2d:touches', // encosta na porta
      'g2d:flash', // o clarão da transição (o fade do original)
      'g2d:clearGroup', // remonta as plataformas ao trocar de fase
      'g2d:spawnInGroup', // nascem os blocos de cada fase
      'g2d:setPosition', // reposiciona rei e porta
      'g2d:setVelocity',
      'g2d:onKey',
      'g2d:setScene',
      'g2d:sceneIs',
      'g2d:showScreen',
      'g2d:restart',
      'g2d:playMusic',
      'g2d:playFx',
      'g2d:drawScore',
      'g2d:drawLabel',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    // É plataforma de fila plana com fade: sem tilemap, sem câmera, sem inimigos.
    expect(types.has('g2d:collideTileMap')).toBe(false)
    expect(types.has('g2d:cameraFollow')).toBe(false)
    expect(types.has('g2d:createEnemyType')).toBe(false)
  })

  it('a transição é toda no "a cada quadro": nenhuma cadência de tempo', () => {
    const loops = portasDoCasteloExample.ir.behavior.loops
    // Nenhum "A cada N segundos/quadros": a fase troca por um contador de quadros.
    expect(loops.some((statement) => statement.type === 'g2d:everySeconds')).toBe(false)
    expect(loops.some((statement) => statement.type === 'g2d:everyFrames')).toBe(false)
    // O clarão e a troca de fase vivem no loop principal.
    const frameLoop = loops.find((statement) => statement.type === 'g2d:updateEachFrame')
    const frameTypes = collectTypes(frameLoop)
    expect(frameTypes.has('g2d:flash')).toBe(true)
    expect(frameTypes.has('g2d:clearGroup')).toBe(true)
    expect(frameTypes.has('g2d:touches')).toBe(true)
  })

  it('nenhum texto visível usa travessão', () => {
    expect(JSON.stringify(portasDoCasteloExample.ir)).not.toContain('—')
    expect(portasDoCasteloExample.name).not.toContain('—')
    expect(portasDoCasteloExample.description ?? '').not.toContain('—')
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(portasDoCasteloExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR preserva o jogo inteiro', () => {
    const state = buildWorkspaceStateFromIR(
      portasDoCasteloExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = behaviorStatements(buildIRFromWorkspace(ws))
      const embedded = behaviorStatements(portasDoCasteloExample.ir)
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
