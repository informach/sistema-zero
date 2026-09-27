import { checkMoldaDocumentVersion } from './documentVersion'
import { MOLDA_LIMITS } from './limits'
import type { MoldaAsset } from './model'
import { sanitizeMoldaAsset } from './sanitize'

export type MoldaDocumentRead =
  | { status: 'valid'; asset: MoldaAsset; sourceVersion: number; legacy: boolean }
  | { status: 'unsupported'; version: number; raw: unknown }
  | { status: 'invalid'; raw: unknown }

/** Small recovery entry; the original is loaded only when requested. */
export interface MoldaReadIssue {
  id: string
  name: string
  status: 'invalid' | 'unsupported'
  version?: number
}

/** Pure and non-mutating. Keep `raw` available for recovery instead of normalizing unknown versions. */
export function readMoldaDocument(raw: unknown): MoldaDocumentRead {
  try {
    const version = checkMoldaDocumentVersion(raw)
    if (version.status === 'unsupported') return { ...version, raw }
    if (version.status === 'invalid') return { status: 'invalid', raw }
    const sourceVersion = version.version
    switch (sourceVersion) {
      case 1: {
        const asset = sanitizeMoldaAsset(raw)
        return asset
          ? { status: 'valid', asset, sourceVersion: version.version, legacy: version.legacy }
          : { status: 'invalid', raw }
      }
      default: {
        // Extending the readable registry requires an explicit parser, not v1 sanitization.
        const missingParser: never = sourceVersion
        return { status: 'unsupported', version: missingParser, raw }
      }
    }
  } catch {
    return { status: 'invalid', raw }
  }
}

/** Storage keys own identity; a readable payload cannot substitute another creation. */
export function readMoldaDocumentForId(raw: unknown, id: string): MoldaDocumentRead {
  const read = readMoldaDocument(raw)
  return read.status === 'valid' && read.asset.id !== id ? { status: 'invalid', raw } : read
}

export function moldaReadIssue(
  id: string,
  read: Exclude<MoldaDocumentRead, { status: 'valid' }>,
): MoldaReadIssue {
  const raw = read.raw
  const name =
    raw && typeof raw === 'object' && 'name' in raw && typeof raw.name === 'string'
      ? raw.name.slice(0, MOLDA_LIMITS.maxNameChars)
      : id
  return {
    id,
    name,
    status: read.status,
    ...(read.status === 'unsupported' ? { version: read.version } : {}),
  }
}
