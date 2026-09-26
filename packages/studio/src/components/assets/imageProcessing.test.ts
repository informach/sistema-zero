import { afterEach, describe, expect, it } from 'bun:test'
import { fileToAssetDataUrl } from './imageProcessing'

const OriginalImage = globalThis.Image

afterEach(() => {
  globalThis.Image = OriginalImage
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
})
