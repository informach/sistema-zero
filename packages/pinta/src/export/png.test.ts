import { describe, expect, it } from 'bun:test'
import { getPalette } from '../core/palette'
import { bmp } from '../testing/fixtures'
import { bitmapDominantColor, bitmapToPngDataUrl, dataUrlToBlob } from './png'

const ARCADE = getPalette('arcade').colors

describe('dataUrlToBlob (atob, NUNCA fetch)', () => {
  it('base64 → Blob com mime e tamanho certos', async () => {
    const dataUrl = `data:image/png;base64,${btoa('abc')}`
    const blob = dataUrlToBlob(dataUrl)
    expect(blob).not.toBeNull()
    expect(blob?.type).toBe('image/png')
    expect(blob?.size).toBe(3)
  })

  it('payload URI-encoded (sem base64)', async () => {
    const blob = dataUrlToBlob('data:text/plain,ol%C3%A1')
    expect(blob).not.toBeNull()
    expect(await blob?.text()).toBe('olá')
  })

  it('malformada/base64 inválido → null', () => {
    expect(dataUrlToBlob('nada-a-ver')).toBeNull()
    expect(dataUrlToBlob('data:image/png;base64,%%%')).toBeNull()
  })
})

describe('bitmapDominantColor (puro, sem canvas)', () => {
  it('devolve o hex da cor visível mais frequente', () => {
    const bitmap = bmp(['122', '.22'])
    expect(bitmapDominantColor(bitmap, ARCADE)).toBe('#ff2121')
  })

  it('tudo transparente → null', () => {
    expect(bitmapDominantColor(bmp(['..', '..']), ARCADE)).toBeNull()
  })
})

describe('bitmapToPngDataUrl — guarda de ambiente', () => {
  it('sem canvas 2D (happy-dom) devolve null em vez de quebrar', () => {
    // happy-dom: getContext('2d') é null — o guard precisa segurar.
    expect(bitmapToPngDataUrl(bmp(['1']), ARCADE)).toBeNull()
  })
})
