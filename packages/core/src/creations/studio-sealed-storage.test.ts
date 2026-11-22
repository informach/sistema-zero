import { describe, expect, test } from 'bun:test'
import { creationPartStorageKey, creationStorageKey } from './storage-keys'
import {
  canReadStudioSealedStorage,
  isStudioSealedObjectKey,
  resolveCreationPartKey,
  STUDIO_SEALED_STORAGE_PROTOCOL,
  STUDIO_SEALED_STORAGE_READER,
  StudioSealedManifestSchema,
  StudioSealedPartRefSchema,
  StudioSealedReceiptSchema,
  studioSealedBlobKey,
} from './studio-sealed-storage'

const nonce = '60000000-0000-4000-8000-000000000001'
const previous = '60000000-0000-4000-8000-000000000002'
const hash = 'a'.repeat(64)
const digest = 'b'.repeat(64)
const locator = {
  userId: 'qa-profile',
  itemId: 'jogo-1',
  audience: 'adult',
  tool: 'studio',
} as const
const requirements = { envelopeVersion: 2, projectFormat: 3, materials: 'legacy' } as const

describe('Studio sealed storage readers', () => {
  test('versioned envelope binds program format and ordered part list', () => {
    const fixture = {
      format: 'sz-studio-parts',
      version: 2,
      requirements,
      program: { id: locator.itemId, formatVersion: 3, assets: [] },
      assets: [hash, digest],
    }
    expect(StudioSealedManifestSchema.parse(fixture).assets).toEqual([hash, digest])
    expect(StudioSealedManifestSchema.safeParse({ ...fixture, version: 3 }).success).toBe(false)
    expect(StudioSealedManifestSchema.safeParse({ ...fixture, assets: [hash, hash] }).success).toBe(
      false,
    )
    expect(
      StudioSealedManifestSchema.safeParse({
        ...fixture,
        program: { ...fixture.program, assets: [{ dataUrl: 'hidden part' }] },
      }).success,
    ).toBe(false)
    expect(
      StudioSealedManifestSchema.safeParse({
        ...fixture,
        requirements: { ...requirements, projectFormat: 2 },
      }).success,
    ).toBe(false)
  })

  test('reader advertises only the material versions it can preserve', () => {
    expect(canReadStudioSealedStorage(STUDIO_SEALED_STORAGE_READER, requirements)).toBe(true)
    expect(canReadStudioSealedStorage(undefined, requirements)).toBe(false)
    expect(canReadStudioSealedStorage('future-reader', requirements)).toBe(false)
    expect(
      canReadStudioSealedStorage(STUDIO_SEALED_STORAGE_READER, {
        ...requirements,
        materials: 'pinta-region-5',
      }),
    ).toBe(false)
  })

  test('sealed parts retain their own nonce and never overlap the legacy numeric key', () => {
    const ref = StudioSealedPartRefSchema.parse({
      protocol: STUDIO_SEALED_STORAGE_PROTOCOL,
      hash,
      bytes: 100,
      nonce: previous,
      gzipSha256: digest,
    })
    const manifest = studioSealedBlobKey(locator, nonce, 'sealed')
    const old = creationStorageKey(locator.userId, 'studio', locator.itemId, 1, 'adult')
    expect(isStudioSealedObjectKey(manifest)).toBe(true)
    expect(isStudioSealedObjectKey(old)).toBe(false)
    expect(studioSealedBlobKey({ ...locator, audience: 'kids' }, nonce, 'sealed')).not.toBe(
      manifest,
    )
    expect(resolveCreationPartKey(locator, ref)).toBe(
      `creations/adult/qa-profile/studio/jogo-1/seals/${previous}/sealed/parts/${hash}.gz`,
    )
    expect(resolveCreationPartKey(locator, { hash, bytes: 100, rev: 1 })).toBe(
      creationPartStorageKey(locator.userId, 'studio', locator.itemId, hash, 1, 'adult'),
    )
    expect(() => resolveCreationPartKey({ ...locator, tool: 'lesson-studio' }, ref)).toThrow()
    expect(StudioSealedPartRefSchema.safeParse({ ...ref, rev: 1 }).success).toBe(false)
    expect(StudioSealedPartRefSchema.safeParse({ ...ref, storageKey: old }).success).toBe(false)
    expect(
      StudioSealedReceiptSchema.safeParse({
        protocol: STUDIO_SEALED_STORAGE_PROTOCOL,
        nonce,
        requirements,
        gzipSha256: digest,
        jsonSha256: hash,
        manifestBytes: 100,
      }).success,
    ).toBe(true)
  })
})
