import { describe, expect, it } from 'bun:test'
import { unzipSync } from 'fflate'
import { zipFiles } from '../zip'

describe('zipFiles', () => {
  it('gera um ZIP valido (assinatura PK) com pastas aninhadas', async () => {
    const bytes = await zipFiles({ 'public/index.html': '<h1>oi</h1>', Dockerfile: 'FROM node' })
    expect(bytes[0]).toBe(0x50) // P
    expect(bytes[1]).toBe(0x4b) // K
    const unzipped = unzipSync(bytes)
    expect(Object.keys(unzipped)).toContain('public/index.html')
    expect(Object.keys(unzipped)).toContain('Dockerfile')
    expect(new TextDecoder().decode(unzipped['public/index.html'])).toBe('<h1>oi</h1>')
  })
  it('preserves large source and binary inputs after asynchronous compression', async () => {
    const binary = Uint8Array.from({ length: 200_000 }, (_, index) => index % 251)
    const text = 'const ponto = "ação🙂"\r\n'.repeat(12_000)
    const result = unzipSync(await zipFiles({ 'src/main.ts': text, 'public/data.bin': binary }))
    expect(new TextDecoder().decode(result['src/main.ts'])).toBe(text)
    expect(result['public/data.bin']).toEqual(binary)
    expect(binary.byteLength).toBe(200_000)
  })
  it('rejects an already cancelled export without consuming inputs', async () => {
    const controller = new AbortController()
    controller.abort(new Error('cancelled'))
    await expect(
      zipFiles({ 'a.txt': 'a'.repeat(80_000) }, { signal: controller.signal }),
    ).rejects.toThrow('cancelled')
  })
})
