import { expect, test } from 'bun:test'
import * as Blockly from 'blockly/core'
import { pythonWorkspaceToVisual, registerPythonBlocks } from '../../blocks/blockly'
import { PYTHON_PROGRAMMING_CODECS } from '../../blocks/catalog'
import { pythonPaletteBlockState } from '../../blocks/paletteBlocks'
import { PYTHON_PALETTE_GROUPS } from '../../blocks/paletteGroups'
import { pythonVisualToAST } from '../../blocks/projection'
import { PYTHON_RAYLIB_2D_CODECS } from '../raylib2d/catalog'
import { PYTHON_RAYLIB_3D_CODECS } from '../raylib3d/catalog'
import {
  RAYLIB_2D_STRUCT_FIELDS,
  RAYLIB_2D_WORLD_ONLY,
  RAYLIB_3D_STRUCT_FIELDS,
} from './commonCatalog'

/**
 * Every Raylib palette block arrives complete (all its inputs filled), loads in Blockly and,
 * when it is a statement, already is a program. Each block's category belongs to the palette
 * group of its extension (a category outside it would make the block unreachable).
 */
for (const [label, own] of [
  ['Raylib 2D', PYTHON_RAYLIB_2D_CODECS],
  ['Raylib 3D', PYTHON_RAYLIB_3D_CODECS],
] as const) {
  const codecs = [...own, ...PYTHON_PROGRAMMING_CODECS]

  test(`${label}: cada bloco da paleta chega completo e carrega no Blockly`, () => {
    registerPythonBlocks(codecs)
    const workspace = new Blockly.Workspace()
    let checked = 0
    try {
      for (const codec of own) {
        if (codec.hidden) continue
        const { kind: _kind, ...state } = pythonPaletteBlockState(codec, codecs)
        const block = Blockly.serialization.blocks.append(
          state as Blockly.serialization.blocks.State,
          workspace,
        )
        for (const input of block.inputList)
          if (input.connection?.type === Blockly.ConnectionType.INPUT_VALUE)
            expect(
              block.getInputTargetBlock(input.name),
              `${codec.id} ${input.name}`,
            ).not.toBeNull()
        if (codec.role === 'statement') {
          const visual = pythonWorkspaceToVisual(workspace, [block.id], [], codecs)
          let kind: string | undefined
          try {
            kind = pythonVisualToAST(visual, codecs).kind
          } catch (error) {
            throw new Error(`${codec.id}: ${(error as Error).message}`)
          }
          expect(kind).toBe('Module')
        }
        block.dispose(false)
        checked++
      }
    } finally {
      workspace.dispose()
    }
    // Anti-vácuo: a paleta inteira passou pelo laço.
    expect(checked).toBeGreaterThan(label === 'Raylib 3D' ? 170 : 120)
  })

  test(`${label}: cada categoria de bloco está no grupo da paleta`, () => {
    const owner = own[0]!.owner as keyof typeof PYTHON_PALETTE_GROUPS
    const categories = new Set(
      PYTHON_PALETTE_GROUPS[owner].categories.map(([category]) => category),
    )
    const outside = own.filter((codec) => !categories.has(codec.category)).map((codec) => codec.id)
    expect(outside).toEqual([])
  })
}

test('a paleta 3D tem os blocos do 3D e a 2D não', () => {
  const ids = (codecs: readonly { id: string }[]) => new Set(codecs.map((codec) => codec.id))
  const three = ids(PYTHON_RAYLIB_3D_CODECS)
  const two = ids(PYTHON_RAYLIB_2D_CODECS)
  for (const key of [
    'draw_cube',
    'load_model',
    'update_model_animation',
    'ffi_new',
    'set_shader_value',
  ])
    expect(three.has(`sz_py_rl3d_${key}`)).toBe(true)
  expect([...two].some((id) => id.endsWith('draw_cube') || id.endsWith('load_model'))).toBe(false)
})

/**
 * The two palettes are independent and self-sufficient (decision of 25/10/2026): the 2D one
 * has no 3D block or field, and the 3D one has no block or field that only serves a 2D world.
 */
test('a paleta 2D não tem nada do 3D e a 3D não tem o que só serve ao mundo 2D', () => {
  const keys = (codecs: readonly { id: string }[], prefix: string) =>
    new Set(codecs.map((codec) => codec.id.slice(prefix.length)))
  const two = keys(PYTHON_RAYLIB_2D_CODECS, 'sz_py_rl2d_')
  const three = keys(PYTHON_RAYLIB_3D_CODECS, 'sz_py_rl3d_')
  // Tudo o que a paleta 2D tem e a 3D não é exatamente a lista do mundo 2D, e cada item dela
  // existe no 2D (sem isso a lista poderia nomear um bloco que não existe e não cortar nada).
  expect([...two].filter((key) => !three.has(key)).sort()).toEqual([...RAYLIB_2D_WORLD_ONLY].sort())
  // Nenhum bloco só do 3D vaza para a paleta 2D.
  const onlyThree = [...three].filter((key) => !two.has(key))
  expect(onlyThree.length).toBeGreaterThan(70)
  for (const key of onlyThree) expect(two.has(key)).toBe(false)

  const fieldsOf = (
    codecs: readonly { id: string; match?: { names?: readonly string[] } }[],
    id: string,
  ) => new Set(codecs.find((codec) => codec.id === id)?.match?.names ?? [])
  const twoFields = fieldsOf(PYTHON_RAYLIB_2D_CODECS, 'sz_py_rl2d_field')
  const threeFields = fieldsOf(PYTHON_RAYLIB_3D_CODECS, 'sz_py_rl3d_field')
  expect(twoFields).toEqual(new Set(RAYLIB_2D_STRUCT_FIELDS.map(([, value]) => value)))
  expect(threeFields).toEqual(new Set(RAYLIB_3D_STRUCT_FIELDS.map(([, value]) => value)))
  for (const field of ['z', 'position', 'fovy', 'meshes', 'normal', 'hit'])
    expect(twoFields.has(field), field).toBe(false)
  for (const field of ['offset', 'rotation', 'zoom'])
    expect(threeFields.has(field), field).toBe(false)
})
