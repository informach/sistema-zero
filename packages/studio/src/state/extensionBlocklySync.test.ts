import { describe, expect, it, mock } from 'bun:test'
import { OFFICIAL_CATALOG } from '#official-extensions'

// projectStore importa idb-keyval no topo (via ./persistence); este no-op garante
// que importá-lo aqui não toque o IndexedDB (inexistente no happy-dom). Sem
// restore de propósito, igual aos demais arquivos de persistência da suíte.
mock.module('idb-keyval', () => ({
  createStore: mock(() => ({ name: 'test-store' })),
  del: mock(async () => undefined),
  delMany: mock(async () => undefined),
  get: mock(async (): Promise<unknown> => undefined),
  getMany: mock(async (): Promise<unknown[]> => []),
  keys: mock(async (): Promise<unknown[]> => []),
  set: mock(async () => undefined),
  setMany: mock(async () => undefined),
  // `update` é usado por settingsStore.ts; o registry de mocks é global na suíte.
  update: mock(async () => undefined),
}))

const { EXTENSION_BLOCKLY_BLOCK_TYPES } = await import('./projectStore')
const { ExtensionManifestSchema, validateManifest } = await import('../extensions/manifest')

/**
 * Drift guard: a allowlist por extensão (EXTENSION_BLOCKLY_BLOCK_TYPES, usada
 * para sanitizar o blocksState no load) DEVE casar 1-para-1 com os block defs
 * declarados em OFFICIAL_CATALOG[].blockly.blocks. Se divergirem, um bloco novo
 * da extensão é silenciosamente derrubado no load (layout cai para os defaults),
 * ou um tipo morto sobrevive na allowlist. Este teste falha em qualquer drift.
 */
describe('EXTENSION_BLOCKLY_BLOCK_TYPES ↔ OFFICIAL_CATALOG (sem drift)', () => {
  it('toda extensão do catálogo tem uma entrada na allowlist', () => {
    for (const ext of OFFICIAL_CATALOG) {
      expect(EXTENSION_BLOCKLY_BLOCK_TYPES[ext.manifest.id]).toBeDefined()
    }
  })

  it('toda entrada da allowlist corresponde a uma extensão do catálogo', () => {
    const catalogIds = new Set(OFFICIAL_CATALOG.map((e) => e.manifest.id))
    for (const id of Object.keys(EXTENSION_BLOCKLY_BLOCK_TYPES)) {
      expect(catalogIds.has(id)).toBe(true)
    }
  })

  it('os tipos de bloco da allowlist batem EXATAMENTE com os block defs de cada extensão', () => {
    for (const ext of OFFICIAL_CATALOG) {
      const defined = new Set(
        ext.blockly.blocks
          .map((b: { type?: unknown }) => b.type)
          .filter((t): t is string => typeof t === 'string'),
      )
      const allowed = EXTENSION_BLOCKLY_BLOCK_TYPES[ext.manifest.id]
      expect(allowed).toBeDefined()

      // Cada bloco DEFINIDO está na allowlist (senão o load o derruba).
      for (const type of defined) {
        expect(allowed?.has(type)).toBe(true)
      }
      // Cada tipo na ALLOWLIST corresponde a um bloco definido (sem tipo morto).
      for (const type of allowed ?? []) {
        expect(defined.has(type)).toBe(true)
      }
      // Sanidade: não há bloco sem `type` (o filtro acima esconderia drift).
      expect(defined.size).toBe(ext.blockly.blocks.length)
    }
  })
})

/**
 * Pré-guarda de profundidade/tamanho do IR de exemplo do manifest. O SZIRSchema
 * é recursivo (z.lazy); um exemplo profundamente aninhado poderia estourar a
 * pilha no parse. A pré-checagem em manifest.ts barra ANTES do parse.
 */
describe('validateManifest — pré-guarda de profundidade do IR de exemplo', () => {
  const baseManifest = {
    id: 'game-2d',
    name: 'Jogo 2D',
    version: '0.1.0',
    description: 'Blocos para criar jogos 2D simples usando Canvas API.',
    category: 'games',
    official: true as const,
    enabledByDefault: false,
    permissions: ['canvas'] as const,
    docs: '## docs',
  }

  /** Constrói um valor JSON com `depth` níveis de aninhamento de objeto. */
  function nest(depth: number): unknown {
    let node: Record<string, unknown> = { leaf: 'x' }
    for (let i = 0; i < depth; i += 1) node = { child: node }
    return node
  }

  it('rejeita um IR de exemplo absurdamente profundo (antes do parse recursivo)', () => {
    const overDeep = {
      ...baseManifest,
      examples: [{ name: 'fundo', experience: 'game' as const, ir: nest(5_000) }],
    }
    expect(() => validateManifest(overDeep)).toThrow()
  })

  it('rejeita via ExtensionManifestSchema.parse com a mensagem da pré-guarda', () => {
    const overDeep = {
      ...baseManifest,
      examples: [{ name: 'fundo', ir: nest(5_000) }],
    }
    const result = ExtensionManifestSchema.safeParse(overDeep)
    expect(result.success).toBe(false)
    const messages = result.success ? [] : result.error.issues.map((issue) => issue.message)
    expect(messages.some((m) => m.includes('profundidade') || m.includes('tamanho'))).toBe(true)
  })

  it('aceita um IR de exemplo bem-formado e raso', () => {
    const ok = {
      ...baseManifest,
      examples: [
        {
          name: 'exemplo',
          experience: 'game' as const,
          ir: { html: [], css: [], js: [], extensions: [] },
        },
      ],
    }
    expect(() => validateManifest(ok)).not.toThrow()
  })
})
