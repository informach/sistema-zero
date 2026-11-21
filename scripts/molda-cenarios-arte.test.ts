import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { descreverArteCenario, validarArteCenario } from './molda-cenarios-arte'

test('arte privada exige identificador por conteúdo e GLB sem dependências externas', () => {
  const glb = (uri?: string) => {
    let json = JSON.stringify({ asset: { version: '2.0' }, buffers: uri ? [{ uri }] : [] })
    json = json.padEnd(Math.ceil(json.length / 4) * 4, ' ')
    const b = Buffer.alloc(20 + json.length)
    b.writeUInt32LE(0x46546c67, 0)
    b.writeUInt32LE(2, 4)
    b.writeUInt32LE(b.length, 8)
    b.writeUInt32LE(json.length, 12)
    b.writeUInt32LE(0x4e4f534a, 16)
    b.write(json, 20)
    return b
  }
  const nome = (b: Uint8Array) => `${createHash('sha256').update(b).digest('hex')}.glb`
  const b = glb()
  expect(validarArteCenario(nome(b), b).key).toStartWith('molda-cenarios/arte/')
  expect(() => descreverArteCenario('../avatar.glb')).toThrow()
  expect(() => validarArteCenario(`${'0'.repeat(64)}.glb`, b)).toThrow('SHA-256')
  const externo = glb('https://example.com/segredo')
  expect(() => validarArteCenario(nome(externo), externo)).toThrow('incorporar')
})
