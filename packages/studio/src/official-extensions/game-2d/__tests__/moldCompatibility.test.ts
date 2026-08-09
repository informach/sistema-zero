import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { generateProjectFiles } from '#generators'
import type { JSStatement, SZIR } from '#ir'
import { normalizeSZIR, SZIRV2Schema } from '#ir'
import { parseProjectFilesWithDiagnostics } from '#parsers'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { normalizeBlocksStateToFrames } from '../../../blockly/normalizeFrames'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { gameTwoDBlocks } from '../blocks'

const defineEnemy: JSStatement = {
  type: 'g2d:defineEnemyType',
  varName: 'zumbis',
  behavior: 'patrulha',
  color: '#e4573d',
  image: '',
  hp: 1,
  speed: 1,
  dmg: 1,
  w: 32,
  h: 32,
}

const firstSpawn: JSStatement = {
  type: 'g2d:spawnEnemy',
  typeVar: 'zumbis',
  varName: 'fraco',
  x: 20,
  y: 40,
}

const strengthenNextWave: JSStatement = {
  type: 'g2d:setEnemyTypeParam',
  typeVar: 'zumbis',
  param: 'vida',
  value: 10,
}

const addShooterBehavior: JSStatement = {
  type: 'g2d:enemyAddBehavior',
  typeVar: 'zumbis',
  behavior: 'atirador',
}

const secondSpawn: JSStatement = {
  type: 'g2d:spawnEnemy',
  typeVar: 'zumbis',
  varName: 'forte',
  x: 200,
  y: 40,
}

function frameChildren(state: unknown, frameType: string): string[] {
  const tops =
    (state as { blocks?: { blocks?: Array<Record<string, unknown>> } }).blocks?.blocks ?? []
  const frame = tops.find((block) => block.type === frameType)
  const result: string[] = []
  let current = (frame?.inputs as { CHILDREN?: { block?: Record<string, unknown> } } | undefined)
    ?.CHILDREN?.block
  while (current) {
    result.push(String(current.type))
    current = (current.next as { block?: Record<string, unknown> } | undefined)?.block
  }
  return result
}

describe('compatibilidade da migração dos ajustes de inimigo', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
    registerExtensionBlocks(gameTwoDBlocks)
  })

  it('a IR plana antiga preserva os ajustes entre os dois spawns', () => {
    const legacy: SZIR = {
      html: [],
      css: [],
      js: [defineEnemy, firstSpawn, strengthenNextWave, addShooterBehavior, secondSpawn],
      extensions: [{ extensionId: 'game-2d' }],
    }

    const normalized = normalizeSZIR(legacy)
    expect(normalized.behavior.molds?.map((statement) => statement.type)).toEqual([
      'g2d:defineEnemyType',
    ])
    expect(normalized.behavior.start.map((statement) => statement.type)).toEqual([
      'g2d:spawnEnemy',
      'g2d:setEnemyTypeParamLegacyStart',
      'g2d:enemyAddBehaviorLegacyStart',
      'g2d:spawnEnemy',
    ])
    expect(SZIRV2Schema.safeParse(normalized).success).toBe(true)
  })

  it('preserva a mesma ordem ao passar por Código e voltar aos blocos', () => {
    const legacy: SZIR = {
      html: [],
      css: [],
      js: [defineEnemy, firstSpawn, strengthenNextWave, addShooterBehavior, secondSpawn],
      extensions: [{ extensionId: 'game-2d' }],
    }

    const files = generateProjectFiles({ ir: legacy, projectName: 'Ondas antigas' })
    const reparsed = parseProjectFilesWithDiagnostics(files).ir
    expect(reparsed.behavior.molds?.map((statement) => statement.type)).toEqual([
      'g2d:defineEnemyType',
    ])
    expect(reparsed.behavior.start.map((statement) => statement.type)).toEqual([
      'g2d:spawnEnemy',
      'g2d:setEnemyTypeParamLegacyStart',
      'g2d:enemyAddBehaviorLegacyStart',
      'g2d:spawnEnemy',
    ])
    expect(SZIRV2Schema.safeParse(reparsed).success).toBe(true)
  })

  it('o workspace antigo migra para blocos ocultos no mesmo ponto do Ao iniciar', () => {
    const chain = [
      'sz_g2d_define_enemy_type',
      'sz_g2d_spawn_enemy',
      'sz_g2d_enemy_type_param',
      'sz_g2d_enemy_add_behavior',
      'sz_g2d_spawn_enemy',
    ].reduceRight<Record<string, unknown> | undefined>(
      (next, type) => ({ type, ...(next ? { next: { block: next } } : {}) }),
      undefined,
    )
    const legacyState = {
      szBehaviorAreasVersion: 6,
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'sz_frame_start',
            inputs: { CHILDREN: { block: chain } },
          },
        ],
      },
    }

    const migrated = normalizeBlocksStateToFrames(legacyState)
    expect(frameChildren(migrated, 'sz_frame_molds')).toEqual(['sz_g2d_define_enemy_type'])
    expect(frameChildren(migrated, 'sz_frame_start')).toEqual([
      'sz_g2d_spawn_enemy',
      'sz_g2d_enemy_type_param_legacy_start',
      'sz_g2d_enemy_add_behavior_legacy_start',
      'sz_g2d_spawn_enemy',
    ])
  })
})
