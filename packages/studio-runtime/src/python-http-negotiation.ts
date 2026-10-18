const MAX_HEADER_BYTES = 8192
const MAX_ITEMS = 128

/** RFC9110 12.5.3. Identity remains the conservative default for absent/empty fields. */
export function selectPythonRuntimeEncoding(
  header: string | null,
  gzipAvailable: boolean,
): 'gzip' | 'identity' | undefined {
  if (header === null || !header.trim()) return 'identity'
  if (header.length > MAX_HEADER_BYTES) return undefined
  const items = header.split(',')
  if (items.length > MAX_ITEMS) return undefined
  const weights = new Map<string, number>()
  for (const item of items) {
    const value = item.trim()
    if (!value) continue
    const coding = /^([!#$%&'*+.^_`|~0-9A-Za-z-]+)/.exec(value)?.[1]?.toLowerCase()
    if (!coding) continue
    const valid =
      /^[!#$%&'*+.^_`|~0-9A-Za-z-]+(?:[ \t]*;[ \t]*q[ \t]*=[ \t]*(0(?:\.\d{0,3})?|1(?:\.0{0,3})?))?$/i.exec(
        value,
      )
    // Malformed or contradictory duplicates must never re-enable an excluded coding.
    const quality = valid ? (valid[1] === undefined ? 1 : Number(valid[1])) : 0
    weights.set(coding, Math.min(weights.get(coding) ?? 1, quality))
  }
  const gzip = gzipAvailable ? (weights.get('gzip') ?? weights.get('*') ?? 0) : 0
  const explicitIdentity = weights.get('identity')
  const identityAllowed = (explicitIdentity ?? (weights.get('*') === 0 ? 0 : 1)) > 0
  if (gzip > 0 && (explicitIdentity === undefined || gzip >= explicitIdentity)) return 'gzip'
  return identityAllowed ? 'identity' : undefined
}

/** These immutable ETags contain SHA256 hex only, so commas cannot occur inside the tag. */
export function pythonRuntimeNotModified(header: string | null, etag: string) {
  if (header === null || header.length > MAX_HEADER_BYTES) return false
  if (header.trim() === '*') return true
  const tags = header.split(',')
  return (
    tags.length <= MAX_ITEMS &&
    tags.some((tag) => {
      const candidate = tag.trim()
      return candidate === etag || candidate === `W/${etag}`
    })
  )
}
