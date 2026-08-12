import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { gameTwoDBlocks } from '../../../official-extensions/game-2d/blocks'
import { gameKitBlocks } from '../../../official-extensions/game-2d-advanced/blocks'
import { gameThreeDBlocks } from '../../../official-extensions/game-3d/blocks'
import { registerExtensionBlocks } from '../../blocks'
import { CANVAS_BLOCKS } from '../../blocks/canvas'
import { VALUE_BLOCKS } from '../../blocks/values'
import { ensureBlocklyInitialized } from '../../setup'
import {
  collectBoards,
  collectCameras3d,
  collectCanvas3DPhysicsBodies,
  collectCanvas3DPhysicsCharacters,
  collectCanvas3DPhysicsResources,
  collectCanvas3DShadowTargets,
  collectCanvasContexts,
  collectCanvasIds,
  collectClassNames,
  collectCombatMoves,
  collectComposers3d,
  collectCSSAnimations,
  collectCSSFonts,
  collectCSSSelectors,
  collectEnemyCombatants,
  collectFightMoves,
  collectFunctionNames,
  collectGame2DVectorTilesets,
  collectGame3DObjects,
  collectGroups3d,
  collectGroupsAndLists,
  collectLights3d,
  collectLoaders3d,
  collectMethodNames,
  collectMutableVariables,
  collectObjects3d,
  collectPerspectiveCameras3d,
  collectPhysicsCities3d,
  collectPhysicsColliders3d,
  collectPhysicsWorlds,
  collectPropertyNames,
  collectReadableVariables,
  collectRenderers3d,
  collectScenes3d,
  collectScopedFunctionNames,
  collectScopedVariableNames,
  collectSpritesheets,
  collectStoredValues,
  collectSVGReferences,
  collectSwarms3d,
  collectTilemaps,
  collectVariables,
  FieldNamePicker,
  nameKindAllowsFreeText,
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

    it('reconhece objetos nomeados dos kits (caminho do equilibrista/balão, cidade)', () => {
      const ws = new Blockly.Workspace()
      ws.newBlock('sz_g2d_stickpath_create').setFieldValue('caminho', 'NAME')
      ws.newBlock('sz_g2d_create_city').setFieldValue('cidade', 'NAME')

      expect(collectVariables(ws)).toEqual(['caminho', 'cidade'])
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

    it('atribuir não declara e variáveis internas de evento não viram globais', () => {
      const ws = new Blockly.Workspace()
      ws.newBlock('sz_js_var_assign').setFieldValue('fantasma', 'NAME')
      ws.newBlock('sz_js_var_create').setFieldValue('global', 'NAME')
      const click = ws.newBlock('sz_js_on_click')
      const local = ws.newBlock('sz_js_var_create')
      local.setFieldValue('dentroDoClique', 'NAME')
      click.getInput('DO')?.connection?.connect(local.previousConnection as Blockly.Connection)

      expect(collectVariables(ws)).toEqual(['global'])
    })

    it('a escrita vê apenas variáveis mutáveis no seu escopo', () => {
      const ws = new Blockly.Workspace()
      ws.newBlock('sz_js_var_create').setFieldValue('global', 'NAME')
      ws.newBlock('sz_js_const_create').setFieldValue('FIXA', 'NAME')

      const click = ws.newBlock('sz_js_on_click')
      const local = ws.newBlock('sz_js_var_create')
      local.setFieldValue('local', 'NAME')
      const inside = ws.newBlock('sz_js_var_assign')
      local.nextConnection?.connect(inside.previousConnection as Blockly.Connection)
      click.getInput('DO')?.connection?.connect(local.previousConnection as Blockly.Connection)

      const outside = ws.newBlock('sz_js_var_assign')
      expect(collectMutableVariables(inside)).toEqual(['global', 'local'])
      expect(collectMutableVariables(outside)).toEqual(['global'])
    })

    it('não oferece uma variável antes do comando que a declara', () => {
      const ws = new Blockly.Workspace()
      const frame = ws.newBlock('sz_frame_start')
      const readBefore = ws.newBlock('sz_js_console_log_value')
      const writeBefore = ws.newBlock('sz_js_var_assign')
      const declaration = ws.newBlock('sz_js_var_create')
      declaration.setFieldValue('futuro', 'NAME')

      frame
        .getInput('CHILDREN')
        ?.connection?.connect(readBefore.previousConnection as Blockly.Connection)
      readBefore.nextConnection?.connect(writeBefore.previousConnection as Blockly.Connection)
      writeBefore.nextConnection?.connect(declaration.previousConnection as Blockly.Connection)

      expect(collectReadableVariables(readBefore)).not.toContain('futuro')
      expect(collectMutableVariables(writeBefore)).not.toContain('futuro')
      expect(collectReadableVariables(declaration)).not.toContain('futuro')
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

    it('vê o item local de map, find e filter com a mesma regra', () => {
      for (const [type, input] of [
        ['sz_val_array_map', 'TRANSFORM'],
        ['sz_val_array_find', 'COND'],
        ['sz_val_array_filter', 'COND'],
      ] as const) {
        const ws = new Blockly.Workspace()
        const operation = ws.newBlock(type)
        operation.setFieldValue('inimigo', 'ITEM')
        const inner = ws.newBlock('sz_val_variable')
        operation.getInput(input)?.connection?.connect(inner.outputConnection as Blockly.Connection)
        expect(collectScopedVariableNames(inner), type).toEqual(['inimigo'])
      }
    })

    it('expõe cada nome local somente no ramo onde ele existe', () => {
      const ws = new Blockly.Workspace()
      const loop = ws.newBlock('sz_js_for_range')
      loop.setFieldValue('i', 'VAR')
      const from = ws.newBlock('sz_val_variable')
      const body = ws.newBlock('sz_js_console_log_value')
      loop.getInput('FROM')?.connection?.connect(from.outputConnection as Blockly.Connection)
      nestStmt(loop, body, 'DO')

      const guarded = ws.newBlock('sz_js_try_catch')
      guarded.setFieldValue('erro', 'ERR')
      const tryBody = ws.newBlock('sz_js_console_log_value')
      const handler = ws.newBlock('sz_js_console_log_value')
      const finalizer = ws.newBlock('sz_js_console_log_value')
      nestStmt(guarded, tryBody, 'BODY')
      nestStmt(guarded, handler, 'HANDLER')
      nestStmt(guarded, finalizer, 'FINALLY')

      expect(collectScopedVariableNames(from)).toEqual([])
      expect(collectScopedVariableNames(body)).toEqual(['i'])
      expect(collectScopedVariableNames(tryBody)).toEqual([])
      expect(collectScopedVariableNames(handler)).toEqual(['erro'])
      expect(collectScopedVariableNames(finalizer)).toEqual([])
    })

    it('expõe resultado e erro do fetch somente em seus respectivos ramos', () => {
      const ws = new Blockly.Workspace()
      const fetch = ws.newBlock('sz_js_fetch_json')
      fetch.setFieldValue('dados', 'OK')
      fetch.setFieldValue('falha', 'ERR')
      const success = ws.newBlock('sz_js_console_log_value')
      const failure = ws.newBlock('sz_js_console_log_value')
      nestStmt(fetch, success, 'BODY')
      nestStmt(fetch, failure, 'CATCH')

      expect(collectScopedVariableNames(success)).toEqual(['dados'])
      expect(collectScopedVariableNames(failure)).toEqual(['falha'])
    })

    it('expõe o tempo local dentro do callback do próximo quadro', () => {
      const ws = new Blockly.Workspace()
      const callback = ws.newBlock('sz_canvas_request_frame_do')
      callback.setFieldValue('tempoQuadro', 'PARAM')
      const body = ws.newBlock('sz_js_console_log_var')
      nestStmt(callback, body, 'DO')

      expect(collectScopedVariableNames(body)).toEqual(['tempoQuadro'])
    })

    it('expõe controle, tempo e delta habilitados dentro do laço de animação', () => {
      const ws = new Blockly.Workspace()
      const loop = ws.newBlock('sz_canvas_anim_loop') as Blockly.Block & {
        loadExtraState(state: { handle: string; timeVar: string; deltaVar: string }): void
      }
      loop.loadExtraState({
        handle: 'controleAnimacao',
        timeVar: 'tempoQuadro',
        deltaVar: 'deltaSegundos',
      })
      const body = ws.newBlock('sz_js_console_log_var')
      nestStmt(loop, body, 'BODY')

      expect(collectScopedVariableNames(body)).toEqual([
        'controleAnimacao',
        'tempoQuadro',
        'deltaSegundos',
      ])
    })

    it('expõe as coordenadas locais dentro do evento de ponteiro do Jogo 2D', () => {
      const ws = new Blockly.Workspace()
      const pointer = ws.newBlock('sz_g2d_on_pointer')
      pointer.setFieldValue('posicaoX', 'PX')
      pointer.setFieldValue('posicaoY', 'PY')
      const body = ws.newBlock('sz_js_console_log_var')
      nestStmt(pointer, body, 'BODY')

      expect(collectScopedVariableNames(body)).toEqual(['posicaoX', 'posicaoY'])
    })

    it('expõe a função de conclusão somente dentro do corpo da Promise', () => {
      const ws = new Blockly.Workspace()
      const promise = ws.newBlock('sz_val_new_promise')
      promise.setFieldValue('concluir', 'PARAM')
      const body = ws.newBlock('sz_js_set_timeout_call')
      nestStmt(promise, body, 'DO')

      expect(collectScopedFunctionNames(body)).toEqual(['concluir'])
      expect(collectScopedFunctionNames(ws.newBlock('sz_js_set_timeout_call'))).toEqual([])
    })

    it('fora de qualquer laço → nenhuma variável local', () => {
      const ws = new Blockly.Workspace()
      const solto = ws.newBlock('sz_val_variable')
      expect(collectScopedVariableNames(solto)).toEqual([])
      expect(collectScopedVariableNames(null)).toEqual([])
    })
  })

  describe('Canvas 3D — declarações e parâmetros locais', () => {
    it('registra todos os resultados nomeados dos facilitadores', () => {
      const ws = new Blockly.Workspace()
      ws.newBlock('sz_t3d_renderer_responsive').setFieldValue('pararResponsivo', 'CLEANUP')
      ws.newBlock('sz_t3d_load_environment').setFieldValue('ceuHDR', 'TEXTURE')
      ws.newBlock('sz_t3d_primitive').setFieldValue('objeto', 'MESH')
      const terrain = ws.newBlock('sz_t3d_terrain')
      terrain.setFieldValue('terreno', 'TERRAIN')
      terrain.setFieldValue('alturaChao', 'HEIGHT_FN')
      ws.newBlock('sz_t3d_road').setFieldValue('estrada', 'ROAD')
      ws.newBlock('sz_t3d_building').setFieldValue('predio', 'BUILDING')
      ws.newBlock('sz_t3d_city').setFieldValue('cidade', 'CITY')
      ws.newBlock('sz_t3d_physics_setup').setFieldValue('fisica', 'WORLD')
      ws.newBlock('sz_t3d_physics_raycast').setFieldValue('acerto', 'RESULT')
      ws.newBlock('sz_t3d_physics_body_state').setFieldValue('estadoCorpo', 'RESULT')
      ws.newBlock('sz_t3d_physics_stats').setFieldValue('estadoFisica', 'RESULT')

      expect(collectVariables(ws)).toEqual([
        'pararResponsivo',
        'ceuHDR',
        'objeto',
        'terreno',
        'estrada',
        'predio',
        'cidade',
        'fisica',
        'acerto',
        'estadoCorpo',
        'estadoFisica',
      ])
      expect(collectFunctionNames(ws)).toContain('alturaChao')
    })

    it('separa sucesso e falha dos carregamentos pelo ramo correto', () => {
      const ws = new Blockly.Workspace()
      const loader = ws.newBlock('sz_t3d_load_model')
      loader.setFieldValue('modelo', 'PARAM')
      loader.setFieldValue('erroModelo', 'ERROR_PARAM')
      const success = ws.newBlock('sz_js_console_log_text')
      const failure = ws.newBlock('sz_js_console_log_text')
      loader.getInput('DO')?.connection?.connect(success.previousConnection as Blockly.Connection)
      loader
        .getInput('DO_ERROR')
        ?.connection?.connect(failure.previousConnection as Blockly.Connection)

      expect(collectScopedVariableNames(success)).toEqual(['modelo'])
      expect(collectScopedVariableNames(failure)).toEqual(['erroModelo'])
    })

    it('expõe os dados de colisão e de área somente dentro do evento', () => {
      const ws = new Blockly.Workspace()
      const collision = ws.newBlock('sz_t3d_physics_on_collision')
      collision.setFieldValue('corpoId', 'BODY_PARAM')
      collision.setFieldValue('obstaculoId', 'COLLIDER_PARAM')
      const collisionBody = ws.newBlock('sz_js_console_log_text')
      collision
        .getInput('DO')
        ?.connection?.connect(collisionBody.previousConnection as Blockly.Connection)

      const trigger = ws.newBlock('sz_t3d_physics_on_trigger')
      trigger.setFieldValue('outroCorpo', 'BODY_PARAM')
      trigger.setFieldValue('areaId', 'TRIGGER_PARAM')
      trigger.setFieldValue('entrou', 'ENTERING_PARAM')
      const triggerBody = ws.newBlock('sz_js_console_log_text')
      trigger
        .getInput('DO')
        ?.connection?.connect(triggerBody.previousConnection as Blockly.Connection)

      expect(collectScopedVariableNames(collisionBody)).toEqual(['corpoId', 'obstaculoId'])
      expect(collectScopedVariableNames(triggerBody)).toEqual(['outroCorpo', 'areaId', 'entrou'])
      expect(collectScopedVariableNames(ws.newBlock('sz_js_console_log_text'))).toEqual([])
    })

    it('separa cenas, renderizadores, câmeras, luzes, efeitos, loaders e mundos físicos', () => {
      const ws = new Blockly.Workspace()
      ws.newBlock('sz_t3d_scene_create').setFieldValue('cena', 'SCENE')
      ws.newBlock('sz_t3d_renderer_create').setFieldValue('renderizador', 'RENDERER')
      ws.newBlock('sz_t3d_camera_create').setFieldValue('camera', 'CAMERA')
      ws.newBlock('sz_t3d_light_create').setFieldValue('luz', 'LIGHT')
      ws.newBlock('sz_t3d_bloom_setup').setFieldValue('efeitos', 'COMPOSER')
      ws.newBlock('sz_t3d_physics_setup').setFieldValue('fisica', 'WORLD')
      const loader = ws.newBlock('sz_t3d_new_var')
      loader.setFieldValue('carregador', 'VARNAME')
      loader.setFieldValue('GLTFLoader', 'CLASS')

      expect(collectScenes3d(ws)).toContain('cena')
      expect(collectRenderers3d(ws)).toEqual(['renderizador'])
      expect(collectCameras3d(ws)).toEqual(['camera'])
      expect(collectLights3d(ws)).toEqual(['luz'])
      expect(collectComposers3d(ws)).toEqual(['efeitos'])
      expect(collectLoaders3d(ws)).toEqual(['carregador'])
      expect(collectPhysicsWorlds(ws)).toEqual(['fisica'])
    })

    it('infere objeto 3D conectado a uma variável genérica', () => {
      const ws = new Blockly.Workspace()
      const declaration = ws.newBlock('sz_js_const_create')
      declaration.setFieldValue('cubo', 'NAME')
      const constructorBlock = ws.newBlock('sz_t3d_new')
      constructorBlock.setFieldValue('THREE.Mesh', 'CLASS')
      declaration
        .getInput('VALUE')
        ?.connection?.connect(constructorBlock.outputConnection as Blockly.Connection)

      expect(collectObjects3d(ws)).toContain('cubo')
    })

    it('mostra recursos Canvas 3D somente depois da declaração e no mesmo escopo', () => {
      const ws = new Blockly.Workspace()
      const before = ws.newBlock('sz_t3d_renderer_create')
      before.setFieldValue('antes', 'RENDERER')
      const use = ws.newBlock('sz_t3d_renderer_responsive')
      const after = ws.newBlock('sz_t3d_renderer_create')
      after.setFieldValue('depois', 'RENDERER')
      before.nextConnection?.connect(use.previousConnection as Blockly.Connection)
      use.nextConnection?.connect(after.previousConnection as Blockly.Connection)

      const fn = ws.newBlock('sz_js_function')
      const local = ws.newBlock('sz_t3d_renderer_create')
      local.setFieldValue('localDaFuncao', 'RENDERER')
      fn.getInput('BODY')?.connection?.connect(local.previousConnection as Blockly.Connection)

      expect(collectRenderers3d(ws, use)).toEqual(['antes'])
    })

    it('oferece somente recursos compatíveis com projetar ou receber sombra', () => {
      const ws = new Blockly.Workspace()
      const ambient = ws.newBlock('sz_t3d_light_create')
      ambient.setFieldValue('luzAmbiente', 'LIGHT')
      ambient.setFieldValue('ambient', 'KIND')
      const directional = ws.newBlock('sz_t3d_light_create')
      directional.setFieldValue('sol', 'LIGHT')
      directional.setFieldValue('directional', 'KIND')
      const box = ws.newBlock('sz_t3d_primitive')
      box.setFieldValue('caixa', 'MESH')
      const capsule = ws.newBlock('sz_t3d_primitive')
      capsule.setFieldValue('capsula', 'MESH')
      capsule.setFieldValue('capsule', 'SHAPE')
      const terrain = ws.newBlock('sz_t3d_terrain')
      terrain.setFieldValue('chao', 'TERRAIN')
      ws.newBlock('sz_t3d_road').setFieldValue('estrada', 'ROAD')

      const technicalMesh = ws.newBlock('sz_t3d_new_var')
      technicalMesh.setFieldValue('malhaTecnica', 'VARNAME')
      technicalMesh.setFieldValue('Mesh', 'CLASS')
      const technicalGroup = ws.newBlock('sz_t3d_new_var')
      technicalGroup.setFieldValue('grupoTecnico', 'VARNAME')
      technicalGroup.setFieldValue('Group', 'CLASS')
      const technicalAmbient = ws.newBlock('sz_t3d_new_var')
      technicalAmbient.setFieldValue('ambienteTecnica', 'VARNAME')
      technicalAmbient.setFieldValue('AmbientLight', 'CLASS')
      const technicalSpot = ws.newBlock('sz_t3d_new_var')
      technicalSpot.setFieldValue('holofote', 'VARNAME')
      technicalSpot.setFieldValue('SpotLight', 'CLASS')

      const shadow = ws.newBlock('sz_t3d_set_shadow')
      shadow.setFieldValue('cast', 'KIND')
      expect(collectCanvas3DShadowTargets(ws, shadow)).toEqual([
        'sol',
        'caixa',
        'chao',
        'malhaTecnica',
        'holofote',
      ])

      shadow.setFieldValue('receive', 'KIND')
      expect(collectCanvas3DShadowTargets(ws, shadow)).toEqual(['caixa', 'chao', 'malhaTecnica'])
    })
  })

  describe('tipos de seletor para leitura e escrita', () => {
    const kindOf = (type: string): string | undefined => {
      const block = new Blockly.Workspace().newBlock(type)
      const field = block.getField('NAME')
      return field instanceof FieldNamePicker ? field.kind : undefined
    }

    it('leitura aceita constante; alteração exige variável mutável', () => {
      expect(kindOf('sz_val_variable')).toBe('variable')
      expect(kindOf('sz_js_var_assign')).toBe('mutable-variable')
      expect(kindOf('sz_js_var_increment')).toBe('mutable-variable')
    })

    it('consumidores de símbolos exigem escolher um nome existente', () => {
      expect(nameKindAllowsFreeText('mutable-variable')).toBe(false)
      expect(nameKindAllowsFreeText('variable')).toBe(false)
      expect(nameKindAllowsFreeText('dom-target')).toBe(false)
      expect(nameKindAllowsFreeText('group')).toBe(false)
      expect(nameKindAllowsFreeText('class')).toBe(false)
      expect(nameKindAllowsFreeText('function')).toBe(false)
      expect(nameKindAllowsFreeText('canvas-context')).toBe(false)
      expect(nameKindAllowsFreeText('super-method')).toBe(false)
      expect(nameKindAllowsFreeText('physics-body')).toBe(false)
      expect(nameKindAllowsFreeText('physics-character')).toBe(false)
      expect(nameKindAllowsFreeText('physics-resource')).toBe(false)
      expect(nameKindAllowsFreeText('optional-function')).toBe(false)
      expect(nameKindAllowsFreeText('canvas3d-canvas')).toBe(false)
      expect(nameKindAllowsFreeText('g3d-world')).toBe(false)
      expect(nameKindAllowsFreeText('water3d')).toBe(false)
      expect(nameKindAllowsFreeText('model-loader3d')).toBe(false)
    })

    it('IDs da física são filtrados pelo mundo e pelo tipo do recurso', () => {
      const ws = new Blockly.Workspace()
      const jogador = ws.newBlock('sz_t3d_physics_body')
      jogador.setFieldValue('fisica', 'WORLD')
      jogador.setFieldValue('jogador', 'ID')
      const inimigo = ws.newBlock('sz_t3d_physics_body')
      inimigo.setFieldValue('outraFisica', 'WORLD')
      inimigo.setFieldValue('inimigo', 'ID')
      const parede = ws.newBlock('sz_t3d_physics_static_box')
      parede.setFieldValue('fisica', 'WORLD')
      parede.setFieldValue('parede', 'ID')
      const mover = ws.newBlock('sz_t3d_physics_move')
      mover.setFieldValue('fisica', 'WORLD')

      expect(collectCanvas3DPhysicsBodies(ws, mover)).toEqual(['jogador'])
      expect(collectCanvas3DPhysicsResources(ws, mover)).toEqual(['jogador', 'parede'])
    })

    it('mover e pular oferecem apenas corpos do tipo personagem', () => {
      const ws = new Blockly.Workspace()
      const jogador = ws.newBlock('sz_t3d_physics_body')
      jogador.setFieldValue('fisica', 'WORLD')
      jogador.setFieldValue('jogador', 'ID')
      jogador.setFieldValue('character', 'KIND')
      const caixa = ws.newBlock('sz_t3d_physics_body')
      caixa.setFieldValue('fisica', 'WORLD')
      caixa.setFieldValue('caixa', 'ID')
      caixa.setFieldValue('dynamic', 'KIND')

      expect(collectCanvas3DPhysicsCharacters(ws)).toEqual(['jogador'])
    })

    it('separa colisores, cidades e câmeras compatíveis com adaptação responsiva', () => {
      const ws = new Blockly.Workspace()
      ws.newBlock('sz_t3d_primitive').setFieldValue('cubo', 'MESH')
      ws.newBlock('sz_t3d_building').setFieldValue('predio', 'BUILDING')
      ws.newBlock('sz_t3d_terrain').setFieldValue('terreno', 'TERRAIN')
      ws.newBlock('sz_t3d_city').setFieldValue('cidade', 'CITY')
      ws.newBlock('sz_t3d_camera_create').setFieldValue('camera', 'CAMERA')
      const ortho = ws.newBlock('sz_t3d_new_var')
      ortho.setFieldValue('cameraOrto', 'VARNAME')
      ortho.setFieldValue('THREE.OrthographicCamera', 'CLASS')

      expect(collectPhysicsColliders3d(ws)).toEqual(['cubo', 'predio'])
      expect(collectPhysicsCities3d(ws)).toEqual(['cidade'])
      expect(collectPerspectiveCameras3d(ws)).toEqual(['camera'])
    })

    it('mostra terreno plano como escolha real da função opcional', () => {
      const road = new Blockly.Workspace().newBlock('sz_t3d_road')
      const field = road.getField('HEIGHT_FN')
      expect(field).toBeInstanceOf(FieldNamePicker)
      if (!(field instanceof FieldNamePicker)) throw new Error('Seletor opcional ausente')
      expect(field.kind).toBe('optional-function')
      expect(field?.getValue()).toBe('')
      expect(field?.getText()).toBe('terreno plano')
    })

    it('não oferece um corpo físico que só será criado depois do comando', () => {
      const ws = new Blockly.Workspace()
      const mover = ws.newBlock('sz_t3d_physics_move')
      mover.setFieldValue('fisica', 'WORLD')
      const corpo = ws.newBlock('sz_t3d_physics_body')
      corpo.setFieldValue('fisica', 'WORLD')
      corpo.setFieldValue('jogador', 'ID')
      const bodyConnection = corpo.previousConnection
      if (!bodyConnection) throw new Error('O corpo físico precisa aceitar encadeamento')
      mover.nextConnection?.connect(bodyConnection)

      expect(collectCanvas3DPhysicsBodies(ws, mover)).toEqual([])
    })

    it('preserva um ID físico legado mesmo quando ele ainda não tem declarador', () => {
      const source = new Blockly.Workspace()
      source.newBlock('sz_t3d_physics_move').setFieldValue('heroiAntigo', 'ID')
      const state = Blockly.serialization.workspaces.save(source)
      const restored = new Blockly.Workspace()
      Blockly.serialization.workspaces.load(state, restored)

      expect(restored.getAllBlocks(false)[0]?.getFieldValue('ID')).toBe('heroiAntigo')
    })

    it('o bloco iniciante de propriedade consome uma variável declarada', () => {
      const block = new Blockly.Workspace().newBlock('sz_js_set_property_var')
      const field = block.getField('NAME')
      expect(field).toBeInstanceOf(FieldNamePicker)
      expect((field as FieldNamePicker).kind).toBe('variable')
    })
  })

  describe('collectGroupsAndLists — grupos de sprites + listas de verdade', () => {
    it('reconhece grupos do Jogo 2D (Criar grupo de sprites)', () => {
      const ws = new Blockly.Workspace()
      ws.newBlock('sz_g2d_create_group').setFieldValue('asteroides', 'NAME')

      expect(collectGroupsAndLists(ws)).toEqual(['asteroides'])
    })

    it('oferece no início, eventos e laços o grupo de todos os inimigos', () => {
      const ws = new Blockly.Workspace()
      const molds = ws.newBlock('sz_frame_molds')
      const allEnemies = ws.newBlock('sz_g2d_all_enemies_group')
      allEnemies.setFieldValue('todosOsInimigos', 'NAME')
      molds
        .getInput('CHILDREN')
        ?.connection?.connect(allEnemies.previousConnection as Blockly.Connection)

      const start = ws.newBlock('sz_frame_start')
      const startGroup = ws.newBlock('sz_g2d_create_group')
      startGroup.setFieldValue('grupoDoInicio', 'NAME')
      const startConsumer = ws.newBlock('sz_g2d_spawn_in_group')
      start
        .getInput('CHILDREN')
        ?.connection?.connect(startGroup.previousConnection as Blockly.Connection)
      startGroup.nextConnection?.connect(startConsumer.previousConnection as Blockly.Connection)

      const events = ws.newBlock('sz_frame_events')
      const onKey = ws.newBlock('sz_g2d_on_key')
      const eventConsumer = ws.newBlock('sz_g2d_clear_group')
      events
        .getInput('CHILDREN')
        ?.connection?.connect(onKey.previousConnection as Blockly.Connection)
      onKey
        .getInput('BODY')
        ?.connection?.connect(eventConsumer.previousConnection as Blockly.Connection)

      const loops = ws.newBlock('sz_frame_loops')
      const update = ws.newBlock('sz_g2d_update_each_frame')
      const loopConsumer = ws.newBlock('sz_g2d_draw_group')
      loops
        .getInput('CHILDREN')
        ?.connection?.connect(update.previousConnection as Blockly.Connection)
      update
        .getInput('BODY')
        ?.connection?.connect(loopConsumer.previousConnection as Blockly.Connection)

      for (const consumer of [startConsumer, eventConsumer, loopConsumer]) {
        expect(collectGroupsAndLists(consumer)).toContain('todosOsInimigos')
      }
      expect(collectGroupsAndLists(allEnemies)).not.toContain('grupoDoInicio')
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
      const varBlock = ws.newBlock('sz_js_var_create')
      varBlock.setFieldValue('placar', 'NAME')
      const arr = ws.newBlock('sz_val_array')
      varBlock.getInput('VALUE')?.connection?.connect(arr.outputConnection as Blockly.Connection)

      expect(collectGroupsAndLists(ws)).toEqual(['inimigos', 'placar'])
    })

    it('alterar para uma lista não transforma um nome inexistente em declaração', () => {
      const ws = new Blockly.Workspace()
      const assignment = ws.newBlock('sz_js_var_assign')
      assignment.setFieldValue('fantasma', 'NAME')
      const arr = ws.newBlock('sz_val_array')
      assignment.getInput('VALUE')?.connection?.connect(arr.outputConnection as Blockly.Connection)

      expect(collectGroupsAndLists(ws)).toEqual([])
    })

    it('oferece uma lista somente depois da declaração no mesmo encadeamento', () => {
      const ws = new Blockly.Workspace()
      const frame = ws.newBlock('sz_frame_start')
      const before = ws.newBlock('sz_js_console_log_value')
      const beforeList = ws.newBlock('sz_val_array_length')
      before
        .getInput('VALUE')
        ?.connection?.connect(beforeList.outputConnection as Blockly.Connection)
      const declaration = ws.newBlock('sz_js_var_create')
      declaration.setFieldValue('itens', 'NAME')
      const array = ws.newBlock('sz_val_array')
      declaration
        .getInput('VALUE')
        ?.connection?.connect(array.outputConnection as Blockly.Connection)
      const after = ws.newBlock('sz_js_console_log_value')
      const afterList = ws.newBlock('sz_val_array_length')
      after.getInput('VALUE')?.connection?.connect(afterList.outputConnection as Blockly.Connection)

      frame
        .getInput('CHILDREN')
        ?.connection?.connect(before.previousConnection as Blockly.Connection)
      before.nextConnection?.connect(declaration.previousConnection as Blockly.Connection)
      declaration.nextConnection?.connect(after.previousConnection as Blockly.Connection)

      expect(collectGroupsAndLists(beforeList)).not.toContain('itens')
      expect(collectGroupsAndLists(afterList)).toContain('itens')
    })

    it('não deixa uma lista local escapar do corpo de um evento', () => {
      const ws = new Blockly.Workspace()
      const event = ws.newBlock('sz_js_on_click_anywhere')
      const declaration = ws.newBlock('sz_js_var_create')
      declaration.setFieldValue('cliques', 'NAME')
      const array = ws.newBlock('sz_val_array')
      declaration
        .getInput('VALUE')
        ?.connection?.connect(array.outputConnection as Blockly.Connection)
      const inside = ws.newBlock('sz_js_console_log_value')
      const insideList = ws.newBlock('sz_val_array_length')
      inside
        .getInput('VALUE')
        ?.connection?.connect(insideList.outputConnection as Blockly.Connection)
      declaration.nextConnection?.connect(inside.previousConnection as Blockly.Connection)
      event
        .getInput('DO')
        ?.connection?.connect(declaration.previousConnection as Blockly.Connection)

      const outside = ws.newBlock('sz_val_array_length')
      expect(collectGroupsAndLists(insideList)).toContain('cliques')
      expect(collectGroupsAndLists(outside)).not.toContain('cliques')
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

    it('não oferece uma classe antes da declaração, mas oferece depois', () => {
      const ws = new Blockly.Workspace()
      const frame = ws.newBlock('sz_frame_start')
      const before = ws.newBlock('sz_js_new_var')
      const declaration = ws.newBlock('sz_js_class')
      declaration.setFieldValue('Heroi', 'NAME')
      const after = ws.newBlock('sz_js_new_var')
      frame
        .getInput('CHILDREN')
        ?.connection?.connect(before.previousConnection as Blockly.Connection)
      before.nextConnection?.connect(declaration.previousConnection as Blockly.Connection)
      declaration.nextConnection?.connect(after.previousConnection as Blockly.Connection)

      expect(collectClassNames(before)).not.toContain('Heroi')
      expect(collectClassNames(after)).toContain('Heroi')
    })

    it('mantém funções no escopo léxico, com hoisting dentro do próprio escopo', () => {
      const ws = new Blockly.Workspace()
      const event = ws.newBlock('sz_js_on_click_anywhere')
      const callBefore = ws.newBlock('sz_js_call_function')
      const declaration = ws.newBlock('sz_js_function')
      declaration.setFieldValue('local', 'NAME')
      callBefore.nextConnection?.connect(declaration.previousConnection as Blockly.Connection)
      event.getInput('DO')?.connection?.connect(callBefore.previousConnection as Blockly.Connection)

      const outside = ws.newBlock('sz_js_call_function')
      expect(collectFunctionNames(callBefore)).toContain('local')
      expect(collectFunctionNames(outside)).not.toContain('local')
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

    it('super: METHOD usa o seletor restrito aos métodos da classe-mãe', () => {
      const block = new Blockly.Workspace().newBlock('sz_js_super_method')
      expect(kindOf(block, 'METHOD')).toBe('super-method')
    })
  })

  describe('consumidores de nomes da Programação', () => {
    const kindOf = (type: string, field: string): string | undefined => {
      const value = new Blockly.Workspace().newBlock(type).getField(field)
      return value instanceof FieldNamePicker ? value.kind : undefined
    }

    it.each([
      ['sz_js_on_event_named', 'HANDLER', 'function'],
      ['sz_js_set_timeout_call', 'FN', 'function'],
      ['sz_js_object_assign', 'SOURCE', 'variable'],
      ['sz_js_object_assign', 'TARGET', 'variable'],
      ['sz_js_append_child', 'PARENT', 'variable'],
      ['sz_js_append_child', 'CHILD', 'variable'],
      ['sz_val_canvas_width', 'CTX', 'canvas-context'],
      ['sz_val_canvas_height', 'CTX', 'canvas-context'],
      ['sz_js_on_click', 'TARGET', 'dom-target'],
    ])('%s.%s usa o picker %s', (type, field, kind) => {
      expect(kindOf(type, field)).toBe(kind)
    })

    it('mantém campos declaradores como texto editável', () => {
      const ws = new Blockly.Workspace()
      expect(ws.newBlock('sz_js_function').getField('NAME')).not.toBeInstanceOf(FieldNamePicker)
      expect(ws.newBlock('sz_js_create_element').getField('NAME')).not.toBeInstanceOf(
        FieldNamePicker,
      )
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

    it('um bloco de desenho consome o ctx via seletor de contexto', () => {
      const b = new Blockly.Workspace().newBlock('sz_canvas_clear')
      expect(kindOf(b, 'CTX')).toBe('canvas-context')
    })

    it('oferece somente contextos declarados antes do uso, sem misturar variáveis comuns', () => {
      const ws = new Blockly.Workspace()
      const frame = ws.newBlock('sz_frame_start')
      const variable = ws.newBlock('sz_js_var_create')
      variable.setFieldValue('pontos', 'NAME')
      const before = ws.newBlock('sz_canvas_clear')
      const setup = ws.newBlock('sz_canvas_setup')
      setup.setFieldValue('pincel', 'CTX')
      const after = ws.newBlock('sz_canvas_clear')

      frame
        .getInput('CHILDREN')
        ?.connection?.connect(variable.previousConnection as Blockly.Connection)
      variable.nextConnection?.connect(before.previousConnection as Blockly.Connection)
      before.nextConnection?.connect(setup.previousConnection as Blockly.Connection)
      setup.nextConnection?.connect(after.previousConnection as Blockly.Connection)

      expect(collectCanvasContexts(before)).toEqual([])
      expect(collectCanvasContexts(after)).toEqual(['pincel'])
      expect(collectReadableVariables(after)).toEqual(['pontos', 'pincel'])
    })

    it.each([
      ['sz_g2d_define_shape', null, null, 'ctx'],
      ['sz_gk_on_draw', 'PARAM', 'pincelMundo', 'pincelMundo'],
      ['sz_gk_on_draw_hud', 'PARAM', 'pincelHud', 'pincelHud'],
      ['sz_gk_rpg_create_map', 'PARAM', 'pincelMapa', 'pincelMapa'],
      ['sz_gk_define_look', 'CTX', 'pincelAparencia', 'pincelAparencia'],
    ])('reconhece o contexto local fornecido por %s', (type, field, value, expectedContext) => {
      const ws = new Blockly.Workspace()
      const provider = ws.newBlock(type)
      if (field && value) provider.setFieldValue(value, field)
      const drawing = ws.newBlock('sz_canvas_clear')
      provider
        .getInput('BODY')
        ?.connection?.connect(drawing.previousConnection as Blockly.Connection)

      expect(collectCanvasContexts(drawing)).toEqual([expectedContext])
    })

    it('todo consumidor CTX do núcleo usa o seletor de contexto', () => {
      const definitions = [...CANVAS_BLOCKS, ...VALUE_BLOCKS]
      const consumers = definitions.filter((definition) =>
        Object.values(definition).some(
          (value) =>
            Array.isArray(value) &&
            value.some(
              (entry) =>
                typeof entry === 'object' &&
                entry !== null &&
                'type' in entry &&
                entry.type === 'field_name_picker' &&
                'name' in entry &&
                entry.name === 'CTX',
            ),
        ),
      )

      expect(consumers).toHaveLength(43)
      for (const definition of consumers) {
        expect(kindOf(new Blockly.Workspace().newBlock(definition.type), 'CTX')).toBe(
          'canvas-context',
        )
      }
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
      expect(kindOf(ws.newBlock('sz_css_fill'), 'SELECTOR')).toBe('selector')
      expect(kindOf(ws.newBlock('sz_css_stroke'), 'SELECTOR')).toBe('selector')
      expect(kindOf(ws.newBlock('sz_svg_use'), 'HREF')).toBe('svg-reference')
      expect(kindOf(ws.newBlock('sz_css_use_font'), 'FONT')).toBe('font')
      expect(kindOf(ws.newBlock('sz_css_apply_animation'), 'NAME')).toBe('animation')
      expect(ws.newBlock('sz_css_google_font').getField('FONT')).not.toBeInstanceOf(FieldNamePicker)
      expect(ws.newBlock('sz_css_keyframes').getField('NAME')).not.toBeInstanceOf(FieldNamePicker)
    })

    it('oferece ids das formas SVG para CSS e reutilização', () => {
      const ws = new Blockly.Workspace()
      const circle = ws.newBlock('sz_svg_circle')
      circle.setFieldValue('bola', 'ID')
      circle.setFieldValue('forma redonda', 'CLASS')

      expect(collectCSSSelectors(ws)).toEqual(['body', '#bola', '.forma', '.redonda'])
      expect(collectSVGReferences(ws)).toEqual(['#bola'])

      const use = ws.newBlock('sz_svg_use')
      const href = use.getField('HREF') as FieldNamePicker
      expect(href.kind).toBe('svg-reference')
    })

    it('oferece somente formas reutilizáveis e evita o ancestral cíclico', () => {
      const ws = new Blockly.Workspace()
      ws.newBlock('sz_html_svg').setFieldValue('raiz', 'ID')
      ws.newBlock('sz_svg_defs').setFieldValue('pecas', 'ID')
      ws.newBlock('sz_svg_symbol').setFieldValue('estrela', 'ID')
      ws.newBlock('sz_svg_circle').setFieldValue('bola', 'ID')
      ws.newBlock('sz_svg_use').setFieldValue('copia', 'ID')
      const group = ws.newBlock('sz_svg_group')
      group.setFieldValue('grupo', 'ID')
      const nestedUse = ws.newBlock('sz_svg_use')
      group
        .getInput('CHILDREN')
        ?.connection?.connect(nestedUse.previousConnection as Blockly.Connection)

      expect(collectSVGReferences(ws, nestedUse)).toEqual(['#estrela', '#bola'])
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
      ws.newBlock('sz_g2d_create_vector_tilemap').setFieldValue('castelo', 'NAME')
      expect(collectSpritesheets(ws)).toEqual(['correr'])
      expect(collectTilemaps(ws)).toEqual(['fase1', 'castelo'])
    })

    it('conjunto vetorial é declarado uma vez e consumido pelo picker próprio', () => {
      const ws = new Blockly.Workspace()
      const declaration = ws.newBlock('sz_g2d_create_vector_tileset')
      declaration.setFieldValue('pecasDoCastelo', 'NAME')

      expect(declaration.getField('NAME')).not.toBeInstanceOf(FieldNamePicker)
      expect(collectGame2DVectorTilesets(ws)).toEqual(['pecasDoCastelo'])
      expect(kindOf(ws.newBlock('sz_g2d_define_vector_tile'), 'TILESET')).toBe('g2d-vector-tileset')
      expect(kindOf(ws.newBlock('sz_g2d_create_vector_tilemap'), 'TILESET')).toBe(
        'g2d-vector-tileset',
      )
      expect(nameKindAllowsFreeText('g2d-vector-tileset')).toBe(false)
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

  describe('Jogo 2D Avançado (recursos nomeados)', () => {
    const kindOf = (block: Blockly.Block, field: string): string | undefined => {
      const value = block.getField(field)
      return value instanceof FieldNamePicker ? value.kind : undefined
    }

    it('todos os consumidores usam o seletor do recurso que já foi declarado', () => {
      const ws = new Blockly.Workspace()
      const consumers = [
        ['sz_gk_count_item', 'NAME', 'item'],
        ['sz_gk_board_set', 'NAME', 'board'],
        ['sz_gk_board_get', 'NAME', 'board'],
        ['sz_gk_board_count', 'NAME', 'board'],
        ['sz_gk_board_in', 'NAME', 'board'],
        ['sz_gk_saved_value', 'NAME', 'stored-value'],
        ['sz_gk_battler_life', 'NAME', 'combatant'],
        ['sz_gk_battler_max_life', 'NAME', 'combatant'],
        ['sz_gk_rpg_on_foe_turn', 'NAME', 'enemy-combatant'],
        ['sz_gk_rpg_foe_use', 'NAME', 'enemy-combatant'],
        ['sz_gk_rpg_foe_hit_all', 'NAME', 'enemy-combatant'],
        ['sz_gk_rpg_foe_use', 'MOVE', 'combat-move'],
        ['sz_gk_luta_move_anim', 'NAME', 'fight-move'],
        ['sz_gk_luta_attack', 'MOVE', 'fight-move'],
      ] as const

      for (const [type, field, kind] of consumers) {
        expect(kindOf(ws.newBlock(type), field)).toBe(kind)
      }
    })

    it('os novos seletores listam seus declaradores sem misturar domínios', () => {
      const ws = new Blockly.Workspace()
      ws.newBlock('sz_gk_board_create').setFieldValue('arena', 'NAME')
      ws.newBlock('sz_gk_save_value').setFieldValue('recorde', 'NAME')
      ws.newBlock('sz_gk_rpg_teach_move').setFieldValue('Baforada', 'MOVE')
      ws.newBlock('sz_gk_luta_move').setFieldValue('soco', 'NAME')

      expect(collectBoards(ws)).toEqual(['arena'])
      expect(collectStoredValues(ws)).toEqual(['recorde'])
      expect(collectCombatMoves(ws)).toEqual(['Baforada'])
      expect(collectFightMoves(ws)).toEqual(['soco'])
    })

    it('o seletor de IA lista somente inimigos declarados', () => {
      const ws = new Blockly.Workspace()
      ws.newBlock('sz_gk_rpg_add_ally').setFieldValue('Amiga', 'NAME')
      ws.newBlock('sz_gk_rpg_add_foe').setFieldValue('Slime', 'NAME')
      ws.newBlock('sz_gk_rpg_add_boss').setFieldValue('Dragão', 'NAME')
      ws.newBlock('sz_gk_rpg_battle_start').setFieldValue('Ogro', 'NAME')
      ws.newBlock('sz_gk_rpg_define_battler').setFieldValue('Bruxa', 'NAME')

      expect(collectEnemyCombatants(ws)).toEqual(['Slime', 'Dragão', 'Ogro', 'Bruxa'])
      expect(nameKindAllowsFreeText('enemy-combatant')).toBe(false)
    })

    it('filtra os golpes pelo combatente ou lutador escolhido no bloco consumidor', () => {
      const ws = new Blockly.Workspace()
      const espada = ws.newBlock('sz_gk_rpg_teach_move')
      espada.setFieldValue('Espadada', 'MOVE')
      espada.setFieldValue('Você', 'WHO')
      const baforada = ws.newBlock('sz_gk_rpg_teach_move')
      baforada.setFieldValue('Baforada', 'MOVE')
      baforada.setFieldValue('Dragão', 'WHO')
      const golpeDoDragao = ws.newBlock('sz_gk_rpg_foe_use')
      golpeDoDragao.setFieldValue('Dragão', 'NAME')

      const soco = ws.newBlock('sz_gk_luta_move')
      soco.setFieldValue('soco', 'NAME')
      soco.setFieldValue('jogador1', 'WHO')
      const chute = ws.newBlock('sz_gk_luta_move')
      chute.setFieldValue('chute', 'NAME')
      chute.setFieldValue('jogador2', 'WHO')
      const ataqueDoJogador2 = ws.newBlock('sz_gk_luta_attack')
      ataqueDoJogador2.setFieldValue('jogador2', 'WHO')

      expect(collectCombatMoves(ws, golpeDoDragao)).toEqual(['Baforada'])
      expect(collectFightMoves(ws, ataqueDoJogador2)).toEqual(['chute'])
    })
  })

  describe('Jogo 3D (cena / objeto / grupo + textura)', () => {
    const kindOf = (block: Blockly.Block, field: string): string | undefined => {
      const f = block.getField(field)
      return f instanceof FieldNamePicker ? f.kind : undefined
    }

    it('cenas Three.js não se misturam com mundos do Jogo 3D', () => {
      const ws = new Blockly.Workspace()
      ws.newBlock('sz_g3d_create_scene').setFieldValue('mundo', 'NAME')
      ws.newBlock('sz_g3d_create_box').setFieldValue('caixa', 'NAME')
      ws.newBlock('sz_g3d_create_model').setFieldValue('nave', 'NAME')
      ws.newBlock('sz_g3d_create_group').setFieldValue('inimigos', 'NAME')
      ws.newBlock('sz_g3d_create_swarm').setFieldValue('estrelas', 'NAME')

      expect(collectScenes3d(ws)).toEqual([])
      expect(collectObjects3d(ws)).toEqual(['caixa', 'nave'])
      expect(collectGroups3d(ws)).toEqual(['inimigos'])
      expect(collectSwarms3d(ws)).toEqual(['estrelas'])

      const coreWs = new Blockly.Workspace()
      coreWs.newBlock('sz_t3d_scene_create').setFieldValue('cena', 'SCENE')
      expect(collectScenes3d(coreWs)).toEqual(['cena'])
    })

    it('WORLD = g3d-world; NAME que declara a cena segue texto', () => {
      const ws = new Blockly.Workspace()
      expect(ws.newBlock('sz_g3d_create_scene').getField('NAME')).not.toBeInstanceOf(
        FieldNamePicker,
      )
      expect(kindOf(ws.newBlock('sz_g3d_create_box'), 'WORLD')).toBe('g3d-world')
    })

    it('usa capacidades específicas nos comandos Canvas 3D especializados', () => {
      const ws = new Blockly.Workspace()
      expect(kindOf(ws.newBlock('sz_t3d_renderer_create'), 'CANVAS')).toBe('canvas3d-canvas')
      expect(kindOf(ws.newBlock('sz_t3d_load_model'), 'LOADER')).toBe('model-loader3d')
      expect(kindOf(ws.newBlock('sz_t3d_load_sound'), 'LOADER')).toBe('audio-loader3d')
      expect(kindOf(ws.newBlock('sz_t3d_water_wave'), 'WATER')).toBe('water3d')
      expect(kindOf(ws.newBlock('sz_t3d_grass_wave'), 'GRASS')).toBe('grass3d')
      expect(kindOf(ws.newBlock('sz_t3d_set_matrix_at'), 'MESH')).toBe('instanced-mesh3d')
      expect(kindOf(ws.newBlock('sz_t3d_set_color'), 'OBJ')).toBe('color-target3d')
    })

    it('separa seletores de grupo simples e enxame', () => {
      const ws = new Blockly.Workspace()
      expect(kindOf(ws.newBlock('sz_g3d_set_position'), 'OBJ')).toBe('object3d')
      expect(kindOf(ws.newBlock('sz_g3d_fps_camera'), 'OBJ')).toBe('g3d-object')
      expect(kindOf(ws.newBlock('sz_g3d_spawn_enemy'), 'GROUP')).toBe('group3d')
      expect(kindOf(ws.newBlock('sz_g3d_spawn_in_swarm'), 'SWARM')).toBe('swarm3d')
      expect(kindOf(ws.newBlock('sz_g3d_count_swarm'), 'SWARM')).toBe('swarm3d')
      expect(kindOf(ws.newBlock('sz_g3d_for_each_swarm'), 'SWARM')).toBe('swarm3d')
      expect(kindOf(ws.newBlock('sz_g3d_remove_from_swarm'), 'SWARM')).toBe('swarm3d')
      expect(kindOf(ws.newBlock('sz_g3d_prune_swarm'), 'SWARM')).toBe('swarm3d')
      // A textura vira o MESMO seletor de imagem já usado (field_asset_picker), não um FieldNamePicker.
      const tex = ws.newBlock('sz_g3d_set_texture')
      expect(tex.getField('ASSET')).not.toBeInstanceOf(FieldNamePicker)
      expect(kindOf(tex, 'OBJ')).toBe('object3d')
    })

    it('usa o seletor restrito em todo campo que depende do mundo do jogo', () => {
      const ws = new Blockly.Workspace()
      const fields: Readonly<Record<string, readonly string[]>> = {
        sz_g3d_camera_follow: ['OBJ'],
        sz_g3d_update_group: ['GROUND'],
        sz_g3d_isometric_camera: ['FOLLOW'],
        sz_g3d_crosser_step: ['OBJ'],
        sz_g3d_crosser_reset: ['OBJ'],
        sz_g3d_crosser_hit: ['OBJ'],
        sz_g3d_top_camera: ['FOLLOW'],
        sz_g3d_race_step: ['OBJ'],
        sz_g3d_race_reset: ['OBJ'],
        sz_g3d_race_hit: ['OBJ'],
        sz_g3d_pointer_over: ['OBJ'],
        sz_g3d_aim_ahead: ['OBJ'],
        sz_g3d_on_ground: ['OBJ'],
        sz_g3d_ground_height: ['OBJ'],
        sz_g3d_step_body: ['OBJ'],
        sz_g3d_platformer_controls: ['OBJ'],
        sz_g3d_fps_controls: ['OBJ'],
        sz_g3d_fps_camera: ['OBJ'],
        sz_g3d_orbit_camera: ['OBJ'],
        sz_g3d_third_person_camera: ['OBJ'],
        sz_g3d_camera_look_at: ['OBJ'],
        sz_g3d_add_to_model: ['PART', 'MODEL'],
        sz_g3d_spawn_in_swarm: ['ORIGINAL'],
        sz_g3d_remove_from_swarm: ['ITEM'],
      }

      for (const [type, names] of Object.entries(fields)) {
        const block = ws.newBlock(type)
        for (const name of names) expect(kindOf(block, name), `${type}.${name}`).toBe('g3d-object')
      }
    })

    it('não mistura objetos Three.js crus no seletor de comandos vinculados ao mundo', () => {
      const ws = new Blockly.Workspace()
      ws.newBlock('sz_g3d_create_box').setFieldValue('caixaDoJogo', 'NAME')
      ws.newBlock('sz_t3d_primitive').setFieldValue('objetoCru', 'MESH')

      expect(collectObjects3d(ws)).toEqual(['caixaDoJogo', 'objetoCru'])
      expect(collectGame3DObjects(ws)).toEqual(['caixaDoJogo'])
    })

    it('oferece resultados de seleção e mira guardados numa variável como objetos do jogo', () => {
      const ws = new Blockly.Workspace()
      const frame = ws.newBlock('sz_frame_start')
      const selected = ws.newBlock('sz_js_var_create')
      selected.setFieldValue('selecionado', 'NAME')
      const pick = ws.newBlock('sz_g3d_pick_at_mouse')
      selected.getInput('VALUE')?.connection?.connect(pick.outputConnection as Blockly.Connection)
      const aimed = ws.newBlock('sz_js_const_create')
      aimed.setFieldValue('alvo', 'NAME')
      const aim = ws.newBlock('sz_g3d_aim_ahead')
      aimed.getInput('VALUE')?.connection?.connect(aim.outputConnection as Blockly.Connection)
      const use = ws.newBlock('sz_g3d_fps_camera')

      frame
        .getInput('CHILDREN')
        ?.connection?.connect(selected.previousConnection as Blockly.Connection)
      selected.nextConnection?.connect(aimed.previousConnection as Blockly.Connection)
      aimed.nextConnection?.connect(use.previousConnection as Blockly.Connection)

      expect(collectGame3DObjects(ws, use)).toEqual(['selecionado', 'alvo'])
    })

    it('o "item" do para-cada do enxame declara; tirar-do-enxame consome objeto do jogo', () => {
      const ws = new Blockly.Workspace()
      expect(ws.newBlock('sz_g3d_for_each_swarm').getField('ITEM')).not.toBeInstanceOf(
        FieldNamePicker,
      )
      expect(kindOf(ws.newBlock('sz_g3d_remove_from_swarm'), 'ITEM')).toBe('g3d-object')
    })

    it('só oferece grupos e enxames declarados antes do bloco que os usa', () => {
      const ws = new Blockly.Workspace()
      const frame = ws.newBlock('sz_frame_start')
      const groupBefore = ws.newBlock('sz_g3d_create_group')
      groupBefore.setFieldValue('inimigosProntos', 'NAME')
      const swarmBefore = ws.newBlock('sz_g3d_create_swarm')
      swarmBefore.setFieldValue('estrelasProntas', 'NAME')
      const use = ws.newBlock('sz_g3d_prune_swarm')
      const groupAfter = ws.newBlock('sz_g3d_create_group')
      groupAfter.setFieldValue('inimigosFuturos', 'NAME')
      const swarmAfter = ws.newBlock('sz_g3d_create_swarm')
      swarmAfter.setFieldValue('estrelasFuturas', 'NAME')

      frame
        .getInput('CHILDREN')
        ?.connection?.connect(groupBefore.previousConnection as Blockly.Connection)
      groupBefore.nextConnection?.connect(swarmBefore.previousConnection as Blockly.Connection)
      swarmBefore.nextConnection?.connect(use.previousConnection as Blockly.Connection)
      use.nextConnection?.connect(groupAfter.previousConnection as Blockly.Connection)
      groupAfter.nextConnection?.connect(swarmAfter.previousConnection as Blockly.Connection)

      expect(collectGroups3d(ws, use)).toEqual(['inimigosProntos'])
      expect(collectSwarms3d(ws, use)).toEqual(['estrelasProntas'])
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
