import { expect, test } from 'bun:test'
import {
  isStudioClassicPublication,
  isStudioProPublication,
  isStudioPublication,
  studioProPublicationUrl,
} from '@sistemazero/core/studio'
import { sha256 } from '../src/artifacts'
import {
  currentPublishedSource,
  publicationCommand,
  publicationRetention,
  retirePublicationReservation,
  servePublishedArtifact,
} from '../src/publications'
import { memoryArtifactBucket } from './artifact-bucket'

const project = (text: string) =>
  JSON.stringify({
    id: 'meu-jogo',
    name: 'Meu jogo',
    files: { 'index.html': '', 'style.css': '', 'script.js': text },
  })

function fixture() {
  const storage = memoryArtifactBucket()
  const playId = crypto.randomUUID()
  const base = {
    operation: 'promote-classic',
    playId,
    owner: 'a'.repeat(64),
    projectId: 'meu-jogo',
    parentOrigin: 'https://kids.test',
  }
  const promote = async (
    source: string,
    expectedVersion: number,
    requestId = crypto.randomUUID(),
  ) => {
    const result = await publicationCommand(
      storage.bucket,
      { ...base, source, expectedVersion, requestId },
      200,
    )
    if (!isStudioClassicPublication(result)) throw new Error('No classic publication')
    return result
  }
  return { ...storage, playId, base, promote }
}

test('classic revisions keep every version on the same link and the active one is served', async () => {
  const f = fixture()
  const v1 = await f.promote(project('a()'), 0)
  expect(v1.version).toBe(1)
  expect(v1.kind).toBe('classic')
  expect(isStudioPublication(v1)).toBe(true)
  expect(isStudioProPublication(v1)).toBe(false)
  const v2 = await f.promote(project('b()'), 1)
  expect(v2.revisions).toHaveLength(2)
  expect(v2.activeRevision).toBe(v2.revisions[1]!.id)
  expect(v2.revisions[1]!.sourceHash).toBe(await sha256(new TextEncoder().encode(project('b()'))))
  const live = await currentPublishedSource(f.bucket, f.playId)
  expect(live?.source).toBe(project('b()'))
  const restored = await publicationCommand(f.bucket, {
    operation: 'activate',
    playId: f.playId,
    owner: f.base.owner,
    requestId: crypto.randomUUID(),
    expectedVersion: 2,
    revision: v1.activeRevision,
    disabled: false,
  })
  expect(isStudioClassicPublication(restored)).toBe(true)
  expect((await currentPublishedSource(f.bucket, f.playId))?.source).toBe(project('a()'))
  expect(publicationRetention(v2.revisions).revisions.size).toBe(2)
})

test('a replayed request returns the same history and a conflicting replay is refused', async () => {
  const f = fixture()
  const requestId = crypto.randomUUID()
  await f.promote(project('a()'), 0, requestId)
  const again = await f.promote(project('a()'), 0, requestId)
  expect(again.version).toBe(1)
  await expect(f.promote(project('b()'), 1, requestId)).rejects.toThrow('outro conteúdo')
  await expect(f.promote(project('c()'), 0)).rejects.toThrow('mudou')
})

test('the classic boundary refuses other languages, other projects and compiled promotions', async () => {
  const f = fixture()
  await expect(
    publicationCommand(f.bucket, {
      ...f.base,
      expectedVersion: 0,
      requestId: crypto.randomUUID(),
      source: JSON.stringify({ id: 'meu-jogo', programmingLanguage: 'python', files: {} }),
    }),
  ).rejects.toThrow('inválido')
  await expect(
    publicationCommand(f.bucket, {
      ...f.base,
      expectedVersion: 0,
      requestId: crypto.randomUUID(),
      source: project('a()').replace('meu-jogo', 'outro-jogo'),
    }),
  ).rejects.toThrow('outro projeto')
  const state = await f.promote(project('a()'), 0)
  await expect(
    publicationCommand(f.bucket, {
      ...f.base,
      operation: 'promote',
      expectedVersion: 1,
      requestId: crypto.randomUUID(),
      source: project('a()'),
      artifactId: '1'.repeat(64),
      artifactHash: '2'.repeat(64),
    }),
  ).rejects.toThrow('Pro')
  await expect(
    publicationCommand(f.bucket, { operation: 'cover', playId: f.playId, owner: f.base.owner }),
  ).rejects.toThrow('autor')
  const url = studioProPublicationUrl('https://runtime.test', f.playId, state.activeRevision)
  expect((await servePublishedArtifact(new Request(url), f.bucket, async () => true)).status).toBe(
    404,
  )
})

test('a disabled classic link resolves to nothing and a first-version reservation can be retired', async () => {
  const f = fixture()
  const state = await f.promote(project('a()'), 0)
  await publicationCommand(f.bucket, {
    operation: 'activate',
    playId: f.playId,
    owner: f.base.owner,
    requestId: crypto.randomUUID(),
    expectedVersion: 1,
    revision: state.activeRevision,
    disabled: true,
  })
  expect(await currentPublishedSource(f.bucket, f.playId)).toBeNull()
  const g = fixture()
  await g.promote(project('a()'), 0)
  const result = await retirePublicationReservation(g.bucket, {
    playId: g.playId,
    owner: g.base.owner,
    snapshotHash: await sha256(new TextEncoder().encode(project('a()'))),
    retirementHash: 'b'.repeat(64),
  })
  expect(result.deleted).toBe(true)
})

test('the status tells a missing record from a disabled link', async () => {
  const { publishedStatus } = await import('../src/publications')
  const f = fixture()
  expect(await publishedStatus(f.bucket, f.playId)).toEqual({ exists: false, disabled: false })
  const state = await f.promote(project('a()'), 0)
  expect(await publishedStatus(f.bucket, f.playId)).toEqual({ exists: true, disabled: false })
  await publicationCommand(f.bucket, {
    operation: 'activate',
    playId: f.playId,
    owner: f.base.owner,
    requestId: crypto.randomUUID(),
    expectedVersion: 1,
    revision: state.activeRevision,
    disabled: true,
  })
  expect(await publishedStatus(f.bucket, f.playId)).toEqual({ exists: true, disabled: true })
})
