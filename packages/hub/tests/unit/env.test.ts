import { describe, expect, test } from 'bun:test'
import { loadEnv, showcaseWallChannelSlug } from '../../src/infrastructure/config/env'

const validEnv = {
  DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
  GATEWAY_HMAC_SECRET: 'gateway-hmac-secret-0001',
  INTERNAL_API_TOKEN: 'hub-internal-token-0001',
}

describe('env', () => {
  test('INTERNAL_API_TOKEN é obrigatório também fora de produção', () => {
    const withoutToken = {
      DATABASE_URL: validEnv.DATABASE_URL,
      GATEWAY_HMAC_SECRET: validEnv.GATEWAY_HMAC_SECRET,
    }
    expect(() => loadEnv(withoutToken)).toThrow(/INTERNAL_API_TOKEN/)
  })

  test('SHOWCASE_WALL_CHANNEL_SLUG defaulta para parede', () => {
    const env = loadEnv(validEnv)
    expect(showcaseWallChannelSlug(env)).toBe('parede')
  })
})
