import { describe, expect, test } from 'bun:test'
import { loadEnv } from '../../src/infrastructure/config/env'

const TOK = 'x'.repeat(20)

/**
 * Base de produção VÁLIDA com TODA chave relevante a refine setada explicitamente
 * (overrides vencem o process.env/.env auto-carregado pelo bun test). Cada teste
 * tweaka 1 campo p/ provar o refine.
 */
function prodEnv(
  overrides: Record<string, string | undefined> = {},
): Record<string, string | undefined> {
  return {
    NODE_ENV: 'production',
    APP_ENV: 'production',
    NFSE_AMBIENTE: 'producao',
    NFSE_CERT_PFX_BASE64: 'ZmFrZQ==',
    NFSE_CERT_PFX_PATH: undefined,
    NFSE_IM: '13372670018',
    NFSE_DPS_SERIE: '2',
    INTERNAL_API_TOKEN: TOK,
    METRICS_TOKEN: TOK,
    PAYMENTS_INTERNAL_TOKEN: TOK,
    PAYMENTS_WEBHOOK_HMAC_SECRET: TOK,
    GATEWAY_URL: 'http://api-gateway.railway.internal:3000',
    FISCAL_HMAC_SECRET: TOK,
    PAYMENTS_BASE_URL: 'http://payments.railway.internal:3001',
    CATALOG_BASE_URL: 'http://catalog.railway.internal:3003',
    FISCAL_SELF_URL: 'http://fiscal.railway.internal:3009',
    DATABASE_URL: 'postgres://u:p@db.internal:5432/sistemazero',
    ...overrides,
  }
}

function stagingEnv(
  overrides: Record<string, string | undefined> = {},
): Record<string, string | undefined> {
  return prodEnv({
    APP_ENV: 'staging',
    NFSE_AMBIENTE: 'producao-restrita',
    NFSE_DPS_SERIE: '902',
    ...overrides,
  })
}

const fails = (env: Record<string, string | undefined>) => expect(() => loadEnv(env)).toThrow()
const ok = (env: Record<string, string | undefined>) => expect(() => loadEnv(env)).not.toThrow()

describe('env — regime de ambientes (CORAÇÃO do serviço)', () => {
  test('produção válida passa; staging válido passa', () => {
    ok(prodEnv())
    ok(stagingEnv())
  })

  test('APP_ENV=production EXIGE NFSE_AMBIENTE=producao', () => {
    fails(prodEnv({ NFSE_AMBIENTE: 'producao-restrita' }))
  })

  test('APP_ENV=staging EXIGE producao-restrita (staging NÃO emite nota real)', () => {
    fails(stagingEnv({ NFSE_AMBIENTE: 'producao' }))
  })

  test('NFSE_AMBIENTE=producao é RECUSADO fora de NODE_ENV=production (nota real em dev!)', () => {
    fails({
      NODE_ENV: 'development',
      NFSE_AMBIENTE: 'producao',
      DATABASE_URL: 'postgres://u:p@localhost:5433/x',
    })
  })

  test('production sem APP_ENV falha', () => {
    fails(prodEnv({ APP_ENV: undefined }))
  })

  test('produção exige REQUIRE_ADMIN=true', () => {
    fails(prodEnv({ REQUIRE_ADMIN: 'false' }))
  })
})

describe('env — segredos e integrações obrigatórias em produção', () => {
  test.each([
    'INTERNAL_API_TOKEN',
    'METRICS_TOKEN',
    'PAYMENTS_INTERNAL_TOKEN',
    'PAYMENTS_WEBHOOK_HMAC_SECRET',
    'NFSE_CERT_PFX_BASE64',
    'NFSE_IM',
    'GATEWAY_URL',
    'FISCAL_HMAC_SECRET',
  ])('produção sem %s falha', (key) => {
    fails(prodEnv({ [key]: undefined }))
  })

  test('cert: nem base64 nem path em produção falha', () => {
    fails(prodEnv({ NFSE_CERT_PFX_BASE64: undefined, NFSE_CERT_PFX_PATH: undefined }))
  })
})

describe('env — URLs entre serviços não podem ser loopback em deploy', () => {
  test.each(['PAYMENTS_BASE_URL', 'CATALOG_BASE_URL'])('%s localhost em produção falha', (key) => {
    fails(prodEnv({ [key]: 'http://localhost:3001' }))
  })

  test('FISCAL_SELF_URL localhost em produção falha', () => {
    fails(prodEnv({ FISCAL_SELF_URL: 'http://localhost:3009' }))
  })

  test('PAYMENTS_BASE_URL/CATALOG_BASE_URL localhost em STAGING também falha', () => {
    fails(stagingEnv({ PAYMENTS_BASE_URL: 'http://127.0.0.1:3001' }))
    fails(stagingEnv({ CATALOG_BASE_URL: 'http://localhost:3003' }))
  })
})

describe('env — série × ambiente (Produção Restrita é numeração compartilhada)', () => {
  test('staging NÃO pode usar a série 2 de produção', () => {
    fails(stagingEnv({ NFSE_DPS_SERIE: '2' }))
  })

  test('produção NÃO pode usar séries de dev/staging (901/902)', () => {
    fails(prodEnv({ NFSE_DPS_SERIE: '901' }))
    fails(prodEnv({ NFSE_DPS_SERIE: '902' }))
  })

  test('default da série é 901 (dev-safe), não a 2 de produção', () => {
    const env = loadEnv({
      NODE_ENV: 'development',
      NFSE_AMBIENTE: 'producao-restrita',
      DATABASE_URL: 'postgres://u:p@localhost:5433/x',
      NFSE_DPS_SERIE: undefined,
    })
    expect(env.NFSE_DPS_SERIE).toBe('901')
  })
})

describe('env — lease do claim', () => {
  test('NFSE_CLAIM_STALE_MS < 2× NFSE_REQUEST_TIMEOUT_MS falha', () => {
    fails(prodEnv({ NFSE_CLAIM_STALE_MS: '10000', NFSE_REQUEST_TIMEOUT_MS: '20000' }))
  })
})
