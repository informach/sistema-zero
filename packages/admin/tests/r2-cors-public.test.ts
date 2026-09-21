import { describe, expect, it } from 'bun:test'
import type { CORSRule } from '@aws-sdk/client-s3'
import {
  KIDS_STAGING_ORIGIN,
  mergePublicReadRule,
  PUBLIC_READ_RULE,
  publicReadRuleMatches,
  validatePublicCorsProbe,
} from '../scripts/r2-cors-public-lib'

describe('CORS do bucket R2 público', () => {
  it('inclui na regra a mesma origem usada pela prova do staging', () => {
    expect(PUBLIC_READ_RULE.AllowedOrigins).toContain(KIDS_STAGING_ORIGIN)
  })

  it('preserva regras alheias e substitui todas as cópias da regra gerenciada', () => {
    const foreignRule: CORSRule = {
      ID: 'upload-legado',
      AllowedOrigins: ['https://example.com'],
      AllowedMethods: ['PUT'],
    }
    const staleRule: CORSRule = {
      ID: PUBLIC_READ_RULE.ID,
      AllowedOrigins: ['https://origem-antiga.example'],
      AllowedMethods: ['GET'],
    }

    expect(mergePublicReadRule([staleRule, foreignRule, staleRule])).toEqual([
      foreignRule,
      PUBLIC_READ_RULE,
    ])
  })

  it('compara a regra inteira sem depender da ordem devolvida pelo provedor', () => {
    const reordered: CORSRule = {
      ...PUBLIC_READ_RULE,
      AllowedOrigins: [...(PUBLIC_READ_RULE.AllowedOrigins ?? [])].reverse(),
      AllowedMethods: [...(PUBLIC_READ_RULE.AllowedMethods ?? [])].reverse(),
      AllowedHeaders: [...(PUBLIC_READ_RULE.AllowedHeaders ?? [])].reverse(),
      ExposeHeaders: [...(PUBLIC_READ_RULE.ExposeHeaders ?? [])].reverse(),
    }

    expect(publicReadRuleMatches(reordered)).toBe(true)
    expect(publicReadRuleMatches({ ...reordered, MaxAgeSeconds: 60 })).toBe(false)
    expect(publicReadRuleMatches(undefined)).toBe(false)
  })

  it('aceita somente a resposta pública que o navegador do Kids precisa', () => {
    const expected = {
      origin: 'https://community-kids-staging.up.railway.app',
      body: 'cors-probe-123',
    }

    expect(
      validatePublicCorsProbe(
        { status: 200, allowOrigin: expected.origin, body: expected.body },
        expected,
      ),
    ).toBeNull()
    expect(
      validatePublicCorsProbe({ status: 200, allowOrigin: null, body: expected.body }, expected),
    ).toContain('Access-Control-Allow-Origin ausente')
    expect(
      validatePublicCorsProbe(
        { status: 200, allowOrigin: 'https://outra.example', body: expected.body },
        expected,
      ),
    ).toContain('origem incorreta')
    expect(
      validatePublicCorsProbe(
        { status: 404, allowOrigin: expected.origin, body: expected.body },
        expected,
      ),
    ).toContain('HTTP 404')
    expect(
      validatePublicCorsProbe(
        { status: 200, allowOrigin: expected.origin, body: 'objeto errado' },
        expected,
      ),
    ).toContain('corpo inesperado')
  })
})
