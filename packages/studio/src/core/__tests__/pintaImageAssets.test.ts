import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import type { PintaImageDerivation } from '@sistemazero/core/studio/pinta-image'
import { buildPythonSourceFiles } from '../../export/pythonSource'
import { preparePythonExecutionSnapshot } from '../../runtime/python/snapshot'
import { documentFixture } from '../../state/fixtures/projectDocuments'
import { refinePythonProjectDocument } from '../../state/pythonProjectValidation'
import { type ProjectAsset, sanitizeProjectAssets } from '../projectAssets'
import { buildPythonAssetBundle, sanitizePythonProjectAssets } from '../pythonAssets'

const dataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH1QAAAAASUVORK5CYII='
const bytes = new Uint8Array(Buffer.from(dataUrl.split(',')[1]!, 'base64'))
function asset(): ProjectAsset & { pintaImage: PintaImageDerivation } {
  return {
    id: 'derived-frame',
    name: 'heroi',
    kind: 'image',
    source: 'library',
    libId: 'personal:original',
    libOrigin: 'pinta',
    libRevision: 3,
    dataUrl,
    width: 1,
    height: 1,
    proPath: 'art/heroi.png',
    pintaImage: {
      recipe: {
        version: 1,
        algorithm: 'pinta-image-1',
        drawingId: 'original',
        selection: { kind: 'frame', animationId: 'andar', frameIndex: 2 },
        scale: 1,
      },
      provenance: { sourceSha256: 'a'.repeat(64), dependencies: [] },
      output: {
        mime: 'image/png',
        width: 1,
        height: 1,
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      },
    },
  }
}

describe('Pinta recipe is durable project content, never a request to regenerate', () => {
  test('read and materialization copy the supplied recipe before their first asynchronous digest', async () => {
    const raw = documentFixture('python', 'pro')
    const inputAsset = asset()
    raw.assets = [inputAsset]
    const expected = structuredClone([inputAsset])
    const reading = refinePythonProjectDocument(raw)
    inputAsset.dataUrl = 'data:image/png;base64,AAAA'
    inputAsset.pintaImage.recipe.scale = 2
    expect((await reading).assets).toEqual(expected)
    const input = [asset()]
    const building = buildPythonAssetBundle(input)
    input[0]!.pintaImage.recipe.scale = 2
    input[0]!.dataUrl = 'data:image/png;base64,AAAA'
    const built = await building
    expect(built.manifest.assets[0]!.pintaImage).toEqual(asset().pintaImage)
    expect(built.files.get('art/heroi.png')).toEqual(bytes)
  })
  test('sanitizer retains a strict recipe and legacy assets keep their exact shape', () => {
    const source = asset(),
      before = structuredClone(source)
    const parsed = sanitizePythonProjectAssets([source])
    expect(parsed).toEqual([source])
    expect(parsed[0]!.pintaImage).not.toBe(source.pintaImage)
    expect(source).toEqual(before)
    const { pintaImage: _recipe, ...legacy } = source
    expect(sanitizePythonProjectAssets([legacy])).toEqual([legacy])
    const javascript = { ...legacy, proPath: 'public/art/heroi.png' }
    expect(sanitizeProjectAssets([javascript])).toEqual([javascript])
    expect(Object.hasOwn(sanitizeProjectAssets([javascript])[0]!, 'pintaImage')).toBe(false)
  })

  test('malformed recipe or incompatible asset is rejected instead of losing the recipe', () => {
    const original = asset()
    for (const candidate of [
      { ...original, pintaImage: null },
      { ...original, pintaImage: { ...original.pintaImage, extra: true } },
      {
        ...original,
        pintaImage: {
          ...original.pintaImage,
          recipe: { ...original.pintaImage.recipe, version: 2 },
        },
      },
      { ...original, libId: 'personal:another-drawing' },
      { ...original, libOrigin: 'molda' },
      { ...original, source: 'upload' },
      { ...original, kind: 'audio' },
      { ...original, width: 2 },
      {
        ...original,
        sprite: {
          frameW: 1,
          frameH: 1,
          animations: [{ name: 'andar', from: 0, to: 2, fps: 8, loop: true }],
        },
      },
    ]) {
      const before = structuredClone(candidate)
      expect(() => sanitizeProjectAssets([candidate])).toThrow()
      expect(candidate).toEqual(before)
    }
  })

  for (const kind of ['classic', 'pro'] as const) {
    test(`${kind} read/snapshot/source export retain the same PNG and explicit path offline`, async () => {
      const raw = documentFixture('python', kind)
      const inputAssets = [asset()]
      raw.assets = inputAssets
      const parsed = await refinePythonProjectDocument(JSON.parse(JSON.stringify(raw)))
      expect(parsed.assets).toEqual(inputAssets)
      const snapshot = await preparePythonExecutionSnapshot(parsed)
      expect(snapshot.files.find((file) => file.path === 'art/heroi.png')?.bytes).toEqual(bytes)
      const built = await buildPythonSourceFiles(parsed, null)
      expect(built.files['art/heroi.png']).toEqual(bytes)
      const manifestPath = Object.keys(built.files).find((path) =>
        path.endsWith('/export-manifest.json'),
      )!
      const manifest = JSON.parse(built.files[manifestPath] as string)
      expect(manifest.assets.assets[0].pintaImage).toEqual(asset().pintaImage)
      expect(manifest.assets.assets[0].path).toBe('art/heroi.png')
      expect(manifest.assets.assets[0].sha256).toBe(asset().pintaImage.output.sha256)
    })
  }

  test('binary/output tampering refuses read and materialization, while provenance-only changes alter metadata hash', async () => {
    const original = asset()
    for (const output of [
      { ...original.pintaImage.output, sha256: '0'.repeat(64) },
      { ...original.pintaImage.output, bytes: bytes.length + 1 },
      { ...original.pintaImage.output, width: 2 },
    ]) {
      const bad = { ...original, pintaImage: { ...original.pintaImage, output } }
      expect(
        await buildPythonAssetBundle([bad]).then(
          () => null,
          (error: unknown) => error,
        ),
      ).toBeInstanceOf(Error)
      const raw = { ...documentFixture('python', 'classic'), assets: [bad] }
      expect(
        await refinePythonProjectDocument(raw).then(
          () => null,
          (error: unknown) => error,
        ),
      ).toBeInstanceOf(Error)
    }
    const first = (await buildPythonAssetBundle([original])).manifest.assets[0]!
    const changed = structuredClone(original)
    changed.pintaImage.provenance.sourceSha256 = 'b'.repeat(64)
    const second = (await buildPythonAssetBundle([changed])).manifest.assets[0]!
    expect(second.sha256).toBe(first.sha256)
    expect(second.path).toBe(first.path)
    expect(second.metadataSha256).not.toBe(first.metadataSha256)
  })
})

describe('an SVG recipe (Pygame Zero) is durable content too', () => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 16 16"><rect width="16" height="16"/></svg>'
  const svgBytes = new Uint8Array(Buffer.from(svg))
  function svgAsset(): ProjectAsset & { pintaImage: PintaImageDerivation } {
    const base = asset()
    return {
      ...base,
      dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
      width: 32,
      height: 32,
      proPath: 'images/heroi.svg',
      pintaImage: {
        ...base.pintaImage,
        recipe: { ...base.pintaImage.recipe, output: 'svg' },
        output: {
          mime: 'image/svg+xml',
          width: 32,
          height: 32,
          bytes: svgBytes.length,
          sha256: createHash('sha256').update(svgBytes).digest('hex'),
        },
      },
    }
  }
  test('reads back unchanged and materializes its exact bytes at images/<name>.svg', async () => {
    const source = svgAsset()
    expect(sanitizePythonProjectAssets([source])).toEqual([source])
    const built = await buildPythonAssetBundle([source])
    expect(built.files.get('images/heroi.svg')).toEqual(svgBytes)
    expect(built.manifest.assets[0]).toMatchObject({
      mime: 'image/svg+xml',
      path: 'images/heroi.svg',
    })
  })
  test('format, file extension, root size and bytes must all agree with the recipe', async () => {
    expect(() =>
      sanitizePythonProjectAssets([{ ...svgAsset(), proPath: 'images/heroi.png' }]),
    ).toThrow()
    expect(() => sanitizePythonProjectAssets([{ ...svgAsset(), dataUrl }])).toThrow()
    const resized = svgAsset()
    resized.dataUrl = resized.dataUrl.replace('width%3D%2232%22', 'width%3D%2216%22')
    await expect(buildPythonAssetBundle([resized])).rejects.toThrow('desenho vetorial')
  })
})
