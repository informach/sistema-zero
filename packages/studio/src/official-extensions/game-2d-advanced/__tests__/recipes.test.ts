import { describe, expect, it } from 'bun:test'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { createEmptyProject } from '../../../core/project'
import { generateProjectFiles } from '../../../generators/project'
import { normalizeSZIR, SZIRV2Schema } from '../../../ir'
import { parseJS } from '../../../parsers/js'
import { sanitizeProjectForHost } from '../../../state/projectValidation'
import { GAME_KIT_EXAMPLE_SECTIONS, gameKitExamples } from '../exampleCatalog'
import { assetsForRecipe } from '../examples/recipes/assets'
import { advancedRecipeExamples } from '../examples/recipes/generated'
import { ADVANCED_RECIPE_SOURCES } from '../examples/recipes/sources'
import { stripIds } from './exampleContractHarness'

describe('receitas executáveis do Jogo 2D Avançado', () => {
  it('começa com demonstração e jogo completo antes de campanhas e kits', () => {
    expect(gameKitExamples[0]?.name).toBe('Meu primeiro jogo')
    expect(gameKitExamples[1]?.name).toBe('Caça-moedas profissional')
    expect(gameKitExamples[1]?.experience).toBe('game')
    expect(GAME_KIT_EXAMPLE_SECTIONS.receitas).toHaveLength(10)
    expect(gameKitExamples.map((example) => example.name)).toEqual(
      [
        ...GAME_KIT_EXAMPLE_SECTIONS.demos,
        ...GAME_KIT_EXAMPLE_SECTIONS.simples,
        ...GAME_KIT_EXAMPLE_SECTIONS.maiores,
        ...GAME_KIT_EXAMPLE_SECTIONS.kits,
        ...GAME_KIT_EXAMPLE_SECTIONS.receitas,
      ].map((example) => example.name),
    )
  })

  it('recusa referência a material ausente', () => {
    expect(() => assetsForRecipe(['material-que-nao-existe'])).toThrow('Material ausente')
  })

  for (const recipe of ADVANCED_RECIPE_SOURCES) {
    it(`${recipe.name}: fonte atual, materiais completos e documento editável`, () => {
      const example = advancedRecipeExamples.find((entry) => entry.name === recipe.name)
      expect(example).toBeDefined()
      if (!example) throw new Error(`Receita não gerada: ${recipe.name}`)
      const parsed = normalizeSZIR({
        html: [],
        css: [],
        js: parseJS(
          `${recipe.source}\nSZGameKit.setStageDescription(${JSON.stringify(recipe.description)});`,
        ),
        extensions: [{ extensionId: 'game-2d-advanced' }],
      })
      expect(stripIds(example.ir)).toEqual(stripIds(parsed))
      expect(example.assets).toEqual(assetsForRecipe(recipe.assets))
      expect(SZIRV2Schema.safeParse(example.ir).success).toBe(true)
      const project = {
        ...createEmptyProject(`receita-${recipe.name}`, recipe.name),
        ir: example.ir,
        blocksState: buildWorkspaceStateFromIR(example.ir),
        files: generateProjectFiles({ ir: example.ir, projectName: example.name }),
        assets: example.assets,
        installedExtensions: [{ id: 'game-2d-advanced', version: '0.63.0', installedAt: 0 }],
      }
      const restored = sanitizeProjectForHost(project)
      if (!restored) throw new Error(`A receita não pôde ser restaurada: ${recipe.name}`)
      expect(restored.ir).toEqual(project.ir)
      expect(restored.assets).toEqual(project.assets)
      expect(example.description).toMatch(/setas|espaço|enter|arraste|mouse|dedo|toque/i)
    })
  }
})
