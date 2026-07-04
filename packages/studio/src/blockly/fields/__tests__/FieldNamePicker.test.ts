import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { gameTwoDBlocks } from '../../../official-extensions/game-2d/blocks'
import { registerExtensionBlocks } from '../../blocks'
import { ensureBlocklyInitialized } from '../../setup'
import { collectGroupsAndLists, collectVariables, FieldNamePicker } from '../FieldNamePicker'

describe('FieldNamePicker', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
    registerExtensionBlocks(gameTwoDBlocks)
  })

  describe('collectVariables — nomes das variáveis já criadas', () => {
    it('reconhece variáveis criadas/declaradas e binders de laço, na ordem dos blocos', () => {
      const ws = new Blockly.Workspace()
      ws.newBlock('sz_js_var_create').setFieldValue('contador', 'NAME')
      ws.newBlock('sz_js_const_create').setFieldValue('PI', 'NAME')
      ws.newBlock('sz_js_var_declare').setFieldValue('x', 'NAME')
      ws.newBlock('sz_js_for_range').setFieldValue('i', 'VAR')

      expect(collectVariables(ws)).toEqual(['contador', 'PI', 'x', 'i'])
    })

    it('reconhece variáveis do Jogo 2D (pontuação e resultado de colisão)', () => {
      const ws = new Blockly.Workspace()
      ws.newBlock('sz_g2d_score').setFieldValue('pontos', 'NAME')
      ws.newBlock('sz_g2d_collides').setFieldValue('bateu', 'NAME')

      expect(collectVariables(ws)).toEqual(['pontos', 'bateu'])
    })

    it('reconhece objetos nomeados dos kits (jogo do equilibrista/balão, cidade)', () => {
      const ws = new Blockly.Workspace()
      ws.newBlock('sz_g2d_create_stickhero').setFieldValue('jogo', 'NAME')
      ws.newBlock('sz_g2d_create_city').setFieldValue('cidade', 'NAME')

      expect(collectVariables(ws)).toEqual(['jogo', 'cidade'])
    })

    it('não repete o mesmo nome e ignora blocos que só CONSOMEM a variável', () => {
      const ws = new Blockly.Workspace()
      ws.newBlock('sz_js_var_create').setFieldValue('contador', 'NAME')
      ws.newBlock('sz_js_var_create').setFieldValue('contador', 'NAME') // duplicado
      ws.newBlock('sz_val_variable').setFieldValue('contador', 'NAME') // consumidor (lê)

      expect(collectVariables(ws)).toEqual(['contador'])
    })

    it('pula campo vazio (ex.: a posição em branco do "para cada item")', () => {
      const ws = new Blockly.Workspace()
      const forEach = ws.newBlock('sz_js_for_each') // ITEM='item', INDEX=''
      expect(collectVariables(ws)).toEqual(['item'])
      forEach.setFieldValue('pos', 'INDEX')
      expect(collectVariables(ws)).toEqual(['item', 'pos'])
    })

    it('workspace vazio → lista vazia', () => {
      expect(collectVariables(new Blockly.Workspace())).toEqual([])
      expect(collectVariables(null)).toEqual([])
    })
  })

  describe('collectGroupsAndLists — grupos de sprites + listas de verdade', () => {
    it('reconhece grupos do Jogo 2D (Criar grupo de sprites)', () => {
      const ws = new Blockly.Workspace()
      ws.newBlock('sz_g2d_create_group').setFieldValue('asteroides', 'NAME')

      expect(collectGroupsAndLists(ws)).toEqual(['asteroides'])
    })

    it('reconhece uma variável que guarda uma lista (sz_val_array no valor)', () => {
      const ws = new Blockly.Workspace()
      const varBlock = ws.newBlock('sz_js_var_create')
      varBlock.setFieldValue('minhaLista', 'NAME')
      const arr = ws.newBlock('sz_val_array')
      varBlock.getInput('VALUE')?.connection?.connect(arr.outputConnection as Blockly.Connection)

      expect(collectGroupsAndLists(ws)).toEqual(['minhaLista'])
    })

    it('NÃO lista uma variável que guarda um valor que não é lista (ex.: número)', () => {
      const ws = new Blockly.Workspace()
      const varBlock = ws.newBlock('sz_js_var_create')
      varBlock.setFieldValue('contador', 'NAME')
      const num = ws.newBlock('sz_val_number')
      varBlock.getInput('VALUE')?.connection?.connect(num.outputConnection as Blockly.Connection)

      expect(collectGroupsAndLists(ws)).toEqual([])
    })

    it('junta grupos e listas sem repetir', () => {
      const ws = new Blockly.Workspace()
      ws.newBlock('sz_g2d_create_group').setFieldValue('inimigos', 'NAME')
      const varBlock = ws.newBlock('sz_js_var_assign')
      varBlock.setFieldValue('placar', 'NAME')
      const arr = ws.newBlock('sz_val_array')
      varBlock.getInput('VALUE')?.connection?.connect(arr.outputConnection as Blockly.Connection)

      expect(collectGroupsAndLists(ws)).toEqual(['inimigos', 'placar'])
    })
  })

  describe('fiação do campo (kind chega no fromJson; valor continua string)', () => {
    it('o bloco de LISTA usa um FieldNamePicker de kind "group"', () => {
      const ws = new Blockly.Workspace()
      const block = ws.newBlock('sz_val_array_length')
      const field = block.getField('NAME')
      expect(field).toBeInstanceOf(FieldNamePicker)
      expect((field as FieldNamePicker).kind).toBe('group')
    })

    it('o bloco "valor da variável" usa um FieldNamePicker de kind "variable"', () => {
      const ws = new Blockly.Workspace()
      const block = ws.newBlock('sz_val_variable')
      const field = block.getField('NAME')
      expect(field).toBeInstanceOf(FieldNamePicker)
      expect((field as FieldNamePicker).kind).toBe('variable')
      block.setFieldValue('placar', 'NAME')
      expect(block.getFieldValue('NAME')).toBe('placar')
    })
  })

  describe('round-trip da serialização é lossless (valor string, como field_input)', () => {
    it('carregar um valor salvo em fields.NAME e salvar de novo preserva o nome', () => {
      const ws = new Blockly.Workspace()
      const state = {
        blocks: {
          blocks: [{ type: 'sz_val_variable', fields: { NAME: 'meuNomeEstranho' } }],
        },
      }
      Blockly.serialization.workspaces.load(state, ws)
      const blocks = ws.getAllBlocks(false)
      expect(blocks).toHaveLength(1)
      expect(blocks[0]?.getFieldValue('NAME')).toBe('meuNomeEstranho')

      const saved = Blockly.serialization.workspaces.save(ws) as {
        blocks: { blocks: Array<{ fields?: Record<string, unknown> }> }
      }
      expect(saved.blocks.blocks[0]?.fields?.NAME).toBe('meuNomeEstranho')
    })
  })
})
