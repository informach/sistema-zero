import { createHash, randomUUID } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { canonicalJson } from '@sistemazero/core/creations'
import {
  STUDIO_SEALED_STORAGE_PROTOCOL as protocol,
  studioSealedBlobKey,
} from '@sistemazero/core/creations/studio-sealed-storage'
import { StudioSealedTicketSchema } from '@sistemazero/core/creations/studio-sealed-writer'
import { studioProjectIndexName } from '@sistemazero/core/studio/project-index-name'
import { createBlankProjectSnapshot } from '@sistemazero/studio/blank-project'
import { regionalSceneMaterial } from '../../../studio/src/testing/pintaRegionalMaterialFixture'
import type { StudioSealedStorage } from '../../src/server/studio-sealed-proof'

const hash = (text: string) => createHash('sha256').update(text).digest('hex')

export async function studioSealedFixture(
  options: { assets?: unknown[]; regional?: boolean; documentId?: string; name?: string } = {},
) {
  const scope = {
    userId: randomUUID(),
    accountId: randomUUID(),
    audience: 'kids' as const,
    itemId: 'regional-project',
  }
  const assets = options.assets ?? (options.regional ? [await regionalSceneMaterial()] : [])
  const project = {
    ...createBlankProjectSnapshot(
      options.documentId ?? scope.itemId,
      options.name ?? 'Vila regional',
    ),
    kind: 'classic',
    assets,
  }
  const texts = assets.map(canonicalJson)
  const parts = texts.map((text) => ({ hash: hash(text), bytes: gzipSync(text), text }))
  const requirements = {
    envelopeVersion: 2,
    projectFormat: 2,
    materials: options.regional ? 'pinta-region-5' : 'legacy',
  }
  const json = JSON.stringify({
    format: 'sz-studio-parts',
    version: 2,
    requirements,
    program: { ...project, assets: [] },
    assets: parts.map((part) => part.hash),
  })
  const manifest = gzipSync(json)
  const ticket = StudioSealedTicketSchema.parse({
    protocol,
    scope,
    nonce: randomUUID(),
    baseGeneration: null,
    baseRevision: 0,
    revision: 1,
    expiresAt: new Date(Date.now() + 600_000).toISOString(),
    name: studioProjectIndexName(project.name),
    kind: 'classic',
    itemUpdatedAt: new Date(project.updatedAt).toISOString(),
    bytes: manifest.length,
    requirements,
    parts: parts.map((part) => ({ source: 'upload', hash: part.hash, bytes: part.bytes.length })),
  })
  const objects = new Map<string, Uint8Array>()
  const staged = studioSealedBlobKey(scope, ticket.nonce, 'upload')
  objects.set(staged, manifest)
  for (const part of parts)
    objects.set(studioSealedBlobKey(scope, ticket.nonce, 'upload', part.hash), part.bytes)
  const created: string[] = []
  const storage: StudioSealedStorage = {
    async open(key) {
      const value = objects.get(key)
      if (!value) return null
      const bytes = new Uint8Array(value)
      return {
        contentType: 'application/gzip',
        contentLength: bytes.length,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(bytes)
            controller.close()
          },
        }),
      }
    },
    async create(input) {
      if (objects.has(input.key)) return false
      objects.set(input.key, new Uint8Array(input.body))
      created.push(input.key)
      return true
    },
  }
  const optionsForProof = () => ({ ticket, storage, signal: new AbortController().signal })
  return {
    ticket,
    project,
    json,
    manifest,
    parts,
    objects,
    staged,
    created,
    storage,
    optionsForProof,
  }
}
