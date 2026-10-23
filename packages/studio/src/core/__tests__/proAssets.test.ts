import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { PRO_ASSET_MANIFEST } from '../proAssetPaths'
import { buildProAssetBundle } from '../proAssets'
import { type ProjectAsset, sanitizeProjectAssets } from '../project'

export const imageAsset: ProjectAsset = {
  id: 'drawing-1',
  name: 'heroi',
  kind: 'image',
  source: 'library',
  libOrigin: 'pinta',
  libId: 'personal:drawing-1',
  dataUrl:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH1QAAAAASUVORK5CYII=',
}

describe('Pro binary assets', () => {
  test('materializes exact bytes, native SHA-256, stable identity and provenance without base64 in metadata', async () => {
    const first = await buildProAssetBundle([imageAsset])
    const entry = first.manifest.assets[0]!
    const bytes = first.files.get(entry.path)!
    expect(bytes).toEqual(new Uint8Array(Buffer.from(imageAsset.dataUrl.split(',')[1]!, 'base64')))
    expect(entry.sha256).toBe(createHash('sha256').update(bytes).digest('hex'))
    expect(entry.origin).toBe('pinta')
    expect(JSON.stringify(first.manifest)).not.toContain('data:')
    const renamed = await buildProAssetBundle([{ ...imageAsset, name: 'novo-nome' }])
    expect(renamed.manifest.assets[0]?.path).toBe(entry.path)
    expect(first.files.has(PRO_ASSET_MANIFEST)).toBe(true)
  })
  test('tilemaps carry separate tilesheet bytes and retain collision/animation metadata', async () => {
    const asset = {
      ...imageAsset,
      tilemap: {
        tileSize: 16,
        cols: 1,
        rows: 1,
        grid: '0',
        solid: [0],
        tileset: { dataUrl: imageAsset.dataUrl, width: 16, height: 16 },
      },
    }
    const result = await buildProAssetBundle([asset])
    const map = result.manifest.assets[0]?.tilemap
    expect(map?.solid).toEqual([0])
    expect(map?.tileset.url).toBeDefined()
    expect(result.files.has(`public/${map?.tileset.url}`)).toBe(true)
    expect(JSON.stringify(map)).not.toContain('data:')
  })
  test('keeps legacy CSS paths and license through persistence', async () => {
    const asset = {
      ...imageAsset,
      proPath: 'public/heroi',
      license: { name: 'CC0', attribution: 'Autor', sourceUrl: 'https://example.com/license' },
    }
    expect(sanitizeProjectAssets([asset])[0]).toEqual(asset)
    expect((await buildProAssetBundle([asset])).files.has('public/heroi')).toBe(true)
  })
  test('refuses traversal, executable aliases, duplicate IDs and code collisions before writing', async () => {
    for (const proPath of ['public/../x.png', 'public/run.js', '/public/a.png', 'public/.env'])
      await expect(buildProAssetBundle([{ ...imageAsset, proPath }])).rejects.toBeDefined()
    await expect(
      buildProAssetBundle([imageAsset, { ...imageAsset, name: 'other' }]),
    ).rejects.toBeDefined()
    await expect(
      buildProAssetBundle([imageAsset], { public: { kind: 'file', content: 'mine' } }),
    ).rejects.toBeDefined()
  })
})
