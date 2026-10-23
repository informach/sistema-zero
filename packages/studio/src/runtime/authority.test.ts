import { expect, spyOn, test } from 'bun:test'
import { createStudioRuntimeAuthority, type StudioRuntimeAuthoritySnapshot } from './authority'

function initial(): StudioRuntimeAuthoritySnapshot {
  return {
    available: true,
    pythonAuthoring: [
      {
        runtime: { profileId: 'python', releaseId: 'current', manifestSha256: 'a'.repeat(64) },
        blockIds: ['sz_py_pass', 'sz_py_integer'],
      },
    ],
    grantedExtensionIds: ['python-turtle'],
    capabilities: ['edit', 'export-source'],
    releaseStatus: 'active',
    curation: { pythonLevel: 3, allowBlocks: ['sz_py_pass', 'sz_py_integer'] },
  }
}

test('authority owns a deeply immutable snapshot and ignores equivalent set order', () => {
  const input = initial()
  const store = createStudioRuntimeAuthority(input)
  const first = store.authority.getSnapshot()
  let notices = 0
  const unsubscribe = store.authority.subscribe(() => notices++)
  expect(first).not.toBe(input)
  for (const object of [
    first,
    first.curation,
    first.curation?.allowBlocks,
    first.pythonAuthoring,
    first.pythonAuthoring[0],
    first.pythonAuthoring[0]?.runtime,
    first.pythonAuthoring[0]?.blockIds,
    first.grantedExtensionIds,
    first.capabilities,
  ])
    expect(Object.isFrozen(object)).toBe(true)
  store.update({
    ...input,
    capabilities: [...input.capabilities].reverse(),
    pythonAuthoring: input.pythonAuthoring.map((item) => ({
      ...item,
      blockIds: [...item.blockIds].reverse(),
    })),
    curation: { ...input.curation, allowBlocks: [...input.curation!.allowBlocks!].reverse() },
  })
  expect(store.authority.getSnapshot()).toBe(first)
  expect(notices).toBe(0)
  store.update({ ...input, grantedExtensionIds: [] })
  expect(notices).toBe(1)
  expect(store.authority.getSnapshot().grantedExtensionIds).toEqual([])
  unsubscribe()
  store.update({ ...input, available: false, capabilities: [] })
  expect(notices).toBe(1)
})

test('authority subscriber errors are reported without skipping the remaining listeners', () => {
  const callbacks: VoidFunction[] = []
  const queued = spyOn(globalThis, 'queueMicrotask').mockImplementation((callback) => {
    callbacks.push(callback)
  })
  const store = createStudioRuntimeAuthority(initial())
  const failure = new Error('subscriber failed')
  let reached = 0
  store.authority.subscribe(() => {
    throw failure
  })
  store.authority.subscribe(() => reached++)
  try {
    store.update({ ...initial(), available: false })
    expect(reached).toBe(1)
    expect(callbacks).toHaveLength(1)
    // A runtime without reportError must surface the error rather than swallow it.
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'reportError')
    Object.defineProperty(globalThis, 'reportError', { configurable: true, value: undefined })
    try {
      expect(callbacks[0]).toThrow(failure)
    } finally {
      if (descriptor) Object.defineProperty(globalThis, 'reportError', descriptor)
      else Reflect.deleteProperty(globalThis, 'reportError')
    }
  } finally {
    queued.mockRestore()
  }
})
