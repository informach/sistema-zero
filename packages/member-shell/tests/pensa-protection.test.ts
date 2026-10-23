import { expect, mock, test } from 'bun:test'
import type { PensaClient } from '../src/server/pensa-client'
import { PENSA_ACTOR, pensaContext, pensaId } from './pensa-fixtures'

mock.module('server-only', () => ({}))
const { protectPensaProject, restorePensaProject } = await import('../src/server/pensa/protection')

test('a definitive prepare refusal preserves its status so the UI can start a new attempt', async () => {
  const context = pensaContext()
  const members: Pick<PensaClient, 'pensaProtect'> = {
    pensaProtect: async () => ({ status: 409, body: context.view }),
  }
  await expect(
    protectPensaProject(
      members,
      PENSA_ACTOR,
      context,
      { requestId: pensaId(30), baseRevisionId: pensaId(31), saveRevision: '7' },
      { refreshContext: async () => context },
    ),
  ).rejects.toMatchObject({ status: 409 })
})

test('a definitive commit refusal stays definitive after aborting the copy', async () => {
  const context = pensaContext()
  const members: Pick<PensaClient, 'pensaProtect'> = {
    pensaProtect: async (_actor, _id, action) => ({
      status: action.type === 'commit' ? 409 : 200,
      body: action.type === 'prepare' ? { id: action.id, files: [] } : context.view,
    }),
  }
  await expect(
    protectPensaProject(
      members,
      PENSA_ACTOR,
      context,
      { requestId: pensaId(30), baseRevisionId: pensaId(31), saveRevision: '7' },
      { refreshContext: async () => context, copyFiles: async () => {} },
    ),
  ).rejects.toMatchObject({ status: 409 })
})

test('copy failure aborts its ticket and cannot commit or change the current game', async () => {
  const context = pensaContext()
  const calls: string[] = []
  const members: Pick<PensaClient, 'pensaProtect'> = {
    pensaProtect: async (_actor, _id, action) => {
      calls.push(action.type)
      return {
        status: 200,
        body:
          action.type === 'prepare'
            ? { id: action.id, files: [{ source: 'saved', destination: 'checkpoint' }] }
            : context.view,
      }
    },
  }
  await expect(
    protectPensaProject(
      members,
      PENSA_ACTOR,
      context,
      { requestId: pensaId(30), baseRevisionId: pensaId(31), saveRevision: '7' },
      {
        refreshContext: async () => context,
        copyFiles: async () => {
          throw new Error('copy failed')
        },
      },
    ),
  ).rejects.toThrow('copy failed')
  expect(calls).toEqual(['prepare', 'abort'])
})

test('a rejected commit aborts copied destinations and reports failure instead of success', async () => {
  const context = pensaContext()
  const calls: string[] = []
  const members: Pick<PensaClient, 'pensaProtect'> = {
    pensaProtect: async (_actor, _id, action) => {
      calls.push(action.type)
      return {
        status: action.type === 'commit' ? 409 : 200,
        body: action.type === 'prepare' ? { id: action.id, files: [] } : context.view,
      }
    },
  }
  await expect(
    protectPensaProject(
      members,
      PENSA_ACTOR,
      context,
      { requestId: pensaId(30), baseRevisionId: pensaId(31), saveRevision: '7' },
      { refreshContext: async () => context, copyFiles: async () => {} },
    ),
  ).rejects.toThrow('confirmar a cópia')
  expect(calls).toEqual(['prepare', 'commit', 'abort'])
})

test('restore first protects the current saved version, then copies and commits with fresh capabilities', async () => {
  const context = pensaContext()
  const fresh = pensaContext()
  fresh.capabilities.fingerprint = 'd'.repeat(64)
  const calls: string[] = []
  const fingerprints: string[] = []
  const members: Pick<PensaClient, 'pensaProtect'> = {
    pensaProtect: async (_actor, _id, action, caps) => {
      calls.push(action.type)
      fingerprints.push(caps.fingerprint)
      return {
        status: 200,
        body:
          action.type === 'prepare' || action.type === 'restore_prepare'
            ? { id: action.id, files: [{ source: 'saved', destination: action.type }] }
            : context.view,
      }
    },
  }
  await restorePensaProject(
    members,
    PENSA_ACTOR,
    context,
    pensaId(45),
    { requestId: pensaId(30), baseRevisionId: pensaId(31), saveRevision: '7' },
    {
      refreshContext: async () => fresh,
      copyFiles: async () => {
        calls.push('copy')
      },
    },
  )
  expect(calls).toEqual(['prepare', 'copy', 'commit', 'restore_prepare', 'copy', 'restore_commit'])
  expect(fingerprints).toEqual([
    context.capabilities.fingerprint,
    fresh.capabilities.fingerprint,
    fresh.capabilities.fingerprint,
    fresh.capabilities.fingerprint,
  ])
})
