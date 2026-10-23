import { describe, expect, it } from 'bun:test'
import type { ProjectTree } from '../../../core/proProject'
import {
  closeWorkspaceFile,
  emptyWorkspace,
  openWorkspaceFile,
  parseWorkspace,
  pinWorkspaceFile,
  reconcileWorkspace,
  remapWorkspace,
} from './model'
import { proSourcePosition, searchProFiles } from './search'

describe('workspace Pro', () => {
  it('explores one temporary tab and pins it before editing', () => {
    const first = openWorkspaceFile(emptyWorkspace(), 'a.ts')
    expect(openWorkspaceFile(first, 'b.ts').openFiles).toEqual(['b.ts'])
    const edited = pinWorkspaceFile(first, 'a.ts')
    expect(openWorkspaceFile(edited, 'b.ts').openFiles).toEqual(['a.ts', 'b.ts'])
  })
  it('does not reopen the last closed tab and remaps a directory coherently', () => {
    const state = { ...openWorkspaceFile(emptyWorkspace(), 'src/a.ts'), collapsed: ['src'] }
    const moved = remapWorkspace(state, { src: 'lib', 'src/a.ts': 'lib/a.ts' })
    expect(moved).toMatchObject({
      activeFile: 'lib/a.ts',
      temporaryFile: 'lib/a.ts',
      collapsed: ['lib'],
    })
    expect(closeWorkspaceFile(moved, 'lib/a.ts').activeFile).toBe('')
    expect(reconcileWorkspace(moved, {}).openFiles).toEqual([])
  })
  it('rejects malformed preferences and removes stale paths', () => {
    const tree: ProjectTree = { 'a.ts': { kind: 'file', content: '' } }
    expect(parseWorkspace({ ...emptyWorkspace(), sizes: [NaN, 40, 40] }, tree)).toBeNull()
    expect(
      parseWorkspace(openWorkspaceFile(emptyWorkspace(), 'deleted.ts'), tree)?.activeFile,
    ).toBe('')
  })
  it('searches closed files literally, returns positions and bounds results', () => {
    const tree: ProjectTree = {
      'main.ts': { kind: 'file', content: 'const speed = 3\nconsole.log(speed)\n// speed' },
      'node_modules/a.ts': { kind: 'file', content: 'speed' },
      'closed.ts': { kind: 'file', content: 'const pattern = "[a-z]"' },
    }
    expect(searchProFiles(tree, '[a-z]', 'content').items[0]).toMatchObject({
      path: 'closed.ts',
      line: 1,
      column: 18,
    })
    expect(searchProFiles(tree, 'SPEED', 'content', 2)).toMatchObject({
      truncated: true,
      items: [{ line: 1 }, { line: 2 }],
    })
    expect(searchProFiles(tree, 'closed', 'files').items[0]?.path).toBe('closed.ts')
  })
  it('preserves source columns through Unicode case folding and all supported line endings', () => {
    const tree: ProjectTree = {
      'main.ts': { kind: 'file', content: '// İ points\rconst points = 1\r\n// POINTS\n// points' },
    }
    expect(
      searchProFiles(tree, 'points', 'content').items.map(({ line, column }) => ({ line, column })),
    ).toEqual([
      { line: 1, column: 6 },
      { line: 2, column: 7 },
      { line: 3, column: 4 },
      { line: 4, column: 4 },
    ])
    const source = 'const x = 0\r\n// exemplo\rexport const y = x'
    expect(proSourcePosition(source, source.indexOf('y ='))).toEqual({ line: 3, column: 14 })
  })
  it('keeps line-local matches, exact truncation and long-line excerpts', () => {
    const content = `${'a'.repeat(300)}needle\r\nneedle\rneedle\n`
    const tree: ProjectTree = { 'main.ts': { kind: 'file', content } }
    const result = searchProFiles(tree, 'needle', 'content', 3)
    expect(result.truncated).toBe(false)
    expect(result.items.map(({ line, column }) => [line, column])).toEqual([
      [1, 301],
      [2, 1],
      [3, 1],
    ])
    expect(result.items[0]?.text.startsWith('…')).toBe(true)
    expect(searchProFiles(tree, 'needle', 'content', 2).truncated).toBe(true)
    expect(searchProFiles(tree, 'needle\r\nneedle', 'content').items).toEqual([])
    expect(searchProFiles(tree, 'missing', 'content')).toEqual({ items: [], truncated: false })
  })
})
