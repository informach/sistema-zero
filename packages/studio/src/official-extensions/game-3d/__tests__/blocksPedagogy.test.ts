import { describe, expect, it } from 'bun:test'
import type { BlockDefinition } from '../../../blockly/blocks/types'
import { G3D_SOCKET_SHADOW_TYPES, gameThreeDBlocks, gameThreeDToolboxCategory } from '../blocks'

describe('game-3d — ergonomia dos blocos para iniciantes', () => {
  it('todo bloco explica sua finalidade em português', () => {
    expect(gameThreeDBlocks.filter((block) => !block.tooltip).map((block) => block.type)).toEqual(
      [],
    )
  })

  it('todo soquete numérico chega preenchido com uma sombra editável', () => {
    const missing = gameThreeDBlocks.flatMap((block) =>
      (block.args0 ?? [])
        .filter(
          (arg) => arg.type === 'input_value' && !G3D_SOCKET_SHADOW_TYPES[block.type]?.[arg.name],
        )
        .map((arg) => `${block.type}.${arg.name}`),
    )
    expect(missing).toEqual([])
  })

  it('blocos com muitos parâmetros usam disposição vertical', () => {
    const tooWide = (gameThreeDBlocks as readonly BlockDefinition[])
      .filter(
        (block) =>
          (block.args0?.length ?? 0) >= 5 &&
          (!Object.hasOwn(block, 'inputsInline') || block.inputsInline === true),
      )
      .map((block) => block.type)
    expect(tooWide).toEqual([])
  })

  it('não chama nenhuma subcategoria de avançada', () => {
    const names = (gameThreeDToolboxCategory.contents ?? [])
      .map((entry) => ('name' in entry ? entry.name : ''))
      .filter(Boolean)
    expect(names.some((name) => /avançad/i.test(name))).toBe(false)
  })
})
