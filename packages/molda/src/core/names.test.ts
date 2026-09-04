import { describe, expect, test } from 'bun:test'
import { normalizeSearchText, searchTerms } from './gallerySearch'
import { normalizeAssetName, uniqueAssetName } from './names'

describe('normalizeAssetName', () => {
  test('kebab-case sem acento, com teto de 48', () => {
    expect(normalizeAssetName('Nave Espacial')).toBe('nave-espacial')
    expect(normalizeAssetName('  céu_de_verão  ')).toBe('ceu-de-verao')
    expect(normalizeAssetName('--a--b--')).toBe('a-b')
    expect(normalizeAssetName('!!!')).toBeNull()
    expect(normalizeAssetName('')).toBeNull()
    expect(normalizeAssetName('a'.repeat(49))).toBeNull()
    expect(normalizeAssetName('a'.repeat(48))).toHaveLength(48)
  })
})

describe('uniqueAssetName', () => {
  test('sufixo -2, -3... e respeita o teto', () => {
    expect(uniqueAssetName('nave', new Set())).toBe('nave')
    expect(uniqueAssetName('nave', new Set(['nave']))).toBe('nave-2')
    expect(uniqueAssetName('nave', new Set(['nave', 'nave-2']))).toBe('nave-3')
    const long = 'a'.repeat(48)
    const unique = uniqueAssetName(long, new Set([long]))
    expect(unique).toHaveLength(48)
    expect(unique?.endsWith('-2')).toBe(true)
  })
})

describe('busca', () => {
  test('termos normalizados', () => {
    expect(normalizeSearchText('Céu Noturno')).toBe('ceu-noturno')
    expect(searchTerms('  Nave   CÉU ')).toEqual(['nave', 'ceu'])
  })
})
