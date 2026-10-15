import { STUDIO_PRO_BUILD_LIMITS } from './pro-build'
import { STUDIO_PRO_REMOTE_PACKAGES } from './pro-dependencies'
import { STUDIO_PRO_TEMPLATE_IDS } from './pro-templates'

export const STUDIO_PRO_RUNTIME_PROTOCOL = 1 as const
export const STUDIO_PRO_REMOTE_PATH_LIMITS = {
  sourceChars: 180,
  materialChars: 240,
  segments: 8,
} as const
export const STUDIO_PRO_RESERVED_BUILD_PATHS = [
  'package.json',
  'package-lock.json',
  'npm-shrinkwrap.json',
  'vite.config.js',
  'vite.config.mjs',
  'vite.config.cjs',
  'vite.config.ts',
  'artifact-options.json',
  'artifact-manifest.json',
  'validation-options.json',
  'typecheck-result.json',
  'playtest-result.json',
] as const
const segment = /^[A-Za-z0-9._-]+$/
const extension = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs|json|webmanifest|html|css|svg|txt|md)$/i

/** Shared by editor guidance and the authoritative remote parser; local files may have broader capabilities. */
export function normalizeStudioProBuildPath(input: string): string | null {
  if (typeof input !== 'string') return null
  const cleaned = input
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/+|\/+$/g, '')
  if (
    !cleaned ||
    cleaned.length > STUDIO_PRO_REMOTE_PATH_LIMITS.sourceChars ||
    !extension.test(cleaned)
  )
    return null
  const parts = cleaned.split('/')
  if (
    parts.length > STUDIO_PRO_REMOTE_PATH_LIMITS.segments ||
    parts.some(
      (part) =>
        !part ||
        part === '.' ||
        part === '..' ||
        !segment.test(part) ||
        part.toLowerCase() === 'node_modules' ||
        part.startsWith('.env'),
    )
  )
    return null
  return parts.join('/')
}
export function isStudioProBuildMaterialPath(path: string): boolean {
  return (
    path.toLowerCase() !== 'public/__studio-proof.png' &&
    path.startsWith('public/') &&
    path.length <= STUDIO_PRO_REMOTE_PATH_LIMITS.materialChars &&
    path.split('/').length <= STUDIO_PRO_REMOTE_PATH_LIMITS.segments &&
    path
      .split('/')
      .every(
        (part) =>
          segment.test(part) && !part.startsWith('.') && part.toLowerCase() !== 'node_modules',
      ) &&
    (!/\.(?:[cm]?[jt]sx?|html|css)$/i.test(path) || path === 'public/sz-assets.js')
  )
}
export interface StudioProBuildEnvelope {
  executionId: string
  templateId: string
  parentOrigin: string
  files: Record<string, string>
  binaries?: Record<string, { base64: string; sha256: string }>
  validate?: boolean
}
/** Exact envelope, not an estimate that omits binary base64 or the parent origin. */
export function serializeStudioProBuildEnvelope(input: StudioProBuildEnvelope): string {
  return JSON.stringify({
    executionId: input.executionId,
    templateId: input.templateId,
    parentOrigin: input.parentOrigin,
    files: input.files,
    ...(input.binaries && Object.keys(input.binaries).length ? { binaries: input.binaries } : {}),
    ...(input.validate ? { validate: true } : {}),
  })
}
export function studioProBuildEnvelopeIssue(input: StudioProBuildEnvelope): string | null {
  for (const path of Object.keys(input.files))
    if (normalizeStudioProBuildPath(path) !== path)
      return `O arquivo ${path} não é compatível com o compilador remoto. Use o terminal local ou ajuste o caminho/formato.`
  for (const path of Object.keys(input.binaries ?? {}))
    if (!isStudioProBuildMaterialPath(path))
      return `O material ${path} não é compatível com o compilador remoto.`
  if (
    new TextEncoder().encode(serializeStudioProBuildEnvelope(input)).byteLength >
    STUDIO_PRO_BUILD_LIMITS.maxRequestBytes
  )
    return 'O projeto com os materiais ultrapassa o limite do compilador remoto. Reduza os materiais ou execute no computador pelo terminal.'
  return null
}
export const STUDIO_PRO_REMOTE_CAPABILITIES = {
  protocol: STUDIO_PRO_RUNTIME_PROTOCOL,
  templateIds: STUDIO_PRO_TEMPLATE_IDS,
  limits: STUDIO_PRO_BUILD_LIMITS,
  paths: STUDIO_PRO_REMOTE_PATH_LIMITS,
  packages: STUDIO_PRO_REMOTE_PACKAGES,
  customBuildPlugins: false,
  networkDuringValidation: false,
} as const
