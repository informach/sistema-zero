import { describe, expect, it } from 'bun:test'
import { changedTreePaths, sameTree } from './treeChanges'

const file = (content: string) => ({ kind: 'file' as const, content })

describe('o que mudou entre a versão guardada e o projeto de agora', () => {
  it('um arquivo novo vazio conta como mudança (antes parecia igual ao ausente)', () => {
    const then = { 'src/main.js': file('a') }
    const now = { 'src/main.js': file('a'), 'notas.js': file('') }
    expect(changedTreePaths(then, now)).toEqual(['notas.js'])
    expect(sameTree(then, now)).toBe(false)
  })

  it('texto diferente conta, e árvores iguais não têm mudança', () => {
    const then = { 'b.js': file('1'), 'a.js': file('x'), src: { kind: 'dir' as const } }
    const now = { 'a.js': file('y'), 'b.js': file('1'), src: { kind: 'dir' as const } }
    expect(changedTreePaths(then, now)).toEqual(['a.js'])
    expect(changedTreePaths(then, then)).toEqual([])
    expect(sameTree(then, { ...then })).toBe(true)
  })

  it('uma pasta a mais não aparece na comparação de arquivos, mas a árvore não é igual', () => {
    const then = { 'a.js': file('x') }
    const now = { 'a.js': file('x'), vazia: { kind: 'dir' as const } }
    expect(changedTreePaths(then, now)).toEqual([])
    expect(sameTree(then, now)).toBe(false)
  })
})
