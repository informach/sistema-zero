import { describe, expect, it } from 'bun:test'
import { loadEnv, portalNotifyConfig, portalUrls } from '../../src/infrastructure/config/env'

const REQUIRED = {
  DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/helpdesk',
  INTERNAL_API_TOKEN: 'internal-token-with-16-chars',
}

describe('configuração do Helpdesk', () => {
  it('falha no boot de produção sem o transporte e as URLs do aviso persistente', () => {
    expect(() => loadEnv({ ...REQUIRED, NODE_ENV: 'production' })).toThrow('GATEWAY_URL')
    expect(() => loadEnv({ ...REQUIRED, NODE_ENV: 'production' })).toThrow('COMMUNITY_URL')
  })

  it('usa limites seguros para contexto da KB', () => {
    const env = loadEnv(REQUIRED)
    expect(env.AI_KB_MAX_CANDIDATES).toBe(100)
    expect(env.AI_MAX_KB_CHARS).toBe(12_000)
  })

  it('permite transporte local com URLs padrão dos portais', () => {
    const env = loadEnv({
      ...REQUIRED,
      GATEWAY_URL: 'http://localhost:3000',
      HELPDESK_HMAC_SECRET: 'hmac-secret-with-16-chars',
    })
    expect(portalNotifyConfig(env)).not.toBeNull()
    expect(portalUrls(env)).toEqual({
      adult: 'http://localhost:3010',
      kids: 'http://localhost:3011',
    })
  })

  it('recusa lease menor que o timeout e backoff inicial maior que o teto', () => {
    expect(() =>
      loadEnv({
        ...REQUIRED,
        S2S_TIMEOUT_MS: '10000',
        PORTAL_NOTIFICATION_LEASE_MS: '10000',
      }),
    ).toThrow('PORTAL_NOTIFICATION_LEASE_MS')
    expect(() =>
      loadEnv({
        ...REQUIRED,
        PORTAL_NOTIFICATION_RETRY_BASE_MS: '60000',
        PORTAL_NOTIFICATION_RETRY_MAX_MS: '30000',
      }),
    ).toThrow('PORTAL_NOTIFICATION_RETRY_BASE_MS')
  })
})
