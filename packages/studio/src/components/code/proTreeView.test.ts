import { describe, expect, it } from 'bun:test'
import type { ProjectTree } from '#core'
import { buildTreeView } from './proTreeView'

describe('buildTreeView', () => {
  const tree: ProjectTree = {
    'package.json': { kind: 'file', content: '{}' },
    src: { kind: 'dir' },
    'src/main.ts': { kind: 'file', content: 'a' },
    'src/App.tsx': { kind: 'file', content: 'b' },
    'src/lib': { kind: 'dir' },
    'src/lib/util.ts': { kind: 'file', content: 'c' },
  }

  it('agrupa filhos sob a pasta correta', () => {
    const roots = buildTreeView(tree)
    const src = roots.find((n) => n.path === 'src')
    expect(src?.kind).toBe('dir')
    expect(src?.children.map((c) => c.name)).toContain('main.ts')
    const lib = src?.children.find((c) => c.path === 'src/lib')
    expect(lib?.children[0]?.path).toBe('src/lib/util.ts')
  })

  it('ordena pastas antes de arquivos, depois alfabético', () => {
    const roots = buildTreeView(tree)
    // raiz: 'src' (dir) antes de 'package.json' (file)
    expect(roots.map((n) => n.name)).toEqual(['src', 'package.json'])
    const src = roots.find((n) => n.path === 'src')
    // dentro de src: lib (dir) antes de App.tsx, main.ts
    expect(src?.children.map((c) => c.name)).toEqual(['lib', 'App.tsx', 'main.ts'])
  })

  it('calcula profundidade para indentação', () => {
    const roots = buildTreeView(tree)
    expect(roots.find((n) => n.path === 'package.json')?.depth).toBe(0)
    const util = buildTreeView(tree)
      .find((n) => n.path === 'src')
      ?.children.find((c) => c.path === 'src/lib')?.children[0]
    expect(util?.depth).toBe(2)
  })

  it('sintetiza pastas-pai ausentes', () => {
    const roots = buildTreeView({ 'a/b/c.ts': { kind: 'file', content: 'x' } })
    expect(roots[0]?.path).toBe('a')
    expect(roots[0]?.children[0]?.path).toBe('a/b')
  })
})
