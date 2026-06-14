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
    expect(diff.rmdirs).toEqual([])
  })

  it('poda a pasta quando seu ÚLTIMO arquivo é removido', () => {
    const diff = computeFsDiff({ 'src/old/dead.ts': 'x' }, {})
    expect(diff.removes).toEqual(['src/old/dead.ts'])
    // src/old e src ficaram sem nenhum arquivo descendente → removidos.
    expect(diff.rmdirs).toContain('src/old')
    expect(diff.rmdirs).toContain('src')
  })

  it('poda da pasta mais profunda para a mais rasa', () => {
    const diff = computeFsDiff({ 'a/b/c/file.ts': 'x' }, {})
    expect(diff.rmdirs).toEqual(['a/b/c', 'a/b', 'a'])
  })

  it('NÃO poda a pasta se ainda resta outro arquivo nela', () => {
    const diff = computeFsDiff({ 'src/keep.ts': 'k', 'src/dead.ts': 'd' }, { 'src/keep.ts': 'k' })
    expect(diff.removes).toEqual(['src/dead.ts'])
    expect(diff.rmdirs).toEqual([])
  })

  it('poda só a subpasta esvaziada, preservando a pasta-pai com outro arquivo', () => {
    const diff = computeFsDiff(
      { 'src/keep.ts': 'k', 'src/sub/dead.ts': 'd' },
      { 'src/keep.ts': 'k' },
    )
    expect(diff.removes).toEqual(['src/sub/dead.ts'])
    // src/sub esvaziou; src ainda tem keep.ts → só src/sub é podada.
    expect(diff.rmdirs).toEqual(['src/sub'])
  })

  it('não poda pasta que passou a ter arquivo novo (mover arquivo entre pastas)', () => {
    const diff = computeFsDiff({ 'old/a.ts': 'x' }, { 'new/a.ts': 'x' })
    expect(diff.rmdirs).toContain('old')
    expect(diff.rmdirs).not.toContain('new')
    expect(diff.mkdirs).toContain('new')
  })
})
