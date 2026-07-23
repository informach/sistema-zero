import { describe, expect, it } from 'bun:test'
import { inferBlockContract } from '../../../blockly/blockContracts'
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

  it('só permite iniciar áudio dentro de uma interação ou de um loop já ativo', () => {
    for (const type of ['sz_g3d_play_note', 'sz_g3d_play_effect']) {
      const definition = gameThreeDBlocks.find((block) => block.type === type)
      if (!definition) throw new Error(`bloco ${type} não encontrado`)
      const placement = inferBlockContract(definition).placement
      expect(placement?.root).toEqual([])
      expect(placement?.nested).toContain('user-gesture-body')
      expect(placement?.nested).toContain('loop-body')
      expect(placement?.nested).not.toContain('event-body')
    }
  })

  it('só permite parar o jogo em um contexto que pode estar rodando', () => {
    const definition = gameThreeDBlocks.find((block) => block.type === 'sz_g3d_stop')
    if (!definition) throw new Error('bloco sz_g3d_stop não encontrado')
    const placement = inferBlockContract(definition).placement

    expect(placement?.root).toEqual([])
    expect(placement?.nested).toContain('loop-body')
    expect(placement?.nested).toContain('event-body')
    expect(placement?.nested).toContain('function-body')
  })
})
