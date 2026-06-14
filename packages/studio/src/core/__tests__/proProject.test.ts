import { describe, expect, it } from 'bun:test'
import { inferProLanguage, normalizeProPath, slugifyProjectName } from '../proProject'

describe('normalizeProPath', () => {
  it('aceita arquivos e pastas válidos', () => {
    expect(normalizeProPath('src/main.ts', { expectFile: true })).toBe('src/main.ts')
    expect(normalizeProPath('src')).toBe('src')
    expect(normalizeProPath('package.json', { expectFile: true })).toBe('package.json')
    expect(normalizeProPath('src/components/App.tsx', { expectFile: true })).toBe(
      'src/components/App.tsx',
    )
  })

  it('normaliza barras e colapsa duplicatas', () => {
    expect(normalizeProPath('\\src\\main.ts', { expectFile: true })).toBe('src/main.ts')
    expect(normalizeProPath('/src//main.ts/', { expectFile: true })).toBe('src/main.ts')
  })

  it('rejeita traversal, absolutos e node_modules', () => {
    expect(normalizeProPath('../x')).toBeNull()
    expect(normalizeProPath('src/../etc')).toBeNull()
    expect(normalizeProPath('a/./b')).toBeNull()
    expect(normalizeProPath('node_modules/three')).toBeNull()
    expect(normalizeProPath('src/node_modules/x')).toBeNull()
    expect(normalizeProPath('')).toBeNull()
  })

  it('rejeita segmento inválido e extensão fora da allowlist', () => {
    expect(normalizeProPath('foo bar.ts', { expectFile: true })).toBeNull()
    expect(normalizeProPath('app.exe', { expectFile: true })).toBeNull()
    expect(normalizeProPath('app', { expectFile: true })).toBeNull()
    expect(normalizeProPath('app.ts', { expectFile: false })).toBe('app.ts')
  })
})

describe('inferProLanguage', () => {
  it('mapeia extensões para linguagens', () => {
    expect(inferProLanguage('src/main.ts')).toBe('typescript')
    expect(inferProLanguage('src/App.tsx')).toBe('tsx')
    expect(inferProLanguage('a.jsx')).toBe('jsx')
    expect(inferProLanguage('a.js')).toBe('javascript')
    expect(inferProLanguage('package.json')).toBe('json')
    expect(inferProLanguage('index.html')).toBe('html')
    expect(inferProLanguage('a.css')).toBe('css')
    expect(inferProLanguage('README.md')).toBe('text')
  })
})

describe('slugifyProjectName', () => {
  it('produz slug seguro para package.json', () => {
    expect(slugifyProjectName('Meu App 3D!')).toBe('meu-app-3d')
    expect(slugifyProjectName('   ')).toBe('sz-project')
  })
})
