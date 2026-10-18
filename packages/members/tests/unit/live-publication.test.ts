import { describe, expect, test } from 'bun:test'
import { LiveMaterialsService } from '../../src/application/live/live-materials.service'
import { LivePublicationService } from '../../src/application/live/live-publication.service'
import type { LiveMaterialRecord } from '../../src/domain/ports/live-materials.port'

describe('authoritative live publication', () => {
  test('retries keep the playable identity across process/secret changes and separate new posts', async () => {
    const actor = {
      id: crypto.randomUUID(),
      accountId: crypto.randomUUID(),
      name: 'Criadora',
      staff: false,
    }
    const workspaceId = crypto.randomUUID(),
      requestId = crypto.randomUUID()
    const snapshots = {
      showcaseSnapshot: async (_actor: unknown, id: string, revision: number) => ({
        workspaceId: id,
        revision,
        project: { id },
        title: 'Jogo',
      }),
    }
    const first = new LivePublicationService(snapshots, 'first-secret')
    const restarted = new LivePublicationService(snapshots, 'rotated-secret')
    const original = await first.prepare(actor, workspaceId, 1, requestId)
    expect((await restarted.prepare(actor, workspaceId, 1, requestId)).playId).toBe(original.playId)
    expect((await first.prepare(actor, workspaceId, 1, crypto.randomUUID())).playId).not.toBe(
      original.playId,
    )
    expect((await first.prepare(actor, workspaceId, 2, requestId)).playId).not.toBe(original.playId)
    expect(
      (await first.prepare({ ...actor, id: crypto.randomUUID() }, workspaceId, 1, requestId))
        .playId,
    ).not.toBe(original.playId)
  })
  test('proof binds family, learner, revision and server-generated playable; expiry and changed revision fail closed', async () => {
    const actor = {
      id: crypto.randomUUID(),
      accountId: crypto.randomUUID(),
      name: 'Alice',
      staff: false,
    }
    const id = crypto.randomUUID()
    let revision = 4
    let now = new Date('2026-11-07T17:00:00Z')
    const service = new LivePublicationService(
      {
        showcaseSnapshot: async (request, workspaceId, expected) => {
          if (
            request.id !== actor.id ||
            request.accountId !== actor.accountId ||
            expected !== revision
          )
            throw new Error('Unavailable revision')
          return { workspaceId, revision, project: { id: workspaceId }, title: 'Minha criação' }
        },
      },
      'secret-test-32-characters-or-more',
      () => now,
    )
    const prepared = await service.prepare(actor, id, revision, crypto.randomUUID())
    const proof = {
      userId: actor.id,
      accountId: actor.accountId,
      workspaceId: id,
      revision,
      playId: prepared.playId,
      publicationToken: prepared.publicationToken,
    }
    expect(await service.verify(proof)).toEqual({ eligible: true, title: 'Minha criação' })
    for (const change of [
      { userId: crypto.randomUUID() },
      { accountId: crypto.randomUUID() },
      { playId: crypto.randomUUID() },
      { revision: 5 },
      { workspaceId: crypto.randomUUID() },
      { publicationToken: `${proof.publicationToken}x` },
    ])
      await expect(service.verify({ ...proof, ...change })).rejects.toThrow()
    revision = 5
    await expect(service.verify(proof)).rejects.toThrow('Unavailable revision')
    revision = 4
    now = new Date(now.getTime() + 300_000)
    await expect(service.verify(proof)).rejects.toThrow()
  })
})

describe('live material provenance', () => {
  test('registered immutable object is required; another id/key and arbitrary R2 content cannot enter a lesson', async () => {
    const records = new Map<string, LiveMaterialRecord>()
    const service = new LiveMaterialsService({
      find: async (id) => records.get(id) ?? null,
      create: async (value) => {
        records.set(value.id, value)
      },
    })
    const id = crypto.randomUUID()
    const data = {
      id,
      title: 'Guia',
      fileName: 'guia.pdf',
      storageKey: `live/materials/${id}/guia.pdf`,
      contentType: 'application/pdf',
      sizeBytes: 40,
      sha256: 'a'.repeat(64),
      uploadedBy: crypto.randomUUID(),
    }
    await expect(service.validate([data])).rejects.toThrow()
    const material = await service.register(data)
    expect(await service.register(data)).toEqual(material)
    await service.validate([material])
    await expect(service.register({ ...data, sha256: 'b'.repeat(64) })).rejects.toThrow()
    await expect(
      service.validate([{ ...material, storageKey: 'studio/private-secret' }]),
    ).rejects.toThrow()
    await expect(
      service.register({
        ...data,
        id: crypto.randomUUID(),
        storageKey: 'live/materials/../secret.pdf',
      }),
    ).rejects.toThrow()
  })
})

test('adult live proof cannot be replayed into Kids and rejects an old service without audience confirmation', async () => {
  const id = crypto.randomUUID()
  const actor = { id, accountId: id, name: 'Criador', staff: false }
  const workspaceId = crypto.randomUUID()
  const service = new LivePublicationService(
    {
      showcaseSnapshot: async (_who, workspaceId, revision, audience) => ({
        workspaceId,
        revision,
        project: { id: workspaceId },
        title: 'Jogo',
        ...(audience === 'adult' ? { audience: 'adult' as const } : {}),
      }),
    },
    'local-publication-secret',
  )
  const prepared = await service.prepare(actor, workspaceId, 1, crypto.randomUUID(), 'adult')
  const proof = {
    userId: id,
    accountId: id,
    workspaceId,
    revision: 1,
    playId: prepared.playId,
    publicationToken: prepared.publicationToken,
  }
  await expect(service.verify(proof)).rejects.toThrow()
  expect(await service.verify({ ...proof, audience: 'adult' })).toEqual({
    eligible: true,
    title: 'Jogo',
    audience: 'adult',
  })
  const old = new LivePublicationService(
    {
      showcaseSnapshot: async (_who, workspaceId, revision) => ({
        workspaceId,
        revision,
        project: {},
        title: 'Jogo',
      }),
    },
    'local-publication-secret',
  )
  await expect(old.prepare(actor, workspaceId, 1, crypto.randomUUID(), 'adult')).rejects.toThrow()
})
