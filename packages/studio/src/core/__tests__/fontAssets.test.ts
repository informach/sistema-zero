import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { isValidAssetDataUrl, type ProjectAsset, sanitizeProjectAssets } from '../project'
import { buildPythonAssetBundle, sanitizePythonProjectAssets } from '../pythonAssets'

const ttfBytes = readFileSync(
  new URL('../../../scripts/raylib/scenes/assets/fonts/pressstart2p.ttf', import.meta.url),
)
const dataUrl = (mime: string, bytes: Uint8Array) =>
  `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`
const font = (patch: Partial<ProjectAsset> = {}): ProjectAsset => ({
  id: 'fonte',
  name: 'fonte',
  kind: 'font',
  source: 'upload',
  originalFileName: 'pressstart2p.ttf',
  proPath: 'fonts/pressstart2p.ttf',
  dataUrl: dataUrl('font/ttf', ttfBytes),
  ...patch,
})

describe('fonte como material (Raylib e Pygame Zero abrem TTF/OTF)', () => {
  test('uma TTF de verdade entra com o nome original e o caminho em fonts/', () => {
    const [asset] = sanitizePythonProjectAssets([font()])
    expect(asset?.kind).toBe('font')
    expect(asset?.originalFileName).toBe('pressstart2p.ttf')
    expect(asset?.proPath).toBe('fonts/pressstart2p.ttf')
    // O projeto JavaScript (Pro) não usa fonte como material: o caminho fica de fora.
    expect(sanitizeProjectAssets([font()])[0]?.proPath).toBeUndefined()
  })

  test('as três provas precisam concordar: extensão, MIME e assinatura', () => {
    const ttf = dataUrl('font/ttf', ttfBytes)
    expect(isValidAssetDataUrl(ttf, 'font', 'a.ttf')).toBe(true)
    // Sem o nome do arquivo não dá para conferir a extensão.
    expect(isValidAssetDataUrl(ttf, 'font')).toBe(false)
    // O MIME de OTF num arquivo .ttf (e o contrário) é recusado.
    expect(isValidAssetDataUrl(ttf, 'font', 'a.otf')).toBe(false)
    expect(isValidAssetDataUrl(dataUrl('font/otf', ttfBytes), 'font', 'a.otf')).toBe(true)
    // WOFF2 tem outra assinatura: o raylib do computador não abre.
    const woff2 = new Uint8Array([0x77, 0x4f, 0x46, 0x32, 0, 1, 0, 0])
    expect(isValidAssetDataUrl(dataUrl('font/ttf', woff2), 'font', 'a.ttf')).toBe(false)
    // Uma imagem com o nome de fonte também não passa.
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    expect(isValidAssetDataUrl(dataUrl('font/ttf', png), 'font', 'a.ttf')).toBe(false)
    expect(isValidAssetDataUrl(dataUrl('image/png', png), 'font', 'a.ttf')).toBe(false)
  })

  test('as três assinaturas sfnt valem nas duas extensões', () => {
    for (const head of [
      [0x00, 0x01, 0x00, 0x00],
      [0x74, 0x72, 0x75, 0x65],
      [0x4f, 0x54, 0x54, 0x4f],
    ]) {
      const bytes = new Uint8Array([...head, 0, 0, 0, 0])
      expect(isValidAssetDataUrl(dataUrl('font/ttf', bytes), 'font', 'a.ttf')).toBe(true)
      expect(isValidAssetDataUrl(dataUrl('font/otf', bytes), 'font', 'a.OTF')).toBe(true)
    }
  })

  test('sem o nome original a fonte é descartada', () => {
    expect(sanitizeProjectAssets([font({ originalFileName: undefined })])).toEqual([])
  })

  test('o projeto Python leva os bytes exatos para fonts/', async () => {
    const bundle = await buildPythonAssetBundle([font()], { files: ['main.py'] })
    expect(bundle.files.get('fonts/pressstart2p.ttf')).toEqual(new Uint8Array(ttfBytes))
    expect(bundle.manifest.assets[0]?.kind).toBe('font')
  })

  test('sem caminho, a extensão no disco segue o MIME da fonte', async () => {
    const bundle = await buildPythonAssetBundle([font({ proPath: undefined })])
    expect([...bundle.files.keys()][0]).toMatch(/^assets\/[0-9a-f]+\.ttf$/)
  })
})
