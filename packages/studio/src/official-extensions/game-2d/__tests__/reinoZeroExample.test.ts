import { describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import { behaviorStatements, SZIRV2Schema } from '#ir'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { parseJS } from '../../../parsers/js'
import { sanitizeImportedBlocksState } from '../../../state/projectStore'
import { gameTwoDExamples } from '../exampleCatalog'
import { reinoZeroExample, reinoZeroLevelNames } from '../examples'

function collectTypes(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) collectTypes(item, out)
  } else if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (typeof record.type === 'string') out.push(record.type)
    for (const child of Object.values(record)) collectTypes(child, out)
  }
  return out
}

describe('Reino Zero — campanha de plataforma vetorial', () => {
  it('é um exemplo público avançado, autoral e sem assets externos', () => {
    expect(gameTwoDExamples).toContain(reinoZeroExample)
    expect(reinoZeroExample).toMatchObject({
      name: 'Reino Zero',
      experience: 'game',
      difficulty: 'advanced',
      genre: 'plataforma',
    })
    expect(reinoZeroExample.assets ?? []).toEqual([])
    expect(reinoZeroExample.ir.extensions).toEqual([{ extensionId: 'game-2d' }])
  })

  it('declara 8 mundos × 4 fases únicas no canvas lógico de 256×240', () => {
    expect(reinoZeroLevelNames).toEqual([
      '1-1',
      '1-2',
      '1-3',
      '1-4',
      '2-1',
      '2-2',
      '2-3',
      '2-4',
      '3-1',
      '3-2',
      '3-3',
      '3-4',
      '4-1',
      '4-2',
      '4-3',
      '4-4',
      '5-1',
      '5-2',
      '5-3',
      '5-4',
      '6-1',
      '6-2',
      '6-3',
      '6-4',
      '7-1',
      '7-2',
      '7-3',
      '7-4',
      '8-1',
      '8-2',
      '8-3',
      '8-4',
    ])
    const maps = reinoZeroExample.ir.behavior.start.filter(
      (statement) => statement.type === 'g2d:createVectorTileMap',
    )
    expect(maps).toHaveLength(32)
    expect(new Set(maps.map((map) => map.grid)).size).toBe(32)
    const widths: number[] = []
    for (const map of maps) {
      const rows = map.grid.split(';')
      expect(rows).toHaveLength(15)
      const width = rows[0]?.split(' ').length ?? 0
      widths.push(width)
      expect(rows.every((row) => row.split(' ').length === width)).toBe(true)
    }
    expect(widths).toEqual([
      72, 74, 76, 73, 74, 76, 78, 75, 76, 78, 74, 77, 73, 77, 75, 78, 75, 78, 76, 77, 76, 78, 75,
      77, 77, 76, 78, 74, 78, 77, 76, 78,
    ])
    expect(new Set(widths).size).toBeGreaterThanOrEqual(6)
    expect(reinoZeroExample.ir.behavior.start[0]).toMatchObject({
      type: 'g2d:setupStage',
      width: 256,
      height: 240,
    })
  })

  it('cobre campanha, dois jogadores, segunda jornada, segredos e arquétipos de inimigo', () => {
    const serialized = JSON.stringify(reinoZeroExample.ir)
    for (const expected of [
      '"type":"g2d:classicPlatformer"',
      '"type":"g2d:swim"',
      '"type":"g2d:forEachTileContact"',
      '"type":"g2d:tileContactIs"',
      '"type":"g2d:updateEnemyShells"',
      '"type":"g2d:allEnemiesGroup","varName":"todosInimigos"',
      '"type":"g2d:onEnemyShotHit","spriteVar":"lumi","typeVar":"guardioes"',
      '"type":"g2d:onActionPressed","action":"pause"',
      '"type":"g2d:setEnemyStompMode","typeVar":"guardioes","mode":"damage"',
      '"mode":"spiky"',
      '"behavior":"voador-vertical"',
      '"behavior":"chefao"',
      '"type":"g2d:countGroup","groupVar":"guardioes"',
      '"name":"jogadores"',
      '"name":"jornada"',
      '"name":"continua"',
    ]) {
      expect(serialized).toContain(expected)
    }
    expect(reinoZeroExample.description).toContain('Backspace')
  })

  it('não devolve o turno a um jogador sem vidas', () => {
    const loop = reinoZeroExample.ir.behavior.loops.find(
      (statement) => statement.type === 'g2d:updateEachFrame',
    )
    if (loop?.type !== 'g2d:updateEachFrame') throw new Error('loop principal ausente')
    const playing = loop.body.find(
      (statement) =>
        statement.type === 'if' &&
        statement.cond.type === 'g2d:sceneIs' &&
        statement.cond.name === 'jogando',
    )
    if (playing?.type !== 'if') throw new Error('cena jogando ausente')
    const death = playing.then.find(
      (statement) =>
        statement.type === 'if' &&
        statement.then[0]?.type === 'if' &&
        statement.then[0].then[0]?.type === 'assign' &&
        statement.then[0].then[0].name === 'vidas1',
    )
    if (death?.type !== 'if') throw new Error('regra de morte ausente')

    const code = compileStatements(death.then.slice(0, 2), 0)
    const applyDeath = new Function(
      'state',
      `let jogador = state.jogador, jogadores = state.jogadores, vidas1 = state.vidas1, vidas2 = state.vidas2;${code};return { jogador, jogadores, vidas1, vidas2 };`,
    )
    const afterPlayerOne = applyDeath({ jogador: 1, jogadores: 2, vidas1: 1, vidas2: 3 })
    const afterPlayerTwo = applyDeath(afterPlayerOne)

    expect(afterPlayerOne).toEqual({ jogador: 2, jogadores: 2, vidas1: 0, vidas2: 3 })
    expect(afterPlayerTwo).toEqual({ jogador: 2, jogadores: 2, vidas1: 0, vidas2: 2 })
  })

  it('persiste o workspace completo sem ultrapassar o sanitizer de projetos', () => {
    const state = buildWorkspaceStateFromIR(reinoZeroExample.ir)
    expect(
      sanitizeImportedBlocksState(state, [{ id: 'game-2d', version: '0.74.0', installedAt: 0 }]),
    ).toBe(state)
  })

  it('valida, gera e volta pelo parser sem código avançado nem memberCall', () => {
    const schema = SZIRV2Schema.safeParse(reinoZeroExample.ir)
    expect(schema.success, schema.success ? '' : JSON.stringify(schema.error.issues)).toBe(true)
    const sourceTypes = collectTypes(reinoZeroExample.ir)
    expect(sourceTypes).not.toContain('rawJS')
    expect(sourceTypes).not.toContain('memberCall')

    const code = compileStatements(behaviorStatements(reinoZeroExample.ir), 0)
    expect(code.match(/createVectorTileMap/g)).toHaveLength(32)
    expect(code).toContain('SZGame2D.tileContactIs(bloco, 2)')
    expect(code).toContain('SZGame2D.enableClassicControls("auto")')
    expect(collectTypes(parseJS(code))).not.toContain('rawJS')
  })
})
