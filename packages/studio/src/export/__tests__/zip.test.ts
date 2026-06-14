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
})
