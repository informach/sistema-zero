import { describe, expect, test } from 'bun:test'
import { watermarkIdentity } from '../src/lib/watermark-identity'

describe('identidade estampada na marca d’água', () => {
  test('aluno do Kids: perfil, nunca o e-mail do responsável; cache separado da cópia antiga', () => {
    const id = '22222222-2222-4222-8222-222222222222'
    const student = {
      id,
      email: '',
      kids: { kind: 'student', sessionId: 's', deviceId: 'd', grantId: 'g' } as const,
    }
    expect(watermarkIdentity(student)).toEqual({
      label: 'Perfil 22222222',
      cacheUser: `${id}-perfil`,
    })
    // Mesmo que um token antigo ainda traga o e-mail, o aluno não o estampa.
    expect(watermarkIdentity({ ...student, email: 'pai@example.com' }).label).toBe(
      'Perfil 22222222',
    )
  })
  test('adulto continua com o e-mail e a mesma chave de cache', () => {
    expect(watermarkIdentity({ id: 'conta-1', email: 'pai@example.com' })).toEqual({
      label: 'pai@example.com',
      cacheUser: 'conta-1',
    })
  })
})
