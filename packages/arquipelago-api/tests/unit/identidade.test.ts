import { describe, expect, test } from 'bun:test'
import { ForbiddenError, UnauthorizedError } from '@sistemazero/core/http'
import { exigirGateway, lerJogador, lerResponsavel } from '../../src/interfaces/http/identidade'

const PERFIL = '11111111-1111-4111-8111-111111111111'
const CONTA = '22222222-2222-4222-8222-222222222222'
const ativo = { 'x-auth-user-role': 'member', 'x-auth-user-status': 'active' }

describe('quem está chamando', () => {
  test('perfil do Kids joga no perfil, com a conta da família', () => {
    expect(
      lerJogador({
        ...ativo,
        'x-auth-user-id': PERFIL,
        'x-auth-account-id': CONTA,
        'x-auth-kids-context': 'student',
      }),
    ).toEqual({ id: PERFIL, publico: 'kids', contaId: CONTA, equipe: false, somenteLeitura: false })
  })

  test('sem perfil e sem contexto do Kids é adulto; equipe é reconhecida', () => {
    expect(lerJogador({ ...ativo, 'x-auth-user-id': CONTA, 'x-auth-user-role': 'admin' })).toEqual({
      id: CONTA,
      publico: 'adulto',
      contaId: null,
      equipe: true,
      somenteLeitura: false,
    })
  })

  test('responsável não joga; só ele mexe no limite', () => {
    const pai = { ...ativo, 'x-auth-user-id': CONTA, 'x-auth-kids-context': 'parent' }
    expect(() => lerJogador(pai)).toThrow(ForbiddenError)
    expect(lerResponsavel(pai)).toEqual({ contaId: CONTA, equipe: false, somenteLeitura: false })
    expect(lerResponsavel({ ...pai, 'x-auth-user-role': 'staff' }).equipe).toBe(true)
    expect(() =>
      lerResponsavel({ ...ativo, 'x-auth-user-id': PERFIL, 'x-auth-account-id': CONTA }),
    ).toThrow(ForbiddenError)
  })

  test('headers faltando, conta inativa e sessão inconsistente', () => {
    expect(() => lerJogador({})).toThrow(UnauthorizedError)
    expect(() => lerJogador({ ...ativo, 'x-auth-user-id': 'lixo' })).toThrow(UnauthorizedError)
    expect(() =>
      lerJogador({ ...ativo, 'x-auth-user-id': PERFIL, 'x-auth-user-status': 'blocked' }),
    ).toThrow(ForbiddenError)
    expect(() =>
      lerJogador({
        ...ativo,
        'x-auth-user-id': PERFIL,
        'x-auth-account-id': CONTA,
        'x-auth-kids-context': 'parent',
      }),
    ).toThrow(ForbiddenError)
  })

  test('suporte só lê, mesmo com um modo de escrita vindo do navegador', () => {
    const base = { ...ativo, 'x-auth-user-id': CONTA, 'x-auth-impersonator-id': PERFIL }
    expect(lerJogador(base).somenteLeitura).toBe(true)
    expect(lerJogador({ ...base, 'x-auth-impersonation-mode': 'write' }).somenteLeitura).toBe(true)
    expect(lerJogador({ ...ativo, 'x-auth-user-id': CONTA }).somenteLeitura).toBe(false)
  })

  test('token interno', () => {
    expect(() => exigirGateway(undefined, undefined)).not.toThrow()
    expect(() => exigirGateway(undefined, 'segredo-de-16-chars')).toThrow(UnauthorizedError)
    expect(() => exigirGateway('outro-valor-16-ch', 'segredo-de-16-chars')).toThrow(
      UnauthorizedError,
    )
    expect(() => exigirGateway('segredo-de-16-chars', 'segredo-de-16-chars')).not.toThrow()
  })
})
