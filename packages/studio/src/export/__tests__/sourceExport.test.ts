import { describe, expect, it } from 'bun:test'
import { unzipSync } from 'fflate'
import type { Project } from '#core'
import { createProProject } from '../../components/code/pro-templates'
import { buildSourceFiles, exportProjectSource } from '../sourceExport'

function classicProject(overrides: Partial<Project> = {}): Project {
  return {
    id: '01',
    name: 'Meu Jogo Álé',
    createdAt: 0,
    updatedAt: 0,
    mode: 'blocks',
    files: {
      'index.html':
        '<!doctype html><html><head><link rel="stylesheet" href="style.css" /></head><body><script src="script.js"></script></body></html>',
      'style.css': 'body { color: red; }',
      'script.js': 'console.log("oi do aluno");',
    },
    extraFiles: [],
    ir: { html: [], css: [], js: [], extensions: [] },
    blocksState: null,
    installedExtensions: [],
    ...overrides,
  }
}

async function unzipBlob(blob: Blob): Promise<Record<string, Uint8Array>> {
  return unzipSync(new Uint8Array(await blob.arrayBuffer()))
}

describe('buildSourceFiles (fonte para o VSCode)', () => {
  it('classico: inclui o runtime de entrada e o carrega antes do script do aluno', async () => {
    const { files } = await buildSourceFiles(classicProject())
    expect(String(files['sz-input.js'])).toContain('window.__szInput = input')
    const index = String(files['index.html'])
    expect(index.indexOf('src="sz-input.js"')).toBeLessThan(index.indexOf('src="script.js"'))
  })

  it('classico: arquivos na RAIZ (sem public/), com LEIA-ME e sem deploy', async () => {
    const { files } = await buildSourceFiles(classicProject())
    expect(files['index.html']).toBeDefined()
    expect(files['style.css']).toBeDefined()
    expect(files['script.js']).toBeDefined()
    expect(files['LEIA-ME.txt']).toBeDefined()
    // Nenhum arquivo com prefixo public/ (foi achatado para a raiz).
    expect(Object.keys(files).some((k) => k.startsWith('public/'))).toBe(false)
    // Não inclui o pacote de deploy.
    expect(files.Dockerfile).toBeUndefined()
    expect(files['railway.json']).toBeUndefined()
    // O script.js é o código do aluno, NÃO minificado.
    expect(String(files['script.js'])).toContain('console.log("oi do aluno")')
  })

  it('classico com extensão + asset: inclui sz-ext e sz-assets na raiz', async () => {
    const { files } = await buildSourceFiles(
      classicProject({
        installedExtensions: [{ id: 'game-2d', version: '1.0.0', installedAt: 0 }],
        assets: [
          {
            id: 'a1',
            name: 'heroi',
            kind: 'image',
            dataUrl: 'data:image/png;base64,AAAA',
            source: 'upload',
          },
        ],
      }),
    )
    expect(files['sz-ext/game-2d.js']).toBeDefined()
    expect(files['sz-assets.js']).toBeDefined()
    expect(Object.keys(files).some((k) => k.startsWith('public/'))).toBe(false)
  })

  it('pro: árvore Vite (fonte) + LEIA-ME, sem Dockerfile', async () => {
    const project = await createProProject('02', 'App Pro', 'vanilla-vite')
    const { files } = await buildSourceFiles(project)
    expect(files['package.json']).toBeDefined()
    expect(files['vite.config.ts']).toBeDefined()
    expect(files['src/main.ts']).toBeDefined()
    expect(files['LEIA-ME.txt']).toBeDefined()
    expect(files.Dockerfile).toBeUndefined()
    expect(String(files['LEIA-ME.txt'])).toContain('npm install')
    expect(String(files['LEIA-ME.txt'])).toContain('npm run dev')
    expect(String(files['LEIA-ME.txt'])).not.toContain('Open with Live Server')
  })

  it('pro: guia usa npm ci com lockfile e preserva a documentação do autor', async () => {
    const project = await createProProject('04', 'Com lock', 'vanilla-vite')
    project.tree = {
      ...project.tree,
      'package-lock.json': { kind: 'file', content: '{"lockfileVersion":3}' },
      'README.md': { kind: 'file', content: 'Manual do autor' },
      'CREDITS.md': { kind: 'file', content: 'Créditos e permissões' },
    }
    const generated = await buildSourceFiles(project)
    expect(String(generated.files['LEIA-ME.txt'])).toContain('dependências: npm ci')
    expect(generated.files['README.md']).toBe('Manual do autor')
    expect(generated.files['CREDITS.md']).toBe('Créditos e permissões')
    project.tree['LEIA-ME.txt'] = { kind: 'file', content: 'Instruções do autor' }
    expect((await buildSourceFiles(project)).files['LEIA-ME.txt']).toBe('Instruções do autor')
  })
})

describe('exportProjectSource', () => {
  it('zipa, nomeia sem -deploy e sem nível public/', async () => {
    const result = await exportProjectSource(classicProject())
    expect(result.filename).toBe('meu-jogo-ale.zip')
    expect(result.blob).toBeInstanceOf(Blob)

    const names = Object.keys(await unzipBlob(result.blob))
    expect(names).toContain('index.html')
    expect(names).toContain('script.js')
    expect(names).toContain('LEIA-ME.txt')
    expect(names).not.toContain('public/index.html')
    expect(names).not.toContain('Dockerfile')
  })
})
