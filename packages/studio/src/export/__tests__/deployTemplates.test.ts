import { describe, expect, it } from 'bun:test'
import { classicDeployTemplates, proDeployTemplates } from '../deployTemplates'

describe('classicDeployTemplates', () => {
  const files = classicDeployTemplates('Meu Jogo')

  it('Dockerfile serve public/ ligado na $PORT', () => {
    expect(files.Dockerfile).toContain('serve -s public')
    expect(files.Dockerfile).toContain('PORT:-3000')
  })

  it('railway.json parseia e usa o builder DOCKERFILE', () => {
    const parsed = JSON.parse(String(files['railway.json'])) as { build: { builder: string } }
    expect(parsed.build.builder).toBe('DOCKERFILE')
  })

  it('.dockerignore ignora node_modules; README e pt-BR sem travessao', () => {
    expect(files['.dockerignore']).toContain('node_modules')
    expect(files['README.md']).toContain('Meu Jogo')
    expect(files['README.md']).not.toContain('—')
  })
})

describe('proDeployTemplates', () => {
  const files = proDeployTemplates('App Pro')

  it('Dockerfile multi-stage faz o build e serve dist/', () => {
    expect(files.Dockerfile).toContain('AS build')
    expect(files.Dockerfile).toContain('npm run build')
    expect(files.Dockerfile).toContain('serve -s dist')
  })

  it('README sem travessao', () => {
    expect(files['README.md']).not.toContain('—')
  })
})

describe('higiene do nome no titulo do README', () => {
  it('classic: tira crase/< />, preserva acentos e espacos', () => {
    const files = classicDeployTemplates('Meu `Jogo` <script> João')
    // Crase, < e > foram removidos do titulo Markdown; acentos/espacos ficam.
    expect(files['README.md']).toContain('# Meu Jogo script João')
    expect(files['README.md']).not.toContain('`Jogo`')
    expect(files['README.md']).not.toContain('<script>')
  })

  it('pro: tira crase/< />, preserva acentos e espacos', () => {
    const files = proDeployTemplates('App `Pro` <b> Coração')
    expect(files['README.md']).toContain('# App Pro b Coração')
    expect(files['README.md']).not.toContain('<b>')
  })

  it('README recomenda configurar cabecalhos de seguranca no host', () => {
    expect(classicDeployTemplates('X')['README.md']).toContain('cabecalhos de seguranca')
    expect(proDeployTemplates('X')['README.md']).toContain('cabecalhos de seguranca')
  })
})
