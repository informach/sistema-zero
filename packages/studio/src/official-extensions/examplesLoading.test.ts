import { describe, expect, it } from 'bun:test'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { loadExtensionExamples } from '#extensions'
import { OFFICIAL_CATALOG } from './index'

const goldenCatalogs = {
  'game-2d': {
    count: 32,
    sha256: 'b98807972d628000803528ce6c095efc4e838e968a2aedd909067b308a181ca1',
  },
  'game-2d-advanced': {
    count: 36,
    sha256: 'cf9c9971920d98a5e426df74afe9a68819a2c896686e47170a175024eb36019b',
  },
  'game-3d': {
    count: 18,
    sha256: '7bf8721cc939d8726d8d6682fcb9cb1004b7920ab22bb21e34153aa32aa2ec21',
  },
  'game-3d-advanced': {
    count: 17,
    sha256: '89ad4d0dd86684c404a5097171264bbc649d1a620e177b4b2d7cb29f150c3b84',
  },
  'world-3d': {
    count: 13,
    sha256: 'd015e060063e041bf2c96c15c7307b14c30815082444fd48d3f2da73c42b036e',
  },
} as const

describe('catálogos lazy das extensões oficiais', () => {
  it('preserva quantidade e ordem da saída validada e sanitizada', async () => {
    for (const extension of OFFICIAL_CATALOG) {
      const golden = goldenCatalogs[extension.manifest.id as keyof typeof goldenCatalogs]
      expect(extension.examples.count).toBe(golden.count)
      expect('examples' in extension.manifest).toBe(false)

      const examples = await loadExtensionExamples(extension)
      const sha256 = createHash('sha256').update(JSON.stringify(examples)).digest('hex')
      expect(examples).toHaveLength(golden.count)
      expect(sha256).toBe(golden.sha256)
    }
  })

  it('mantém os IRs pesados fora do chunk inicial do catálogo', async () => {
    const build = await Bun.build({
      entrypoints: [resolve(import.meta.dir, 'index.ts')],
      target: 'browser',
      minify: true,
      splitting: true,
      write: false,
    } as Parameters<typeof Bun.build>[0])
    expect(build.success).toBe(true)

    const entry = build.outputs.find((output) => output.kind === 'entry-point')
    expect(entry).toBeDefined()
    if (!entry) throw new Error('build sem entry-point')

    expect(entry.size).toBeLessThan(800_000)
    expect(Bun.gzipSync(new Uint8Array(await entry.arrayBuffer())).byteLength).toBeLessThan(230_000)
    const entrySource = await entry.text()
    expect(entrySource).not.toContain('Pegue a moeda')
    expect(entrySource).not.toContain('Jogo 2D interativo')
    expect(build.outputs.filter((output) => output.kind === 'chunk').length).toBeGreaterThanOrEqual(
      15,
    )
  })
})
