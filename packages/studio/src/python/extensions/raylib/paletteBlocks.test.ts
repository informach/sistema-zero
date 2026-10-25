import { expect, test } from 'bun:test'
import * as Blockly from 'blockly/core'
import { pythonWorkspaceToVisual, registerPythonBlocks } from '../../blocks/blockly'
import { PYTHON_PROGRAMMING_CODECS } from '../../blocks/catalog'
import { pythonPaletteBlockState } from '../../blocks/paletteBlocks'
import { PYTHON_PALETTE_GROUPS } from '../../blocks/paletteGroups'
import { pythonVisualToAST } from '../../blocks/projection'
import { PYTHON_RAYLIB_2D_CODECS } from '../raylib2d/catalog'
import { PYTHON_RAYLIB_3D_CODECS } from '../raylib3d/catalog'

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
    expect(checked).toBeGreaterThan(label === 'Raylib 3D' ? 200 : 120)
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
