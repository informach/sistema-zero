import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
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
      ((block.args0 ?? []) as { type?: string; name: string }[])
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
    // ⚠️ Lista EXPLÍCITA: um bloco de áudio novo que não seja somado aqui passa
    // batido pela guarda, e o custo é som que não toca sem ninguém entender por
    // quê. `sz_g3d_load_sound` fica de fora de propósito — ele não toca nada, é
    // `start-only-command`, e o teste de placement dele é o do blockAudit.
    for (const type of [
      'sz_g3d_play_note',
      'sz_g3d_play_effect',
      'sz_g3d_play_sound',
      'sz_g3d_stop_sound',
      'sz_g3d_stop_music',
      'sz_g3d_set_volume',
    ]) {
      const definition = gameThreeDBlocks.find((block) => block.type === type)
      if (!definition) throw new Error(`bloco ${type} não encontrado`)
      const placement = inferBlockContract(definition).placement
      expect(placement?.root).toEqual([])
      expect(placement?.nested).toContain('user-gesture-body')
      expect(placement?.nested).toContain('loop-body')
      expect(placement?.nested).not.toContain('event-body')
    }
  })

  it('só permite o fim de jogo e o recomeçar num contexto que pode estar rodando', () => {
    for (const type of ['sz_g3d_end_game', 'sz_g3d_restart']) {
      const definition = gameThreeDBlocks.find((block) => block.type === type)
      if (!definition) throw new Error(`bloco ${type} não encontrado`)
      const placement = inferBlockContract(definition).placement

      expect(placement?.root).toEqual([])
      expect(placement?.nested).toContain('loop-body')
      expect(placement?.nested).toContain('event-body')
      expect(placement?.nested).toContain('function-body')
    }
  })

  it('só permite soltar a torre em resposta a uma ação', () => {
    const definition = gameThreeDBlocks.find((block) => block.type === 'sz_g3d_stack_drop')
    if (!definition) throw new Error('bloco sz_g3d_stack_drop não encontrado')
    const placement = inferBlockContract(definition).placement

    expect(placement?.root).toEqual([])
    expect(placement?.nested).toContain('event-body')
    expect(placement?.nested).toContain('function-body')
    expect(placement?.nested).not.toContain('loop-body')
    expect(placement?.nested).not.toContain('syntactic-loop-body')
    expect(placement?.nested).not.toContain('constructor-body')
    expect(placement?.forbiddenNested).toContain('loop-body')
    expect(placement?.forbiddenNested).toContain('syntactic-loop-body')
  })

  it('declara a cor uma única vez pela subcategoria de cada bloco', () => {
    const source = readFileSync(join(import.meta.dir, '..', 'blocks.ts'), 'utf8')
    const definitionsStart = source.indexOf('const gameThreeDBlockDefinitions')
    const subcategoriesStart = source.indexOf('const STACKED_INPUT_TYPES')
    const definitionsSource = source.slice(definitionsStart, subcategoriesStart)

    expect(definitionsStart).toBeGreaterThanOrEqual(0)
    expect(subcategoriesStart).toBeGreaterThan(definitionsStart)
    expect(definitionsSource).not.toMatch(/^\s+colour:/gm)
    expect(source).not.toMatch(/^const (?:EVENT_C|KIT_C|GRID_C|KIT2_C|RACE_C|STACK_C)\b/m)
    expect(
      (gameThreeDBlocks as BlockDefinition[]).every((block) => typeof block.colour === 'string'),
    ).toBe(true)
  })
})

describe('textos que prometiam outra coisa (review 3D, item 25)', () => {
  it('a opacidade diz o que o número faz (1 = inteiro, 0 = some)', () => {
    const block = gameThreeDBlocks.find((b) => b.type === 'sz_g3d_set_opacity')
    expect(block?.message0).not.toMatch(/transpar/i)
    expect(block?.message0).toContain('0 = some, 1 = inteiro')
  })

  it('as teclas sem ação própria têm rótulo neutro (R não recomeça, P não pausa)', async () => {
    const { THREE_KEY_OPTIONS } = await import('../../threeKeys')
    const label = (code: string) => THREE_KEY_OPTIONS.find(([, value]) => value === code)?.[0]
    expect(label('KeyR')).toBe('R')
    expect(label('KeyP')).toBe('P')
    expect(label('KeyF')).toBe('F')
    expect(label('ShiftLeft')).toBe('shift')
  })

  it('a faixa do Kit Travessia nomeia a régua da velocidade', () => {
    const block = gameThreeDBlocks.find((b) => b.type === 'sz_g3d_add_row')
    expect(block?.message0).toContain('(150 = normal)')
    expect(block?.tooltip).toContain('pontos por segundo')
  })
})
