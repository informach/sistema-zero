import { describe, expect, it } from 'bun:test'
import type { ProjectTree } from '#core'
import { sanitizeProTree } from '../../state/proTree'
import { reconcileProTree } from './reconcileProTree'

const tree = (files: Record<string, string>): ProjectTree =>
  sanitizeProTree(
    Object.fromEntries(
      Object.entries(files).map(([path, content]) => [path, { kind: 'file', content }]),
    ),
  ) ?? {}

describe('reconciliação terminal/editor', () => {
  it('incorpora install, criação, rename e exclusão enquanto preserva uma edição independente', () => {
    const base = tree({
      'package.json': '{}',
      'src/main.ts': 'old',
      'src/old.ts': 'move',
      'delete.txt': 'delete',
    })
    const editor = tree({
      'package.json': '{}',
      'src/main.ts': 'edited',
      'src/old.ts': 'move',
      'delete.txt': 'delete',
    })
    const disk = tree({
      'package.json': '{"dependencies":{"mitt":"3.0.1"}}',
      'package-lock.json': 'lock',
      'src/main.ts': 'old',
      'src/new.ts': 'move',
    })
    const result = reconcileProTree(base, editor, disk)
    expect(result.conflicts).toEqual([])
    expect(result.tree).toEqual(
      tree({
        'package.json': '{"dependencies":{"mitt":"3.0.1"}}',
        'package-lock.json': 'lock',
        'src/main.ts': 'edited',
        'src/new.ts': 'move',
      }),
    )
  })
  it('preserva as duas versões concorrentes em arquivos persistíveis', () => {
    const result = reconcileProTree(
      tree({ 'src/main.ts': 'base' }),
      tree({ 'src/main.ts': 'editor' }),
      tree({ 'src/main.ts': 'terminal' }),
    )
    expect(result.conflicts).toEqual(['src/main.ts'])
    expect(result.tree['src/main.ts']).toEqual({ kind: 'file', content: 'editor' })
    expect(result.tree[`${result.recoveryDirectory}/files/src/main.ts`]).toEqual({
      kind: 'file',
      content: 'terminal',
    })
    expect(sanitizeProTree(result.tree)).toEqual(result.tree)
  })
  it.each([
    'editor',
    'terminal',
  ] as const)('edição contra exclusão no %s não perde a versão editada', (deleted) => {
    const edited = tree({ 'src/main.ts': 'changed' })
    const result = reconcileProTree(
      tree({ 'src/main.ts': 'base' }),
      deleted === 'editor' ? {} : edited,
      deleted === 'terminal' ? {} : edited,
    )
    expect(result.conflicts).toEqual(['src'])
    expect(JSON.stringify(result.tree)).toContain('changed')
    expect(sanitizeProTree(result.tree)).not.toBeNull()
  })
  it('conflito arquivo/pasta preserva a subárvore inteira', () => {
    const result = reconcileProTree(
      tree({ 'src/main.ts': 'base' }),
      tree({ src: 'arquivo' }),
      tree({ 'src/main.ts': 'terminal', 'src/new.ts': 'novo' }),
    )
    expect(result.conflicts).toEqual(['src'])
    expect(result.tree.src).toEqual({ kind: 'file', content: 'arquivo' })
    expect(result.tree['src/main.ts']).toBeUndefined()
    expect(result.tree[`${result.recoveryDirectory}/files/src/new.ts`]).toEqual({
      kind: 'file',
      content: 'novo',
    })
    expect(sanitizeProTree(result.tree)).not.toBeNull()
  })
  it('edições idênticas não criam conflito e não sobrescreve uma recuperação anterior', () => {
    const edited = tree({ 'main.ts': 'same' })
    expect(reconcileProTree(tree({ 'main.ts': 'base' }), edited, edited).conflicts).toEqual([])
    const existing = tree({ 'main.ts': 'editor', 'studio-terminal-conflict-1/README.md': 'keep' })
    const result = reconcileProTree(
      tree({ 'main.ts': 'base' }),
      existing,
      tree({ 'main.ts': 'terminal' }),
    )
    expect(result.recoveryDirectory).toBe('studio-terminal-conflict-2')
    expect(result.tree['studio-terminal-conflict-1/README.md']).toEqual({
      kind: 'file',
      content: 'keep',
    })
  })
})
