import { expect, test } from 'bun:test'
import { installablePintaScenesSources } from './pintaScenesModuleBrowser'

test('the staging file is removed after a successful hash and after a rejected write or hash', () => {
  for (const failure of [null, 'partial-write', 'bad-hash', 'hash-error']) {
    const temporary = new Map<string, Uint8Array>()
    const installed = new Map([['pinta.py', new Uint8Array([19])]])
    const bytes = new Uint8Array([20])
    const sha256 = new Bun.CryptoHasher('sha256').update(bytes).digest('hex')
    let checks = 0
    const runtime = {
      FS: {
        mkdirTree() {},
        writeFile(path: string, value: Uint8Array) {
          temporary.set(path, value)
          if (failure === 'partial-write') throw new Error('falha de escrita')
        },
        analyzePath(path: string) {
          return { exists: temporary.has(path) }
        },
        unlink(path: string) {
          temporary.delete(path)
        },
      },
      runPython(source: string) {
        checks++
        const [path, value] = temporary.entries().next().value ?? []
        if (!value || !path || !source.includes(JSON.stringify(path)))
          throw new Error('esperava a entrada temporária em vez do módulo em sys.path')
        if (failure === 'hash-error') throw new Error('falha de leitura')
        return failure === 'bad-hash'
          ? 'digest de outra fonte'
          : new Bun.CryptoHasher('sha256').update(value).digest('hex')
      },
    }
    const admit = () => installablePintaScenesSources(runtime, installed, { bytes, sha256 })
    if (failure) expect(admit).toThrow()
    else expect(admit().get('pinta.py')).toBe(bytes)
    expect(temporary.size).toBe(0)
    expect(checks).toBe(failure === 'partial-write' ? 0 : 1)
    expect(installed.get('pinta.py')).toEqual(new Uint8Array([19]))
  }
})
