import { describe, expect, test } from 'bun:test'
import { EncryptedRankingCursorCodec } from '../../src/infrastructure/security/ranking-cursor.codec'

const SECRET = 'ranking-cursor-test-secret-0123456789'

describe('cursor cifrado do ranking', () => {
  test('faz round-trip sem deixar os ids internos legíveis', () => {
    const codec = new EncryptedRankingCursorCodec(SECRET)
    const payload = {
      audience: 'kids' as const,
      viewerUserId: '11111111-1111-1111-1111-111111111111',
      snapshot: '31337:31342:31338,31340',
      xp: 80,
      userId: '22222222-2222-2222-2222-222222222222',
    }

    const token = codec.encode(payload)
    const encryptedBytes = Buffer.from(token, 'base64url').toString('utf8')

    expect(encryptedBytes).not.toContain(payload.viewerUserId)
    expect(encryptedBytes).not.toContain(payload.userId)
    expect(token.length).toBeLessThanOrEqual(512)
    expect(codec.decode(token)).toEqual(payload)
  })

  test('recusa adulteração e segredo diferente', () => {
    const codec = new EncryptedRankingCursorCodec(SECRET)
    const token = codec.encode({
      audience: 'adult',
      viewerUserId: 'viewer',
      snapshot: '31337:31337:',
      xp: 10,
      userId: 'last',
    })
    const at = Math.floor(token.length / 2)
    const tampered = `${token.slice(0, at)}${token[at] === 'a' ? 'b' : 'a'}${token.slice(at + 1)}`

    expect(codec.decode(tampered)).toBeNull()
    expect(new EncryptedRankingCursorCodec('outro-segredo-seguro-012345').decode(token)).toBeNull()
  })
})
