import { describe, expect, it } from 'bun:test'
import { OFFICIAL_CATALOG } from '#official-extensions'
import { ExtensionManifestSchema, MAX_PROMPT_CONTEXT_CHARS, validateManifest } from '../manifest'

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
    // O teto subiu 20k → 32k → 40k SEMPRE pelo mesmo motivo: extensão oficial
    // batendo nele, e aí kit novo custava enxugar seção antiga em vez de explicar
    // melhor. É trava de sanidade contra manifest malformado — não é o limite da
    // UI (o "Saiba mais" é um modal com scroll) e não entra no contexto da IA.
    expect(() => validateManifest({ ...validManifest, docs: 'x'.repeat(48_001) })).toThrow()
    expect(() => validateManifest({ ...validManifest, docs: 'x'.repeat(48_000) })).not.toThrow()
  })

  it('valida ExtensionManifestSchema parse de raw object', () => {
    const parsed = ExtensionManifestSchema.parse(validManifest)
    expect(parsed.id).toBe('game-2d')
    expect(parsed.permissions).toEqual(['canvas', 'keyboard'])
  })
})

describe('promptContext das extensões oficiais — teto de sanidade (R24)', () => {
  it('nenhum contexto de IA passa do teto (o system prompt paga por char, em TODA chamada)', () => {
    // O promptContext entra CRU no system prompt, sem truncagem em runtime (de
    // propósito — cortar receita no meio ensinaria errado). Este teste é a única
    // trava. Estourou? ENXUGUE o ai.ts da extensão — NÃO suba o teto sem medir o
    // custo em tokens (a doença do MAX_DOCS_CHARS subindo 3x não se repete aqui).
    const estourados = OFFICIAL_CATALOG.filter(
      (e) => (e.ai?.promptContext.length ?? 0) > MAX_PROMPT_CONTEXT_CHARS,
    ).map((e) => `${e.manifest.id}: ${e.ai?.promptContext.length}`)
    expect(estourados).toEqual([])
  })
})
