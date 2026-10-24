import { afterEach, describe, expect, it } from 'bun:test'
import { fileToAssetDataUrl } from './imageProcessing'

const OriginalImage = globalThis.Image
const originalCreateElement = document.createElement.bind(document)

afterEach(() => {
  globalThis.Image = OriginalImage
  document.createElement = originalCreateElement
})

describe('fileToAssetDataUrl', () => {
  it('preserva SVG importado com ou sem MIME para ampliar sem rasterizar', async () => {
    class SvgImage {
      naturalWidth = 64
      naturalHeight = 64
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_value: string) {
        queueMicrotask(() => this.onload?.())
      }
    }
    globalThis.Image = SvgImage as unknown as typeof Image
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="20"/></svg>'
    for (const type of ['image/svg+xml', '']) {
      const file = new File([svg], 'pedra.svg', { type })
      const result = await fileToAssetDataUrl(file)
      expect(result.dataUrl).toStartWith('data:image/svg+xml;base64,')
      expect(result.width).toBe(64)
      expect(result.height).toBe(64)
    }
  })

  it('a Pygame Zero destination gets PNG (it opens no WebP); the default stays compact', async () => {
    class RasterImage {
      naturalWidth = 10
      naturalHeight = 10
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_value: string) {
        queueMicrotask(() => this.onload?.())
      }
    }
    globalThis.Image = RasterImage as unknown as typeof Image
    const requested: string[] = []
    document.createElement = ((tag: string) => {
      if (tag !== 'canvas') return originalCreateElement(tag)
      return {
        width: 0,
        height: 0,
        getContext: () => ({ drawImage() {} }),
        toDataURL: (type: string) => {
          requested.push(type)
          return type === 'image/webp'
            ? 'data:image/webp;base64,AAAA'
            : 'data:image/png;base64,AAAA'
        },
      }
    }) as typeof document.createElement
    const file = () => new File(['x'], 'heroi.png', { type: 'image/png' })
    expect((await fileToAssetDataUrl(file(), undefined, 'png')).dataUrl).toStartWith(
      'data:image/png;',
    )
    expect(requested).toEqual(['image/png'])
    expect((await fileToAssetDataUrl(file())).dataUrl).toStartWith('data:image/webp;')
  })

  it('a Python project uses its own cap and shrinks a PNG step by step before refusing', async () => {
    class PhotoImage {
      naturalWidth = 1000
      naturalHeight = 1000
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_value: string) {
        queueMicrotask(() => this.onload?.())
      }
    }
    globalThis.Image = PhotoImage as unknown as typeof Image
    // A noisy photo: the PNG grows with the pixel count (4 characters per pixel).
    document.createElement = ((tag: string) => {
      if (tag !== 'canvas') return originalCreateElement(tag)
      const canvas = {
        width: 0,
        height: 0,
        getContext: () => ({ drawImage() {} }),
        toDataURL: () => `data:image/png;base64,${'A'.repeat(canvas.width * canvas.height * 4)}`,
      }
      return canvas
    }) as typeof document.createElement
    const file = () => new File(['x'], 'foto.png', { type: 'image/png' })
    const python = (maxAssetDataUrlChars: number) => ({
      limits: { maxAssetDataUrlChars, maxAudioDataUrlChars: 1 },
    })
    // 512x512 is about 1 M characters: over the JavaScript cap, inside the Python one.
    await expect(fileToAssetDataUrl(file(), undefined, 'png')).rejects.toThrow('grande demais')
    expect(await fileToAssetDataUrl(file(), undefined, 'png', python(16_000_000))).toMatchObject({
      width: 512,
      height: 512,
    })
    // Over a smaller cap it shrinks 512 → 384 → 288 → 216 instead of refusing.
    expect(await fileToAssetDataUrl(file(), undefined, 'png', python(300_000))).toMatchObject({
      width: 216,
      height: 216,
    })
    // Below 64 px the drawing would be unrecognisable: refused.
    await expect(fileToAssetDataUrl(file(), undefined, 'png', python(1000))).rejects.toThrow(
      'grande demais',
    )
  })
})
