import { describe, expect, it } from 'bun:test'
import { sanitizeBaseFilename } from '../sanitize'

describe('sanitizeBaseFilename', () => {
  it('normaliza acentos, espacos e simbolos', () => {
    expect(sanitizeBaseFilename('Meu Jogo Álé!')).toBe('meu-jogo-ale')
    expect(sanitizeBaseFilename('App  __ 3D')).toBe('app-__-3d')
  })

  it('cai em "projeto" quando sobra vazio', () => {
    expect(sanitizeBaseFilename('   ')).toBe('projeto')
    expect(sanitizeBaseFilename('!!!')).toBe('projeto')
  })
})
