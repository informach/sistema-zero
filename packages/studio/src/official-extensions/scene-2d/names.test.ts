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
  SCENE_METHODS,
  SCENE_NAME_KINDS,
  type SceneTarget,
  sceneBlockType,
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
  describe(`${target}: names are picked from what already exists`, () => {
    test('a socket that USES a name is born with the list; one that CREATES it, with plain text', () => {
      const shadows = sceneShadows(target as SceneTarget)
      let users = 0
      let creators = 0
      for (const entry of SCENE_METHODS) {
        for (const arg of entry.args) {
          const shadow = (
            shadows[sceneBlockType(target, entry)]?.[arg.name] as { shadow?: { type?: string } }
          )?.shadow
          if (arg.picks) {
            users++
            expect(shadow?.type, `${entry.block}.${arg.name}`).toBe(
              sceneNameBlockType(target, arg.picks),
            )
          }
          if (arg.declares) {
            creators++
            expect(shadow?.type, `${entry.block}.${arg.name}`).toBe('sz_val_text')
          }
        }
      }
      // Anti-vacuum: 5 layer users, 11 track users and 4 object users; one creator of each.
      expect(users).toBe(20)
      expect(creators).toBe(3)
      // The palette really hands the list over, and not only the map that feeds it.
      const inPalette = toolboxBlocks(toolbox.contents).find(
        (block) => block.type === `sz_${target}_transform_scene_layer`,
      )
      expect(inPalette?.inputs).toMatchObject({
        NAME: { shadow: { type: sceneNameBlockType(target, 'layer') } },
      })
    })

    test('the list blocks exist for old and new projects, but are not offered on their own', () => {
      const types = SCENE_NAME_KINDS.map((kind) => sceneNameBlockType(target, kind))
      for (const type of types) {
        const definition = blocks.find((block) => block.type === type)
        expect(definition?.hidden, type).toBe(true)
        expect(definition?.output, type).toBe('JSValue')
        expect(isSceneNameBlock(type)).toBe(true)
      }
      const offered = toolboxBlocks(toolbox.contents).map((block) => block.type)
      expect(offered.filter((type) => types.includes(type))).toEqual([])
      expect(BLOCK_CATALOG.filter((entry) => types.includes(entry.type))).toEqual([])
      expect(isSceneNameBlock(`sz_${target}_create_track`)).toBe(false)
      // A saved project is refused whole when one block type is unknown to the import
      // allowlist; a block that lives inside every name socket must be in it.
      for (const type of types)
        expect(EXTENSION_BLOCKLY_BLOCK_TYPES[extensionId]?.has(type), type).toBe(true)
    })

    test('a fixed name returns from code into the list, and a computed one keeps the list beneath', () => {
      const { ir, state } = stateFrom(
        extensionId,
        `${api}.createTrack('rio', 28, 300, 160, 120);
for (let i = 0; i < 3; i++) { ${api}.moveTrackObject('rio', 'obj' + i, 0, 100); }
${api}.removeTrackObject('rio', 'pedra');`,
      )
      const all = everyBlock(state)
      const create = all.find((block) => block.type === `sz_${target}_create_track`)
      const move = all.find((block) => block.type === `sz_${target}_move_track_object`)
      const remove = all.find((block) => block.type === `sz_${target}_remove_track_object`)
      // The creator keeps free text: a child names the track there, once. Like every
      // literal that comes back from code, it is the socket's SHADOW again: dragged
      // out as a real block it would leave an empty socket behind.
      expect(create?.inputs?.TRACK).toEqual({
        shadow: { type: 'sz_val_text', fields: { TEXT: 'rio' } },
      })
      expect(create?.inputs?.HORIZON).toEqual({
        shadow: { type: 'sz_val_number', fields: { NUM: 28 } },
      })
      expect(move?.inputs?.Z?.shadow?.type).toBe('sz_val_number')
      expect(move?.inputs?.Z?.block).toBeUndefined()
      expect(move?.inputs?.TRACK).toEqual({
        shadow: { type: sceneNameBlockType(target, 'track'), fields: { NAME: 'rio' } },
      })
      expect(remove?.inputs?.OBJECT).toEqual({
        shadow: { type: sceneNameBlockType(target, 'object'), fields: { NAME: 'pedra' } },
      })
      expect(move?.inputs?.OBJECT?.block).toBeDefined()
      expect(isSceneNameBlock(move?.inputs?.OBJECT?.block?.type ?? '')).toBe(false)
      expect(move?.inputs?.OBJECT?.shadow?.type).toBe(sceneNameBlockType(target, 'object'))

      // And the program is the same after the blocks are saved and reopened.
      const workspace = new Blockly.Workspace()
      try {
        Blockly.serialization.workspaces.load(state, workspace)
        const saved = Blockly.serialization.workspaces.save(workspace)
        workspace.clear()
        Blockly.serialization.workspaces.load(saved, workspace)
        const rebuilt = buildIRFromWorkspace(workspace)
        expect(JSON.stringify(rebuilt)).not.toContain('rawJS')
        expect(compileStatements(behaviorStatements(rebuilt), 0)).toBe(
          compileStatements(behaviorStatements(ir), 0),
        )
      } finally {
        workspace.dispose()
      }
    })

    test('the list shows the names already created, each kind its own', () => {
      const workspace = load(
        extensionId,
        `${api}.createSceneLayer('ceu', 'a', 'back');
${api}.createSceneLayer('montanhas', 'b', 'back');
${api}.createSceneLayer('ceu', 'c', 'front');
${api}.createTrack('pista', 28, 300, 160, 120);
${api}.createTrack('rio', 28, 300, 160, 120);
${api}.placeTrackObject('pista', 'bandeira', 'a', 0, 600, 40, 80);
${api}.placeTrackObject('rio', 'pedra', 'a', 0, 600, 40, 80);
${api}.placeTrackObject('pista', 7, 'a', 0, 600, 40, 80);
for (let i = 0; i < 3; i++) { ${api}.placeTrackObject('pista', 'obj' + i, 'a', 0, 600, 40, 80); }
${api}.transformSceneLayer('montanhas', 0, 0, 1, 1);
${api}.moveTrackObject('rio', 'pedra', 0, 100);
${api}.moveTrackObject('pista', 'bandeira', 0, 100);
${api}.moveTrackObject('lago', 'bandeira', 0, 100);`,
      )
      try {
        expect(collectSceneNames(workspace, 'layer')).toEqual(['ceu', 'montanhas'])
        expect(collectSceneNames(workspace, 'track')).toEqual(['pista', 'rio'])
        // No block in hand: every fixed object name. The computed one has nothing to offer.
        expect(collectSceneNames(workspace, 'object')).toEqual(['bandeira', 'pedra', '7'])

        const moves = workspace.getBlocksByType(`sz_${target}_move_track_object`, true)
        const nameOf = (track: string) => {
          const block = moves.find(
            (move) => move.getInputTargetBlock('TRACK')?.getFieldValue('NAME') === track,
          )
          const name = block?.getInputTargetBlock('OBJECT')
          if (!name) throw new Error(`no move block on track ${track}`)
          return name
        }
        // An object belongs to a track: the list follows the track named in the same block.
        expect(collectSceneNames(workspace, 'object', nameOf('rio'))).toEqual(['pedra'])
        expect(collectSceneNames(workspace, 'object', nameOf('pista'))).toEqual(['bandeira', '7'])
        // A track with no object of its own would leave the list empty: show them all.
        expect(collectSceneNames(workspace, 'object', nameOf('lago'))).toEqual([
          'bandeira',
          'pedra',
          '7',
        ])

        // The field itself: a picker of the right kind that still takes a typed name.
        const field = nameOf('rio').getField('NAME')
        expect(field).toBeInstanceOf(FieldNamePicker)
        expect((field as FieldNamePicker).kind).toBe('scene-object')
        const layerUser = workspace.getBlocksByType(`sz_${target}_transform_scene_layer`, false)[0]
        const layerField = layerUser?.getInputTargetBlock('NAME')?.getField('NAME')
        expect((layerField as FieldNamePicker).kind).toBe('scene-layer')
        expect(layerUser?.getInputTargetBlock('NAME')?.isShadow()).toBe(true)
      } finally {
        workspace.dispose()
      }
    })
  })
}

test('a lesson check reads the name picked from the list as the text it is', () => {
  const { state } = stateFrom(
    'game-2d',
    `SZGame2D.createSceneLayer('ceu', 'a', 'back');
SZGame2D.transformSceneLayer('ceu', 0, 0, 1, 1);`,
  )
  const project = { blocksState: state }
  const used = (name: string) =>
    evaluateStudioProjectStructure(
      { type: 'usesBlock', blockType: 'sz_g2d_transform_scene_layer', inputs: { NAME: name } },
      project,
    )
  // The name sits in a list block, which the evaluator alone would not read.
  expect(everyBlock(state).some((block) => isSceneNameBlock(block.type))).toBe(true)
  expect(used('ceu')).toBe(true)
  // Anti-vacuum: another name is still refused, and the bare evaluator, which does not
  // know the list blocks, fails the child who did everything right.
  expect(used('montanhas')).toBe(false)
  expect(
    evaluateProjectStructure(
      { type: 'usesBlock', blockType: 'sz_g2d_transform_scene_layer', inputs: { NAME: 'ceu' } },
      project,
    ),
  ).toBe(false)

  // The swap is a copy: the saved project keeps its list blocks, and a project with
  // none of them is returned as it came.
  const read = sceneNamesAsText(state)
  expect(read).not.toBe(state)
  expect(everyBlock(read).some((block) => isSceneNameBlock(block.type))).toBe(false)
  expect(everyBlock(state).some((block) => isSceneNameBlock(block.type))).toBe(true)
  const plain = stateFrom('game-2d', 'let pontos = 0;').state
  expect(sceneNamesAsText(plain)).toBe(plain)
})

test('a computed number keeps the number of the palette underneath', () => {
  const { state } = stateFrom(
    'game-2d',
    `SZGame2D.createSceneLayer('ceu', 'a', 'back');
let recuo = 4;
SZGame2D.transformSceneLayer('ceu', recuo, 0, 1, 1);`,
  )
  const transform = everyBlock(state).find((block) => block.type === 'sz_g2d_transform_scene_layer')
  expect(transform?.inputs?.X?.block).toBeDefined()
  expect(transform?.inputs?.X?.shadow).toEqual({ type: 'sz_val_number', fields: { NUM: 0 } })
  expect(transform?.inputs?.Y).toEqual({ shadow: { type: 'sz_val_number', fields: { NUM: 0 } } })
})

test('an empty name socket is an empty name, not the name the palette suggests', () => {
  const workspace = new Blockly.Workspace()
  try {
    Blockly.serialization.workspaces.load(
      {
        blocks: {
          blocks: [
            {
              type: 'sz_frame_start',
              inputs: {
                CHILDREN: {
                  block: {
                    type: 'sz_g2d_create_scene_layer',
                    fields: { IMAGE: 'a', PASS: 'back' },
                    next: { block: { type: 'sz_g2d_remove_scene_layer' } },
                  },
                },
              },
            },
          ],
        },
      },
      workspace,
    )
    const code = compileStatements(behaviorStatements(buildIRFromWorkspace(workspace)), 0)
    expect(code).toContain('SZGame2D.createSceneLayer("", "a", "back")')
    expect(code).toContain('SZGame2D.removeSceneLayer("")')
    expect(code).not.toContain('montanhas')
    // And nothing with no name is offered as a name.
    expect(collectSceneNames(workspace, 'layer')).toEqual([])
  } finally {
    workspace.dispose()
  }
})

test('each engine lists its own scene: a project with both does not mix them', () => {
  const workspace = load(
    'game-2d',
    `SZGame2D.createSceneLayer('ceu', 'a', 'back');
SZGameKit.createSceneLayer('nuvem', 'a', 'back');
SZGame2D.transformSceneLayer('ceu', 0, 0, 1, 1);
SZGameKit.transformSceneLayer('nuvem', 0, 0, 1, 1);`,
  )
  try {
    const basic = workspace
      .getBlocksByType('sz_g2d_transform_scene_layer', false)[0]
      ?.getInputTargetBlock('NAME')
    const advanced = workspace
      .getBlocksByType('sz_gk_transform_scene_layer', false)[0]
      ?.getInputTargetBlock('NAME')
    expect(collectSceneNames(workspace, 'layer', basic)).toEqual(['ceu'])
    expect(collectSceneNames(workspace, 'layer', advanced)).toEqual(['nuvem'])
    // Anti-vacuum: with no block in hand, both engines answer.
    expect(collectSceneNames(workspace, 'layer')).toEqual(['ceu', 'nuvem'])
  } finally {
    workspace.dispose()
  }
})

test('the list inside a socket is part of its block when counting blocks in use', () => {
  const { state } = stateFrom(
    'game-2d',
    `SZGame2D.createTrack('rio', 28, 300, 160, 120);
SZGame2D.moveTrackObject('rio', 'pedra', 0, 100);`,
  )
  // Anti-vacuum: the two lists are there, in the move block.
  expect(everyBlock(state).filter((block) => isSceneNameBlock(block.type))).toHaveLength(2)
  expect(
    countExtensionBlocksInProject({ blocksState: state } as unknown as Project, 'game-2d'),
  ).toBe(2)
})

test('the three kinds accept a typed name, and each has a creator in both engines', () => {
  for (const kind of SCENE_NAME_KINDS) {
    expect(nameKindAllowsFreeText(`scene-${kind}`)).toBe(true)
    expect(Object.keys(sceneNameDeclarations(kind)).sort()).toHaveLength(2)
  }
  expect(sceneNameDeclarations('object')).toEqual({
    sz_g2d_place_track_object: 'OBJECT',
    sz_gk_place_track_object: 'OBJECT',
  })
  expect(collectSceneNames(null, 'layer')).toEqual([])
})
