import { describe, expect, it } from 'bun:test'
import { resolveAvatarReturnPath } from '../src/lib/avatar-return'

describe('retorno seguro do configurador de avatar', () => {
  it('preserva a home quando o onboarding iniciou o fluxo', () => {
    expect(resolveAvatarReturnPath('/')).toBe('/')
  })

  it('recusa destinos externos e usa o perfil como padrão', () => {
    expect(resolveAvatarReturnPath(undefined)).toBe('/perfil')
    expect(resolveAvatarReturnPath('https://example.com')).toBe('/perfil')
    expect(resolveAvatarReturnPath('//example.com')).toBe('/perfil')
  })
})
