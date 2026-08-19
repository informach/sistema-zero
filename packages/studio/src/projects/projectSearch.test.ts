import { describe, expect, it } from 'bun:test'
import {
  matchesProjectMode,
  matchesProjectSearch,
  normalizeProjectSearchText,
  projectSearchTerms,
} from './projectSearch'

describe('busca de projetos', () => {
  it('normaliza como o Pinta: minúsculas, sem acento, espaços viram hífen', () => {
    expect(normalizeProjectSearchText('Nave Espacial 2')).toBe('nave-espacial-2')
    expect(normalizeProjectSearchText('  Ação!  ')).toBe('acao')
    expect(projectSearchTerms('nave   AZUL')).toEqual(['nave', 'azul'])
  })

  it('casa por nome sem acento/caixa; vários termos casam todos; busca vazia casa tudo', () => {
    expect(matchesProjectSearch('Nave Espacial', 'espaçial')).toBe(true)
    expect(matchesProjectSearch('Nave Espacial', 'NAVE')).toBe(true)
    expect(matchesProjectSearch('Nave Espacial', 'nave espacial')).toBe(true)
    expect(matchesProjectSearch('Nave Espacial', 'nave lua')).toBe(false)
    expect(matchesProjectSearch('Nave Espacial', '   ')).toBe(true)
  })

  it('modo: Blocos = blocks e bridge; Código = code; todos = tudo', () => {
    expect(matchesProjectMode('blocks', 'blocks')).toBe(true)
    expect(matchesProjectMode('bridge', 'blocks')).toBe(true)
    expect(matchesProjectMode('code', 'blocks')).toBe(false)
    expect(matchesProjectMode('code', 'code')).toBe(true)
    expect(matchesProjectMode('blocks', 'code')).toBe(false)
    expect(matchesProjectMode('code', 'all')).toBe(true)
  })
})
