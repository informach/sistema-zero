import { describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  parseBootstrapArguments,
  parseBootstrapOutput,
  preparationProgress,
  runRemoteBootstrap,
  stagingJourney,
} from './kids-journey-bootstrap.mjs'

const deployment = '22222222-2222-4222-8222-222222222222'
const preparationId = '33333333-3333-4333-8333-333333333333'
const input = { action: 'initialize', sha: 'a'.repeat(40), deployment, nonce: 'b'.repeat(32) }
const env = {
  RAILWAY_ENVIRONMENT_ID: stagingJourney.environment,
  RAILWAY_SERVICE_ID: stagingJourney.members,
  RAILWAY_DEPLOYMENT_ID: deployment,
  RAILWAY_GIT_COMMIT_SHA: input.sha,
  DATABASE_URL: 'local-fixture-only',
  AUTH_BASE_URL: 'local-fixture-only',
  AUTH_INTERNAL_TOKEN: 'local-fixture-only',
  MEMBERS_PROFILE_ADMISSION_TOKEN: 'local-fixture-only',
}

describe('remote canonical bootstrap wrapper', () => {
  test('staging argv remains unchanged and production requires its explicit closed target prefix', () => {
    const values = ['initialize', input.sha, deployment, input.nonce]
    expect(parseBootstrapArguments(values)).toEqual({ ...input, preparationId: undefined })
    expect(parseBootstrapArguments(['--target', 'production', ...values])).toEqual({
      ...input,
      target: 'production',
      preparationId: undefined,
    })
    for (const invalid of [
      ['--target', 'prod', ...values],
      ['--target', ...values],
      [...values, preparationId, 'extra'],
    ])
      expect(() => parseBootstrapArguments(invalid)).toThrow()
  })
  test('executable refuses a wrong artifact without logging credentials or child error objects', () => {
    const result = spawnSync(
      'node',
      [
        fileURLToPath(new URL('./kids-journey-bootstrap.mjs', import.meta.url)),
        'initialize',
        input.sha,
        deployment,
        input.nonce,
      ],
      {
        env: {
          ...process.env,
          ...env,
          RAILWAY_ENVIRONMENT_ID: 'wrong',
          DATABASE_URL: 'must-not-leave-process',
        },
        encoding: 'utf8',
        timeout: 10000,
      },
    )
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Bootstrap Kids falhou')
    expect(result.stdout + result.stderr).not.toContain('must-not-leave-process')
  })
  test.each([
    'RAILWAY_ENVIRONMENT_ID',
    'RAILWAY_SERVICE_ID',
    'RAILWAY_DEPLOYMENT_ID',
    'RAILWAY_GIT_COMMIT_SHA',
  ])('refuses wrong %s before running a command', async (key) => {
    let called = false
    await expect(
      runRemoteBootstrap(
        input,
        { ...env, [key]: 'wrong' },
        {
          exec: () => {
            called = true
          },
        },
      ),
    ).rejects.toThrow('divergente')
    expect(called).toBe(false)
  })
  test('uses the existing CLI and returns only its receipt, never extra policy or secrets', async () => {
    const calls: string[][] = []
    const reply = await runRemoteBootstrap(input, env, {
      exec: (args: string[]) => {
        calls.push(args)
        return JSON.stringify({
          status: 'initializing',
          version: 0,
          preparationId,
          secret: 'must-not-leave-container',
          policy: { arbitrary: true },
        })
      },
    })
    expect(calls).toEqual([
      [
        'run',
        'packages/members/scripts/bootstrap-kids-journey.ts',
        'initialize',
        '--confirm-rollout-order',
      ],
    ])
    expect(reply).toEqual({
      kind: 'kids-journey-rollout',
      nonce: input.nonce,
      status: 'initializing',
      version: 0,
      preparationId,
    })
  })
  test('advance keeps the preparation and bounded canonical steps', async () => {
    let captured: string[] = []
    await runRemoteBootstrap({ ...input, action: 'advance', preparationId }, env, {
      exec: (args: string[]) => {
        captured = args
        return JSON.stringify({ status: 'advanced', phase: 'ready', preparationId, processed: 2 })
      },
      readPreparation: async () => ({
        id: preparationId,
        origin: 'seed',
        expectedVersion: 0,
        captureStage: 'done',
        status: 'ready',
        processed: 2,
      }),
    })
    expect(captured.slice(-4)).toEqual(['--preparation', preparationId, '--steps', '20'])
  })
  test('progress distinguishes phase/owner cursors without exposing them or treating zero as failure', () => {
    const state = {
      id: preparationId,
      origin: 'seed',
      expectedVersion: 0,
      status: 'capturing',
      captureStage: 'auth',
      authCapture: null,
      processed: 0,
    }
    const a = preparationProgress(state, preparationId)
    expect(a).toMatch(/^[a-f0-9]{64}$/)
    expect(
      preparationProgress(
        { ...state, authCapture: { upperBound: deployment, cursor: preparationId } },
        preparationId,
      ),
    ).not.toBe(a)
    expect(preparationProgress({ ...state, captureStage: 'members' }, preparationId)).not.toBe(a)
  })
  test('migration uses the existing Members migrate command before initialization', async () => {
    const calls: string[][] = []
    expect(
      (
        await runRemoteBootstrap({ ...input, action: 'migrate' }, env, {
          exec: (args: string[]) => {
            calls.push(args)
            return ''
          },
        })
      ).status,
    ).toBe('migrated')
    expect(calls).toEqual([['run', '--filter', '@sistemazero/members', 'db:migrate']])
  })
  test('verify only reads the canonical snapshot and refuses initializing', async () => {
    let calls = 0
    const verify = { ...input, action: 'verify' }
    const ports = {
      exec: () => {
        throw new Error('No command should run')
      },
      readPublished: async () => {
        calls++
        return { phase: 'published', version: 9 }
      },
    }
    expect((await runRemoteBootstrap(verify, env, ports)).version).toBe(9)
    expect(calls).toBe(1)
    await expect(
      runRemoteBootstrap(verify, env, {
        ...ports,
        readPublished: async () => ({ phase: 'initializing', version: 0 }),
      }),
    ).rejects.toThrow('não publicada')
  })
  test.each([
    'stale',
    'blocked',
    'unknown',
  ])('does not turn %s into a successful advance', (status) => {
    expect(() =>
      parseBootstrapOutput(
        JSON.stringify({ status, phase: 'ready', preparationId, processed: 2 }),
        'advance',
        preparationId,
      ),
    ).toThrow()
  })
  test('refuses identity changes, malformed output and a published zero version', () => {
    expect(() => parseBootstrapOutput('not-json', 'initialize')).toThrow()
    expect(() =>
      parseBootstrapOutput(
        JSON.stringify({ status: 'already-published', version: 0 }),
        'initialize',
      ),
    ).toThrow()
    expect(() =>
      parseBootstrapOutput(
        JSON.stringify({
          status: 'advanced',
          phase: 'ready',
          preparationId: deployment,
          processed: 1,
        }),
        'advance',
        preparationId,
      ),
    ).toThrow()
  })
})
