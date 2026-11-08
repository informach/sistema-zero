import { describe, expect, it } from 'bun:test'
import {
  proLayoutTier,
  STUDIO_NARROW_MAX_PX,
  STUDIO_PRO_PHONE_MAX_PX,
  STUDIO_PRO_WIDE_MIN_PX,
} from './layoutBreakpoints'

describe('proLayoutTier (os três tamanhos do workspace Pro)', () => {
  it('ainda sem medida (0) é largo, como o resto do Studio antes de medir', () => {
    expect(proLayoutTier(0)).toBe('wide')
  })
  it('separa largo, tablet e celular nas réguas do Pro', () => {
    expect(proLayoutTier(1440)).toBe('wide')
    expect(proLayoutTier(STUDIO_PRO_WIDE_MIN_PX)).toBe('wide')
    expect(proLayoutTier(STUDIO_PRO_WIDE_MIN_PX - 1)).toBe('tablet')
    expect(proLayoutTier(STUDIO_NARROW_MAX_PX)).toBe('tablet')
    expect(proLayoutTier(STUDIO_PRO_PHONE_MAX_PX + 1)).toBe('tablet')
    expect(proLayoutTier(STUDIO_PRO_PHONE_MAX_PX)).toBe('phone')
    expect(proLayoutTier(390)).toBe('phone')
  })
})
