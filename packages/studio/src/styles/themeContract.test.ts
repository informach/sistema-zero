import { describe, expect, it } from 'bun:test'
import { join } from 'node:path'

describe('contrato de tema do Studio', () => {
  it('não usa a variante dark do host em código de produção', async () => {
    const sourceRoot = join(import.meta.dir, '..')
    const glob = new Bun.Glob('**/*.{ts,tsx}')
    const offenders: string[] = []

    for await (const relativePath of glob.scan({ cwd: sourceRoot })) {
      if (/\.(?:test|spec)\.[^.]+$/.test(relativePath)) continue
      const source = await Bun.file(join(sourceRoot, relativePath)).text()
      if (/\bdark:[a-z]/.test(source)) offenders.push(relativePath)
    }

    expect(offenders).toEqual([])
  })
})
