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
    const project = createProProject('02', 'App Pro', 'vanilla-vite')
    const { files } = await buildSourceFiles(project)
    expect(files['package.json']).toBeDefined()
    expect(files['vite.config.ts']).toBeDefined()
    expect(files['src/main.ts']).toBeDefined()
    expect(files['LEIA-ME.txt']).toBeDefined()
    expect(files.Dockerfile).toBeUndefined()
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
