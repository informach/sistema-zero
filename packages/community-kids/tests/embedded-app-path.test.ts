import { describe, expect, test } from 'bun:test'
import { EMBEDDED_APP_PREFIXES, isEmbeddedAppPath } from '../src/lib/embedded-app-path'

describe('isEmbeddedAppPath', () => {
  test('aceita as rotas dos apps que ocupam a área útil inteira', () => {
    expect(isEmbeddedAppPath('/estudio')).toBe(true)
    expect(isEmbeddedAppPath('/pensa')).toBe(true)
    expect(isEmbeddedAppPath('/pinta')).toBe(true)
    expect(isEmbeddedAppPath('/molda')).toBe(true)
    // O configurador de avatar entrou em 19/09/2026, ao sair da tela cheia solta.
    expect(isEmbeddedAppPath('/meu-avatar')).toBe(true)
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
    // ⚠️ O Quarto é tela de FOCO, mas não entra aqui: este regime trava a altura na janela e
    // cortaria as bandejas de móveis, que rolam. Ver `tests/focus-route.test.ts`.
    expect(isEmbeddedAppPath('/quarto')).toBe(false)
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
    expect([...EMBEDDED_APP_PREFIXES]).toEqual([
      '/estudio',
      '/pensa',
      '/pinta',
      '/molda',
      '/meu-avatar',
    ])
  })
})
