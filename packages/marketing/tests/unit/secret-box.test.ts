import { describe, expect, it } from 'bun:test'
import { randomBytes } from 'node:crypto'
import { createSecretBox, SecretBoxError } from '../../src/infrastructure/security/secret-box'

const KEY = randomBytes(32).toString('base64')

describe('secret-box (AES-256-GCM)', () => {
  it('roundtrip: seal → open devolve o texto original', () => {
    const box = createSecretBox(KEY)
    const sealed = box.seal('ya29.token-super-secreto')
    expect(box.open(sealed)).toBe('ya29.token-super-secreto')
  })

  it('formato versionado v1.<iv>.<tag>.<ct>', () => {
    const box = createSecretBox(KEY)
    const sealed = box.seal('abc')
    const parts = sealed.split('.')
    expect(parts).toHaveLength(4)
    expect(parts[0]).toBe('v1')
  })

  it('IV é único entre seals do mesmo texto (nunca reusa nonce)', () => {
    const box = createSecretBox(KEY)
    const a = box.seal('mesmo-texto')
    const b = box.seal('mesmo-texto')
    expect(a).not.toBe(b)
    expect(a.split('.')[1]).not.toBe(b.split('.')[1])
  })

  it('tag adulterada → SecretBoxError', () => {
    const box = createSecretBox(KEY)
    const [v, iv, _tag, ct] = box.seal('abc').split('.')
    const forged = [v, iv, Buffer.alloc(16, 7).toString('base64url'), ct].join('.')
    expect(() => box.open(forged)).toThrow(SecretBoxError)
  })

  it('ciphertext adulterado → SecretBoxError', () => {
    const box = createSecretBox(KEY)
    const [v, iv, tag] = box.seal('abc').split('.')
    const forged = [v, iv, tag, Buffer.from('forjado').toString('base64url')].join('.')
    expect(() => box.open(forged)).toThrow(SecretBoxError)
  })

  it('chave errada → SecretBoxError', () => {
    const sealed = createSecretBox(KEY).seal('abc')
    const other = createSecretBox(randomBytes(32).toString('base64'))
    expect(() => other.open(sealed)).toThrow(SecretBoxError)
  })

  it('versão desconhecida → SecretBoxError', () => {
    const box = createSecretBox(KEY)
    const sealed = box.seal('abc').replace(/^v1\./, 'v9.')
    expect(() => box.open(sealed)).toThrow(SecretBoxError)
  })

  it('formato inválido (sem 4 partes) → SecretBoxError', () => {
    const box = createSecretBox(KEY)
    expect(() => box.open('lixo-qualquer')).toThrow(SecretBoxError)
  })

  it('chave com tamanho errado falha na criação', () => {
    expect(() => createSecretBox(Buffer.alloc(16).toString('base64'))).toThrow(SecretBoxError)
  })
})
