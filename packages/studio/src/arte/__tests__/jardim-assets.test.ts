import { describe, expect, test } from 'bun:test'
import { jardimSvg, jardimSvgUrl } from '../jardim-assets'

describe('a arte do jardim', () => {
  test('por padrão o SVG cabe inteiro na caixa (a raiz não declara encaixe)', () => {
    expect(jardimSvg('jardim')).not.toContain('preserveAspectRatio')
    expect(jardimSvg('jardim')).toContain('viewBox="0 0 640 360"')
  })

  test('com `cobrir`, a RAIZ do SVG leva o "slice": é ela quem manda quando um <image> a aponta', () => {
    expect(jardimSvg('jardim', { cobrir: true })).toMatch(
      /^<svg [^>]*preserveAspectRatio="xMidYMid slice">/,
    )
    expect(decodeURIComponent(jardimSvgUrl('jardim', { cobrir: true }))).toContain(
      'preserveAspectRatio="xMidYMid slice"',
    )
    // Os sprites não mudam: quem cobre é só quem pede.
    expect(jardimSvg('coelho')).not.toContain('preserveAspectRatio')
  })
})
