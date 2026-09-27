/** Writers stay on this format until storage migration and remote rollout are verified. */
export const MOLDA_DOCUMENT_WRITE_VERSION = 1
const READABLE_VERSIONS = [1] as const
type ReadableVersion = (typeof READABLE_VERSIONS)[number]
/**
 * Registro do leitor v1, e só dele. Acrescentar aqui cobra um parser: o `never` do
 * despacho em `documentReader` não compila sem ele.
 */
export const MOLDA_V1_MAX_READ_VERSION = READABLE_VERSIONS[
  READABLE_VERSIONS.length - 1
] as ReadableVersion

/**
 * A geração mais nova que ESTE cliente sabe abrir, por qualquer leitor: v1 pelo
 * `readMoldaDocument`, v2 pelo `readSceneDocument`. Não é o registro do leitor v1 nem a
 * versão do escritor. É o que o host pode aceitar da nuvem sem reconciliar às cegas um
 * documento que não entende, e por isso precisa ser implantado ANTES de qualquer
 * escritor da geração nova.
 */
export const MOLDA_MAX_READ_VERSION = 2
/** @deprecated Use the explicit read capability or write version at the boundary. */
export const MOLDA_DOCUMENT_VERSION = MOLDA_DOCUMENT_WRITE_VERSION

export type MoldaVersionCheck =
  | { status: 'supported'; version: ReadableVersion; legacy: boolean }
  | { status: 'unsupported'; version: number }
  | { status: 'invalid' }

/** Inspect before sanitizing: a future document must never become a lossy legacy one. */
export function checkMoldaDocumentVersion(raw: unknown): MoldaVersionCheck {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { status: 'invalid' }
  const value = (raw as Record<string, unknown>).formatVersion
  if (value === undefined) return { status: 'supported', version: 1, legacy: true }
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    return { status: 'invalid' }
  }
  const supported = READABLE_VERSIONS.find((version) => version === value)
  return supported !== undefined
    ? { status: 'supported', version: supported, legacy: false }
    : { status: 'unsupported', version: value }
}

export class MoldaUnsupportedVersionError extends Error {
  readonly code = 'unsupported-document-version' as const
  constructor(readonly version: number) {
    super(
      'Esta criação usa uma versão mais nova. Atualize a página para abrir sem perder detalhes.',
    )
    this.name = 'MoldaUnsupportedVersionError'
  }
}

/** Prevent an accidentally forwarded newer document from being retagged by an older writer. */
export function assertMoldaDocumentWritable(raw: unknown): void {
  const version = checkMoldaDocumentVersion(raw)
  if (version.status === 'unsupported') throw new MoldaUnsupportedVersionError(version.version)
  if (version.status === 'invalid') throw new TypeError('Versão de documento inválida.')
  // A future reader may open a format that this writer must not flatten or retag.
  const formatVersion = version.version
  if (formatVersion !== MOLDA_DOCUMENT_WRITE_VERSION) {
    throw new MoldaUnsupportedVersionError(formatVersion)
  }
}
