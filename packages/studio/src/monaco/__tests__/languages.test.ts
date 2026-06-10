import { describe, expect, it } from 'bun:test'
import { inferLanguage } from '../languages'

describe('inferLanguage', () => {
  it('infere linguagem por extensão para arquivos canônicos e extras', () => {
    expect(inferLanguage('index.html')).toBe('html')
    expect(inferLanguage('fragmento.html')).toBe('html')
    expect(inferLanguage('tema.css')).toBe('css')
    expect(inferLanguage('helper.js')).toBe('javascript')
    expect(inferLanguage('module.mjs')).toBe('javascript')
  })
})
