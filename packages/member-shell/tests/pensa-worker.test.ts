import { expect, mock, test } from 'bun:test'
import { PensaJsonObjectSchema } from '@sistemazero/core/pensa'
import type { PensaWorkerMembers } from '../src/server/pensa/planning'
import {
  PENSA_ACTOR,
  PENSA_USER,
  pensaContext,
  pensaContextMembers,
  pensaId,
  pensaWork,
} from './pensa-fixtures'

mock.module('server-only', () => ({}))
const { workPensa } = await import('../src/server/pensa/planning')

test('help publishes only after acquiring a lease and revalidating the current project', async () => {
  const context = pensaContext()
  const calls: string[] = []
  const work = { ...pensaWork(context), step: 'answer' as const, kind: 'help' as const }
  const members: PensaWorkerMembers = {
    ...pensaContextMembers(context),
    pensaClaimOperation: async (_actor, _id, _op, leaseId) => {
      calls.push('claim')
      return { status: 200, body: { work: { ...work, leaseId } } }
    },
    pensaPublishOperation: async (_actor, _id, _op, _lease, result) => {
      calls.push('publish')
      expect(result).toEqual({ type: 'answer', text: 'Confira a regra das duas cartas.' })
      context.view.operation = null
      return { status: 200, body: { ok: true } }
    },
    pensaFailOperation: async () => {
      throw new Error('No failure expected')
    },
  }
  await workPensa({
    members,
    user: PENSA_USER,
    actor: PENSA_ACTOR,
    projectId: context.view.project.id,
    loadContext: async () => {
      calls.push('context')
      return context
    },
    complete: async (options) =>
      options.schema.parse({ text: 'Confira a regra das duas cartas.', referenceIds: [] }),
  })
  expect(calls).toEqual(['context', 'claim', 'context', 'context', 'publish', 'context'])
})

test('failed publication explicitly fails its lease and preserves the resumable candidate', async () => {
  const context = pensaContext()
  const work = {
    ...pensaWork(context),
    step: 'answer' as const,
    kind: 'help' as const,
    output: PensaJsonObjectSchema.parse({ preserved: 'canonical choice' }),
  }
  const failures: string[] = []
  const members: PensaWorkerMembers = {
    ...pensaContextMembers(context),
    pensaClaimOperation: async (_actor, _id, _op, leaseId) => ({
      status: 200,
      body: { work: { ...work, leaseId } },
    }),
    pensaPublishOperation: async () => ({ status: 409, body: { ok: true } }),
    pensaFailOperation: async (_actor, _id, _op, _lease, message) => {
      failures.push(message)
      return { status: 200, body: { ok: true } }
    },
  }
  await workPensa({
    members,
    user: PENSA_USER,
    actor: PENSA_ACTOR,
    projectId: context.view.project.id,
    loadContext: async () => context,
    complete: async (options) =>
      options.schema.parse({ text: 'Confira o resultado.', referenceIds: [] }),
  })
  expect(failures).toHaveLength(1)
  expect(failures[0]).toContain('recursos mudaram')
  expect(work.output).toEqual({ preserved: 'canonical choice' })
})

test('a busy lease or rejected admission cannot call the paid provider', async () => {
  for (const status of [200, 429]) {
    const context = pensaContext()
    const provider = mock(async () => {
      throw new Error('No provider call expected')
    })
    const members: PensaWorkerMembers = {
      ...pensaContextMembers(context),
      pensaClaimOperation: async () => ({ status, body: { work: null } }),
      pensaPublishOperation: async () => {
        throw new Error('No publication expected')
      },
      pensaFailOperation: async () => {
        throw new Error('No lease acquired')
      },
    }
    await workPensa({
      members,
      user: PENSA_USER,
      actor: PENSA_ACTOR,
      projectId: context.view.project.id,
      loadContext: async () => context,
      complete: provider,
    })
    expect(provider).not.toHaveBeenCalled()
  }
})

test('a teammate resuming the work preserves the original author for help context and publication', async () => {
  const context = pensaContext()
  const original = { profileId: pensaId(61), accountId: pensaId(62), privileged: false }
  const work = {
    ...pensaWork(context),
    actor: original,
    kind: 'help' as const,
    step: 'answer' as const,
  }
  const contexts: string[] = []
  const members: PensaWorkerMembers = {
    ...pensaContextMembers(context),
    pensaClaimOperation: async (_actor, _id, _operation, leaseId) => ({
      status: 200,
      body: { work: { ...work, leaseId } },
    }),
    pensaPublishOperation: async (actor) => {
      expect(actor).toEqual(original)
      context.view.operation = null
      return { status: 200, body: { ok: true } }
    },
    pensaFailOperation: async () => {
      throw new Error('No failure expected')
    },
  }
  await workPensa({
    members,
    user: PENSA_USER,
    actor: PENSA_ACTOR,
    projectId: context.view.project.id,
    loadContext: async (_members, _user, actor) => {
      contexts.push(actor.profileId)
      return context
    },
    complete: async (options) =>
      options.schema.parse({ text: 'Confira a regra escolhida.', referenceIds: [] }),
  })
  expect(contexts.slice(0, 3)).toEqual([
    PENSA_ACTOR.profileId,
    original.profileId,
    original.profileId,
  ])
})
