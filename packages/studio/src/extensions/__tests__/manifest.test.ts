import { describe, expect, it } from 'bun:test'
import { ExtensionManifestSchema, validateManifest } from '../manifest'

const validManifest = {
  id: 'game-2d',
  name: 'Jogo 2D',
  version: '0.1.0',
  description: 'Blocos para criar jogos 2D simples usando Canvas API.',
  category: 'games',
  official: true as const,
  enabledByDefault: false,
  permissions: ['canvas', 'keyboard'] as const,
  docs: '## Game 2D\n\nBlocos para sprites, colisão e loop de jogo.',
  examples: [],
}

describe('ExtensionManifestSchema', () => {
  it('aceita um manifest oficial bem-formado', () => {
    expect(() => validateManifest(validManifest)).not.toThrow()
  })

  it('rejeita id fora de kebab-case', () => {
    expect(() => validateManifest({ ...validManifest, id: 'Game_2D' })).toThrow()
  })

  it('rejeita versão fora de semver simples', () => {
    expect(() => validateManifest({ ...validManifest, version: '0.1' })).toThrow()
  })

  it('rejeita extensão marcada como não-oficial', () => {
    expect(() => validateManifest({ ...validManifest, official: false })).toThrow()
  })

  it('rejeita permission desconhecida', () => {
    expect(() => validateManifest({ ...validManifest, permissions: ['canvas', 'gpu'] })).toThrow()
  })

  it('rejeita docs absurdamente grande', () => {
    // O teto subiu 20k → 32k: DUAS extensões oficiais já batiam nele, e aí cada
    // kit novo custava enxugar seção antiga em vez de explicar melhor.
    expect(() => validateManifest({ ...validManifest, docs: 'x'.repeat(32_001) })).toThrow()
    expect(() => validateManifest({ ...validManifest, docs: 'x'.repeat(32_000) })).not.toThrow()
  })

  it('valida ExtensionManifestSchema parse de raw object', () => {
    const parsed = ExtensionManifestSchema.parse(validManifest)
    expect(parsed.id).toBe('game-2d')
    expect(parsed.permissions).toEqual(['canvas', 'keyboard'])
  })
})
