import { describe, expect, it } from 'bun:test'
import { CAROUSEL_MAX, isCarouselReady, moveAsset, toggleAsset } from '../src/lib/carousel'

describe('toggleAsset', () => {
  it('adiciona no fim; remover preserva a ordem dos demais', () => {
    expect(toggleAsset(['a', 'b'], 'c')).toEqual(['a', 'b', 'c'])
    expect(toggleAsset(['a', 'b', 'c'], 'b')).toEqual(['a', 'c'])
  })

  it('teto de 10 imagens: seleção extra é ignorada', () => {
    const full = Array.from({ length: CAROUSEL_MAX }, (_, i) => `id-${i}`)
    expect(toggleAsset(full, 'extra')).toEqual(full)
  })

  it('é imutável (nunca mexe no array de entrada)', () => {
    const input = ['a']
    toggleAsset(input, 'b')
    expect(input).toEqual(['a'])
  })
})

describe('moveAsset', () => {
  it('sobe/desce uma posição', () => {
    expect(moveAsset(['a', 'b', 'c'], 'c', -1)).toEqual(['a', 'c', 'b'])
    expect(moveAsset(['a', 'b', 'c'], 'a', 1)).toEqual(['b', 'a', 'c'])
  })

  it('bordas e id desconhecido são no-op', () => {
    expect(moveAsset(['a', 'b'], 'a', -1)).toEqual(['a', 'b'])
    expect(moveAsset(['a', 'b'], 'b', 1)).toEqual(['a', 'b'])
    expect(moveAsset(['a', 'b'], 'x', 1)).toEqual(['a', 'b'])
  })
})

describe('isCarouselReady', () => {
  it('pronto só de 2 a 10 imagens', () => {
    expect(isCarouselReady(['a'])).toBe(false)
    expect(isCarouselReady(['a', 'b'])).toBe(true)
    expect(isCarouselReady(Array.from({ length: 11 }, (_, i) => `id-${i}`))).toBe(false)
  })
})
