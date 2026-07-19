import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { OFFICIAL_CATALOG } from '#official-extensions'
import {
  getBlockContract,
  inferBlockContract,
  materializeBlockDefinition,
  registerBlockContracts,
} from '../blockContracts'
import { CORE_BLOCKS, registerExtensionBlocks } from '../blocks'

function definition(type: string) {
  const all = [...CORE_BLOCKS, ...OFFICIAL_CATALOG.flatMap((extension) => extension.blockly.blocks)]
  const found = all.find((block) => block.type === type)
  if (!found) throw new Error(`Bloco ausente no teste: ${type}`)
  return found
}

describe('contrato central de posicionamento', () => {
  it('classifica todos os blocos core e das extensões oficiais', () => {
    const all = [
      ...CORE_BLOCKS,
      ...OFFICIAL_CATALOG.flatMap((extension) => extension.blockly.blocks),
    ]
    expect(() => registerBlockContracts(all)).not.toThrow()
    for (const block of all) {
      expect(getBlockContract(block.type), block.type).toBeDefined()
    }
  })

  it('separa fisicamente início, eventos e loops', () => {
    expect(
      materializeBlockDefinition(definition('sz_js_console_log_text')).previousStatement,
    ).toEqual(['JSStartRoot', 'JSStmt'])
    expect(materializeBlockDefinition(definition('sz_js_on_click')).previousStatement).toEqual([
      'JSEventRoot',
    ])
    expect(materializeBlockDefinition(definition('sz_canvas_anim_loop')).previousStatement).toEqual(
      ['JSLoopRoot'],
    )
  })

  it('repara um bloco que foi registrado externamente sem o contrato físico', () => {
    const raw = {
      type: 'sz_test_external_registration',
      message0: 'teste',
      previousStatement: 'JSStmt',
      nextStatement: 'JSStmt',
      colour: 20,
    }
    Blockly.defineBlocksWithJsonArray([raw])

    try {
      registerExtensionBlocks([raw])
      const workspace = new Blockly.Workspace()
      try {
        const block = workspace.newBlock(raw.type)
        expect(block.previousConnection?.getCheck()).toEqual(['JSStartRoot', 'JSStmt'])
      } finally {
        workspace.dispose()
      }
    } finally {
      delete Blockly.Blocks[raw.type]
    }
  })

  it('não chama varreduras contínuas de evento', () => {
    for (const type of [
      'sz_g2d_on_enemy_shot_hit',
      'sz_g2d_on_group_overlap',
      'sz_g2d_on_sprite_group_overlap',
    ]) {
      const contract = inferBlockContract(definition(type))
      expect(contract.placement?.role, type).toBe('loop')
      expect(contract.placement?.root, type).toEqual([])
      expect(contract.placement?.nested, type).toEqual(['loop-body'])
    }
  })

  it('mantém métodos do evento fora das raízes', () => {
    const contract = inferBlockContract(definition('sz_js_event_method'))
    expect(contract.placement?.root).toEqual([])
    expect(contract.placement?.nested).toEqual(['event-body'])
  })

  it('não confunde comandos que contêm “on” com eventos', () => {
    for (const type of ['sz_gk_keep_on_screen', 'sz_gk_bounce_on_edges', 'sz_gk_lean_on_move']) {
      const contract = inferBlockContract(definition(type))
      expect(contract.placement?.role, type).toBe('command')
      expect(contract.placement?.root, type).toEqual(['start'])
    }
    expect(inferBlockContract(definition('sz_gk_rpg_on_step')).placement?.role).toBe('event')
  })

  it('marca wrappers e boots antigos para migração, não para projetos novos', () => {
    expect(inferBlockContract(definition('sz_g2d_on_start')).migration).toBe('unwrap-start')
    expect(inferBlockContract(definition('sz_js_on_load')).migration).toBe('unwrap-load')
    expect(inferBlockContract(definition('sz_gk_start')).migration).toBe('remove-engine-boot')
  })
})
