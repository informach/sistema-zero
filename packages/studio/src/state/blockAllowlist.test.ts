import { describe, expect, it } from 'bun:test'
import { CORE_BLOCKS } from '#blockly'
import { CORE_BLOCKLY_BLOCK_TYPES } from './projectStore'

/**
 * A allowlist de tipos de bloco em projectStore é validada no load/import: se um
 * tipo de CORE_BLOCKS não estiver nela, o blocksState salvo inteiro é descartado
 * (o editor de blocos fica vazio mesmo com código no Monaco). Este teste impede
 * que adicionar um bloco novo sem registrá-lo na allowlist passe despercebido.
 */
describe('CORE_BLOCKLY_BLOCK_TYPES', () => {
  it('contém todos os tipos de CORE_BLOCKS (inclusive blocos ocultos)', () => {
    const faltando = CORE_BLOCKS.map((b) => b.type).filter(
      (type) => !CORE_BLOCKLY_BLOCK_TYPES.has(type),
    )
    expect(faltando).toEqual([])
  })

  it('persiste as primitives profissionais sem extensão', () => {
    for (const type of [
      'sz_val_json_data',
      'sz_val_json_parse',
      'sz_val_json_stringify',
      'sz_val_gamepad_connected',
      'sz_val_gamepad_axis',
      'sz_val_gamepad_button',
      'sz_js_storage_remove',
      'sz_som_tone',
      'sz_som_noise',
    ]) {
      expect(CORE_BLOCKLY_BLOCK_TYPES.has(type), type).toBe(true)
    }
  })
})
