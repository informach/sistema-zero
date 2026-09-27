import { expect, test } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { StrictMode } from 'react'
import { createSceneProject } from '../../../scene/createProject'
import { sceneSummary } from '../../../state/sceneMetadata'
import { deferred } from '../../../testing/deferred'
import { type SceneProjectLibrary, useSceneProjectList } from './useSceneProjectList'

type Listing = Awaited<ReturnType<SceneProjectLibrary['listSummaries']>>
type Connection = Awaited<ReturnType<SceneProjectLibrary['subscribe']>>
function listing(name: string): Listing {
  return {
    summaries: [sceneSummary(createSceneProject({ kind: 'empty', name }), 1, 0)],
    issues: [],
  }
}
function controlledLibrary() {
  const reads: Array<ReturnType<typeof deferred<Listing>>> = []
  const connections: Array<{
    done: ReturnType<typeof deferred<Connection>>
    notify: Parameters<SceneProjectLibrary['subscribe']>[0]
    signal: AbortSignal | undefined
    stopped: number
  }> = []
  const library: SceneProjectLibrary = {
    listSummaries: () => {
      const done = deferred<Listing>()
      reads.push(done)
      return done.promise
    },
    subscribe: (notify, signal) => {
      const item: (typeof connections)[number] = {
        done: deferred<Connection>(),
        notify,
        signal,
        stopped: 0,
      }
      connections.push(item)
      return item.done.promise
    },
  }
  function connect(index: number) {
    const item = connections[index]
    if (!item) throw new Error('Subscription was not requested')
    item.done.resolve({
      available: true,
      unsubscribe: () => {
        item.stopped++
      },
    })
  }
  function notify(index: number) {
    connections[index]?.notify({
      protocol: 1,
      type: 'scene-storage-changed',
      id: 'id',
      revision: 1,
      status: 'indexed',
    })
  }
  return { library, reads, connections, connect, notify }
}

test('project metadata subscription coalesces invalidations, ignores stale StrictMode connections and stops all reads on unmount', async () => {
  const p = controlledLibrary()
  const view = renderHook(() => useSceneProjectList(p.library), { wrapper: StrictMode })
  try {
    expect(p.connections).toHaveLength(2)
    expect(p.connections[0]?.signal?.aborted).toBe(true)
    expect(p.reads).toHaveLength(0)
    await act(async () => {
      p.connect(0)
      p.connect(1)
    })
    expect(p.connections[0]?.stopped).toBe(1)
    expect(p.reads).toHaveLength(1)
    act(() => {
      for (let i = 0; i < 100; i++) p.notify(1)
    })
    const first = listing('Primeiro'),
      latest = listing('Atualizado')
    await act(async () => {
      p.reads[0]?.resolve(first)
    })
    expect(p.reads).toHaveLength(2)
    expect(view.result.current.listing).toEqual(first)
    await act(async () => {
      p.reads[1]?.resolve(latest)
    })
    expect(view.result.current.listing).toEqual(latest)
    expect(p.reads).toHaveLength(2)
    const refresh = view.result.current.refresh
    view.unmount()
    expect(p.connections[1]?.signal?.aborted).toBe(true)
    expect(p.connections[1]?.stopped).toBe(1)
    await act(async () => {
      p.notify(1)
      await refresh()
    })
    expect(p.reads).toHaveLength(2)
  } finally {
    view.unmount()
  }
})

test('project list never shows another namespace, retains its own list on failure and recovers without notifications', async () => {
  const old = controlledLibrary(),
    next = controlledLibrary()
  const view = renderHook(({ library }) => useSceneProjectList(library), {
    initialProps: { library: old.library },
  })
  try {
    await act(async () => {
      old.connect(0)
    })
    const previous = listing('Outra pessoa')
    await act(async () => {
      old.reads[0]?.resolve(previous)
    })
    expect(view.result.current.listing).toEqual(previous)
    await act(async () => {
      void view.result.current.refresh()
    })
    // Start a second old read and switch owner while it is pending.
    expect(old.reads).toHaveLength(2)
    view.rerender({ library: next.library })
    expect(view.result.current.listing).toBeNull()
    expect(view.result.current.error).toBe(false)
    await act(async () => {
      old.reads[1]?.resolve(previous)
      next.connections[0]?.done.reject(new Error('Channel blocked'))
    })
    expect(view.result.current.listing).toBeNull()
    expect(next.reads).toHaveLength(1)
    await act(async () => {
      next.reads[0]?.reject(new Error('IDB unavailable'))
    })
    expect(view.result.current.error).toBe(true)
    expect(view.result.current.listing).toBeNull()
    const current = listing('Esta pessoa')
    await act(async () => {
      void view.result.current.refresh()
    })
    await act(async () => {
      next.reads[1]?.resolve(current)
    })
    expect(view.result.current.listing).toEqual(current)
    expect(view.result.current.error).toBe(false)
    await act(async () => {
      void view.result.current.refresh()
    })
    await act(async () => {
      next.reads[2]?.reject(new Error('Temporary read failure'))
    })
    expect(view.result.current.listing).toEqual(current)
    expect(view.result.current.error).toBe(true)
    expect(old.connections[0]?.stopped).toBe(1)
  } finally {
    view.unmount()
  }
})
