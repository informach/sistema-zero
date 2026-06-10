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
})
