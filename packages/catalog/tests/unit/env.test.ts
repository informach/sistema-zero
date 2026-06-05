import { describe, expect, it } from 'bun:test'
import { loadEnv } from '../../src/infrastructure/config/env'

const BASE = { DATABASE_URL: 'postgres://localhost:5433/test' }

describe('loadEnv (fail-fast de produção)', () => {
  it('dev/test: INTERNAL_API_TOKEN opcional e REQUIRE_ADMIN desligável', () => {
    const env = loadEnv({ ...BASE, NODE_ENV: 'test', REQUIRE_ADMIN: 'false' })
    expect(env.INTERNAL_API_TOKEN).toBeUndefined()
    expect(env.REQUIRE_ADMIN).toBe(false)
    expect(env.HOST).toBe('::')
  })

  it('produção SEM INTERNAL_API_TOKEN → boot falha', () => {
    expect(() => loadEnv({ ...BASE, NODE_ENV: 'production' })).toThrow(/INTERNAL_API_TOKEN/)
  })

  it('produção com REQUIRE_ADMIN=false → boot falha (fail-closed)', () => {
    expect(() =>
      loadEnv({
        ...BASE,
        NODE_ENV: 'production',
        INTERNAL_API_TOKEN: 'token-de-producao-bem-longo',
        REQUIRE_ADMIN: 'false',
      }),
    ).toThrow(/REQUIRE_ADMIN/)
  })

  it('produção com token (≥16) e REQUIRE_ADMIN default → ok', () => {
    const env = loadEnv({
      ...BASE,
      NODE_ENV: 'production',
      INTERNAL_API_TOKEN: 'token-de-producao-bem-longo',
    })
    expect(env.REQUIRE_ADMIN).toBe(true)
    expect(env.INTERNAL_API_TOKEN).toBe('token-de-producao-bem-longo')
  })

  it('token curto (<16) → boot falha', () => {
    expect(() => loadEnv({ ...BASE, NODE_ENV: 'test', INTERNAL_API_TOKEN: 'curto' })).toThrow(
      /16 caracteres/,
    )
  })
})
