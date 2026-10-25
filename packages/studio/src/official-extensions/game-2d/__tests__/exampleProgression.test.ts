import { describe, expect, it } from 'bun:test'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { GAME_TWO_D_EXAMPLE_SECTIONS, gameTwoDExamples } from '../exampleCatalog'

function typesOf(value: unknown, types = new Set<string>()): Set<string> {
  if (!value || typeof value !== 'object') return types
  if ('type' in value && typeof value.type === 'string') types.add(value.type)
  for (const child of Object.values(value)) typesOf(child, types)
  return types
}

describe('Jogo 2D — progressão e independência de página', () => {
  it('a vitrine apresenta demonstrações, jogos simples, maiores e kits sem repetir cartões', () => {
    const { demos, simples, maiores, kits, receitas } = GAME_TWO_D_EXAMPLE_SECTIONS
    expect(gameTwoDExamples).toEqual([...demos, ...simples, ...maiores, ...kits, ...receitas])
    expect(new Set(gameTwoDExamples.map((example) => example.name)).size).toBe(45)
    expect(demos.every((example) => example.experience === 'demo')).toBe(true)
    expect(simples[0]?.name).toBe('Pegue a moeda')
  })

  it('o primeiro jogo completo tem início, objetivo, placar, vitória e recomeço', () => {
    const example = GAME_TWO_D_EXAMPLE_SECTIONS.simples[0]
    const types = typesOf(example.ir)
    for (const type of [
      'g2d:setupStage',
      'g2d:topDown',
      'g2d:touches',
      'g2d:drawScore',
      'g2d:showScreen',
      'g2d:restart',
    ]) {
      expect(types.has(type), type).toBe(true)
    }
    expect(JSON.stringify(example.ir)).toContain('vitoria')
  })

  for (const example of gameTwoDExamples) {
    it(`${example.name} só usa as ferramentas visuais da extensão`, () => {
      expect(example.ir.html).toEqual([])
      expect(example.ir.css).toEqual([])
      const types = [...typesOf(buildWorkspaceStateFromIR(example.ir))]
      expect(types.filter((type) => /^sz_(html_|css_|canvas_|t3d_)/.test(type))).toEqual([])
      expect(typesOf(example.ir).has('rawJS')).toBe(false)
    })
  }
})
