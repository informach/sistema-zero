/** Public runtime origins configured by the host operator, never supplied by a project.
 * This permits framing/fetching only; catalog pins and per-operation authorization still apply. */
export function studioPythonCspOrigins(raw: string | undefined, development: boolean): string[] {
  if (!raw?.trim()) return []
  if (raw.length > 8192) throw new Error('STUDIO_PYTHON_FRAME_ORIGINS excede o limite.')
  const entries: unknown = JSON.parse(raw)
  if (!Array.isArray(entries) || entries.length > 16)
    throw new Error('STUDIO_PYTHON_FRAME_ORIGINS precisa ser uma lista de até 16 origens.')
  const origins = entries.map((entry: unknown) => studioRuntimeOrigin(entry, development))
  return [...new Set(origins)]
}

function studioRuntimeOrigin(entry: unknown, development: boolean): string {
  if (typeof entry !== 'string' || entry.length > 8192 || /[\s;*]/.test(entry))
    throw new Error('Origem de execução inválida na CSP.')
  const url = new URL(entry)
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    (url.protocol !== 'https:' &&
      !(
        development &&
        url.protocol === 'http:' &&
        ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      ))
  )
    throw new Error('A CSP aceita somente origens HTTPS ou localhost em desenvolvimento.')
  return url.origin
}

/** Published Pro artifacts run only on the operator's configured, isolated executor. */
export function withStudioPublishedProCsp(
  csp: string,
  runtimeUrl: string | undefined,
  development: boolean,
): string {
  if (!runtimeUrl?.trim()) return csp
  const origin = studioRuntimeOrigin(runtimeUrl.trim(), development)
  return csp
    .split('; ')
    .map((directive) =>
      directive.startsWith('frame-src ') && !directive.split(' ').includes(origin)
        ? `${directive} ${origin}`
        : directive,
    )
    .join('; ')
}

export function withStudioPythonCsp(csp: string, origins: readonly string[]): string {
  if (!origins.length) return csp
  return csp
    .split('; ')
    .map((directive) => {
      if (!/^(frame-src|connect-src) /.test(directive)) return directive
      return `${directive} ${origins.join(' ')}`
    })
    .join('; ')
}
