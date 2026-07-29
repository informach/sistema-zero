import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { behaviorStatements } from '#ir'
import { gameTwoDExtension } from '../../official-extensions/game-2d/index'
import { parseJS } from '../../parsers/js'
import { buildIRFromWorkspace } from '../buildIR'
import { migrateLegacyValueFields } from '../migrateValueFields'
import { ensureBlocklyInitialized } from '../setup'
import { buildWorkspaceStateFromIR } from '../workspaceState'

type AnyBlock = {
  type?: string
  fields?: Record<string, unknown>
  inputs?: Record<string, unknown>
  [k: string]: unknown
}
const topBlocks = (s: unknown): AnyBlock[] =>
  (s as { blocks?: { blocks?: AnyBlock[] } }).blocks?.blocks ?? []
const firstBlock = (s: unknown): AnyBlock => topBlocks(s)[0] as AnyBlock

describe('migrateLegacyValueFields — campos legados viram soquetes preservando o valor', () => {
  it('sz_g2d_set_position com fields.X/Y antigos → inputs com sombra e valor preservado', () => {
    const legacy = {
      blocks: {
        languageVersion: 0,
        blocks: [{ type: 'sz_g2d_set_position', fields: { SPRITE: 'jogador', X: 120, Y: 80 } }],
      },
    }
    const block = firstBlock(migrateLegacyValueFields(legacy))
    expect(block.fields).toEqual({ SPRITE: 'jogador' }) // X/Y saíram de fields
    expect(block.inputs?.X).toEqual({ shadow: { type: 'sz_val_number', fields: { NUM: 120 } } })
    expect(block.inputs?.Y).toEqual({ shadow: { type: 'sz_val_number', fields: { NUM: 80 } } })
  })

  it('NÃO toca um slot que a criança já preencheu (input existente)', () => {
    const state = {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'sz_g2d_set_velocity',
            fields: { SPRITE: 'bola', VY: 9 },
            inputs: { VX: { block: { type: 'sz_val_variable', fields: { NAME: 'vento' } } } },
          },
        ],
      },
    }
    const block = firstBlock(migrateLegacyValueFields(state))
    expect(block.inputs?.VX).toEqual({
      block: { type: 'sz_val_variable', fields: { NAME: 'vento' } },
    })
    expect(block.inputs?.VY).toEqual({ shadow: { type: 'sz_val_number', fields: { NUM: 9 } } })
  })

  it('devolve a MESMA referência quando não há nada a migrar', () => {
    const clean = {
      blocks: {
        languageVersion: 0,
        blocks: [{ type: 'sz_js_console_log_text', fields: { VALUE: 'oi' } }],
      },
    }
    expect(migrateLegacyValueFields(clean)).toBe(clean)
  })

  it('migra blocos aninhados (dentro de frame)', () => {
    const state = {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'sz_frame_behavior',
            inputs: {
              CHILDREN: {
                block: { type: 'sz_g2d_set_velocity', fields: { SPRITE: 'bola', VX: 5, VY: -3 } },
              },
            },
          },
        ],
      },
    }
    const frame = firstBlock(migrateLegacyValueFields(state))
    const inner = (frame.inputs?.CHILDREN as { block: AnyBlock }).block
    expect(inner.fields).toEqual({ SPRITE: 'bola' })
    expect(inner.inputs?.VX).toEqual({ shadow: { type: 'sz_val_number', fields: { NUM: 5 } } })
    expect(inner.inputs?.VY).toEqual({ shadow: { type: 'sz_val_number', fields: { NUM: -3 } } })
  })
})

describe('Round-trip dos blocos convertidos — aceitam variável/conta', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
    Blockly.defineBlocksWithJsonArray(
      gameTwoDExtension.blockly.blocks as Parameters<typeof Blockly.defineBlocksWithJsonArray>[0],
    )
  })

  it('set_position com X = variável e Y = número entra no IR como expressão (não rawJS)', () => {
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(
        {
          blocks: {
            languageVersion: 0,
            blocks: [
              {
                type: 'sz_frame_behavior',
                inputs: {
                  CHILDREN: {
                    block: {
                      type: 'sz_g2d_set_position',
                      fields: { SPRITE: 'jogador' },
                      inputs: {
                        X: { block: { type: 'sz_val_variable', fields: { NAME: 'alvoX' } } },
                        Y: { block: { type: 'sz_val_number', fields: { NUM: 50 } } },
                      },
                    },
                  },
                },
              },
            ],
          },
        },
        ws,
      )
      const ir = buildIRFromWorkspace(ws)
      const stmt = behaviorStatements(ir).find((s) => s.type === 'g2d:setPosition') as
        | { type: 'g2d:setPosition'; x: unknown; y: unknown }
        | undefined
      expect(stmt).toBeDefined()
      expect(stmt?.x).toMatchObject({ type: 'var', name: 'alvoX' })
      expect(stmt?.y).toMatchObject({ type: 'num', value: 50 })

      // IR → blocos: o set_position volta com o input (não vira rawJS).
      const back = buildWorkspaceStateFromIR(ir)
      const json = JSON.stringify(back)
      expect(json).toContain('sz_g2d_set_position')
      expect(json).toContain('alvoX')
      expect(json).not.toContain('sz_adv_raw_js')
    } finally {
      ws.dispose()
    }
  })
})

function collectTypes(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) for (const item of value) collectTypes(item, out)
  else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.type === 'string') out.add(obj.type)
    for (const v of Object.values(obj)) collectTypes(v, out)
  }
  return out
}

describe('Parser dos blocos convertidos — código com conta/variável vira bloco (não rawJS)', () => {
  it('setHealth com conta, setSize/scaleSprite com variável', () => {
    const t1 = collectTypes(parseJS('SZGame2D.setHealth(jogador, nivel * 3);'))
    expect(t1.has('g2d:setHealth')).toBe(true)
    expect(t1.has('binop')).toBe(true) // a conta nivel*3 virou bloco de conta
    expect(t1.has('rawJS')).toBe(false)

    const t2 = collectTypes(parseJS('SZGame2D.setSize(jogador, larg, larg);'))
    expect(t2.has('g2d:setSize')).toBe(true)
    expect(t2.has('rawJS')).toBe(false)

    const t3 = collectTypes(parseJS('SZGame2D.scaleSprite(jogador, fator);'))
    expect(t3.has('g2d:scaleSprite')).toBe(true)
    expect(t3.has('rawJS')).toBe(false)
  })

  it('migra o `sz_js_for_each` legado: campo NAME → soquete ARRAY com variável', () => {
    const legacy = {
      blocks: {
        blocks: [
          {
            type: 'sz_js_for_each',
            fields: { ITEM: 'carta', INDEX: '', NAME: 'cartas' },
          },
        ],
      },
    }
    const migrated = migrateLegacyValueFields(legacy)
    const b = firstBlock(migrated)
    expect(b.fields?.NAME).toBeUndefined()
    expect(b.fields?.ITEM).toBe('carta')
    const array = (b.inputs?.ARRAY as { block?: AnyBlock } | undefined)?.block
    expect(array?.type).toBe('sz_val_variable')
    expect(array?.fields?.NAME).toBe('cartas')
  })
})
