import { describe, expect, test } from 'bun:test'
import { EMBEDDED_APP_PREFIXES, isEmbeddedAppPath } from '../src/lib/embedded-app-path'

describe('isEmbeddedAppPath', () => {
  test('aceita as três rotas dos apps de criação', () => {
    expect(isEmbeddedAppPath('/estudio')).toBe(true)
    expect(isEmbeddedAppPath('/pensa')).toBe(true)
    expect(isEmbeddedAppPath('/pinta')).toBe(true)
  })

  test('aceita sub-rotas (o Estúdio Pro entra de graça)', () => {
    expect(isEmbeddedAppPath('/estudio/pro/abc123')).toBe(true)
    expect(isEmbeddedAppPath('/pinta/qualquer')).toBe(true)
  })

  test('recusa rota que só COMEÇA com o mesmo texto', () => {
    // Um `startsWith` cru diria `true` aqui — o segmento tem que ser inteiro.
    expect(isEmbeddedAppPath('/estudiozinho')).toBe(false)
    expect(isEmbeddedAppPath('/pintassilgo')).toBe(false)
  })

  test('recusa as demais rotas do app', () => {
    expect(isEmbeddedAppPath('/cursos')).toBe(false)
    expect(isEmbeddedAppPath('/cursos/meu-curso/aulas/abc123')).toBe(false)
    expect(isEmbeddedAppPath('/perfil')).toBe(false)
    expect(isEmbeddedAppPath('/')).toBe(false)
  })

  test('tolera null/undefined/vazio', () => {
    expect(isEmbeddedAppPath(null)).toBe(false)
    expect(isEmbeddedAppPath(undefined)).toBe(false)
    expect(isEmbeddedAppPath('')).toBe(false)
  })

  test('a lista de prefixos é a fonte única do MainContainer e do modo foco', () => {
    expect([...EMBEDDED_APP_PREFIXES]).toEqual(['/estudio', '/pensa', '/pinta', '/molda'])
  })
})
