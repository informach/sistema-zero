/** Server-side publication inventory. It contains private storage keys, never a member view. */
export interface CourseMediaOrigin {
  publicBaseUrl: string
  publicBucket: string
  privateBucket: string
}
export interface CourseMediaResource {
  kind: 'r2-public' | 'r2-private' | 'vimeo'
  source: string
  /** Multiple URLs can point to one stored object or one Vimeo video. Transfer only once. */
  sources: string[]
  bucket?: string
  key?: string
  videoId?: string
  references: string[]
}
const MAX_DEPTH = 80
const MAX_REFERENCES = 20_000
const pointer = (value: string) => value.replaceAll('~', '~0').replaceAll('/', '~1')
const uriTokens = (value: string) =>
  value.replaceAll('\\/', '/').match(/https?:\/\/[^\s<>"'`\\)\]}]+|r2priv:[^\s<>"'`\\)\]}]+/gi) ??
  []

function originUrl(origin: CourseMediaOrigin) {
  const base = new URL(origin.publicBaseUrl)
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash)
    throw new Error('A origem das mídias precisa ser uma URL HTTPS sem credenciais ou query')
  base.pathname = `${base.pathname.replace(/\/+$/, '')}/`
  if (!origin.publicBucket || !origin.privateBucket) throw new Error('Buckets da origem ausentes')
  return base
}

function classify(
  source: string,
  origin: CourseMediaOrigin,
): Omit<CourseMediaResource, 'references' | 'sources'> | null {
  if (/^r2priv:/i.test(source) && !source.startsWith('r2priv:'))
    throw new Error('Referência privada inválida')
  if (source.startsWith('r2priv:')) {
    const key = source.slice(7)
    if (!key || key.startsWith('/') || key.includes('\0'))
      throw new Error('Referência privada inválida')
    return { kind: 'r2-private', source, bucket: origin.privateBucket, key }
  }
  const base = originUrl(origin)
  let url: URL
  try {
    url = new URL(source)
  } catch {
    if (source.toLowerCase().includes(base.host.toLowerCase()))
      throw new Error('Referência de origem inválida')
    return null // A teaching example can contain a placeholder such as https://{dominio}.
  }
  if (url.username || url.password) {
    if (
      url.hostname === base.hostname ||
      ['player.vimeo.com', 'vimeo.com', 'www.vimeo.com'].includes(url.hostname)
    )
      throw new Error('Mídia com credenciais na URL')
    return null
  }
  if (
    url.hostname === base.hostname &&
    url.pathname.startsWith(base.pathname) &&
    url.origin !== base.origin
  )
    throw new Error('A mídia de origem usa protocolo ou porta diferente da configuração')
  if (url.origin === base.origin && url.pathname.startsWith(base.pathname)) {
    const key = decodeURIComponent(url.pathname.slice(base.pathname.length))
    if (!key || key.includes('\0')) throw new Error('Chave pública inválida')
    return { kind: 'r2-public', source, bucket: origin.publicBucket, key }
  }
  const video =
    url.hostname === 'player.vimeo.com'
      ? /^\/video\/(\d+)$/.exec(url.pathname)
      : ['vimeo.com', 'www.vimeo.com'].includes(url.hostname)
        ? /^\/(\d+)$/.exec(url.pathname)
        : null
  if (video) return { kind: 'vimeo', source, videoId: video[1]! }
  return null
}

/** Visits values and dictionary keys, including URLs in Markdown, HTML and project source files. */
function mapTree(
  value: unknown,
  visit: (value: string, path: string) => string,
  path = '',
  depth = 0,
  transform = true,
): unknown {
  if (depth > MAX_DEPTH) throw new Error('A árvore do curso excede a profundidade permitida')
  if (typeof value === 'string') return visit(value, path)
  if (value instanceof Date) return transform ? new Date(value) : value
  if (Array.isArray(value)) {
    if (transform)
      return value.map((item, index) => mapTree(item, visit, `${path}/${index}`, depth + 1))
    value.forEach((item, index) => {
      mapTree(item, visit, `${path}/${index}`, depth + 1, false)
    })
    return value
  }
  if (value && typeof value === 'object') {
    if (!transform) {
      for (const [key, item] of Object.entries(value)) {
        visit(key, `${path}/@${pointer(key)}`)
        mapTree(item, visit, `${path}/${pointer(key)}`, depth + 1, false)
      }
      return value
    }
    const entries = Object.entries(value).map(
      ([key, item]) =>
        [
          visit(key, `${path}/@${pointer(key)}`),
          mapTree(item, visit, `${path}/${pointer(key)}`, depth + 1),
        ] as const,
    )
    if (new Set(entries.map(([key]) => key)).size !== entries.length)
      throw new Error('A troca de mídia causou colisão numa chave do curso')
    return Object.fromEntries(entries)
  }
  return value
}

export function inventoryCourseMedia(
  document: unknown,
  origin: CourseMediaOrigin,
): CourseMediaResource[] {
  originUrl(origin)
  const resources = new Map<string, CourseMediaResource>()
  let references = 0
  mapTree(
    document,
    (value, path) => {
      for (const token of new Set(uriTokens(value))) {
        const resource = classify(token, origin)
        if (!resource) continue
        if (++references > MAX_REFERENCES)
          throw new Error('O curso excede o teto de referências de mídia')
        const identity =
          resource.kind === 'vimeo'
            ? `vimeo:${resource.videoId}`
            : `${resource.kind}:${resource.bucket}:${resource.key}`
        const existing = resources.get(identity) ?? { ...resource, sources: [], references: [] }
        if (!existing.sources.includes(token)) existing.sources.push(token)
        existing.references.push(path)
        resources.set(identity, existing)
      }
      // Private references with literal whitespace cannot be split and copied as another object.
      if (value.startsWith('r2priv:') && /\s/.test(value))
        throw new Error('A chave privada contém espaço sem codificação')
      return value
    },
    '',
    0,
    false,
  )
  return [...resources.values()]
    .map((resource) => {
      resource.sources.sort()
      resource.source = resource.sources[0]!
      resource.references.sort()
      return resource
    })
    .sort((a, b) => a.source.localeCompare(b.source))
}

/** Every owned reference needs a prepared destination. Arbitrary hostname replacement is forbidden. */
export function remapCourseMedia<T>(
  document: T,
  origin: CourseMediaOrigin,
  replacements: ReadonlyMap<string, string>,
): T {
  const resources = inventoryCourseMedia(document, origin)
  const pairs = resources.flatMap((resource) =>
    resource.sources.map((source) => {
      let replacement = replacements.get(source) ?? replacements.get(resource.source)
      if (!replacement)
        throw new Error(`A mídia ainda não foi preparada: ${resource.references[0]}`)
      if (resource.kind === 'r2-private') {
        if (!/^r2priv:[^\s]+$/.test(replacement)) throw new Error('Destino privado inválido')
      } else {
        const target = new URL(replacement)
        if (target.protocol !== 'https:' || target.username || target.password)
          throw new Error('Destino de mídia inválido')
        if (resource.kind === 'vimeo') {
          const video = classify(replacement, origin)
          if (video?.kind !== 'vimeo' || video.videoId === resource.videoId)
            throw new Error('A promoção exige o vídeo Vimeo de destino')
          const previous = new URL(source)
          for (const [key, value] of previous.searchParams)
            if (key !== 'h') target.searchParams.set(key, value)
          target.hash = previous.hash
          replacement = target.href
        }
      }
      return [source, replacement] as const
    }),
  )
  const lookup = new Map(pairs)
  const output = mapTree(document, (value) => {
    // Token replacement is simultaneous: a destination never becomes another source.
    return value.replace(
      /https?:\/\/[^\s<>"'`\\)\]}]+|r2priv:[^\s<>"'`\\)\]}]+|https?:\\\/\\\/[^\s<>"'`)\]}]+/gi,
      (token) => {
        const plain = token.replaceAll('\\/', '/')
        const replacement = lookup.get(plain)
        return replacement
          ? token.includes('\\/')
            ? replacement.replaceAll('/', '\\/')
            : replacement
          : token
      },
    )
  }) as T
  const base = originUrl(origin)
  mapTree(
    output,
    (value) => {
      // This also catches encoded source syntax which cannot safely be rewritten as a URL.
      if (value.toLowerCase().includes(base.host.toLowerCase())) {
        const tokens = uriTokens(value)
        const unrecognized = value
          .replaceAll('\\/', '/')
          .replace(/https?:\/\/[^\s<>"'`\\)\]}]+/gi, '')
        if (
          tokens.some((token) => classify(token, origin)?.kind === 'r2-public') ||
          unrecognized.toLowerCase().includes(base.host.toLowerCase())
        )
          throw new Error('Restou uma referência ao armazenamento de origem')
      }
      return value
    },
    '',
    0,
    false,
  )
  return output
}
