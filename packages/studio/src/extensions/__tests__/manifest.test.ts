import { describe, expect, it } from 'bun:test'
import { OFFICIAL_CATALOG } from '#official-extensions'
import {
  ExtensionExamplesSchema,
  ExtensionManifestSchema,
  MAX_PROMPT_CONTEXT_CHARS,
  validateManifest,
} from '../manifest'

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
    expect(() => validateManifest({ ...validManifest, docs: 'x'.repeat(60_001) })).toThrow()
    expect(() => validateManifest({ ...validManifest, docs: 'x'.repeat(60_000) })).not.toThrow()
  })

  it('valida ExtensionManifestSchema parse de raw object', () => {
    const parsed = ExtensionManifestSchema.parse(validManifest)
    expect(parsed.id).toBe('game-2d')
    expect(parsed.permissions).toEqual(['canvas', 'keyboard'])
  })
})

describe('promptContext das extensões oficiais — teto de sanidade (R24)', () => {
  it('nenhum manual completo carregado de forma eager passa do teto', () => {
    // Extensões grandes podem fornecer promptSummary + loadPromptContext; nesse
    // caso o manual completo fica num chunk sob demanda e não entra em toda chamada.
    const estourados = OFFICIAL_CATALOG.filter(
      (e) => (e.ai?.promptContext?.length ?? 0) > MAX_PROMPT_CONTEXT_CHARS,
    ).map((e) => `${e.manifest.id}: ${e.ai?.promptContext?.length}`)
    expect(estourados).toEqual([])
  })

  it('resumos permanentes ficam pequenos', () => {
    const estourados = OFFICIAL_CATALOG.filter(
      (extension) => (extension.ai?.promptSummary?.length ?? 0) > 6_000,
    ).map((extension) => `${extension.manifest.id}: ${extension.ai?.promptSummary?.length}`)
    expect(estourados).toEqual([])
  })
})

describe('guarda estrutural dos IRs de exemplo', () => {
  const exampleWith = (ir: unknown) => [{ name: 'exemplo', experience: 'game' as const, ir }]

  it('aceita referências compartilhadas que continuam serializáveis', () => {
    const sharedEmpty: unknown[] = []
    const ir = {
      version: 2,
      html: sharedEmpty,
      css: sharedEmpty,
      behavior: { start: sharedEmpty, events: [], loops: [] },
      extensions: [],
    }

    expect(() => ExtensionExamplesSchema.parse(exampleWith(ir))).not.toThrow()
  })

  it('continua rejeitando referências circulares reais', () => {
    const cyclicStatement: Record<string, unknown> = { type: 'comment', text: 'ciclo' }
    cyclicStatement.self = cyclicStatement
    const ir = {
      version: 2,
      html: [],
      css: [],
      behavior: { start: [cyclicStatement], events: [], loops: [] },
      extensions: [],
    }

    const result = ExtensionExamplesSchema.safeParse(exampleWith(ir))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('profundidade'))).toBe(true)
    }
  })
})
