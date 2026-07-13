import { describe, expect, it } from 'bun:test'
import { inferLanguage } from '../languages'

describe('inferLanguage', () => {
  it('infere linguagem por extensão para arquivos canônicos e extras', () => {
    expect(inferLanguage('index.html')).toBe('html')
    expect(inferLanguage('fragmento.html')).toBe('html')
    expect(inferLanguage('tema.css')).toBe('css')
    expect(inferLanguage('helper.js')).toBe('javascript')
    expect(inferLanguage('module.mjs')).toBe('javascript')
    expect(inferLanguage('tipos.ts')).toBe('typescript')
    expect(inferLanguage('App.tsx')).toBe('typescript')
  })

  it('mantém as variantes de JS da árvore PRO no language service de JS', () => {
    expect(inferLanguage('util.cjs')).toBe('javascript')
    expect(inferLanguage('App.jsx')).toBe('javascript')
  })

  it('mapeia json/markdown/xml da árvore PRO para as linguagens certas', () => {
    expect(inferLanguage('package.json')).toBe('json')
    expect(inferLanguage('README.md')).toBe('markdown')
    expect(inferLanguage('logo.svg')).toBe('xml')
    expect(inferLanguage('config.xml')).toBe('xml')
  })

  it('desconhecido vira texto puro, nunca javascript', () => {
    expect(inferLanguage('notas.txt')).toBe('plaintext')
    expect(inferLanguage('sem-extensao')).toBe('plaintext')
    expect(inferLanguage('.gitignore')).toBe('plaintext')
  })
})
