import 'server-only'
import { createHash } from 'node:crypto'
import { canonicalJson, creationPartStorageKey } from '@sistemazero/core/creations'
import {
  STUDIO_SEALED_STORAGE_PROTOCOL,
  StudioSealedManifestSchema,
  studioSealedBlobKey,
} from '@sistemazero/core/creations/studio-sealed-storage'
import {
  type StudioSealedCommitProof,
  type StudioSealedPlannedPart,
  type StudioSealedTicket,
  StudioSealedTicketSchema,
} from '@sistemazero/core/creations/studio-sealed-writer'
import { hasRegionalPintaReference } from '@sistemazero/core/studio/pinta-regional-reference'
import { studioProjectIndexName } from '@sistemazero/core/studio/project-index-name'
import { copyStudioProjectJson } from '@sistemazero/core/studio/project-json'
import { prepareEditableStudioProject } from '@sistemazero/studio/editable-project-validation'
import { admitRegionalProjectAssets } from '@sistemazero/studio/pinta-regional-admission'
import { CREATION_BLOB_CONTENT_TYPE } from './creation-download'
import { PintaCausalUnverifiedContent, readVerifiedCreationGzip } from './pinta-causal-content'
import type { r2CreateObjectUgc, r2GetObjectUgc } from './r2'

const LIMITS = { compressedBytes: 40 * 1024 * 1024, jsonBytes: 128 * 1024 * 1024 }
type VerifiedBlob = Awaited<ReturnType<typeof readVerifiedCreationGzip>>
export type StudioSealedStorage = {
  open: typeof r2GetObjectUgc
  create: typeof r2CreateObjectUgc
}
export class StudioSealedContentError extends Error {
  override readonly name = 'StudioSealedContentError'
}
export class StudioSealedStorageError extends Error {
  override readonly name = 'StudioSealedStorageError'
}
function invalid(message = 'Os arquivos do projeto não conferem com a revisão enviada.'): never {
  throw new StudioSealedContentError(message)
}
const digest = (text: string) => createHash('sha256').update(text).digest('hex')

function partSource(ticket: StudioSealedTicket, part: StudioSealedPlannedPart): string {
  const locator = ticket.scope
  if (part.source === 'legacy')
    return creationPartStorageKey(
      locator.userId,
      'studio',
      locator.itemId,
      part.hash,
      part.rev,
      locator.audience,
    )
  return studioSealedBlobKey(
    locator,
    part.source === 'sealed' ? part.nonce : ticket.nonce,
    part.source === 'sealed' ? 'sealed' : 'upload',
    part.hash,
  )
}

/** Capture all bytes from server-derived keys, validate the complete document,
 * then create immutable seals. No network copy can re-read a changed predecessor.
 */
export async function proveStudioSealedWrite(options: {
  ticket: StudioSealedTicket
  storage: StudioSealedStorage
  signal: AbortSignal
}): Promise<StudioSealedCommitProof> {
  const ticket = StudioSealedTicketSchema.parse(options.ticket)
  const { storage, signal } = options
  async function storageCall<T>(run: () => Promise<T>): Promise<T> {
    try {
      return await run()
    } catch (cause) {
      signal.throwIfAborted()
      throw new StudioSealedStorageError('O armazenamento do projeto não respondeu.', { cause })
    }
  }
  async function capture(...args: Parameters<typeof readVerifiedCreationGzip>) {
    try {
      return await readVerifiedCreationGzip(...args)
    } catch (cause) {
      signal.throwIfAborted()
      if (cause instanceof PintaCausalUnverifiedContent) throw cause
      throw new StudioSealedStorageError('A leitura do projeto foi interrompida.', { cause })
    }
  }
  try {
    signal.throwIfAborted()
    if (Date.parse(ticket.expiresAt) <= Date.now()) invalid('A reserva do projeto expirou.')
    let remaining = LIMITS.jsonBytes
    async function read(key: string, bytes: number, sha256?: string): Promise<VerifiedBlob> {
      signal.throwIfAborted()
      const object = await storageCall(() => storage.open(key, signal))
      if (!object) invalid('Um arquivo do projeto ainda não está disponível.')
      const verified = await capture(
        object,
        { bytes, sha256 },
        { compressedBytes: LIMITS.compressedBytes, jsonBytes: remaining },
        signal,
      )
      remaining -= verified.jsonBytes
      return verified
    }
    const manifest = await read(
      studioSealedBlobKey(ticket.scope, ticket.nonce, 'upload'),
      ticket.bytes,
    )
    const document = StudioSealedManifestSchema.parse(JSON.parse(manifest.text))
    if (
      document.program.id !== ticket.scope.itemId ||
      canonicalJson(document.requirements) !== canonicalJson(ticket.requirements) ||
      document.assets.length !== ticket.parts.length ||
      document.assets.some((hash, i) => hash !== ticket.parts[i]?.hash)
    )
      invalid()
    const parts: Array<{ planned: StudioSealedPlannedPart; bytes: VerifiedBlob }> = []
    const assets: unknown[] = []
    for (const part of ticket.parts) {
      const bytes = await read(
        partSource(ticket, part),
        part.bytes,
        part.source === 'sealed' ? part.gzipSha256 : undefined,
      )
      if (digest(bytes.text) !== part.hash) invalid('Os bytes de um material foram alterados.')
      assets.push(JSON.parse(bytes.text))
      parts.push({ planned: part, bytes })
    }
    const regionalMaterials = await admitRegionalProjectAssets(assets, signal)
    const materials = assets.some(hasRegionalPintaReference) ? 'pinta-region-5' : 'legacy'
    if (materials !== ticket.requirements.materials)
      invalid('A capacidade dos materiais não confere.')
    const raw = copyStudioProjectJson({ ...document.program, assets })
    const project = await prepareEditableStudioProject(raw, { regionalMaterials })
    if (
      !project ||
      project.id !== ticket.scope.itemId ||
      (project.kind ?? 'classic') !== ticket.kind ||
      project.formatVersion !== ticket.requirements.projectFormat ||
      (project.programmingLanguage ?? 'javascript') !==
        (ticket.requirements.programmingLanguage ?? 'javascript') ||
      new Date(project.updatedAt).toISOString() !== ticket.itemUpdatedAt ||
      studioProjectIndexName(project.name) !== ticket.name
    )
      invalid('O programa não corresponde ao projeto reservado.')
    async function seal(key: string, bytes: VerifiedBlob) {
      signal.throwIfAborted()
      const created = await storageCall(() =>
        storage.create({ key, body: bytes.gzip, contentType: CREATION_BLOB_CONTENT_TYPE }, signal),
      )
      if (!created) {
        const existing = await storageCall(() => storage.open(key, signal))
        if (!existing) invalid('O arquivo confirmado do projeto não está disponível.')
        // Re-read only the immutable seal, bound to the exact captured compressed bytes.
        await capture(
          existing,
          { bytes: bytes.gzip.byteLength, sha256: bytes.sha256 },
          LIMITS,
          signal,
        )
      }
    }
    const references: StudioSealedCommitProof['parts'] = []
    for (const { planned, bytes } of parts) {
      const nonce = planned.source === 'sealed' ? planned.nonce : ticket.nonce
      if (planned.source !== 'sealed')
        await seal(studioSealedBlobKey(ticket.scope, nonce, 'sealed', planned.hash), bytes)
      references.push({
        protocol: STUDIO_SEALED_STORAGE_PROTOCOL,
        hash: planned.hash,
        bytes: planned.bytes,
        nonce,
        gzipSha256: bytes.sha256,
      })
    }
    await seal(studioSealedBlobKey(ticket.scope, ticket.nonce, 'sealed'), manifest)
    signal.throwIfAborted()
    return {
      ticket,
      parts: references,
      receipt: {
        protocol: STUDIO_SEALED_STORAGE_PROTOCOL,
        nonce: ticket.nonce,
        requirements: ticket.requirements,
        manifestBytes: ticket.bytes,
        gzipSha256: manifest.sha256,
        jsonSha256: digest(manifest.text),
      },
    }
  } catch (cause) {
    signal.throwIfAborted()
    if (cause instanceof StudioSealedContentError || cause instanceof StudioSealedStorageError)
      throw cause
    throw new StudioSealedContentError(
      'O projeto não pôde ser conferido integralmente. O original foi preservado.',
      { cause },
    )
  }
}
