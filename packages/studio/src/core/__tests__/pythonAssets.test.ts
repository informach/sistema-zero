import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { type ProjectAsset, sanitizeProjectAssets } from '../project'
import { buildPythonAssetBundle } from '../pythonAssets'

const png: ProjectAsset = {
  id: 'drawing-1',
  name: 'heroi',
  kind: 'image',
  source: 'library',
  libOrigin: 'pinta',
  libId: 'personal:drawing-1',
  libRevision: 3,
  dataUrl:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH1QAAAAASUVORK5CYII=',
  license: { name: 'CC0', attribution: 'Test fixture' },
}

describe('portable Python materialization', () => {
  test('preserves a large Python WAV without widening JavaScript limits', async () => {
    const bytes = new Uint8Array(23_472_658)
    bytes.set([82, 73, 70, 70])
    bytes[bytes.length - 1] = 123
    const asset: ProjectAsset = {
      id: 'music',
      name: 'music',
      kind: 'audio',
      source: 'upload',
      proPath: 'bgm.wav',
      dataUrl: `data:audio/wav;base64,${Buffer.from(bytes).toString('base64')}`,
    }
    expect(sanitizeProjectAssets([asset])).toEqual([])
    const bundle = await buildPythonAssetBundle([asset])
    expect(bundle.files.get('bgm.wav')).toEqual(bytes)
    expect(bundle.manifest.assets[0]?.sha256).toBe(createHash('sha256').update(bytes).digest('hex'))
    expect(sanitizeProjectAssets([asset])).toEqual([])
  })
  test('preserves bytes, provenance and hashes without adding web files', async () => {
    const bundle = await buildPythonAssetBundle([png], { files: ['main.py'] })
    const entry = bundle.manifest.assets[0]!
    const expected = Buffer.from(png.dataUrl.split(',')[1]!, 'base64')
    expect(bundle.files.size).toBe(1)
    expect(entry.path).toMatch(/^assets\/[a-f0-9]{64}\.png$/)
    expect(bundle.files.get(entry.path)).toEqual(new Uint8Array(expected))
    expect(entry.sha256).toBe(createHash('sha256').update(expected).digest('hex'))
    expect(entry.bytes).toBe(expected.byteLength)
    expect(entry.libOrigin).toBe('pinta')
    expect(entry.libId).toBe(png.libId)
    expect(entry.libRevision).toBe(3)
    expect(entry.license).toEqual(png.license)
    expect(JSON.stringify(bundle.manifest)).not.toContain('data:')
    expect([...bundle.files.keys()].some((path) => /\.(?:py|js|html|json)$/.test(path))).toBe(false)
  })

  test('uses original root and nested media paths without renaming them', async () => {
    const bundle = await buildPythonAssetBundle(
      [
        { ...png, proPath: 'hero.png' },
        {
          id: 'sound',
          name: 'sound',
          kind: 'audio',
          dataUrl: 'data:audio/wav;base64,UklGRg==',
          source: 'upload',
          proPath: 'sounds/start.wav',
        },
      ],
      { files: ['main.py'], directories: ['sounds'] },
    )
    expect([...bundle.files.keys()]).toEqual(['hero.png', 'sounds/start.wav'])
    expect(Buffer.from(bundle.files.get('sounds/start.wav')!).toString()).toBe('RIFF')
  })

  test('renaming and metadata updates keep paths and bytes while changing metadata identity', async () => {
    const original = (await buildPythonAssetBundle([png])).manifest.assets[0]!
    const renamed = (
      await buildPythonAssetBundle([{ ...png, name: 'novo-nome', license: { name: 'MIT' } }])
    ).manifest.assets[0]!
    expect(renamed.path).toBe(original.path)
    expect(renamed.sha256).toBe(original.sha256)
    expect(renamed.metadataSha256).not.toBe(original.metadataSha256)
  })

  test('admitted FLAC media receives a portable default path without changing explicit paths', async () => {
    for (const mime of ['audio/flac', 'audio/x-flac']) {
      const asset: ProjectAsset = {
        id: 'sound',
        name: 'sound',
        kind: 'audio',
        source: 'upload',
        dataUrl: `data:${mime};base64,ZkxhQw==`,
      }
      const generated = await buildPythonAssetBundle([asset])
      const original = await buildPythonAssetBundle([{ ...asset, proPath: 'clip.flac' }])
      expect(generated.manifest.assets[0]?.path).toMatch(/^assets\/[a-f0-9]{64}\.flac$/)
      expect(original.manifest.assets[0]?.path).toBe('clip.flac')
      expect(generated.manifest.assets[0]?.sha256).toBe(original.manifest.assets[0]?.sha256)
    }
  })

  test('captures material and layout before hashing yields', async () => {
    const source = structuredClone(png)
    const layout = { files: ['main.py'], directories: [] as string[] }
    const pending = buildPythonAssetBundle([source], layout)
    source.dataUrl = 'data:image/png;base64,Q0hBTkdFRA=='
    source.name = 'changed'
    source.license!.name = 'changed'
    layout.files.push('assets')
    const bundle = await pending
    expect(bundle.manifest.assets[0]?.name).toBe(png.name)
    expect(bundle.manifest.assets[0]?.license).toEqual(png.license)
    expect(bundle.files.values().next().value).toEqual(
      new Uint8Array(Buffer.from(png.dataUrl.split(',')[1]!, 'base64')),
    )
  })

  test('rejects path aliases and collisions with code or explicit/implicit directories', async () => {
    for (const layout of [
      { files: ['hero.png'] },
      { files: ['HERO.png'] },
      { files: ['hero.png/helper.py'] },
      { files: ['main.py'], directories: ['hero.png'] },
    ])
      await expect(
        buildPythonAssetBundle([{ ...png, proPath: 'hero.png' }], layout),
      ).rejects.toThrow('colide')
    for (const path of ['main.py', '../hero.png', 'assets/CON.png', 'constructor/hero.png'])
      await expect(buildPythonAssetBundle([{ ...png, proPath: path }])).rejects.toThrow()
    await expect(
      buildPythonAssetBundle([
        { ...png, proPath: 'assets/Hero.png' },
        { ...png, id: 'drawing-2', name: 'heroi-2', proPath: 'assets/hero.png' },
      ]),
    ).rejects.toThrow('colide')
  })

  test('never overwrites duplicate identities or drops malformed materials', async () => {
    await expect(buildPythonAssetBundle([png, { ...png, name: 'other' }])).rejects.toThrow(
      'identificador',
    )
    await expect(buildPythonAssetBundle([{ ...png, dataUrl: 'invalid' }])).rejects.toThrow('assets')
    await expect(
      buildPythonAssetBundle([{ ...png, dataUrl: 'data:image/png;base64,###' }]),
    ).rejects.toThrow()
  })

  test('keeps revision-manifest limits separate from reading/materializing source', async () => {
    const bundle = await buildPythonAssetBundle(
      Array.from({ length: 100 }, (_, index) => ({
        ...png,
        id: `drawing-${index}`,
        name: `hero-${index}`,
        license: { name: 'CC0', attribution: 'x'.repeat(600) },
      })),
    )
    expect(bundle.manifest.assets.length).toBe(100)
    expect(bundle.files.size).toBe(100)
    expect(JSON.stringify(bundle.manifest).length).toBeGreaterThan(80_000)
  })
})
