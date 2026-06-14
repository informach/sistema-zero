import { describe, expect, it } from 'bun:test'
import { computeFsDiff } from './fsDiff'

describe('computeFsDiff', () => {
  it('detecta arquivos novos com mkdir dos pais', () => {
    const diff = computeFsDiff({}, { 'src/main.ts': 'a', 'package.json': '{}' })
    expect(diff.writes).toContainEqual({ path: 'src/main.ts', content: 'a' })
    expect(diff.writes).toContainEqual({ path: 'package.json', content: '{}' })
    expect(diff.mkdirs).toContain('src')
    expect(diff.removes).toEqual([])
  })

  it('reescreve só conteúdo alterado, sem mkdir', () => {
    const diff = computeFsDiff({ 'src/main.ts': 'a' }, { 'src/main.ts': 'b' })
    expect(diff.writes).toEqual([{ path: 'src/main.ts', content: 'b' }])
    expect(diff.mkdirs).toEqual([])
  })

  it('ignora arquivos idênticos', () => {
    const diff = computeFsDiff({ 'a.ts': 'x' }, { 'a.ts': 'x' })
    expect(diff.writes).toEqual([])
    expect(diff.removes).toEqual([])
  })

  it('remove arquivos que sumiram', () => {
    const diff = computeFsDiff({ 'a.ts': 'x', 'b.ts': 'y' }, { 'a.ts': 'x' })
    expect(diff.removes).toEqual(['b.ts'])
    expect(diff.writes).toEqual([])
  })
})
