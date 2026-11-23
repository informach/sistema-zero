import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { SectionProjectLiveContext } from '@sistemazero/core/learning'
import type { StudioHandle } from '@sistemazero/studio'
import { createEmptyProject } from '../../../studio/src/core/project'
import type { LessonPlayerContextValue } from '../../src/components/lesson-player-context'

GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { LessonPlayerProvider } = await import('../../src/components/lesson-player-context')
const { SectionProjectCheck } = await import('../../src/components/studio/section-project-check')

async function harness(
  subscribe = true,
  save: () => Promise<void> = async () => {},
  initialLive?: { key: string; prepare(signal: AbortSignal): Promise<SectionProjectLiveContext> },
) {
  let live = initialLive
  const originalFetch = globalThis.fetch
  const entered = Promise.withResolvers<void>()
  const response = Promise.withResolvers<Response>()
  const requests: RequestInit[] = []
  globalThis.fetch = Object.assign(
    async (_input: RequestInfo | URL, init?: RequestInit) => {
      requests.push(init ?? {})
      entered.resolve()
      return response.promise // Deliberately noncooperative; the component must still own withdrawal.
    },
    { preconnect: originalFetch.preconnect },
  )
  let project = createEmptyProject('project', 'Jogo')
  const listeners = new Set<() => void>()
  const handle: StudioHandle = {
    getProject: () => project,
    save,
    onProjectChange: subscribe
      ? (listener) => {
          listeners.add(listener)
          return () => {
            listeners.delete(listener)
          }
        }
      : undefined,
    getCodeCursorAnchor: async () => null,
    getCodeCursorPosition: async () => null,
    onCodeCursorChange: () => () => {},
    replaceProject: (next) => {
      if (next.programmingLanguage === 'python') throw new Error('JS test port')
      project = next
    },
    prepareHandoff: async () => project,
    applyObservedRevision: async () => {},
    resumeAuthorship: () => {},
    setMode: () => {},
    isDirty: () => false,
  }
  const ref: { current: StudioHandle | null } = { current: handle }
  let refreshed = 0
  let player: LessonPlayerContextValue = {
    lessonId: 'lesson',
    courseSlug: 'course',
    viewerWatermark: null,
    viewerId: 'child',
    initialPositionSeconds: null,
    sectionProjectCheck: {
      blockId: 'block',
      sectionId: 'section',
      revision: 'revision',
      objectives: [{ id: 'loop', label: 'Repita', kind: 'idea' }],
    },
    refreshAfterLearning: () => {
      refreshed++
    },
  }
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const render = () =>
    act(async () =>
      root.render(
        <LessonPlayerProvider value={player}>
          <SectionProjectCheck blockId="block" handleRef={ref} live={live} />
        </LessonPlayerProvider>,
      ),
    )
  await render()
  const verify = () =>
    act(async () => host.querySelector<HTMLButtonElement>('.sz-lesson-objectives-action')!.click())
  const edit = () =>
    act(async () => {
      project = { ...project, files: { ...project.files, 'script.js': 'let changed = true' } }
      for (const listener of listeners) listener()
    })
  const reply = (passed = true) =>
    act(async () => {
      response.resolve(Response.json({ passed, results: [{ id: 'loop', passed }] }))
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
  return {
    host,
    entered,
    requests,
    verify,
    edit,
    reply,
    bridgePending: () => {
      project = { ...project, bridgeCodeAhead: true }
    },
    bridgeReady: () => {
      const { bridgeCodeAhead: _pending, ...ready } = project
      project = ready
    },
    retireHandle: () => {
      ref.current = null
    },
    replaceHandle: () => {
      ref.current = { ...handle }
    },
    refreshed: () => refreshed,
    replaceRevision: async () => {
      player = {
        ...player,
        sectionProjectCheck: { ...player.sectionProjectCheck!, revision: 'new-revision' },
      }
      await render()
    },
    replaceLive: async () => {
      if (!live) throw new Error('Missing live context')
      live = { ...live, key: 'new-live-writer' }
      await render()
    },
    close: async () => {
      await act(async () => root.unmount())
      response.resolve(Response.json({ passed: true, results: [] }))
      host.remove()
      globalThis.fetch = originalFetch
    },
  }
}

test('objective details can collapse without hiding the verification action', async () => {
  const h = await harness()
  try {
    const toggle = h.host.querySelector<HTMLButtonElement>('button[aria-expanded]')
    expect(Boolean(toggle)).toBe(true)
    expect(toggle?.getAttribute('aria-expanded')).toBe('false')
    const details = document.getElementById(toggle!.getAttribute('aria-controls')!)
    expect(details?.hidden).toBe(true)
    expect(h.host.querySelector('.sz-lesson-objectives-action')?.closest('[hidden]')).toBeNull()
    await act(async () => toggle!.click())
    expect(toggle?.getAttribute('aria-expanded')).toBe('true')
    expect(details?.hidden).toBe(false)
    await act(async () => toggle!.click())
    expect(details?.hidden).toBe(true)
  } finally {
    await h.close()
  }
})

test('failed checks open the details and successful checks update the compact progress', async () => {
  for (const passed of [false, true]) {
    const h = await harness()
    try {
      await h.verify()
      await h.entered.promise
      await h.reply(passed)
      const toggle = h.host.querySelector<HTMLButtonElement>('button[aria-expanded]')
      expect(toggle?.getAttribute('aria-expanded')).toBe(passed ? 'false' : 'true')
      expect(toggle?.textContent).toContain(passed ? '1 de 1 cumpridos' : '0 de 1 cumpridos')
      expect(h.host.querySelector('.sz-lesson-objectives-action')?.closest('[hidden]')).toBeNull()
    } finally {
      await h.close()
    }
  }
})

test('editing cancels the request immediately and an old successful response cannot approve the new project', async () => {
  const h = await harness()
  try {
    await h.verify()
    await h.entered.promise
    expect(h.requests).toHaveLength(1)
    await h.edit()
    expect(h.requests[0]?.signal?.aborted).toBe(true)
    expect(h.host.querySelector<HTMLButtonElement>('.sz-lesson-objectives-action')?.disabled).toBe(
      false,
    )
    await h.reply()
    expect(h.refreshed()).toBe(0)
    expect(h.host.querySelector('[data-state="passed"]')).toBeNull()
  } finally {
    await h.close()
  }
})

test('successful feedback is cleared on subsequent editing without regressing recorded progression', async () => {
  const h = await harness()
  try {
    await h.verify()
    await h.entered.promise
    await h.reply()
    expect(h.refreshed()).toBe(1)
    expect(h.host.querySelector('[data-state="passed"]')).not.toBeNull()
    await h.edit()
    expect(h.host.querySelector('[data-stale="true"][data-state="passed"]')).not.toBeNull()
    expect(h.host.querySelector('[role="status"]')?.textContent).toBe('')
    expect(h.refreshed()).toBe(1)
  } finally {
    await h.close()
  }
})

test('a new section revision withdraws the previous request and cannot receive its grade', async () => {
  const h = await harness()
  try {
    await h.verify()
    await h.entered.promise
    await h.replaceRevision()
    expect(h.requests[0]?.signal?.aborted).toBe(true)
    await h.reply()
    expect(h.refreshed()).toBe(0)
    expect(h.host.querySelector('[data-state="passed"]')).toBeNull()
  } finally {
    await h.close()
  }
})

test('legacy handles without subscriptions still reject feedback for changed source', async () => {
  const h = await harness(false)
  try {
    await h.verify()
    await h.entered.promise
    await h.edit()
    await h.reply()
    expect(h.refreshed()).toBe(0)
    expect(h.host.querySelector('[data-state="passed"]')).toBeNull()
  } finally {
    await h.close()
  }
})

test('unmounting during a noncooperative save never admits the check request afterwards', async () => {
  const entered = Promise.withResolvers<void>(),
    release = Promise.withResolvers<void>()
  const h = await harness(true, async () => {
    entered.resolve()
    await release.promise
  })
  await h.verify()
  await entered.promise
  await h.close()
  release.resolve()
  await new Promise((resolve) => setTimeout(resolve, 20))
  expect(h.requests).toHaveLength(0)
})

test.each([
  'unmount',
  'retire',
  'replace',
] as const)('a bridge parser wait cannot dispatch after editor %s', async (withdrawal) => {
  const h = await harness()
  let closed = false
  try {
    h.bridgePending()
    await h.verify()
    expect(h.requests).toHaveLength(0)
    if (withdrawal === 'unmount') {
      await h.close()
      closed = true
    } else if (withdrawal === 'retire') h.retireHandle()
    else h.replaceHandle()
    await act(async () => new Promise((resolve) => setTimeout(resolve, 250)))
    expect(h.requests).toHaveLength(0)
    expect(h.refreshed()).toBe(0)
  } finally {
    if (!closed) await h.close()
  }
})

test('the current editor can finish its bridge parser and verify the synchronized project', async () => {
  const h = await harness()
  try {
    h.bridgePending()
    await h.verify()
    expect(h.requests).toHaveLength(0)
    h.bridgeReady()
    await act(async () => new Promise((resolve) => setTimeout(resolve, 250)))
    expect(h.requests).toHaveLength(1)
    expect(JSON.parse(String(h.requests[0]?.body)).project.bridgeCodeAhead).toBeUndefined()
    await h.reply()
    expect(h.refreshed()).toBe(1)
  } finally {
    await h.close()
  }
})

function liveContext(): SectionProjectLiveContext {
  return {
    context: {
      kind: 'live',
      workspaceId: crypto.randomUUID(),
      sessionId: crypto.randomUUID(),
      blockId: crypto.randomUUID(),
      deviceId: crypto.randomUUID(),
      writerEpoch: 4,
    },
    expectedWorkspaceRevision: 7,
  }
}

test('a live check waits for preparation and sends its latest confirmed context with the project', async () => {
  const entered = Promise.withResolvers<void>(),
    release = Promise.withResolvers<void>()
  const context = liveContext()
  let ordinarySaves = 0
  const h = await harness(
    true,
    async () => {
      ordinarySaves++
    },
    {
      key: 'live-writer',
      async prepare(signal) {
        entered.resolve()
        await release.promise
        signal.throwIfAborted()
        return context
      },
    },
  )
  try {
    await h.verify()
    await entered.promise
    expect(h.requests).toHaveLength(0)
    release.resolve()
    await h.entered.promise
    expect(ordinarySaves).toBe(0)
    expect(JSON.parse(String(h.requests[0]?.body))).toMatchObject({
      revision: 'revision',
      project: { id: 'project' },
      liveContext: context,
    })
    await h.reply()
    expect(h.refreshed()).toBe(1)
  } finally {
    release.resolve()
    await h.close()
  }
})

test('a live writer change withdraws a pending preparation and never admits its late request', async () => {
  const entered = Promise.withResolvers<void>(),
    release = Promise.withResolvers<void>()
  let preparationSignal: AbortSignal | undefined
  const h = await harness(true, async () => {}, {
    key: 'live-writer',
    async prepare(signal) {
      preparationSignal = signal
      entered.resolve()
      await release.promise
      return liveContext()
    },
  })
  try {
    await h.verify()
    await entered.promise
    await h.replaceLive()
    expect(preparationSignal?.aborted).toBe(true)
    release.resolve()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(h.requests).toHaveLength(0)
    expect(h.refreshed()).toBe(0)
  } finally {
    release.resolve()
    await h.close()
  }
})
