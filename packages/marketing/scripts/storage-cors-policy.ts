import type { CORSRule } from '@aws-sdk/client-s3'

export const marketingCorsRuleId = 'marketing-direct-upload'

/** Exact origins only; HTTP is reserved for loopback development. */
export function storageOrigin(input: string) {
  const url = new URL(input)
  if (
    url.origin !== input ||
    url.username ||
    url.password ||
    input.includes('*') ||
    (url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))
  )
    throw new Error('Informe uma origem HTTPS exata, ou HTTP em loopback, sem caminho ou curinga')
  return input
}

/** Add the browser multipart contract without deleting existing origins or unrelated rules. */
export function marketingStorageCors(current: CORSRule[], origins: string[]): CORSRule[] {
  if (!origins.length) throw new Error('Informe ao menos uma origem do app')
  const selected = current.filter((rule) => rule.ID === marketingCorsRuleId)
  if (selected.length > 1) throw new Error('Regra gerenciada duplicada; confira o bucket')
  const existing = selected[0]
  const unique = (values: string[]) => [...new Set(values)]
  const rule: CORSRule = {
    ...existing,
    ID: marketingCorsRuleId,
    AllowedOrigins: unique([...(existing?.AllowedOrigins ?? []), ...origins.map(storageOrigin)]),
    AllowedMethods: unique([...(existing?.AllowedMethods ?? []), 'PUT', 'GET', 'HEAD']),
    AllowedHeaders: unique([
      ...(existing?.AllowedHeaders ?? []).map((header) => header.toLowerCase()),
      'content-type',
      'content-md5',
      'range',
    ]),
    ExposeHeaders: unique([
      ...(existing?.ExposeHeaders ?? []).map((header) => header.toLowerCase()),
      'etag',
      'content-length',
      'content-range',
      'accept-ranges',
    ]),
    MaxAgeSeconds: existing?.MaxAgeSeconds ?? 3600,
  }
  return existing
    ? current.map((item) => (item.ID === marketingCorsRuleId ? rule : item))
    : [...current, rule]
}
