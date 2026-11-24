import { z } from 'zod'
import {
  STUDIO_PARTS_FORMAT,
  STUDIO_PROJECT_FORMAT_VERSION,
  STUDIO_PROJECT_SUPPORTED_FORMAT_VERSION,
} from '../studio/project-format'
import {
  type CreationStorageTool,
  creationPartStorageKey,
  creationStorageKey,
} from './storage-keys'

export const STUDIO_SEALED_PARTS_VERSION = 2
export const STUDIO_SEALED_STORAGE_PROTOCOL = 'studio-sealed-v1'
export const STUDIO_SEALED_STORAGE_READER = 'studio-parts-v2'

const sha256 = z.string().regex(/^[a-f0-9]{64}$/)
const compressedBytes = z
  .number()
  .int()
  .positive()
  .max(40 * 1024 * 1024)
const projectFormat = z.union([
  z.literal(STUDIO_PROJECT_FORMAT_VERSION),
  z.literal(STUDIO_PROJECT_SUPPORTED_FORMAT_VERSION),
])

export const StudioSealedRequirementsSchema = z.strictObject({
  envelopeVersion: z.literal(STUDIO_SEALED_PARTS_VERSION),
  projectFormat,
  materials: z.enum(['legacy', 'pinta-region-5']),
})

export type StudioSealedRequirements = z.infer<typeof StudioSealedRequirementsSchema>

const program = z.custom<Record<string, unknown>>(
  (value) => value !== null && typeof value === 'object' && !Array.isArray(value),
)

export const StudioSealedManifestSchema = z
  .strictObject({
    format: z.literal(STUDIO_PARTS_FORMAT),
    version: z.literal(STUDIO_SEALED_PARTS_VERSION),
    requirements: StudioSealedRequirementsSchema,
    program,
    assets: z.array(sha256).max(128),
  })
  .refine(
    ({ program, assets, requirements }) =>
      Array.isArray(program.assets) &&
      program.assets.length === 0 &&
      program.formatVersion === requirements.projectFormat &&
      new Set(assets).size === assets.length,
    'O manifesto e os requisitos do programa não conferem.',
  )

export const StudioSealedReceiptSchema = z.strictObject({
  protocol: z.literal(STUDIO_SEALED_STORAGE_PROTOCOL),
  nonce: z.uuid(),
  requirements: StudioSealedRequirementsSchema,
  gzipSha256: sha256,
  jsonSha256: sha256,
  manifestBytes: compressedBytes,
})

export type StudioSealedReceipt = z.infer<typeof StudioSealedReceiptSchema>

export const StudioSealedPartRefSchema = z.strictObject({
  protocol: z.literal(STUDIO_SEALED_STORAGE_PROTOCOL),
  hash: sha256,
  bytes: compressedBytes,
  nonce: z.uuid(),
  gzipSha256: sha256,
})

export type StudioSealedPartRef = z.infer<typeof StudioSealedPartRefSchema>
export type CreationStoragePartRef =
  | { hash: string; bytes: number; rev: number }
  | StudioSealedPartRef

export interface StudioSealedLocator {
  userId: string
  audience: 'adult' | 'kids'
  itemId: string
}

function studioItemPrefix({ userId, audience, itemId }: StudioSealedLocator): string {
  const legacy = creationStorageKey(userId, 'studio', itemId, 1, audience)
  return legacy.slice(0, legacy.lastIndexOf('/') + 1)
}

export function studioSealedBlobKey(
  locator: StudioSealedLocator,
  nonce: string,
  stage: 'upload' | 'sealed',
  partHash?: string,
): string {
  const file = partHash ? `parts/${partHash}.gz` : 'project.gz'
  return `${studioItemPrefix(locator)}seals/${nonce}/${stage}/${file}`
}

export function isStudioSealedObjectKey(key: string): boolean {
  return /^creations\/(?:adult\/)?[^/]+\/studio\/[^/]+\/seals\//.test(key)
}

export function resolveCreationPartKey(
  locator: StudioSealedLocator & { tool: CreationStorageTool },
  part: CreationStoragePartRef,
): string {
  const { userId, tool, itemId, audience } = locator
  if ('rev' in part)
    return creationPartStorageKey(userId, tool, itemId, part.hash, part.rev, audience)
  if (tool !== 'studio') throw new Error('Parte selada fora da ferramenta Estúdio.')
  return studioSealedBlobKey(locator, part.nonce, 'sealed', part.hash)
}

/** This reader understands the private envelope with the existing material formats. */
export function canReadStudioSealedStorage(
  reader: unknown,
  requirements: StudioSealedRequirements,
): boolean {
  return reader === STUDIO_SEALED_STORAGE_READER && requirements.materials === 'legacy'
}
