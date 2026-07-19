import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { gameTwoDBlocks } from '../../../official-extensions/game-2d/blocks'
import { gameKitBlocks } from '../../../official-extensions/game-2d-advanced/blocks'
import { gameThreeDBlocks } from '../../../official-extensions/game-3d/blocks'
import { registerExtensionBlocks } from '../../blocks'
import { ensureBlocklyInitialized } from '../../setup'
import {
  collectCanvasIds,
  collectClassNames,
  collectCSSAnimations,
  collectCSSFonts,
  collectCSSSelectors,
  collectFunctionNames,
  collectGroups3d,
  collectGroupsAndLists,
  collectMethodNames,
  collectObjects3d,
  collectPropertyNames,
  collectScenes3d,
  collectScopedVariableNames,
  collectSpritesheets,
  collectTilemaps,
  collectVariables,
  FieldNamePicker,
} from '../FieldNamePicker'

describe('FieldNamePicker', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
    registerExtensionBlocks(gameTwoDBlocks)
    registerExtensionBlocks(gameKitBlocks)
    registerExtensionBlocks(gameThreeDBlocks)
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

    it('reconhece instâncias de objeto (criar pessoa = novo Pessoa → VARNAME)', () => {
      const ws = new Blockly.Workspace()
      const novo = ws.newBlock('sz_js_new_var')
      novo.setFieldValue('joao', 'VARNAME')
      novo.setFieldValue('Pessoa', 'CLASS')

      expect(collectVariables(ws)).toEqual(['joao'])
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

  describe('collectClassNames / collectFunctionNames / collectMethodNames / collectPropertyNames', () => {
    it('lista os nomes de classe declarados', () => {
      const ws = new Blockly.Workspace()
      ws.newBlock('sz_js_class').setFieldValue('Pessoa', 'NAME')
      ws.newBlock('sz_js_class').setFieldValue('Carro', 'NAME')
      expect(collectClassNames(ws)).toEqual(['Pessoa', 'Carro'])
    })

    it('lista os nomes de função declarados', () => {
      const ws = new Blockly.Workspace()
      ws.newBlock('sz_js_function').setFieldValue('fazerAlgo', 'NAME')
      expect(collectFunctionNames(ws)).toEqual(['fazerAlgo'])
    })

    it('lista os métodos de todas as classes (fallback global)', () => {
      const ws = new Blockly.Workspace()
      ws.newBlock('sz_js_class_method').setFieldValue('falar', 'NAME')
      ws.newBlock('sz_js_class_method').setFieldValue('andar', 'NAME')
      expect(collectMethodNames(ws)).toEqual(['falar', 'andar'])
    })

    it('lista propriedades escritas (this.x/obj.x) + chaves de objeto literal', () => {
      const ws = new Blockly.Workspace()
      ws.newBlock('sz_js_set_this_prop').setFieldValue('nome', 'NAME')
      ws.newBlock('sz_js_member_set').setFieldValue('x', 'NAME')
      // sz_val_object nasce com uma chave KEY0 (default) — renomeamos para 'cor'.
      ws.newBlock('sz_val_object').setFieldValue('cor', 'KEY0')
      expect(collectPropertyNames(ws)).toEqual(['nome', 'x', 'cor'])
    })
  })

  describe('fiação dos blocos de OOP (o consumidor certo vira picker com o kind certo)', () => {
    const kindOf = (block: Blockly.Block, field: string): string | undefined => {
      const f = block.getField(field)
      return f instanceof FieldNamePicker ? f.kind : undefined
    }

    it('classe: sz_js_new_var.CLASS = class; VARNAME segue texto (declara)', () => {
      const b = new Blockly.Workspace().newBlock('sz_js_new_var')
      expect(kindOf(b, 'CLASS')).toBe('class')
      expect(b.getField('VARNAME')).not.toBeInstanceOf(FieldNamePicker)
    })

    it('método/objeto: sz_js_call_method.OBJ = variable, METHOD = method', () => {
      const b = new Blockly.Workspace().newBlock('sz_js_call_method')
      expect(kindOf(b, 'OBJ')).toBe('variable')
      expect(kindOf(b, 'METHOD')).toBe('method')
    })

    it('propriedade: sz_val_get_prop.NAME = property, OBJ = variable', () => {
      const b = new Blockly.Workspace().newBlock('sz_val_get_prop')
      expect(kindOf(b, 'NAME')).toBe('property')
      expect(kindOf(b, 'OBJ')).toBe('variable')
    })

    it('propriedade "minha": sz_val_this_prop.NAME = property', () => {
      const b = new Blockly.Workspace().newBlock('sz_val_this_prop')
      expect(kindOf(b, 'NAME')).toBe('property')
    })

    it('objeto (tomada de valor): sz_val_member_get.NAME = property', () => {
      const b = new Blockly.Workspace().newBlock('sz_val_member_get')
      expect(kindOf(b, 'NAME')).toBe('property')
    })

    it('função: sz_js_call_function.NAME = function', () => {
      const b = new Blockly.Workspace().newBlock('sz_js_call_function')
      expect(kindOf(b, 'NAME')).toBe('function')
    })

    it('herança: o campo SUPER do extends é um picker de classe', () => {
      const cls = new Blockly.Workspace().newBlock('sz_js_class') as Blockly.Block & {
        addExtends_(): void
      }
      cls.addExtends_()
      expect(kindOf(cls, 'SUPER')).toBe('class')
    })
  })

  describe('Canvas (contexto de desenho + id da tela)', () => {
    const kindOf = (block: Blockly.Block, field: string): string | undefined => {
      const f = block.getField(field)
      return f instanceof FieldNamePicker ? f.kind : undefined
    }

    it('collectCanvasIds lista os ids das telas de desenho criadas', () => {
      const ws = new Blockly.Workspace()
      ws.newBlock('sz_html_canvas').setFieldValue('tela', 'ID')
      ws.newBlock('sz_html_canvas').setFieldValue('placar', 'ID')
      expect(collectCanvasIds(ws)).toEqual(['tela', 'placar'])
    })

    it('o ctx guardado pelo Pegar canvas entra na lista de variáveis', () => {
      const ws = new Blockly.Workspace()
      ws.newBlock('sz_canvas_setup').setFieldValue('pincel', 'CTX')
      expect(collectVariables(ws)).toEqual(['pincel'])
    })

    it('sz_canvas_setup: CANVAS_ID = canvas (seletor); CTX segue texto (declara)', () => {
      const b = new Blockly.Workspace().newBlock('sz_canvas_setup')
      expect(kindOf(b, 'CANVAS_ID')).toBe('canvas')
      expect(b.getField('CTX')).not.toBeInstanceOf(FieldNamePicker)
    })

    it('um bloco de desenho consome o ctx via seletor de variável', () => {
      const b = new Blockly.Workspace().newBlock('sz_canvas_clear')
      expect(kindOf(b, 'CTX')).toBe('variable')
    })
  })

  describe('CSS (partes da página, fontes e animações)', () => {
    const kindOf = (block: Blockly.Block, field: string): string | undefined => {
      const value = block.getField(field)
      return value instanceof FieldNamePicker ? value.kind : undefined
    }

    it('lista body, ids e classes do HTML já criado sem repetir', () => {
      const ws = new Blockly.Workspace()
      const box = ws.newBlock('sz_html_div')
      box.setFieldValue('caixa', 'ID')
      box.setFieldValue('cartao destaque', 'CLASS')
      const title = ws.newBlock('sz_html_h1')
      title.setFieldValue('cartao', 'CLASS')

      expect(collectCSSSelectors(ws)).toEqual(['body', '#caixa', '.cartao', '.destaque'])
      expect(collectCSSSelectors(null)).toEqual(['body'])
    })

    it('lista fontes e animações declaradas para os blocos consumidores', () => {
      const ws = new Blockly.Workspace()
      ws.newBlock('sz_css_google_font').setFieldValue('Press Start 2P', 'FONT')
      ws.newBlock('sz_css_keyframes').setFieldValue('pulsar', 'NAME')
      ws.newBlock('sz_css_keyframes_steps').setFieldValue('girar', 'NAME')

      expect(collectCSSFonts(ws)).toEqual(['Press Start 2P'])
      expect(collectCSSAnimations(ws)).toEqual(['pulsar', 'girar'])
    })

    it('liga cada consumidor ao kind correto e mantém declarações como texto', () => {
      const ws = new Blockly.Workspace()
      expect(kindOf(ws.newBlock('sz_css_background_color'), 'SELECTOR')).toBe('selector')
      expect(kindOf(ws.newBlock('sz_css_use_font'), 'FONT')).toBe('font')
      expect(kindOf(ws.newBlock('sz_css_apply_animation'), 'NAME')).toBe('animation')
      expect(ws.newBlock('sz_css_google_font').getField('FONT')).not.toBeInstanceOf(FieldNamePicker)
      expect(ws.newBlock('sz_css_keyframes').getField('NAME')).not.toBeInstanceOf(FieldNamePicker)
    })
  })

  describe('Jogo 2D (folha de quadros + mapa de tiles)', () => {
    const kindOf = (block: Blockly.Block, field: string): string | undefined => {
      const f = block.getField(field)
      return f instanceof FieldNamePicker ? f.kind : undefined
    }

    it('collectSpritesheets / collectTilemaps listam os nomes declarados', () => {
      const ws = new Blockly.Workspace()
      ws.newBlock('sz_g2d_load_spritesheet').setFieldValue('correr', 'NAME')
      ws.newBlock('sz_g2d_create_tilemap').setFieldValue('fase1', 'NAME')
      expect(collectSpritesheets(ws)).toEqual(['correr'])
      expect(collectTilemaps(ws)).toEqual(['fase1'])
    })

    it('mapa vazio criado por código também aparece no seletor de tilemaps', () => {
      const ws = new Blockly.Workspace()
      ws.newBlock('sz_gk_create_empty_tilemap').setFieldValue('masmorra', 'NAME')
      expect(collectTilemaps(ws)).toEqual(['masmorra'])
    })

    it('animar sprite consome a folha (SHEET = spritesheet); NAME que declara segue texto', () => {
      const ws = new Blockly.Workspace()
      const decl = ws.newBlock('sz_g2d_load_spritesheet')
      expect(decl.getField('NAME')).not.toBeInstanceOf(FieldNamePicker)
      expect(kindOf(ws.newBlock('sz_g2d_animate_sprite'), 'SHEET')).toBe('spritesheet')
    })

    it('desenhar/colidir mapa consomem o mapa (MAP = tilemap)', () => {
      const ws = new Blockly.Workspace()
      expect(kindOf(ws.newBlock('sz_g2d_draw_tilemap'), 'MAP')).toBe('tilemap')
      expect(kindOf(ws.newBlock('sz_g2d_tilemap_collide'), 'MAP')).toBe('tilemap')
    })
  })

  describe('Jogo 3D (cena / objeto / grupo + textura)', () => {
    const kindOf = (block: Blockly.Block, field: string): string | undefined => {
      const f = block.getField(field)
      return f instanceof FieldNamePicker ? f.kind : undefined
    }

    it('collectScenes3d / collectObjects3d / collectGroups3d listam os nomes declarados', () => {
      const ws = new Blockly.Workspace()
      ws.newBlock('sz_g3d_create_scene').setFieldValue('mundo', 'NAME')
      ws.newBlock('sz_g3d_create_box').setFieldValue('caixa', 'NAME')
      ws.newBlock('sz_g3d_create_model').setFieldValue('nave', 'NAME')
      ws.newBlock('sz_g3d_create_group').setFieldValue('inimigos', 'NAME')
      ws.newBlock('sz_g3d_create_swarm').setFieldValue('estrelas', 'NAME')

      expect(collectScenes3d(ws)).toEqual(['mundo'])
      expect(collectObjects3d(ws)).toEqual(['caixa', 'nave'])
      expect(collectGroups3d(ws)).toEqual(['inimigos', 'estrelas'])
    })

    it('WORLD = scene3d; NAME que declara a cena segue texto', () => {
      const ws = new Blockly.Workspace()
      expect(ws.newBlock('sz_g3d_create_scene').getField('NAME')).not.toBeInstanceOf(
        FieldNamePicker,
      )
      expect(kindOf(ws.newBlock('sz_g3d_create_box'), 'WORLD')).toBe('scene3d')
    })

    it('OBJ/A/B = object3d; GROUP = group3d; textura ASSET = seletor de imagem', () => {
      const ws = new Blockly.Workspace()
      expect(kindOf(ws.newBlock('sz_g3d_set_position'), 'OBJ')).toBe('object3d')
      expect(kindOf(ws.newBlock('sz_g3d_run_enemies'), 'GROUP')).toBe('group3d')
      // A textura vira o MESMO seletor de imagem já usado (field_asset_picker), não um FieldNamePicker.
      const tex = ws.newBlock('sz_g3d_set_texture')
      expect(tex.getField('ASSET')).not.toBeInstanceOf(FieldNamePicker)
      expect(kindOf(tex, 'OBJ')).toBe('object3d')
    })

    it('o "item" do para-cada do enxame DECLARA (texto); tirar-do-enxame CONSOME (object3d)', () => {
      const ws = new Blockly.Workspace()
      expect(ws.newBlock('sz_g3d_for_each_swarm').getField('ITEM')).not.toBeInstanceOf(
        FieldNamePicker,
      )
      expect(kindOf(ws.newBlock('sz_g3d_remove_from_swarm'), 'ITEM')).toBe('object3d')
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
