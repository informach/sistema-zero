import { expect, spyOn, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { LiveWorkspaceView } from '@sistemazero/core/live'
import type { Project } from '@sistemazero/studio'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { useLiveProRuntime } from '../src/components/live/use-live-pro-runtime'
import { createLiveProRuntime } from '../src/lib/live/pro-runtime'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
type Input = Parameters<typeof useLiveProRuntime>[0]
function fixture() {
  const project: Project = {
    id: crypto.randomUUID(),
    name: 'Oficina Pro',
    formatVersion: 2,
    kind: 'pro',
    mode: 'code',
    createdAt: 1,
    updatedAt: 1,
    files: { 'index.html': '', 'style.css': '', 'script.js': '' },
    ir: null,
    blocksState: null,
    installedExtensions: [],
    tree: { 'index.html': { kind: 'file', content: '<main>Oi</main>' } },
    proMeta: { templateId: 'vanilla-js', devScript: 'dev' },
  }
  const userId = crypto.randomUUID()
  let current: LiveWorkspaceView = {
    id: project.id,
    sessionId: crypto.randomUUID(),
    learnerId: userId,
    revision: 0,
    writerId: userId,
    writerEpoch: 1,
    writerDeviceId: crypto.randomUUID(),
    leaseExpiresAt: new Date(Date.now() + 30_000).toISOString(),
    project: { ...project },
    assistance: null,
    updatedAt: new Date().toISOString(),
  }
  const context = {
    kind: 'live' as const,
    workspaceId: project.id,
    sessionId: current.sessionId,
    blockId: crypto.randomUUID(),
    deviceId: current.writerDeviceId ?? '',
    writerEpoch: 1,
  }
  const input: Input = {
    project,
    userId,
    context,
    enabled: true,
    leaseExpiresAt: current.leaseExpiresAt,
    queue: { current: Promise.resolve() },
    current: () => current,
    save: async () => {},
  }
  const authority = new AbortController()
  const adapter = () => createLiveProRuntime({ ...input, context, signal: authority.signal })
  const artifact = {
    id: 'a'.repeat(64),
    sha256: 'b'.repeat(64),
    url: `https://runtime.test/v1/artifacts/${'a'.repeat(64)}/index.html`,
    expiresAt: Date.now() + 60_000,
  }
  return {
    project,
    input,
    authority,
    adapter,
    artifact,
    context,
    update(change: Partial<LiveWorkspaceView>) {
      current = { ...current, ...change }
    },
  }
}
function intercept(handler: (...args: Parameters<typeof fetch>) => Promise<Response>) {
  return spyOn(globalThis, 'fetch').mockImplementation(
    Object.assign(handler, { preconnect: fetch.preconnect }),
  )
}

for (const stage of ['save', 'queue'] as const) {
  test(`aborting a pending ${stage} releases only the build consumer, preserving the real journal`, async () => {
    const f = fixture()
    const hold = Promise.withResolvers<void>()
    const entered = Promise.withResolvers<void>()
    let saved = false
    const journal = hold.promise.then(() => {
      saved = true
    })
    f.input.queue.current = journal
    f.input.save = async () => {
      entered.resolve()
      if (stage === 'save') await journal
    }
    const fetch = intercept(async () => {
      throw new Error('HTTP must not start')
    })
    const pending = f.adapter().build({ project: f.project })
    const settled = pending.then(
      () => 'resolved',
      () => 'rejected',
    )
    try {
      await entered.promise
      await Promise.resolve()
      const actualQueue = f.input.queue.current
      let drained = false
      void actualQueue.then(() => {
        drained = true
      })
      f.authority.abort()
      // A cancelled consumer settles before the next event-loop task; the write is still held.
      expect(
        await Promise.race([
          settled,
          new Promise<string>((resolve) => setTimeout(() => resolve('still-pending'), 0)),
        ]),
      ).toBe('rejected')
      expect(saved).toBe(false)
      expect(drained).toBe(false)
      expect(f.input.queue.current === actualQueue).toBe(true)
      expect(fetch).not.toHaveBeenCalled()
    } finally {
      hold.resolve()
      await settled
      await f.input.queue.current
      expect(saved).toBe(true)
      expect(fetch).not.toHaveBeenCalled()
      fetch.mockRestore()
    }
  })
}

test('flushes the real save boundary and journal before dispatch; long compilation does not hold the journal', async () => {
  const f = fixture()
  const save = Promise.withResolvers<void>()
  const saving = Promise.withResolvers<void>()
  const dispatched = Promise.withResolvers<void>()
  const build = Promise.withResolvers<Response>()
  f.input.save = async () => {
    saving.resolve()
    await save.promise
    f.update({ revision: 2 })
  }
  const calls: unknown[] = []
  const fetch = intercept(async (_url, init) => {
    calls.push(JSON.parse(String(init?.body)))
    dispatched.resolve()
    return build.promise
  })
  const pending = f.adapter().build({ project: f.project })
  try {
    await saving.promise
    expect(calls).toHaveLength(0)
    save.resolve()
    await dispatched.promise
    expect(calls).toEqual([{ context: f.context, expectedWorkspaceRevision: 2 }])
    let saved = false
    await f.input.queue.current.then(() => {
      saved = true
    })
    expect(saved).toBe(true)
    build.resolve(Response.json({ artifact: f.artifact, workspaceRevision: 2 }))
    expect(await pending).toEqual({ artifact: f.artifact })
  } finally {
    save.resolve()
    build.resolve(Response.json({ artifact: f.artifact, workspaceRevision: 2 }))
    await pending.catch(() => {})
    fetch.mockRestore()
  }
})

test('source/context changes during save or build reject old work without compiling replacement bytes', async () => {
  for (const stage of ['save', 'build'] as const) {
    const f = fixture()
    const calls: unknown[] = []
    const mutate = () =>
      f.update({
        project: {
          ...f.project,
          tree: { 'index.html': { kind: 'file', content: 'Outra revisão' } },
        },
        revision: 1,
      })
    if (stage === 'save') f.input.save = async () => mutate()
    const fetch = intercept(async (_url, init) => {
      calls.push(init?.body)
      mutate()
      return Response.json({ artifact: f.artifact, workspaceRevision: 0 })
    })
    try {
      expect(
        await f
          .adapter()
          .build({ project: f.project })
          .then(
            () => null,
            (error) => error,
          ),
      ).toBeInstanceOf(Error)
      expect(calls).toHaveLength(stage === 'save' ? 0 : 1)
    } finally {
      fetch.mockRestore()
    }
  }
})

test('authority abort and revision mismatch reject deferred responses; expired lease never dispatches', async () => {
  for (const reason of ['abort', 'revision', 'expiry'] as const) {
    const f = fixture()
    const fetch = intercept(async () => {
      if (reason === 'abort') f.authority.abort()
      return Response.json({
        artifact: f.artifact,
        workspaceRevision: reason === 'revision' ? 7 : 0,
      })
    })
    if (reason === 'expiry') f.update({ leaseExpiresAt: new Date(0).toISOString() })
    try {
      expect(
        await f
          .adapter()
          .build({ project: f.project })
          .then(
            () => null,
            (error) => error,
          ),
      ).toBeInstanceOf(Error)
      expect(fetch).toHaveBeenCalledTimes(reason === 'expiry' ? 0 : 1)
    } finally {
      fetch.mockRestore()
    }
  }
})

test('remote adapter is present while blocked; lease renewal preserves it, epoch/observer/unmount retire it', async () => {
  const f = fixture()
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  let current: ReturnType<typeof useLiveProRuntime> | undefined
  const observed: ReturnType<typeof useLiveProRuntime>['adapter'][] = []
  function Probe({ input }: { input: Input }) {
    current = useLiveProRuntime(input)
    observed.push(current.adapter)
    return null
  }
  const render = async () => {
    await act(async () => root.render(<Probe input={{ ...f.input }} />))
  }
  try {
    await render()
    const first = current?.adapter
    if (!first) throw new Error('Missing live adapter')
    expect(observed.every(Boolean)).toBe(true)
    expect(observed[0]?.signal?.aborted).toBe(true)
    expect(first.signal?.aborted).toBe(false)
    f.input.leaseExpiresAt = new Date(Date.now() + 60_000).toISOString()
    await render()
    expect(current?.adapter === first).toBe(true)
    f.input.leaseExpiresAt = new Date(0).toISOString()
    await render()
    expect(first.signal?.aborted).toBe(true)
    f.input.leaseExpiresAt = new Date(Date.now() + 60_000).toISOString()
    f.input.context = { ...f.context, writerEpoch: 2 }
    f.update({ writerEpoch: 2 })
    await render()
    expect(first.signal?.aborted).toBe(true)
    const second = current?.adapter
    expect(second === first).toBe(false)
    f.input.enabled = false
    await render()
    expect(second?.signal?.aborted).toBe(true)
    expect(current?.adapter?.signal?.aborted).toBe(true)
    f.input.enabled = true
    await render()
    const third = current?.adapter
    await act(async () => root.unmount())
    expect(third?.signal?.aborted).toBe(true)
  } finally {
    container.remove()
  }
})
