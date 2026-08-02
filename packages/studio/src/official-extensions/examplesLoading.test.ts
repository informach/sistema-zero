import { describe, expect, it } from 'bun:test'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { loadExtensionExamples } from '#extensions'
import { OFFICIAL_CATALOG } from './index'

const goldenCatalogs = {
  'game-2d': {
    count: 31,
    sha256: 'e646ea180367b6179f30db6c00b72abada6b6b48a963440284795b35499e86bf',
  },
  'game-2d-advanced': {
    count: 36,
    sha256: '9f421fb06f4d9043ef5198c2063df2133c17a8df064016c02157db96264f9417',
  },
  'game-3d': {
    count: 18,
    sha256: 'ef8209bc363bd5013497956473a42e2990655256d7b4c906dc1d3f31520452fd',
  },
  'game-3d-advanced': {
    count: 17,
    sha256: '96aefa29ba530a0c5308b1bf82977cd42f81a1cc71c39e7c5db762aafc4d52dc',
  },
  'world-3d': {
    count: 13,
    sha256: 'a9390913a02aa4da88bfa2ab909204ddafa3a13cf8b3af6df8bccdabc6aa2486',
  },
} as const

describe('catálogos lazy das extensões oficiais', () => {
  it('preserva quantidade, ordem, IR e assets byte a byte', async () => {
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

    expect(entry.size).toBeLessThan(2_200_000)
    expect(await entry.text()).not.toContain('Pegue a moeda')
    expect(build.outputs.filter((output) => output.kind === 'chunk').length).toBeGreaterThanOrEqual(
      5,
    )
  })
})
