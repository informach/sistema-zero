/** Extensões de ARQUIVO aceitas na árvore profissional. */
const PRO_FILE_EXTENSIONS = new Set([
  'ts',
  'tsx',
  'mts',
  'cts',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'json',
  'webmanifest',
  'html',
  'css',
  'svg',
  'txt',
  'md',
])

const SEGMENT_RE = /^[A-Za-z0-9._-]+$/

/**
 * Normaliza um caminho da árvore profissional. Aceita pastas e arquivos.
 * Rejeita (→ null): vazio, `..`/`.`, `node_modules` (anti-DoS), segmentos
 * inválidos. Com `expectFile`, exige extensão na allowlist.
 */
export function normalizeProPath(
  input: string,
  opts: { expectFile?: boolean } = {},
): string | null {
  if (typeof input !== 'string') return null
  const cleaned = input
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/+|\/+$/g, '')
  if (!cleaned) return null
  const segments = cleaned.split('/')
  for (const seg of segments) {
    if (!seg || seg === '.' || seg === '..') return null
    if (seg === 'node_modules') return null
    if (seg !== seg.trim()) return null
    if (!SEGMENT_RE.test(seg)) return null
  }
  if (opts.expectFile) {
    const last = segments[segments.length - 1] ?? ''
    const dot = last.lastIndexOf('.')
    const ext = dot >= 0 ? last.slice(dot + 1).toLowerCase() : ''
    if (!PRO_FILE_EXTENSIONS.has(ext)) return null
  }
  return segments.join('/')
}
