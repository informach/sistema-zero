import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createEmptyProject, type Project } from '#core'
import { convertClassicToProTree } from './convertToPro'
import { sanitizeProjectForHost, useProjectStore } from './projectStore'
import { sanitizeProTree } from './proTree'

function classicProject(overrides: Partial<Project> = {}): Project {
  const base = createEmptyProject('p1', 'Meu Jogo')
  return {
    ...base,
    files: {
      'index.html':
        '<!doctype html><html lang="pt-BR"><head><title>Meu Jogo</title><link rel="stylesheet" href="style.css" /></head><body><script src="script.js"></script></body></html>',
      'style.css': 'body{color:red}',
      'script.js': 'console.log("oi")',
    },
    ...overrides,
  }
}

describe('convertClassicToProTree', () => {
  it('monta uma árvore Vite válida: index.html na raiz, assets em public/, refs absolutas', async () => {
    const tree = await convertClassicToProTree(classicProject())
    expect(tree['package.json']).toBeDefined()
    expect(tree['vite.config.ts']).toBeDefined()
    expect(tree['tsconfig.json']).toBeDefined()
    expect(tree['index.html']?.kind).toBe('file')
    expect(tree.public?.kind).toBe('dir')
    expect((tree['public/style.css'] as { content: string }).content).toBe('body{color:red}')
    expect((tree['public/script.js'] as { content: string }).content).toBe('console.log("oi")')
    // não traz o src/main.ts do template
    expect(tree['src/main.ts']).toBeUndefined()
    // referências viram absolutas (servidas do public na raiz pelo Vite)
    const index = (tree['index.html'] as { content: string }).content
    expect(index).toContain('href="/style.css"')
    expect(index).toContain('src="/script.js"')
    // a árvore passa pelo sanitizador de árvore pro
    expect(sanitizeProTree(tree)).not.toBeNull()
  })

  it('transpila extras .ts para .js em public/ e injeta runtime+importmap de extensão', async () => {
    const tree = await convertClassicToProTree(
      classicProject({
        extraFiles: [
          { name: 'util.ts', language: 'typescript', content: 'export const x: number = 1' },
        ],
        installedExtensions: [{ id: 'game-3d', version: '1.0.0', installedAt: 0 }],
      }),
    )
    expect((tree['public/util.js'] as { content: string }).content).not.toContain(': number')
    expect(tree['public/sz-ext/game-3d.js']).toBeDefined()
    expect(tree['public/sz-ext']?.kind).toBe('dir')
    const index = (tree['index.html'] as { content: string }).content
    expect(index).toContain('<script type="importmap">')
    expect(index).toContain('src="/sz-ext/game-3d.js"')
  })
})

describe('sanitizeProjectForHost — coerção de modo (D2)', () => {
  it("básico legado em mode 'code' carrega como 'bridge'", () => {
    const raw = { ...classicProject(), mode: 'code' }
    expect(sanitizeProjectForHost(raw)?.mode).toBe('bridge')
  })

  it("básico em mode 'blocks' permanece 'blocks'", () => {
    expect(sanitizeProjectForHost(classicProject())?.mode).toBe('blocks')
  })
})

describe('store: setMode + convertToPro', () => {
  beforeEach(() => {
    useProjectStore.setState({ project: classicProject({ mode: 'bridge' }), isDirty: false })
  })
  afterEach(() => {
    useProjectStore.setState({ project: null, isDirty: false })
  })

  it("setMode('code') num projeto básico nunca cai em Código", () => {
    useProjectStore.getState().setMode('code')
    const mode = useProjectStore.getState().project?.mode ?? ''
    expect(mode).not.toBe('code')
    expect(['blocks', 'bridge']).toContain(mode)
  })

  it('convertToPro gradua o projeto para pro (kind/mode/tree, zera ir/blocos)', async () => {
    await useProjectStore.getState().convertToPro()
    const p = useProjectStore.getState().project
    expect(p?.kind).toBe('pro')
    expect(p?.mode).toBe('code')
    expect(p?.tree?.['index.html']).toBeDefined()
    expect(p?.ir).toBeNull()
    expect(p?.blocksState).toBeNull()
  })

  it("pro não volta para 'blocks' (setMode preso em Código)", async () => {
    await useProjectStore.getState().convertToPro()
    useProjectStore.getState().setMode('blocks')
    expect(useProjectStore.getState().project?.mode).toBe('code')
  })

  it('uma edição feita DURANTE o await da conversão não se perde (tree×conteúdo consistentes)', async () => {
    // Regressão M-convertToPro: a tree era construída do snapshot PRÉ-await e o
    // commit espalhava o `fresh` zerando files — a edição feita no meio (durante o
    // import dinâmico / conversão) se perdia (tree antiga, conteúdo novo descartado).
    // Agora o snapshot é lido APÓS o import, então a edição abaixo entra na tree.
    const promise = useProjectStore.getState().convertToPro()
    // O convertToPro começa pelo `await import('./convertToPro')`: esta edição
    // síncrona acontece antes do snapshot ser lido (pós-import) e deve aparecer.
    useProjectStore.getState().setFile('script.js', 'console.log("edição no meio")')
    await promise

    const p = useProjectStore.getState().project
    expect(p?.kind).toBe('pro')
    // A tree reflete o conteúdo editado (não o original), e os campos do básico
    // foram zerados de forma CONSISTENTE com essa mesma tree.
    expect((p?.tree?.['public/script.js'] as { content: string }).content).toBe(
      'console.log("edição no meio")',
    )
    expect(p?.files['script.js']).toBe('')
  })
})
