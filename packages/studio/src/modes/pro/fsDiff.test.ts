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

// A3: transição arquivo↔diretório no MESMO caminho. O diff é plano (path →
// conteúdo só de arquivos), então sozinho ele não sabe que `src/data` mudou de
// arquivo para pasta (ou vice-versa). Sem o sinal `removeFirst` o sync faz
// mkdir/write ANTES do remove e o mkdir colide com o arquivo homônimo (falha
// engolida), travando o sync para sempre. `removeFirst` instrui o sync a apagar
// o nó antigo primeiro.
describe('computeFsDiff — transição arquivo↔diretório (removeFirst)', () => {
  it('por padrão (sem transição) removeFirst é false', () => {
    const diff = computeFsDiff({ 'a.ts': 'x' }, { 'a.ts': 'y', 'b.ts': 'z' })
    expect(diff.removeFirst).toBe(false)
  })

  it('arquivo→diretório no mesmo caminho: caminho em conflito vai p/ removeFirstPaths', () => {
    // `src/data` era ARQUIVO; agora `src/data` é PASTA com `x.ts` dentro.
    const diff = computeFsDiff({ 'src/data': 'conteudo antigo' }, { 'src/data/x.ts': 'novo' })
    expect(diff.removeFirst).toBe(true)
    // o arquivo antigo `src/data` é removido ANTES do mkdir/write (removeFirstPaths)
    expect(diff.removeFirstPaths).toContain('src/data')
    // e NÃO duplicado em removes (seria redundante/fora de ordem)
    expect(diff.removes).not.toContain('src/data')
    expect(diff.writes).toEqual([{ path: 'src/data/x.ts', content: 'novo' }])
    expect(diff.mkdirs).toContain('src/data')
  })

  it('diretório→arquivo no mesmo caminho: a pasta antiga vai p/ removeFirstPaths (não rmdirs)', () => {
    // `src/data` era PASTA (com `x.ts`); agora `src/data` é um ARQUIVO.
    const diff = computeFsDiff({ 'src/data/x.ts': 'antigo' }, { 'src/data': 'agora arquivo' })
    expect(diff.removeFirst).toBe(true)
    // a pasta `src/data` é apagada RECURSIVAMENTE antes do write do arquivo novo
    expect(diff.removeFirstPaths).toContain('src/data')
    // NÃO pode estar em rmdirs: rmdirs roda DEPOIS do write e apagaria o arquivo
    expect(diff.rmdirs).not.toContain('src/data')
    expect(diff.writes).toEqual([{ path: 'src/data', content: 'agora arquivo' }])
  })

  it('renomeio sem colisão de caminho NÃO marca removeFirst', () => {
    const diff = computeFsDiff({ 'src/a.ts': 'x' }, { 'src/b.ts': 'x' })
    expect(diff.removeFirst).toBe(false)
    expect(diff.removeFirstPaths).toEqual([])
  })
})
