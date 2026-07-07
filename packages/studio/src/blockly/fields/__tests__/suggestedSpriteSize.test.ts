import { describe, expect, it } from 'bun:test'
import { suggestedSpriteSize } from '../FieldAssetPicker'

describe('suggestedSpriteSize', () => {
  it('amplia pixel art pequena por múltiplo inteiro (~48px no maior lado)', () => {
    expect(suggestedSpriteSize(16, 16)).toEqual({ w: 48, h: 48 })
    expect(suggestedSpriteSize(32, 32)).toEqual({ w: 64, h: 64 })
    expect(suggestedSpriteSize(48, 48)).toEqual({ w: 48, h: 48 })
  })

  it('imagem já grande fica no tamanho real (fator 1)', () => {
    expect(suggestedSpriteSize(64, 64)).toEqual({ w: 64, h: 64 })
    expect(suggestedSpriteSize(128, 128)).toEqual({ w: 128, h: 128 })
  })

  it('preserva a proporção de assets não-quadrados (um fator só)', () => {
    // Fator sai do MAIOR lado: 48/32 → 2 (não 3× no lado menor).
    expect(suggestedSpriteSize(16, 32)).toEqual({ w: 32, h: 64 })
    expect(suggestedSpriteSize(64, 16)).toEqual({ w: 64, h: 16 })
  })

  it('entrada inválida devolve null', () => {
    expect(suggestedSpriteSize(0, 16)).toBeNull()
    expect(suggestedSpriteSize(16, -1)).toBeNull()
    expect(suggestedSpriteSize(Number.NaN, 16)).toBeNull()
  })
})
