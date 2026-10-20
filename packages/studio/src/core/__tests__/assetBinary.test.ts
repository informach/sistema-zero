import { expect, test } from 'bun:test'
import { decodeProjectAsset } from '../assetBinary'
import { buildProAssetBundle } from '../proAssets'
import type { ProjectAsset } from '../projectAssets'
import { buildPythonAssetBundle } from '../pythonAssets'

test('base64 material decoding preserves every byte and browser validation rules', () => {
  for (const length of [0, 1, 2, 3, 255, 256, 257, 8191, 8192, 8193, 1_048_577]) {
    const source = Uint8Array.from({ length }, (_, index) => (index * 173 + 41) % 256)
    const base64 = Buffer.from(source).toString('base64')
    for (const raw of [base64, base64.replace(/=+$/, '')]) {
      const decoded = decodeProjectAsset(`data:IMAGE/PNG;base64,${raw}`)
      expect(decoded.mime).toBe('image/png')
      expect(decoded.bytes).toEqual(source)
    }
  }
  for (const raw of ['a', '%%%%', '😀', 'AA-_']) {
    expect(() => atob(raw)).toThrow()
    expect(() => decodeProjectAsset(`data:audio/wav;base64,${raw}`)).toThrow()
  }
  expect(
    decodeProjectAsset('data:image/svg+xml,%3Csvg%3E%C3%A7%F0%9F%90%A2%3C/svg%3E').bytes,
  ).toEqual(new TextEncoder().encode('<svg>ç🐢</svg>'))
})

test('Pinta UTF-8 SVG data URLs preserve their MIME and source bytes', () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><text>Olá, 🐢!</text></svg>'
  const bytes = new TextEncoder().encode(svg)
  for (const header of ['charset=utf-8', 'CHARSET=UTF-8']) {
    expect(decodeProjectAsset(`data:image/svg+xml;${header},${encodeURIComponent(svg)}`)).toEqual({
      mime: 'image/svg+xml',
      bytes,
    })
    expect(
      decodeProjectAsset(
        `data:image/svg+xml;${header};base64,${Buffer.from(bytes).toString('base64')}`,
      ),
    ).toEqual({ mime: 'image/svg+xml', bytes })
  }
  expect(decodeProjectAsset('data:image/svg+xml;charset=US-ASCII,%3Csvg/%3E')).toEqual({
    mime: 'image/svg+xml',
    bytes: new TextEncoder().encode('<svg/>'),
  })
  // A charset declaration cannot change a binary material's bytes.
  const binary = Uint8Array.from([0, 255, 128, 1, 254])
  expect(
    decodeProjectAsset(
      `data:audio/wav;charset=utf-8;base64,${Buffer.from(binary).toString('base64')}`,
    ),
  ).toEqual({ mime: 'audio/wav', bytes: binary })
})

test('charset support does not accept ambiguous headers or repair invalid payloads', () => {
  for (const url of [
    'data:image/svg+xml;charset=utf-8;charset=utf-8,%3Csvg/%3E',
    'data:image/svg+xml;base64;charset=utf-8,PHN2Zy8+',
    'data:image/svg+xml;charset=utf-8;base64=1,PHN2Zy8+',
    'data:image/svg+xml;charset=iso-8859-1,%E7',
    'data:image/svg+xml;charset=utf-8;unknown=value,%3Csvg/%3E',
    'data:image/svg+xml;charset=utf-8;base64,%%%%',
    'data:image/svg+xml;charset=utf-8,%Q0',
  ])
    expect(() => decodeProjectAsset(url)).toThrow()
})

test('both project materializers preserve the Pinta vector source as SVG bytes', async () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><text>Olá, 🐢!</text></svg>'
  const bytes = new TextEncoder().encode(svg)
  const asset: ProjectAsset = {
    id: 'pinta-vector',
    name: 'jardim-v',
    kind: 'image',
    source: 'library',
    libOrigin: 'pinta',
    libId: 'personal:pinta-vector',
    dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
  }
  const before = JSON.stringify(asset)
  for (const materialize of [buildProAssetBundle, buildPythonAssetBundle]) {
    const bundle = await materialize([asset])
    const entry = bundle.manifest.assets[0]!
    expect(entry.mime).toBe('image/svg+xml')
    expect(entry.path.endsWith('.svg')).toBe(true)
    expect(bundle.files.get(entry.path)).toEqual(bytes)
  }
  expect(JSON.stringify(asset)).toBe(before)
  // Preserving a source file does not add SVG decoding to Turtle's PNG/GIF API.
})
