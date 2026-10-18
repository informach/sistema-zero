import { expect, test } from 'bun:test'
import { pythonEnvironmentFixture } from '../../state/fixtures/pythonEnvironment'
import type { StudioRuntimeEnvironment } from '../environment'
import { createStudioRuntimeRegistry } from '../registry'
import type { StudioRuntimeEvent, StudioRuntimeSession } from '../types'
import { createPythonExecutionController } from './controller'
import { preparePythonExecutionSnapshot } from './snapshot'

async function fixture(kind: 'classic' | 'pro' = 'classic') {
  const { project, environment: original } = await pythonEnvironmentFixture(kind)
  let currentProject = project
  let revoked = false
  let frames = 0
  let runs = 0
  let inputs = 0
  let evaluations = 0
  let allowRepl = true
  let epoch = 1
  const sessions: StudioRuntimeSession[] = []
  const listeners = new Map<StudioRuntimeSession, Set<(event: StudioRuntimeEvent) => void>>()
  let beforePrepare = async () => {}
  const environment: StudioRuntimeEnvironment = {
    ...original,
    access: () => ({
      ...original.access(project),
      releaseStatus: revoked ? 'revoked' : 'active',
      hostOperations: [
        { capability: 'execute', state: 'available' },
        { capability: 'python-repl', state: 'available' },
      ],
      grantedCapabilities: allowRepl ? ['execute', 'python-repl'] : ['execute'],
    }),
    registry: createStudioRuntimeRegistry([
      {
        id: 'test-controller',
        profileId: project.runtime.profileId,
        programmingLanguage: 'python',
        kinds: ['classic', 'pro'],
        load: async () => ({
          id: 'test-controller',
          prepare: async ({ identity }) => {
            await beforePrepare()
            const callbacks = new Set<(event: StudioRuntimeEvent) => void>()
            const session: StudioRuntimeSession = {
              identity,
              playback: { kind: 'stop-only' },
              repl: {
                kind: 'python',
                evaluate: async () => {
                  evaluations++
                },
              },
              run: async () => {
                expect(revoked).toBe(false)
                runs++
                for (const callback of callbacks)
                  callback({ identity, sequence: 1, type: 'state', state: 'running' })
              },
              subscribe: (listener) => {
                callbacks.add(listener)
                return () => {
                  callbacks.delete(listener)
                }
              },
              stop: async () => {},
              dispose: async () => {
                callbacks.clear()
              },
              provideInput: async () => {
                inputs++
              },
            }
            sessions.push(session)
            listeners.set(session, callbacks)
            return session
          },
        }),
      },
    ]),
  }
  const controller = createPythonExecutionController({
    instanceId: 'test',
    environment: () => environment,
    project: () => currentProject,
    canExecute: () => true,
    writerEpoch: () => epoch,
    mountFrame: () => {
      frames++
      let removed = false
      return {
        frame: document.createElement('iframe'),
        release: () => {
          if (!removed) frames--
          removed = true
        },
      }
    },
  })
  return {
    project,
    environment,
    controller,
    sessions,
    listeners,
    runs: () => runs,
    inputs: () => inputs,
    evaluations: () => evaluations,
    denyRepl: () => {
      allowRepl = false
    },
    switchProject: () => {
      currentProject = { ...project, id: 'another-project' }
    },
    frames: () => frames,
    revoke: () => {
      revoked = true
    },
    epoch: () => {
      epoch++
    },
    changeSource: () => {
      currentProject = { ...project, name: 'Changed while preparing' }
    },
    beforePrepare: (callback: () => Promise<void>) => {
      beforePrepare = callback
    },
  }
}

test('context disposal stops an existing run and prevents starting another in the revoked environment', async () => {
  const f = await fixture()
  const context = new AbortController()
  f.environment.signal = context.signal
  const original = JSON.stringify(f.project)
  await f.controller.run()
  expect(f.frames()).toBe(1)
  context.abort()
  expect(f.controller.getSnapshot().status).toBe('failed')
  await f.controller.stop()
  expect(f.frames()).toBe(0)
  expect(f.listeners.get(f.sessions[0]!)?.size).toBe(0)
  await expect(f.controller.run()).rejects.toThrow()
  expect(f.runs()).toBe(1)
  expect(JSON.stringify(f.project)).toBe(original)
  await f.controller.dispose()
})

test('revocation and Stop during ready prevent dispatch of the old run', async () => {
  for (const action of ['revoke', 'stop'] as const) {
    const f = await fixture()
    f.controller.subscribe(() => {
      if (f.controller.getSnapshot().status === 'ready') {
        if (action === 'revoke') f.revoke()
        else void f.controller.stop()
      }
    })
    await expect(f.controller.run()).rejects.toThrow()
    expect(f.runs()).toBe(0)
    await f.controller.dispose()
    expect(f.frames()).toBe(0)
  }
})

test('a restart during ready runs only the replacement generation', async () => {
  const f = await fixture()
  let restart: Promise<void> | undefined
  let started = false
  f.controller.subscribe(() => {
    if (!started && f.controller.getSnapshot().status === 'ready') {
      started = true
      restart = f.controller.run()
    }
  })
  await expect(f.controller.run()).rejects.toThrow()
  await restart
  expect(f.runs()).toBe(1)
  expect(f.controller.getSnapshot().identity?.runId).toBe(f.sessions[1]!.identity.runId)
  expect(f.frames()).toBe(1)
  await f.controller.dispose()
  expect(f.frames()).toBe(0)
})

test('late preparation after Stop or a source change cannot start a stale program', async () => {
  for (const action of ['stop', 'edit'] as const) {
    const f = await fixture()
    let release!: () => void
    let entered!: () => void
    const started = new Promise<void>((resolve) => {
      entered = resolve
    })
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    f.beforePrepare(async () => {
      entered()
      await gate
    })
    const run = f.controller.run()
    await started
    if (action === 'stop') await f.controller.stop()
    else f.changeSource()
    release()
    await expect(run).rejects.toThrow()
    expect(f.runs()).toBe(0)
    await f.controller.dispose()
    expect(f.frames()).toBe(0)
  }
})

test('writer epochs and fresh grants protect commands after a successful start', async () => {
  for (const action of ['epoch', 'revoke'] as const) {
    const f = await fixture()
    await f.controller.run()
    if (action === 'epoch') f.epoch()
    else f.revoke()
    await expect(f.controller.input('input', { kind: 'line', text: 'late' })).rejects.toThrow()
    expect(f.inputs()).toBe(0)
    await f.controller.dispose()
    expect(f.frames()).toBe(0)
  }
})

test('automatic and explicit cover requests share one capture, and Stop revokes both', async () => {
  const f = await fixture()
  await f.controller.run()
  let release!: () => void
  let captures = 0
  let captureStarted!: () => void
  const started = new Promise<void>((resolve) => {
    captureStarted = resolve
  })
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  f.sessions[0]!.captureSnapshot = async () => {
    captures++
    captureStarted()
    await gate
    return null
  }
  const first = f.controller.capture()
  const second = f.controller.capture()
  await started
  expect(captures).toBe(1)
  const results = Promise.allSettled([first, second])
  await f.controller.stop()
  release()
  expect((await results).map((result) => result.status)).toEqual(['rejected', 'rejected'])
  await f.controller.dispose()
})

test('REPL checks its own grant and current project independently of execute permission', async () => {
  for (const action of ['allowed', 'deny', 'switch', 'classic'] as const) {
    const f = await fixture(action === 'classic' ? 'classic' : 'pro')
    try {
      await f.controller.run()
      if (action === 'deny') f.denyRepl()
      if (action === 'switch') f.switchProject()
      if (action === 'allowed') {
        await f.controller.evaluate('command', '2 + 2')
        expect(f.evaluations()).toBe(1)
      } else {
        await expect(f.controller.evaluate('command', '2 + 2')).rejects.toThrow()
        expect(f.evaluations()).toBe(0)
      }
    } finally {
      await f.controller.dispose()
    }
  }
})

test('context authorization receives the real snapshot revision before a frame or run exists', async () => {
  const f = await fixture('pro')
  const snapshot = await preparePythonExecutionSnapshot(f.project)
  const operations: string[] = []
  f.environment.authorize = async ({ project, operation, revision, signal }) => {
    signal.throwIfAborted()
    expect(project).toBe(f.project)
    expect(revision).toBe(snapshot.revision)
    operations.push(operation)
    if (operations.length === 1) {
      expect(f.frames()).toBe(0)
      expect(f.runs()).toBe(0)
    }
  }
  await f.controller.run()
  await f.controller.input('input', { kind: 'line', text: 'ok' })
  await f.controller.evaluate('repl', '2 + 2')
  expect(operations).toEqual(['execute', 'execute', 'python-repl'])
  f.environment.authorize = async () => {
    throw new Error('Acesso revogado')
  }
  await expect(f.controller.evaluate('denied', '3 + 3')).rejects.toThrow('revogado')
  expect(f.evaluations()).toBe(1)
  await expect(f.controller.run()).rejects.toThrow('revogado')
  expect(f.runs()).toBe(1)
  expect(f.frames()).toBe(0)
  await f.controller.dispose()
})

test('late authorization after Stop or editing cannot start the captured project', async () => {
  for (const action of ['stop', 'edit'] as const) {
    const f = await fixture()
    let entered!: () => void
    let release!: () => void
    const started = new Promise<void>((resolve) => {
      entered = resolve
    })
    const pending = new Promise<void>((resolve) => {
      release = resolve
    })
    f.environment.authorize = async () => {
      entered()
      await pending
    }
    const run = f.controller.run()
    await started
    if (action === 'stop') await f.controller.stop()
    else f.changeSource()
    release()
    await expect(run).rejects.toThrow()
    expect(f.runs()).toBe(0)
    expect(f.frames()).toBe(0)
    await f.controller.dispose()
  }
})
