import { describe, expect, it } from 'bun:test'
import { gameTwoDExamples } from '../official-extensions/game-2d/exampleCatalog'
import {
  buildKitGroups,
  filterKitGroups,
  type KitEntry,
  type KitGalleryFilters,
  type KitGroup,
} from './KitGallery'

describe('descoberta dos exemplos do Jogo 2D', () => {
  it('todos os 32 exemplos têm dificuldade, gênero e conceitos pesquisáveis', () => {
    expect(gameTwoDExamples).toHaveLength(32)
    for (const example of gameTwoDExamples) {
      expect(['beginner', 'intermediate', 'advanced'].includes(example.difficulty ?? '')).toBe(true)
      expect(example.genre?.trim().length ?? 0).toBeGreaterThan(0)
      expect(example.concepts?.length ?? 0).toBeGreaterThanOrEqual(2)
    }
  })

  it('o percurso recomendado preserva a progressão editorial aprovada', () => {
    const route = gameTwoDExamples
      .filter((example) => example.featured)
      .sort((left, right) => (left.recommendedOrder ?? 99) - (right.recommendedOrder ?? 99))

    expect(route.map((example) => example.name)).toEqual([
      'Pegue a moeda',
      'Herói que anda',
      'Mini plataforma',
      'Sala com paredes',
    ])
  })

  it('o loader validado entrega os metadados à galeria', async () => {
    const gameTwoDGroup = (await buildKitGroups()).find((group) => group.extensionId === 'game-2d')

    expect(gameTwoDGroup?.entries).toHaveLength(32)
    expect(gameTwoDGroup?.entries.find((entry) => entry.name === 'Pegue a moeda')).toMatchObject({
      difficulty: 'beginner',
      genre: 'coleta',
      featured: true,
      recommendedOrder: 1,
    })
  })

  it('busca sem acento e filtros combinados encontram metadados editoriais', () => {
    const entries = gameTwoDExamples.slice(0, 8).map<KitEntry>((example) => ({
      key: `game-2d:${example.name}`,
      name: example.name,
      description: example.description ?? '',
      experience: example.experience,
      difficulty: example.difficulty,
      concepts: example.concepts,
      genre: example.genre,
      recommendedOrder: example.recommendedOrder,
      featured: example.featured,
      emoji: '🎮',
      ir: example.ir,
    }))
    const groups: KitGroup[] = [{ extensionId: 'game-2d', label: 'Jogos 2D', entries }]
    const filter = (overrides: Partial<KitGalleryFilters>) =>
      filterKitGroups(groups, {
        query: '',
        difficulty: 'all',
        experience: 'all',
        ...overrides,
      }).flatMap((group) => group.entries.map((entry) => entry.name))

    expect(filter({ query: 'animacao' })).toContain('Herói que anda')
    expect(filter({ query: 'tilemap', difficulty: 'beginner' })).toEqual(['Sala com paredes'])
    expect(filter({ difficulty: 'advanced' })).toEqual([])
  })
})
