import { afterEach, expect, mock, spyOn, test } from 'bun:test'
import type { StudioAiActor, StudioAiUsageAction } from '@sistemazero/core/ai-credits'
import { createBlankProjectSnapshot } from '@sistemazero/studio/blank-project'
import { pythonEnvironmentFixture } from '../../studio/src/state/fixtures/pythonEnvironment'
import { studioDescriptionInput } from '../src/lib/studio-description-input'

mock.module('server-only', () => ({}))
process.env.JWT_HS256_SECRET ??= 'description-test-secret-with-32-characters'
const { generateProjectDescription } = await import('../src/server/openrouter')
afterEach(() => mock.restore())

for (const kind of ['classic', 'pro'] as const)
  test(`Python ${kind} descriptions contain bounded Python source, without assets or requirements`, async () => {
    const { project } = await pythonEnvironmentFixture(kind)
    const source = 'import turtle\nturtle.forward(60)\n'.repeat(200)
    if (project.kind === 'pro') {
      project.tree[project.python.entrypoint] = { kind: 'file', content: source }
      project.tree['requirements.txt'] = { kind: 'file', content: 'PRIVATE_DEPENDENCIES' }
      for (let index = 0; index < 8; index++)
        project.tree[`helper_${index}.py`] = { kind: 'file', content: 'value = 42' }
    } else {
      project.files[project.python.entrypoint] = source
      project.files['requirements.txt'] = 'PRIVATE_DEPENDENCIES'
      for (let index = 0; index < 8; index++) project.files[`helper_${index}.py`] = 'value = 42'
    }
    const input = studioDescriptionInput(project, 'Meu Turtle')
    expect(input.kind).toBe('python')
    if (input.kind !== 'python') throw new Error('Expected Python description')
    expect(input.projectKind).toBe(kind)
    expect(input.sources).toHaveLength(6)
    expect(input.sources[0]).toEqual({
      path: project.python.entrypoint,
      content: source.slice(0, 4000),
    })
    expect(JSON.stringify(input)).not.toContain('PRIVATE_DEPENDENCIES')
    expect(JSON.stringify(input)).not.toContain(project.runtime.manifestSha256)
  })

test('Pro description reads bounded real sources, not dormant classic code or binaries', () => {
  const project = {
    ...createBlankProjectSnapshot('pro-game', 'Ilha'),
    kind: 'pro' as const,
    tree: {
      'src/main.ts': { kind: 'file' as const, content: 'movement'.repeat(1000) },
      'package-lock.json': { kind: 'file' as const, content: 'LOCK' },
      'public/private.json': { kind: 'file' as const, content: 'BINARY' },
    },
  }
  const input = studioDescriptionInput(project, 'Ilha')
  expect(input.kind).toBe('pro')
  expect('sources' in input && input.sources).toEqual([
    { path: 'src/main.ts', content: 'movement'.repeat(1000).slice(0, 4000) },
  ])
  expect(JSON.stringify(input)).not.toContain('LOCK')
  expect(JSON.stringify(input)).not.toContain('BINARY')
})

function execution(denied = false) {
  const actions: StudioAiUsageAction[] = [],
    actors: StudioAiActor[] = []
  return {
    actions,
    actors,
    members: {
      studioAiUsage: async (actor: StudioAiActor, action: StudioAiUsageAction) => {
        actions.push(action)
        actors.push(actor)
        return {
          status: 200,
          body:
            action.operation === 'reserve'
              ? {
                  reservation: denied
                    ? { allowed: false, scope: 'cost-day', credits: {} }
                    : {
                        allowed: true,
                        source: 'openrouter',
                        credits: {},
                        priceCaps: { prompt: 1, completion: 4, request: 0 },
                        expiresAt: new Date(Date.now() + 300000).toISOString(),
                      },
                }
              : action.operation === 'dispatch'
                ? { dispatch: { source: 'openrouter', apiKey: 'responsible-adult-test-key' } }
                : { ok: true },
        }
      },
    },
    user: {
      id: 'learner',
      activeProfile: { accountId: 'family' },
      status: 'active',
      role: 'student',
    },
  }
}

test('short description uses the adult connection and the same durable cost ledger exactly once', async () => {
  const state = execution()
  const wire = spyOn(globalThis, 'fetch').mockImplementation((async (
    _url: unknown,
    init: RequestInit,
  ) => {
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer responsible-adult-test-key')
    const body = JSON.parse(String(init.body))
    expect(body.messages[1].content).toContain('Modo Pro')
    expect(body.max_tokens).toBe(160)
    expect(body.provider.max_price).toEqual({ prompt: 1, completion: 4, request: 0 })
    return Response.json({
      id: 'gen-description',
      choices: [{ message: { content: 'Este jogo protege uma ilha.' } }],
      usage: { cost: 0.000004 },
    })
  }) as typeof fetch)
  const result = await generateProjectDescription(
    { kind: 'pro', projectId: 'project', sources: [{ path: 'src/main.ts', content: 'move()' }] },
    state as never,
  )
  expect(result.description).toBe('Este jogo protege uma ilha.')
  expect(wire).toHaveBeenCalledTimes(1)
  expect(state.actions.map((action) => action.operation)).toEqual([
    'reserve',
    'dispatch',
    'settle',
    'finish',
  ])
  expect(state.actions[2]).toMatchObject({ settlement: { status: 'confirmed', actualMicroUsd: 4 } })
  expect(state.actors.every((actor) => actor.accountId === 'family' && !actor.privileged)).toBe(
    true,
  )
})

test('quota refusal and uncertain transport failures never make another provider call', async () => {
  const wire = spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Response lost'))
  const denied = await generateProjectDescription(
    { files: { js: 'start()' } },
    execution(true) as never,
  )
  expect(denied).toMatchObject({ quotaExceeded: true, scope: 'day', fallback: true })
  expect(wire).not.toHaveBeenCalled()
  const state = execution()
  expect(
    await generateProjectDescription({ files: { js: 'start()' } }, state as never),
  ).toMatchObject({ fallback: true })
  expect(wire).toHaveBeenCalledTimes(1)
  expect(state.actions[2]).toMatchObject({ settlement: { status: 'uncertain' } })
  expect(state.actions.at(-1)?.operation).toBe('finish')
})
