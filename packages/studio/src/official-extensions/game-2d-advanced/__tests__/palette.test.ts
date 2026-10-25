import { describe, expect, it } from 'bun:test'
import { paletteTreeTypes } from '../../extensionPalette'
import { gameKitPromptContext } from '../ai'
import { gameKitPromptSummary } from '../aiSummary'
import { GK_SOCKET_SHADOW_TYPES, gameKitBlocks, gameKitToolboxCategory } from '../blocks'
import { gameKitDocs } from '../docs'
import { GAME_KIT_PALETTE } from '../palette'

describe('Jogo 2D Avançado — famílias da paleta', () => {
  it('apresenta doze assuntos e deixa os sete kits reunidos no fim', () => {
    expect(GAME_KIT_PALETTE).toHaveLength(12)
    expect(gameKitToolboxCategory.contents.map((family) => family.kind)).toEqual(
      Array.from({ length: 12 }, () => 'category'),
    )
    expect(GAME_KIT_PALETTE.at(-1)?.name).toBe('Kits prontos')
    expect(GAME_KIT_PALETTE.at(-1)?.sections.map((section) => section.name)).toEqual([
      '🏃 Kit Plataforma',
      '🥊 Kit Luta',
      '🧙 Kit RPG',
      '👾 Kit Monstrinhos',
      '🚀 Kit Nave',
      '🏰 Kit Defesa de Torre',
      '🃏 Kit Cartas',
    ])
  })

  it('oferece cada bloco visível uma única vez, na árvore editorial', () => {
    const offered = paletteTreeTypes(GAME_KIT_PALETTE)
    const visible = gameKitBlocks.filter((block) => !block.hidden).map((block) => block.type)
    expect(visible.length).toBeGreaterThan(380)
    expect(visible.filter((type) => !offered.includes(type))).toEqual([])
    expect(offered.filter((type, index) => offered.indexOf(type) !== index)).toEqual([])
  })

  it('mostra os mesmos nomes de família no manual e na paleta', () => {
    for (const family of GAME_KIT_PALETTE) {
      expect(gameKitDocs).toContain(`**${family.name}**`)
    }
  })

  it('mantém as dicas curtas e o vocabulário público de grupos', () => {
    const visible = gameKitBlocks.filter((block) => !block.hidden)
    const tooLong = visible.filter(
      (block) => typeof block.tooltip === 'string' && block.tooltip.length > 220,
    )
    expect(tooLong.map((block) => block.type)).toEqual([])
    expect(
      visible
        .filter((block) => /enxame|semente/i.test(String(block.message0)))
        .map((block) => block.type),
    ).toEqual([])
  })

  it('mantém os valores iniciais de desenho e orienta o tutor a usar a extensão', () => {
    expect(GK_SOCKET_SHADOW_TYPES.sz_gk_draw_rectangle).toEqual({
      X: 'sz_val_number',
      Y: 'sz_val_number',
      W: 'sz_val_number',
      H: 'sz_val_number',
      COLOR: 'sz_val_color',
    })
    expect(gameKitPromptContext).not.toContain('blocos de Canvas do núcleo funcionam')
    expect(gameKitPromptContext).not.toContain('Blocos de Canvas do núcleo valem')
    expect(gameKitPromptContext).toContain('Não gere blocos HTML/CSS/Canvas')
    expect(gameKitPromptSummary).toContain('Não gere blocos HTML, CSS ou Canvas')
  })
})
