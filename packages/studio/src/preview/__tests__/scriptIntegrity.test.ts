import { describe, expect, it } from 'bun:test'
import { createHash } from 'node:crypto'
import { scriptIntegrity, sha256Base64 } from '../scriptIntegrity'

describe('scriptIntegrity', () => {
  it.each([
    '',
    'abc',
    'Olá, criança 🎮',
    'linha 1\nlinha 2\n',
  ])('%j coincide com SHA-256 nativo', (text) => {
    expect(sha256Base64(text)).toBe(createHash('sha256').update(text).digest('base64'))
  })

  it('formata a fonte SRI/CSP', () => {
    expect(scriptIntegrity('abc')).toBe('sha256-ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0=')
  })
})
