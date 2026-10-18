import { expect, test } from 'bun:test'
import {
  type StudioLivePublicationRuntimeRequest,
  StudioLivePublicationRuntimeRequestSchema,
} from '@sistemazero/core/studio/runtime-authorization'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { AuthorizeLivePublicationRuntimeService } from '../../src/application/studio/authorize-live-publication-runtime.service'
import { createStudioRuntimeHosts } from '../../src/domain/studio/runtime-hosts'
import { createStudioRuntimePolicy } from '../../src/domain/studio/runtime-policy'
import { authoringFixture } from '../fakes/studio-authoring-policy'

async function setup(kind: 'classic' | 'pro') {
  const f = await authoringFixture('python', kind)
  const actor = {
    id: crypto.randomUUID(),
    accountId: crypto.randomUUID(),
    name: 'Ana',
    staff: false,
  }
  const workspaceId = crypto.randomUUID()
  const state = { revision: 3, allowed: true, calls: 0 }
  const service = new AuthorizeLivePublicationRuntimeService(
    {
      async showcaseSnapshot(received, id, revision) {
        state.calls++
        expect(received).toEqual(actor)
        if (!state.allowed || id !== workspaceId || revision !== state.revision)
          throw new Error('Saved revision not eligible')
        return { workspaceId, revision, project: structuredClone(f.project), title: 'Projeto' }
      },
    },
    await createStudioRuntimePolicy(
      f.configuration,
      createStudioRuntimeHosts(f.configuration.catalog, [
        { runtime: f.project.runtime, origin: 'https://runtime.test' },
      ]),
    ),
    () => 100_000,
  )
  const request: StudioLivePublicationRuntimeRequest = {
    context: { kind: 'live-publication', workspaceId, workspaceRevision: 3 },
    operation: 'execute',
    subject: studioRuntimeSubject(f.project),
    revision: 'c'.repeat(64),
  }
  return { ...f, actor, state, service, request }
}

for (const kind of ['classic', 'pro'] as const)
  test(`saved live ${kind} publication checks the owner revision without a device lease or free Pro entitlement`, async () => {
    const f = await setup(kind)
    const decision = await f.service.execute(f.actor, f.request)
    expect(decision.context).toEqual(f.request.context)
    expect(decision.actor).toEqual({ userId: f.actor.id, accountId: f.actor.accountId })
    expect(decision.capabilities).toEqual(['execute'])
    expect(decision.blockIds).toEqual([])
    expect(decision.expiresAt - decision.issuedAt).toBe(30_000)
    f.state.allowed = false
    await expect(f.service.execute(f.actor, f.request)).rejects.toThrow('not eligible')
    expect(f.state.calls).toBe(2)
  })

test('live publishing rejects stale revision, substituted metadata/extensions/requirements and non-execution operations', async () => {
  const f = await setup('pro')
  f.state.revision++
  await expect(f.service.execute(f.actor, f.request)).rejects.toThrow('not eligible')
  f.state.revision--
  for (const subject of [
    { ...f.request.subject, id: 'other-project' },
    { ...f.request.subject, installedExtensions: [{ id: 'unknown', version: '1.0.0' }] },
    { ...f.request.subject, requirements: 'pygame-ce' },
  ])
    await expect(f.service.execute(f.actor, { ...f.request, subject })).rejects.toThrow(
      'revisão guardada',
    )
  for (const operation of ['analyze', 'python-repl', 'install-dependencies'])
    expect(
      StudioLivePublicationRuntimeRequestSchema.safeParse({ ...f.request, operation }).success,
    ).toBe(false)
  expect(
    StudioLivePublicationRuntimeRequestSchema.safeParse({ ...f.request, actor: f.actor }).success,
  ).toBe(false)
  expect(
    StudioLivePublicationRuntimeRequestSchema.safeParse({
      ...f.request,
      context: { ...f.request.context, deviceId: crypto.randomUUID() },
    }).success,
  ).toBe(false)
})
