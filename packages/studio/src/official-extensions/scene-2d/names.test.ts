import { beforeAll, describe, expect, test } from 'bun:test'
import { evaluateProjectStructure } from '@sistemazero/core/learning'
import * as Blockly from 'blockly/core'
import { BLOCK_CATALOG } from '../../blockly/blockCatalog'
import { registerExtensionBlocks } from '../../blockly/blocks'
import { buildIRFromWorkspace } from '../../blockly/buildIR'
import {
  collectSceneNames,
  FieldNamePicker,
  nameKindAllowsFreeText,
} from '../../blockly/fields/FieldNamePicker'
import { evaluateStudioProjectStructure } from '../../blockly/projectCheckAuthoring'
import { ensureBlocklyInitialized } from '../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../blockly/workspaceState'
import type { SerializedBlocklyBlock } from '../../codecs/types'
import type { Project } from '../../core/project'
import { compileStatements } from '../../generators/js'
import { behaviorStatements, normalizeSZIR, SZIRV2Schema } from '../../ir'
import { parseJS } from '../../parsers/js'
import { countExtensionBlocksInProject } from '../../state/extensionsAdapter'
import { EXTENSION_BLOCKLY_BLOCK_TYPES } from '../../state/projectValidation'
import { gameTwoDBlocks, gameTwoDToolboxCategory } from '../game-2d/blocks'
import { gameKitBlocks, gameKitToolboxCategory } from '../game-2d-advanced/blocks'
import { sceneShadows } from './blocks'
import {
  isSceneNameBlock,
  SCENE_NAME_KINDS,
  sceneBlockType,
  sceneMethods,
  sceneNameBlockType,
  sceneNameDeclarations,
  sceneNamesAsText,
} from './catalog'

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameTwoDBlocks)
  registerExtensionBlocks(gameKitBlocks)
})

const TARGETS = [
  ['g2d', 'SZGame2D', 'game-2d', gameTwoDBlocks, gameTwoDToolboxCategory],
  ['gk', 'SZGameKit', 'game-2d-advanced', gameKitBlocks, gameKitToolboxCategory],
] as const

function stateFrom(extensionId: string, code: string) {
  const ir = SZIRV2Schema.parse(
    normalizeSZIR({ html: [], css: [], js: parseJS(code), extensions: [{ extensionId }] }),
  )
  return { ir, state: buildWorkspaceStateFromIR(ir) }
}

/** Every serialized block of a state, shadows included. */
function everyBlock(node: unknown, found: SerializedBlocklyBlock[] = []): SerializedBlocklyBlock[] {
  if (Array.isArray(node)) {
    for (const child of node) everyBlock(child, found)
    return found
  }
  if (!node || typeof node !== 'object') return found
  const record = node as Record<string, unknown>
  if (typeof record.type === 'string') found.push(record as unknown as SerializedBlocklyBlock)
  for (const child of Object.values(record)) everyBlock(child, found)
  return found
}

function toolboxBlocks(node: unknown, found: { type: string; inputs?: unknown }[] = []) {
  if (Array.isArray(node)) {
    for (const child of node) toolboxBlocks(child, found)
    return found
  }
  if (!node || typeof node !== 'object') return found
  const record = node as { kind?: string; type?: string; inputs?: unknown; contents?: unknown }
  if (record.kind === 'block' && typeof record.type === 'string')
    found.push({ type: record.type, inputs: record.inputs })
  if (record.contents) toolboxBlocks(record.contents, found)
  return found
}

function load(extensionId: string, code: string) {
  const { state } = stateFrom(extensionId, code)
  const workspace = new Blockly.Workspace()
  Blockly.serialization.workspaces.load(state, workspace)
  return workspace
}

for (const [target, api, extensionId, blocks, toolbox] of TARGETS) {
  describe(`${target}: simple scene names and palette`, () => {
    test('names in use come from creators, while sprites use the ordinary sprite picker', () => {
      const shadows = sceneShadows(target)
      for (const entry of sceneMethods(target)) {
        for (const arg of entry.args) {
          const input = shadows[sceneBlockType(target, entry)]?.[arg.name] as
            | { shadow?: { type: string } }
            | undefined
          if (arg.picks) expect(input?.shadow?.type).toBe(sceneNameBlockType(target, arg.picks))
          if (arg.declares) expect(input?.shadow?.type).toBe('sz_val_text')
          if (arg.field === 'sprite') expect(input).toBeUndefined()
        }
      }
      const offered = toolboxBlocks(toolbox.contents).map((block) => block.type)
      expect(offered).toContain(`sz_${target}_create_sprite_track`)
      expect(offered).toContain(`sz_${target}_scene_animation`)
      for (const obsolete of [
        'create_scene_layer',
        'transform_scene_layer',
        'motion_scene_layer',
        'order_scene_layer',
        'show_scene_layer',
        'remove_scene_layer',
        'create_track',
        'view_track',
        'camera_track',
        'advance_track',
        'place_track_object',
        'move_track_object',
        'remove_track_object',
        'project_track',
        'draw_track',
        'draw_scene_layers',
        'track_value',
        'track_passed',
        'track_touching',
        'scene_object_name',
      ]) {
        expect(blocks.some((block) => block.type === `sz_${target}_${obsolete}`)).toBe(false)
        expect(EXTENSION_BLOCKLY_BLOCK_TYPES[extensionId]?.has(`sz_${target}_${obsolete}`)).toBe(
          false,
        )
      }
      for (const kind of SCENE_NAME_KINDS) {
        const type = sceneNameBlockType(target, kind)
        expect(blocks.find((block) => block.type === type)?.hidden).toBe(true)
        expect(offered).not.toContain(type)
        expect(BLOCK_CATALOG.some((entry) => entry.type === type)).toBe(false)
      }
    })
    test('saved lists, computed names and event bodies survive reopening', () => {
      const { ir, state } = stateFrom(
        extensionId,
        `${api}.createSpriteTrack('rio');
let outra = 'rio';
${api}.trackCameraView(outra, "wide");
${api}.onTrackFinish('rio', function () { ${api}.trackCameraView('rio', "near");  });`,
      )
      const score = everyBlock(state).find(
        (block) => block.type === `sz_${target}_track_camera_view`,
      )
      expect(score?.inputs?.TRACK?.block).toBeDefined()
      expect(score?.inputs?.TRACK?.shadow?.type).toBe(sceneNameBlockType(target, 'track'))
      const ws = new Blockly.Workspace()
      try {
        Blockly.serialization.workspaces.load(state, ws)
        const saved = Blockly.serialization.workspaces.save(ws)
        ws.clear()
        Blockly.serialization.workspaces.load(saved, ws)
        expect(compileStatements(behaviorStatements(buildIRFromWorkspace(ws)), 0)).toBe(
          compileStatements(behaviorStatements(ir), 0),
        )
      } finally {
        ws.dispose()
      }
    })
    test('the name list contains only scenes created by the corresponding engine', () => {
      const ws = load(
        extensionId,
        `${api}.addSceneBackdrop('ceu', 'a', 'far');
${api}.addSceneBackdrop('montanhas', 'b', 'back');
${api}.addSceneBackdrop('ceu', 'c', 'front');
${api}.createSpriteTrack('pista');
${api}.sceneBackdropMotion('montanhas', 40);`,
      )
      try {
        expect(collectSceneNames(ws, 'layer')).toEqual(['ceu', 'montanhas'])
        expect(collectSceneNames(ws, 'track')).toEqual(['pista'])
        const field = ws
          .getBlocksByType(`sz_${target}_scene_backdrop_motion`, false)[0]
          ?.getInputTargetBlock('NAME')
          ?.getField('NAME')
        expect(field).toBeInstanceOf(FieldNamePicker)
        expect((field as FieldNamePicker).kind).toBe('scene-layer')
      } finally {
        ws.dispose()
      }
    })
  })
}

test('lesson checks and block counts treat the embedded name list as part of the scene block', () => {
  const { state } = stateFrom(
    'game-2d',
    `SZGame2D.addSceneBackdrop('ceu', 'a', 'far'); SZGame2D.sceneBackdropMotion('ceu', 40);`,
  )
  const project = { blocksState: state }
  const rule = {
    type: 'usesBlock' as const,
    blockType: 'sz_g2d_scene_backdrop_motion',
    inputs: { NAME: 'ceu' },
  }
  expect(evaluateStudioProjectStructure(rule, project)).toBe(true)
  expect(evaluateStudioProjectStructure({ ...rule, inputs: { NAME: 'outra' } }, project)).toBe(
    false,
  )
  expect(evaluateProjectStructure(rule, project)).toBe(false)
  const read = sceneNamesAsText(state)
  expect(read).not.toBe(state)
  expect(everyBlock(read).some((block) => isSceneNameBlock(block.type))).toBe(false)
  expect(everyBlock(state).some((block) => isSceneNameBlock(block.type))).toBe(true)
  expect(countExtensionBlocksInProject(project as unknown as Project, 'game-2d')).toBe(2)
  for (const kind of SCENE_NAME_KINDS) {
    expect(nameKindAllowsFreeText(`scene-${kind}`)).toBe(true)
    expect(Object.keys(sceneNameDeclarations(kind))).toHaveLength(2)
  }
})
