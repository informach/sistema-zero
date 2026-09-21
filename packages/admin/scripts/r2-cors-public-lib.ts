import type { CORSRule } from '@aws-sdk/client-s3'
import { STUDENT_APP_ORIGINS } from './student-app-origins'

export const PUBLIC_READ_RULE_ID = 'public-direct-read'
export const KIDS_STAGING_ORIGIN = 'https://community-kids-staging.up.railway.app'

/**
 * Leitura por `fetch()` das origens dos apps de aluno. O bucket público nunca
 * recebe escrita do navegador; uploads continuam passando pelo Admin.
 */
export const PUBLIC_READ_RULE: CORSRule = {
  ID: PUBLIC_READ_RULE_ID,
  AllowedOrigins: STUDENT_APP_ORIGINS,
  AllowedMethods: ['GET', 'HEAD'],
  AllowedHeaders: ['range', 'content-type'],
  ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type', 'Content-Range', 'Accept-Ranges'],
  MaxAgeSeconds: 3600,
}

/** Preserva regras externas e mantém exatamente uma cópia da regra gerenciada. */
export function mergePublicReadRule(current: CORSRule[]): CORSRule[] {
  return [...current.filter((rule) => rule.ID !== PUBLIC_READ_RULE_ID), PUBLIC_READ_RULE]
}

function normalized(values: string[] | undefined, normalizeCase = false): string[] {
  const normalizedValues = (values ?? []).map((value) =>
    normalizeCase ? value.toLowerCase() : value,
  )
  return [...new Set(normalizedValues)].sort()
}

function sameSet(
  actual: string[] | undefined,
  expected: string[] | undefined,
  normalizeCase = false,
): boolean {
  return (
    JSON.stringify(normalized(actual, normalizeCase)) ===
    JSON.stringify(normalized(expected, normalizeCase))
  )
}

/** Confere o contrato completo, não apenas a presença do ID da regra. */
export function publicReadRuleMatches(rule: CORSRule | undefined): boolean {
  return Boolean(
    rule &&
      rule.ID === PUBLIC_READ_RULE.ID &&
      sameSet(rule.AllowedOrigins, PUBLIC_READ_RULE.AllowedOrigins) &&
      sameSet(rule.AllowedMethods, PUBLIC_READ_RULE.AllowedMethods, true) &&
      sameSet(rule.AllowedHeaders, PUBLIC_READ_RULE.AllowedHeaders, true) &&
      sameSet(rule.ExposeHeaders, PUBLIC_READ_RULE.ExposeHeaders, true) &&
      rule.MaxAgeSeconds === PUBLIC_READ_RULE.MaxAgeSeconds,
  )
}

export interface PublicCorsProbeResponse {
  status: number
  allowOrigin: string | null
  body: string
}

export interface PublicCorsProbeExpectation {
  origin: string
  body: string
}

/** Retorna uma explicação acionável ou `null` quando a prova pública passou. */
export function validatePublicCorsProbe(
  response: PublicCorsProbeResponse,
  expected: PublicCorsProbeExpectation,
): string | null {
  if (response.status !== 200) return `HTTP ${response.status}, esperado 200`
  if (!response.allowOrigin) return 'Access-Control-Allow-Origin ausente'
  if (response.allowOrigin !== expected.origin) {
    return `Access-Control-Allow-Origin com origem incorreta: ${response.allowOrigin}`
  }
  if (response.body !== expected.body) return 'corpo inesperado no objeto de prova'
  return null
}
