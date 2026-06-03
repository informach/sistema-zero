import { describe, expect, test } from 'bun:test'
import { DomainError } from '../src/errors/index'
import { envelope, ForbiddenError, UnauthorizedError } from '../src/http/index'
import { createLogger } from '../src/logging/index'
import { signHmac } from '../src/security/index'

/**
 * Smoke da superfície pública do `@sistemazero/core` (lib de re-export consumida por
 * todos os serviços). Garante que os subpaths exportam o esperado e cobre o `test`
 * do pacote (que falharia com 0 arquivos).
 */
describe('@sistemazero/core — superfície pública', () => {
  test('exports-chave estão definidos', () => {
    expect(typeof signHmac).toBe('function')
    expect(typeof createLogger).toBe('function')
    expect(typeof DomainError).toBe('function')
    expect(typeof envelope).toBe('function')
    expect(typeof UnauthorizedError).toBe('function')
    expect(typeof ForbiddenError).toBe('function')
  })

  test('envelope monta o envelope de erro padronizado', () => {
    expect(envelope('SOME_CODE', 'mensagem')).toMatchObject({
      error: { code: 'SOME_CODE', message: 'mensagem' },
    })
  })

  test('signHmac é determinístico e devolve string', () => {
    const a = signHmac('segredo-de-teste-0123456789', 'corpo', 1_700_000_000)
    const b = signHmac('segredo-de-teste-0123456789', 'corpo', 1_700_000_000)
    expect(typeof a).toBe('string')
    expect(a).toBe(b)
  })
})
