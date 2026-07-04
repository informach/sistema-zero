import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { gameTwoDBlocks } from '../../../official-extensions/game-2d/blocks'
import { registerExtensionBlocks } from '../../blocks'
import { ensureBlocklyInitialized } from '../../setup'
import {
  collectGroupsAndLists,
  collectScopedVariableNames,
  collectVariables,
  FieldNamePicker,
} from '../FieldNamePicker'

describe('FieldNamePicker', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
    registerExtensionBlocks(gameTwoDBlocks)
  })

  describe('collectVariables — nomes das variáveis já criadas', () => {
    it('reconhece variáveis criadas/declaradas (globais), na ordem dos blocos', () => {
      const ws = new Blockly.Workspace()
      ws.newBlock('sz_js_var_create').setFieldValue('contador', 'NAME')
      ws.newBlock('sz_js_const_create').setFieldValue('PI', 'NAME')
      ws.newBlock('sz_js_var_declare').setFieldValue('x', 'NAME')

      expect(collectVariables(ws)).toEqual(['contador', 'PI', 'x'])
    })

    it('NÃO inclui variáveis de laço no global (elas são LOCAIS/escopadas)', () => {
      const ws = new Blockly.Workspace()
      ws.newBlock('sz_js_for_range').setFieldValue('i', 'VAR')
      ws.newBlock('sz_js_for_each') // ITEM='item'

      expect(collectVariables(ws)).toEqual([])
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

    it('workspace vazio → lista vazia', () => {
      expect(collectVariables(new Blockly.Workspace())).toEqual([])
      expect(collectVariables(null)).toEqual([])
    })
  })

  describe('collectScopedVariableNames — variáveis LOCAIS do laço-pai em escopo', () => {
    /** Encaixa `child` num input de statement (ex.: DO) de `parent`. */
    function nestStmt(parent: Blockly.Block, child: Blockly.Block, input: string): void {
      parent.getInput(input)?.connection?.connect(child.previousConnection as Blockly.Connection)
    }

    it('vê a variável do laço "contar" (for_range → VAR)', () => {
      const ws = new Blockly.Workspace()
      const loop = ws.newBlock('sz_js_for_range')
      loop.setFieldValue('i', 'VAR')
      const inner = ws.newBlock('sz_js_console_log_var')
      nestStmt(loop, inner, 'DO')

      expect(collectScopedVariableNames(inner)).toEqual(['i'])
    })

    it('junta laços aninhados e pula a posição em branco do "para cada item"', () => {
      const ws = new Blockly.Workspace()
      const outer = ws.newBlock('sz_js_for_range')
      outer.setFieldValue('linha', 'VAR')
      const inner = ws.newBlock('sz_js_for_each') // ITEM='item', INDEX=''
      nestStmt(outer, inner, 'DO')
      const leaf = ws.newBlock('sz_js_console_log_var')
      nestStmt(inner, leaf, 'DO')

      // ITEM 'item' (do para-cada) + 'linha' (do contar); INDEX vazio é pulado.
      expect(collectScopedVariableNames(leaf)).toEqual(['item', 'linha'])
    })

    it('vê o "item" do "transformar lista" dentro do valor (array_map → ITEM)', () => {
      const ws = new Blockly.Workspace()
      const map = ws.newBlock('sz_val_array_map')
      map.setFieldValue('n', 'ITEM')
      const inner = ws.newBlock('sz_val_variable')
      map.getInput('TRANSFORM')?.connection?.connect(inner.outputConnection as Blockly.Connection)

      expect(collectScopedVariableNames(inner)).toEqual(['n'])
    })

    it('fora de qualquer laço → nenhuma variável local', () => {
      const ws = new Blockly.Workspace()
      const solto = ws.newBlock('sz_val_variable')
      expect(collectScopedVariableNames(solto)).toEqual([])
      expect(collectScopedVariableNames(null)).toEqual([])
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
