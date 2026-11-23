import { describe, expect, it } from 'bun:test'
import { join } from 'node:path'

describe('contrato de tema do Studio', () => {
  it('não usa a variante dark do host em código de produção', async () => {
    const sourceRoot = join(import.meta.dir, '..')
    const glob = new Bun.Glob('**/*.{ts,tsx}')
    const offenders: string[] = []
    const paths = [...glob.scanSync({ cwd: sourceRoot })]
      .filter((path) => !/\.(?:test|spec)\.[^.]+$/.test(path))
      .sort()
    // O acervo cresceu: uma espera de I/O por arquivo esgotava os 5 s da prova no Windows.
    // Lotes limitados conferem os mesmos arquivos sem abrir todos de uma vez.
    for (let start = 0; start < paths.length; start += 32) {
      const matches = await Promise.all(
        paths.slice(start, start + 32).map(async (relativePath) => {
          const source = await Bun.file(join(sourceRoot, relativePath)).text()
          return /\bdark:[a-z]/.test(source) ? relativePath : null
        }),
      )
      offenders.push(...matches.filter((path): path is string => path !== null))
    }

    expect(offenders).toEqual([])
  })
})
