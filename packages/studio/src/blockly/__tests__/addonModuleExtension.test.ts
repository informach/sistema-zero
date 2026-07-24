import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { ensureBlocklyInitialized } from '../setup'

/**
 * Extensão de visibilidade do "usar … da biblioteca" (`sz_t3d_import_named`):
 * a linha "no arquivo …" (MODULE) só aparece quando carrega informação real —
 * addon fora do catálogo ou caminho não-canônico (Ponte). No fluxo normal do
 * picker ela fica escondida (o caminho é derivável do addon). Serialização
 * INTOCADA: o campo continua salvo mesmo invisível.
 */
describe('sz_t3d_import_named — visibilidade da linha "no arquivo"', () => {
  let workspace: Blockly.Workspace

  beforeAll(() => {
    ensureBlocklyInitialized()
    workspace = new Blockly.Workspace()
  })
  afterAll(() => {
    workspace.dispose()
  })

  function makeBlock(): Blockly.Block {
    return workspace.newBlock('sz_t3d_import_named')
  }
  function moduleInput(block: Blockly.Block) {
    const input = block.inputList.find((i) => i.fieldRow.some((f) => f.name === 'MODULE'))
    if (!input) throw new Error('input do MODULE não encontrado')
    return input
  }

  it('nasce com a linha escondida (addon do catálogo + caminho automático)', () => {
    const block = makeBlock()
    expect(block.getFieldValue('NAMES')).toBe('GLTFLoader')
    expect(moduleInput(block).isVisible()).toBe(false)
    block.dispose()
  })

  it('addon fora do catálogo → a linha aparece p/ a criança informar o arquivo', () => {
    const block = makeBlock()
    block.setFieldValue('MinhaClasse', 'NAMES')
    expect(moduleInput(block).isVisible()).toBe(true)
    // Voltar a um addon conhecido esconde de novo.
    block.setFieldValue('OrbitControls', 'NAMES')
    expect(moduleInput(block).isVisible()).toBe(false)
    block.dispose()
  })

  it('caminho CANÔNICO vindo da Ponte segue escondido; divergente aparece', () => {
    const block = makeBlock()
    block.setFieldValue('OrbitControls', 'NAMES')
    // A Ponte grava o caminho real (não o marcador "automático") — redundante = some.
    block.setFieldValue('three/addons/controls/OrbitControls.js', 'MODULE')
    expect(moduleInput(block).isVisible()).toBe(false)
    // Nome conhecido amarrado a OUTRO arquivo é anomalia — precisa ficar visível.
    block.setFieldValue('three/addons/loaders/GLTFLoader.js', 'MODULE')
    expect(moduleInput(block).isVisible()).toBe(true)
    block.dispose()
  })

  it('o MODULE continua SERIALIZADO mesmo com a linha escondida (round-trip intacto)', () => {
    const block = makeBlock()
    expect(moduleInput(block).isVisible()).toBe(false)
    const state = Blockly.serialization.blocks.save(block) as { fields?: Record<string, unknown> }
    expect(state.fields?.MODULE).toBe('automático')
    expect(state.fields?.NAMES).toBe('GLTFLoader')
    block.dispose()
  })
})
