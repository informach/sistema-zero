import type { VersionMapping } from '../../infrastructure/config/gateway-config.schema'

export interface VersionHeaders {
  accept: string
  explicit: string
}

/** Normaliza "1"/"v1"/"V1" → "v1". */
export function normalizeVersion(raw: string): string {
  const trimmed = raw.trim().toLowerCase()
  if (!trimmed) return ''
  return /^v\d+$/.test(trimmed) ? trimmed : /^\d+$/.test(trimmed) ? `v${trimmed}` : trimmed
}

/**
 * Negocia a versão pedida com precedência: path `/vN` > header explícito
 * (`X-API-Version`) > `Accept-Version` > default. `fromPath` indica se a versão
 * veio do path (e portanto o prefixo `/vN` deve ser removido antes de casar a rota).
 */
export function parseRequestedVersion(
  pathname: string,
  headers: Headers,
  vh: VersionHeaders,
  defaultVersion: string,
): { version: string; fromPath: boolean } {
  const firstSegment = pathname.split('/').find((s) => s.length > 0)
  if (firstSegment && /^v\d+$/i.test(firstSegment)) {
    return { version: firstSegment.toLowerCase(), fromPath: true }
  }
  const explicit = headers.get(vh.explicit)
  if (explicit && explicit.trim()) return { version: normalizeVersion(explicit), fromPath: false }
  const accept = headers.get(vh.accept)
  if (accept && accept.trim()) return { version: normalizeVersion(accept), fromPath: false }
  return { version: defaultVersion, fromPath: false }
}

/** Remove o prefixo `/vN` do caminho (quando a versão veio do path). */
export function stripVersionPrefix(pathname: string): string {
  return pathname.replace(/^\/v\d+(?=\/|$)/i, '') || '/'
}

/** Encontra o mapeamento de versão de uma rota para a versão pedida (se houver). */
export function resolveVersionMapping(
  versions: readonly VersionMapping[] | undefined,
  version: string,
): VersionMapping | undefined {
  if (!versions || versions.length === 0) return undefined
  return versions.find((v) => normalizeVersion(v.version) === normalizeVersion(version))
}
