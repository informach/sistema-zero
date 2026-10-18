/** Public runtime origins configured by the host operator, never supplied by a project.
 * This permits framing/fetching only; catalog pins and per-operation authorization still apply. */
export function studioPythonCspOrigins(raw: string | undefined, development: boolean): string[] {
  if (!raw?.trim()) return []
  if (raw.length > 8192) throw new Error('STUDIO_PYTHON_FRAME_ORIGINS excede o limite.')
  const entries: unknown = JSON.parse(raw)
  if (!Array.isArray(entries) || entries.length > 16)
    throw new Error('STUDIO_PYTHON_FRAME_ORIGINS precisa ser uma lista de até 16 origens.')
  const origins = entries.map((entry: unknown) => {
    if (typeof entry !== 'string' || /[\s;*]/.test(entry))
      throw new Error('Origem Python inválida na CSP.')
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
      throw new Error('A CSP Python aceita somente origens HTTPS ou localhost em desenvolvimento.')
    return url.origin
  })
  return [...new Set(origins)]
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
