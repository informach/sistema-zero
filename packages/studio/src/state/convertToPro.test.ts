import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createEmptyProject, type Project } from '#core'
import { buildProFileMap } from '../export/fileMap'
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
  it('leva o runtime de entrada para public/ e o carrega antes do script do aluno', async () => {
    const tree = await convertClassicToProTree(classicProject())
    expect((tree['public/sz-input.js'] as { content: string }).content).toContain(
      'window.__szInput = input',
    )
    const index = (tree['index.html'] as { content: string }).content
    expect(index.indexOf('src="/sz-input.js"')).toBeLessThan(index.indexOf('src="/script.js"'))
  })

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
    expect(tree['src/main.js']).toBeUndefined()
    // referências viram absolutas (servidas do public na raiz pelo Vite)
    const index = (tree['index.html'] as { content: string }).content
    expect(index).toContain('href="/style.css"')
    expect(index).toContain('src="/script.js"')
    // a árvore passa pelo sanitizador de árvore pro
    expect(sanitizeProTree(tree)).not.toBeNull()
  })

  it('preserva TypeScript e migra Three e extensões para módulos npm', async () => {
    const tree = await convertClassicToProTree(
      classicProject({
        extraFiles: [
          { name: 'util.ts', language: 'typescript', content: 'export const x: number = 1' },
        ],
        installedExtensions: [{ id: 'game-3d', version: '1.0.0', installedAt: 0 }],
      }),
    )
    expect((tree['src/converted/util.ts'] as { content: string }).content).toContain(': number')
    expect(tree['src/converted/sz-ext/game-3d.js']).toBeDefined()
    expect(tree['src/converted/sz-ext']?.kind).toBe('dir')
    const index = (tree['index.html'] as { content: string }).content
    expect(index).not.toContain('importmap')
    expect((tree['package.json'] as { content: string }).content).toContain('"three": "0.180.0"')
    expect(index).toContain('src="/src/converted/sz-ext/game-3d.js"')
    expect(index).toContain('src="/script.js" defer')
  })

  it('rewrites inline and absolute module imports to the preserved typed source', async () => {
    const source = classicProject({
      extraFiles: [
        {
          name: 'util.ts',
          language: 'typescript',
          content: 'export const color: string = "green"',
        },
      ],
    })
    source.files['index.html'] =
      '<html><head></head><body><script type="module">import { color } from "./util.js"; window.color = color</script><script src="script.js"></script></body></html>'
    source.files['script.js'] = 'import { color } from "/util.js"; console.log(color)'
    const tree = await convertClassicToProTree(source)
    expect((tree['index.html'] as { content: string }).content).toContain(
      'from "/src/converted/util.ts"',
    )
    expect((tree['src/converted/script.js'] as { content: string }).content).toContain(
      'from "/src/converted/util.ts"',
    )
  })

  it('rejects mixed global/module files instead of copying divergent source or changing scope', async () => {
    const source = classicProject({
      extraFiles: [{ name: 'global.js', language: 'javascript', content: 'var value = 1' }],
    })
    source.files['index.html'] =
      '<html><head></head><body><script src="global.js"></script><script src="script.js"></script></body></html>'
    source.files['script.js'] = 'import "./global.js"'
    await expect(convertClassicToProTree(source)).rejects.toThrow('módulo e script global')
  })

  it('rejects dynamic imports in untouched global code before moving their target', async () => {
    const source = classicProject({
      extraFiles: [{ name: 'util.ts', language: 'typescript', content: 'export const value = 1' }],
    })
    source.files['script.js'] = 'function load() { return import("./util.js") }'
    await expect(convertClassicToProTree(source)).rejects.toThrow('importação dinâmica')
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
    await useProjectStore.getState().convertToPro(async () => {})
    const p = useProjectStore.getState().project
    expect(p?.kind).toBe('pro')
    expect(p?.mode).toBe('code')
    expect(p?.tree?.['index.html']).toBeDefined()
    expect(p?.ir).toBeNull()
    expect(p?.blocksState).toBeNull()
  })

  it('only converts after saving the complete original, retaining Pensa identity and CSS binary paths', async () => {
    const asset = {
      id: 'a',
      name: 'fundo',
      kind: 'image' as const,
      source: 'upload' as const,
      dataUrl: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"/>')}`,
    }
    const source = classicProject({
      assets: [asset],
      files: {
        'index.html': '<html><head></head><body></body></html>',
        'style.css': 'body{background:url(fundo)}',
        'script.js': '',
      },
    })
    useProjectStore.setState({ project: source })
    let original: Project | undefined
    await useProjectStore.getState().convertToPro(async (copy) => {
      expect(useProjectStore.getState().project).toBe(source)
      original = copy
    })
    const pro = useProjectStore.getState().project!
    expect(original?.id).not.toBe(source.id)
    expect(original?.assets).toEqual(source.assets)
    expect(original?.files).toEqual(source.files)
    expect(pro.id).toBe(source.id)
    expect(pro.proMeta?.origin?.projectId).toBe(original?.id)
    expect(pro.tree?.['public/sz-assets.js']).toBeUndefined()
    const { files } = await buildProFileMap(pro)
    expect(files['public/fundo']).toBeInstanceOf(Uint8Array)
    expect(files['public/sz-assets.js']).toBeInstanceOf(Uint8Array)
    expect(files['public/style.css']).toContain('url(fundo)')
    expect(sanitizeProjectForHost(pro)?.proMeta?.origin).toEqual(pro.proMeta?.origin)
  })

  it('failure to preserve the original leaves the current document intact', async () => {
    const source = useProjectStore.getState().project
    await expect(
      useProjectStore.getState().convertToPro(async () => {
        throw new Error('quota')
      }),
    ).rejects.toThrow('quota')
    expect(useProjectStore.getState().project).toBe(source)
  })

  it('an edit during original-copy persistence cancels conversion instead of losing that edit', async () => {
    await expect(
      useProjectStore.getState().convertToPro(async () => {
        useProjectStore.getState().setFile('script.js', 'console.log("newer")')
      }),
    ).rejects.toThrow('mudou')
    expect(useProjectStore.getState().project?.kind).not.toBe('pro')
    expect(useProjectStore.getState().project?.files['script.js']).toContain('newer')
  })

  it("pro não volta para 'blocks' (setMode preso em Código)", async () => {
    await useProjectStore.getState().convertToPro(async () => {})
    useProjectStore.getState().setMode('blocks')
    expect(useProjectStore.getState().project?.mode).toBe('code')
  })

  it('uma edição feita DURANTE o await da conversão não se perde (tree×conteúdo consistentes)', async () => {
    // Regressão M-convertToPro: a tree era construída do snapshot PRÉ-await e o
    // commit espalhava o `fresh` zerando files — a edição feita no meio (durante o
    // import dinâmico / conversão) se perdia (tree antiga, conteúdo novo descartado).
    // Agora o snapshot é lido APÓS o import, então a edição abaixo entra na tree.
    const promise = useProjectStore.getState().convertToPro(async () => {})
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
