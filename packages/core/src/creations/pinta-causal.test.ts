import { expect, test } from 'bun:test'
import {
  PintaCausalAttestationSchema,
  PintaCausalIntentSchema,
  PintaCausalManifestSchema,
  PintaCausalReservePageSchema,
  PintaCausalSnapshotPageSchema,
  pintaCausalBlobKey,
  pintaCausalIntentHash,
} from './pinta-causal'

const opId = 'efa24de7-d572-4258-84c1-860e0c948d29'
const hash = 'a'.repeat(64)
const member = {
  action: 'put',
  itemId: 'sheet',
  baseRevision: 1,
  name: 'Folha',
  kind: 'tileset',
  formatVersion: 6,
  itemUpdatedAt: '2026-11-22T12:00:00Z',
  bytes: 80,
  sha256: hash,
  operation: { type: 'remap', oldToNew: [-1, 0, 1], count: 2 },
}
const base = { protocol: 1, opId, baseEpoch: '11', reader: 6, members: [member], readSet: [] }

test('canonical intent binds every revision, ordered member, read and layout operation', async () => {
  const parsed = PintaCausalIntentSchema.parse(base)
  expect(await pintaCausalIntentHash(parsed)).toMatch(/^[0-9a-f]{64}$/)
  expect(await pintaCausalIntentHash({ ...parsed, baseEpoch: '12' })).not.toBe(
    await pintaCausalIntentHash(parsed),
  )
  for (const bad of [
    { ...base, baseEpoch: '01' },
    { ...base, baseEpoch: '9223372036854775808' },
    { ...base, reader: 99 },
    { ...base, members: [member, member] },
    { ...base, members: [member, { ...member, itemId: 'a' }] },
    {
      ...base,
      members: [{ ...member, operation: { type: 'remap', oldToNew: [0, 0, 1], count: 2 } }],
    },
    { ...base, readSet: [{ source: 'unit', consumerId: 'sheet', targetId: 'missing' }] },
    {
      ...base,
      readSet: [
        { source: 'snapshot', consumerId: 'other', targetId: 'art', revision: 1, sha256: hash },
      ],
    },
  ])
    expect(PintaCausalIntentSchema.safeParse(bad).success).toBe(false)
  const page = {
    protocol: 1,
    opId,
    baseEpoch: '11',
    reader: 6,
    intentHash: hash,
    page: 0,
    pages: 1,
    members: [member],
    readSet: [],
  }
  expect(PintaCausalReservePageSchema.safeParse(page).success).toBe(true)
  expect(PintaCausalReservePageSchema.safeParse({ ...page, page: 1 }).success).toBe(false)
  expect(
    PintaCausalReservePageSchema.safeParse({ ...page, members: Array(101).fill(member) }).success,
  ).toBe(false)
})

test('stored manifest distinguishes unknown, empty, implicit tile zero and live external references', () => {
  const ref = {
    id: 'sheet',
    roles: ['art'],
    implicitArtSlotZero: true,
    indices: `01${'00'.repeat(31)}`,
  }
  const m = {
    version: 1,
    itemId: 'map',
    name: 'Vila',
    kind: 'tilemap',
    nativeSchema: 7,
    backupVersion: 7,
    requiredNativeSchema: 7,
    refs: [ref],
    doorSelectors: ['Cabana'],
  }
  expect(PintaCausalManifestSchema.parse(m)).toEqual(m)
  for (const broken of [
    { ...m, refs: [ref, ref] },
    { ...m, refs: [{ ...ref, roles: ['property'] }] },
    { ...m, refs: [{ ...ref, indices: '00' }] },
    { ...m, kind: 'tileset' },
  ])
    expect(PintaCausalManifestSchema.safeParse(broken).success).toBe(false)
  const binding = {
    namespace: { userId: opId, audience: 'adult', tool: 'pinta' },
    opId,
    intentHash: hash,
    baseEpoch: '11',
    itemId: 'map',
    baseRevision: 1,
    revision: 2,
    nonce: opId,
    baseSha256: hash,
    candidateSha256: hash,
    expiresAt: '2026-11-22T15:00:00Z',
  }
  const proof = PintaCausalAttestationSchema.parse({
    purpose: 'pinta-unit-content-v1',
    binding,
    manifest: m,
    transitions: [],
  })
  expect(pintaCausalBlobKey(proof.binding, 'sealed')).not.toBe(
    pintaCausalBlobKey(proof.binding, 'upload'),
  )
  expect(pintaCausalBlobKey(proof.binding, 'sealed')).toContain('/adult/')
  expect(
    PintaCausalAttestationSchema.safeParse({ ...proof, binding: { ...binding, itemId: 'wrong' } })
      .success,
  ).toBe(false)
  expect(PintaCausalAttestationSchema.safeParse({ ...proof, manifest: null }).success).toBe(false)
})
test('snapshot pages pin every observed revision and require the cursor to end at a returned id', () => {
  const entry = {
    itemId: 'map',
    name: 'Vila',
    kind: 'tilemap',
    revision: 1,
    formatVersion: 6,
    layoutRevision: null,
    sha256: hash,
    bytes: 80,
    itemUpdatedAt: member.itemUpdatedAt,
    coverage: 'certified',
  }
  const page = { protocol: 1, epoch: '1', entries: [entry], requiredFormat: 1, nextCursor: 'map' }
  expect(PintaCausalSnapshotPageSchema.safeParse(page).success).toBe(true)
  expect(PintaCausalSnapshotPageSchema.safeParse({ ...page, nextCursor: 'next' }).success).toBe(
    false,
  )
  expect(
    PintaCausalSnapshotPageSchema.safeParse({ ...page, entries: [{ ...entry, sha256: null }] })
      .success,
  ).toBe(false)
})
