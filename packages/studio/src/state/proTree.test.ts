import { describe, expect, it } from 'bun:test'
import type { ProjectTree } from '#core'
import {
  addProDir,
  addProFile,
  removeProNode,
  renameProNode,
  sanitizeProMeta,
  sanitizeProTree,
  setProFileContent,
} from './proTree'

const base: ProjectTree = {
  'package.json': { kind: 'file', content: '{}' },
  src: { kind: 'dir' },
  'src/main.ts': { kind: 'file', content: 'a' },
}

describe('addProFile', () => {
  it('cria arquivo e pastas-pai ausentes', () => {
    const { tree } = addProFile(base, 'src/lib/util.ts')
    expect(tree?.['src/lib']?.kind).toBe('dir')
    expect(tree?.['src/lib/util.ts']).toEqual({ kind: 'file', content: '' })
  })

  it('rejeita duplicata e path inválido', () => {
    expect(addProFile(base, 'src/main.ts').error).toBeDefined()
    expect(addProFile(base, '../x.ts').error).toBeDefined()
    expect(addProFile(base, 'node_modules/x.ts').error).toBeDefined()
  })

  it('rejeita quando um ancestral é arquivo', () => {
    expect(addProFile(base, 'package.json/child.ts').error).toBeDefined()
  })

  it('rejeita variante de CAIXA de um arquivo existente (FS case-insensível)', () => {
    // src/main.ts já existe; src/Main.TS colidiria no WebContainer/macOS/Windows.
    expect(addProFile(base, 'src/Main.TS').error).toBeDefined()
    // E permanece bloqueado para um arquivo recém-criado.
    const created = addProFile(base, 'src/App.tsx').tree as ProjectTree
    expect(addProFile(created, 'src/app.tsx').error).toBeDefined()
    // Mas um nome genuinamente novo passa.
    expect(addProFile(base, 'src/outro.ts').error).toBeUndefined()
  })
})

describe('addProDir', () => {
  it('cria pasta', () => {
    const { tree } = addProDir(base, 'public')
    expect(tree?.public?.kind).toBe('dir')
  })
  it('rejeita colisão', () => {
    expect(addProDir(base, 'src').error).toBeDefined()
  })
  it('rejeita variante de caixa de pasta existente', () => {
    expect(addProDir(base, 'SRC').error).toBeDefined()
  })
})

describe('setProFileContent', () => {
  it('atualiza conteúdo', () => {
    const next = setProFileContent(base, 'src/main.ts', 'b')
    expect((next['src/main.ts'] as { content: string }).content).toBe('b')
  })
  it('no-op se igual ou inexistente', () => {
    expect(setProFileContent(base, 'src/main.ts', 'a')).toBe(base)
    expect(setProFileContent(base, 'nope.ts', 'x')).toBe(base)
    expect(setProFileContent(base, 'src', 'x')).toBe(base)
  })
})

describe('renameProNode', () => {
  it('renomeia arquivo', () => {
    const { tree } = renameProNode(base, 'src/main.ts', 'src/index.ts')
    expect(tree?.['src/main.ts']).toBeUndefined()
    expect((tree?.['src/index.ts'] as { content: string }).content).toBe('a')
  })

  it('renomeia pasta reescrevendo prefixos dos filhos', () => {
    const tree: ProjectTree = {
      src: { kind: 'dir' },
      'src/a.ts': { kind: 'file', content: '1' },
      'src/sub': { kind: 'dir' },
      'src/sub/b.ts': { kind: 'file', content: '2' },
    }
    const { tree: out } = renameProNode(tree, 'src', 'app')
    expect(out?.app?.kind).toBe('dir')
    expect((out?.['app/a.ts'] as { content: string }).content).toBe('1')
    expect((out?.['app/sub/b.ts'] as { content: string }).content).toBe('2')
    expect(out?.src).toBeUndefined()
  })

  it('recusa mover pasta para dentro dela mesma e colisões', () => {
    expect(renameProNode(base, 'src', 'src/child').error).toBeDefined()
    expect(renameProNode(base, 'src/main.ts', 'package.json').error).toBeDefined()
    expect(renameProNode(base, 'nope', 'x.ts').error).toBeDefined()
  })

  it('recusa renomear para variante de caixa de OUTRO nó, mas permite só trocar a caixa do próprio', () => {
    const tree: ProjectTree = {
      src: { kind: 'dir' },
      'src/main.ts': { kind: 'file', content: 'a' },
      'src/app.tsx': { kind: 'file', content: 'b' },
    }
    // app.tsx → Main.ts colidiria (case-insensível) com main.ts.
    expect(renameProNode(tree, 'src/app.tsx', 'src/Main.ts').error).toBeDefined()
    // Mas corrigir a CAIXA do próprio nó é permitido (ignora a si mesmo).
    const { tree: fixed } = renameProNode(tree, 'src/app.tsx', 'src/App.tsx')
    expect(fixed?.['src/App.tsx']).toBeDefined()
    expect(fixed?.['src/app.tsx']).toBeUndefined()
    expect((fixed?.['src/App.tsx'] as { content: string }).content).toBe('b')
  })
})

describe('removeProNode', () => {
  it('remove arquivo', () => {
    const next = removeProNode(base, 'src/main.ts')
    expect(next['src/main.ts']).toBeUndefined()
    expect(next.src).toBeDefined()
  })
  it('remove subárvore de uma pasta', () => {
    const next = removeProNode(base, 'src')
    expect(next.src).toBeUndefined()
    expect(next['src/main.ts']).toBeUndefined()
    expect(next['package.json']).toBeDefined()
  })
  it('no-op se inexistente', () => {
    expect(removeProNode(base, 'nope')).toBe(base)
  })
})

describe('sanitizeProTree', () => {
  it('aceita árvore válida e preenche pais ausentes', () => {
    const out = sanitizeProTree({
      'src/main.ts': { kind: 'file', content: 'x' },
    })
    expect(out?.src?.kind).toBe('dir')
    expect(out?.['src/main.ts']?.kind).toBe('file')
  })

  it('rejeita node_modules, traversal e formas inválidas', () => {
    expect(sanitizeProTree({ 'node_modules/x': { kind: 'file', content: '' } })).toBeNull()
    expect(sanitizeProTree({ '../x': { kind: 'file', content: '' } })).toBeNull()
    expect(sanitizeProTree({ 'a.ts': { kind: 'weird' } })).toBeNull()
    expect(sanitizeProTree({ 'a.ts': { kind: 'file' } })).toBeNull()
    expect(sanitizeProTree({})).toBeNull()
    expect(sanitizeProTree(null)).toBeNull()
    expect(sanitizeProTree([])).toBeNull()
  })

  it('rejeita excesso de nós e tamanho', () => {
    const tooMany: Record<string, { kind: 'file'; content: string }> = {}
    for (let i = 0; i < 6000; i++) tooMany[`f${i}.ts`] = { kind: 'file', content: '' }
    expect(sanitizeProTree(tooMany, { maxNodes: 5000 })).toBeNull()
    expect(
      sanitizeProTree({ 'a.ts': { kind: 'file', content: 'xxxx' } }, { maxFileChars: 2 }),
    ).toBeNull()
    expect(
      sanitizeProTree(
        { 'a.ts': { kind: 'file', content: 'xx' }, 'b.ts': { kind: 'file', content: 'xx' } },
        { maxTotalChars: 3 },
      ),
    ).toBeNull()
  })

  it('rejeita árvore onde um arquivo é pai de outro path', () => {
    expect(
      sanitizeProTree({
        'a.ts': { kind: 'file', content: '' },
        'a.ts/b.ts': { kind: 'file', content: '' },
      }),
    ).toBeNull()
  })
})

describe('sanitizeProMeta', () => {
  it('aceita meta válida e corta strings longas', () => {
    expect(sanitizeProMeta({ devScript: 'dev', templateId: 'react-ts' })).toEqual({
      devScript: 'dev',
      templateId: 'react-ts',
    })
    const long = 'x'.repeat(200)
    expect(sanitizeProMeta({ devScript: long, templateId: long })?.devScript.length).toBe(80)
  })
  it('rejeita meta incompleta', () => {
    expect(sanitizeProMeta({ devScript: 'dev' })).toBeNull()
    expect(sanitizeProMeta(null)).toBeNull()
    expect(sanitizeProMeta({})).toBeNull()
  })
})
