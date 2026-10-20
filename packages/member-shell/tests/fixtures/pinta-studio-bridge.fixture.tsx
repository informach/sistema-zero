import { afterEach, beforeEach, expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { PintaExportedAsset, PintaHostAdapter } from '@sistemazero/pinta'
import type { ReactNode } from 'react'

GlobalRegistrator.register({ settings: { disableIframePageLoading: true } })
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const canonical: PintaExportedAsset = {
  id: 'drawing',
  name: 'heroi',
  dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="16"><rect width="16" height="16" fill="red"/><rect x="16" width="16" height="16" fill="blue"/></svg>')}`,
  width: 32,
  height: 16,
  sprite: {
    frameW: 16,
    frameH: 16,
    animations: [{ name: 'andar', from: 0, to: 1, fps: 8, loop: true }],
  },
}
let current: PintaHostAdapter | undefined
let lookupGate = Promise.withResolvers<void>()
let lookupEntered = Promise.withResolvers<void>()
let linked = false
let saveOk = true
const lookups: Array<{ id: string; namespace: string }> = []
const saves: Array<{ asset: PintaExportedAsset; namespace: string }> = []
const cleanups: Array<() => void> = []
const router = { push: () => {}, replace: () => {} }
const search = new URLSearchParams()

// Only external UI/cloud/storage boundaries are replaced. The tested callbacks
// are the real PintaClient adapter, including its await/captured namespace.
mock.module('next/navigation', () => ({
  useRouter: () => router,
  useSearchParams: () => search,
}))
mock.module('@sistemazero/pinta', () => ({
  setPintaStorageNamespace: () => {},
  createPintaPersistence: () => ({}),
  isPintaAssetOpen: () => false,
  subscribePintaAssetOpenState: () => () => {},
  PintaHostChromeProvider: ({ children }: { children: ReactNode }) => children,
  PintaApp: ({ adapter }: { adapter: PintaHostAdapter }) => {
    current = adapter
    return null
  },
}))
mock.module('../../src/lib/creations-cloud', () => ({
  createCreationsCloud: () => ({ flush: async () => {}, dispose: () => {} }),
}))
mock.module('../../src/lib/pinta-cloud-persistence', () => ({
  createCloudMirroredPintaPersistence: () => ({ dispose: () => {} }),
}))
mock.module('../../src/components/creator/focus-mode', () => ({
  useFocusMode: () => ({ setWorkspaceActive: () => {} }),
}))
mock.module('../../src/components/creator/use-host-chrome', () => ({
  HostChromeAnnouncer: () => null,
  useHostChrome: () => ({ chrome: {}, announcement: '' }),
}))
mock.module('../../src/components/creator/use-pensa-mission-session', () => ({
  canOpenPensaMission: () => true,
  usePensaMissionHandoff: () => ({
    data: null,
    status: 'idle',
    error: null,
    retry: () => {},
    update: () => {},
  }),
  usePensaMissionSession: () => undefined,
}))
mock.module('@sistemazero/studio/personal-assets', () => ({
  getPersonalAsset: async (id: string, options: { namespace: string }) => {
    lookups.push({ id, namespace: options.namespace })
    lookupEntered.resolve()
    await lookupGate.promise
    return linked ? { ...canonical, kind: 'image', updatedAt: 1 } : null
  },
  savePersonalAsset: async (asset: PintaExportedAsset, options: { namespace: string }) => {
    saves.push({ asset: structuredClone(asset), namespace: options.namespace })
    return saveOk ? { ok: true, name: asset.name } : { ok: false, error: 'quota' }
  },
}))
const { PintaClient } = await import('../../src/components/creator/pinta-client')

function mountedAdapter(): PintaHostAdapter {
  if (!current) throw new Error('Pinta adapter was not mounted')
  return current
}

beforeEach(() => {
  current = undefined
  linked = false
  saveOk = true
  lookups.length = saves.length = 0
  lookupGate = Promise.withResolvers<void>()
  lookupEntered = Promise.withResolvers<void>()
})
afterEach(async () => {
  lookupGate.resolve()
  await act(async () => {
    for (const cleanup of cleanups.splice(0)) cleanup()
  })
})
async function harness(audience: 'kids' | 'adult', owned = true) {
  const element = document.createElement('div')
  document.body.append(element)
  const root = createRoot(element)
  let mounted = true
  const unmount = () => {
    if (!mounted) return
    mounted = false
    root.unmount()
    element.remove()
  }
  cleanups.push(unmount)
  const render = async (viewerId: string) => {
    current = undefined
    await act(async () => {
      root.render(<PintaClient viewerId={viewerId} audience={audience} studioAvailable={owned} />)
    })
    return mountedAdapter()
  }
  return { render, unmount: async () => act(unmount) }
}

test('unlinked resync does not create a canonical record or expose an unowned send button', async () => {
  const view = await harness('kids', false)
  const adapter = await view.render('a')
  expect(adapter.sendToStudio).toBeUndefined()
  lookupGate.resolve()
  expect(await adapter.resyncToStudio?.(canonical)).toEqual({
    updated: false,
    reason: 'not-linked',
  })
  expect(lookups).toEqual([{ id: canonical.id, namespace: 'a' }])
  expect(saves).toEqual([])
})

test('explicit PUSH and linked resync pass the unchanged canonical sheet; failures keep their reason', async () => {
  const view = await harness('kids')
  const adapter = await view.render('a')
  expect(await adapter.sendToStudio?.(canonical)).toMatchObject({ ok: true })
  linked = true
  lookupGate.resolve()
  expect(await adapter.resyncToStudio?.(canonical)).toEqual({ updated: true })
  saveOk = false
  expect(await adapter.resyncToStudio?.(canonical)).toEqual({
    updated: false,
    reason: 'failed',
    error: 'quota',
  })
  expect(saves).toEqual(Array.from({ length: 3 }, () => ({ asset: canonical, namespace: 'a' })))
  expect(Object.hasOwn(saves[0]!.asset, 'pintaImage')).toBe(false)
})

for (const audience of ['kids', 'adult'] as const) {
  test(`${audience}: a pending resync lookup and its save stay in the original profile`, async () => {
    const view = await harness(audience)
    const original = await view.render('a')
    linked = true
    const pending = original.resyncToStudio!(canonical)
    await lookupEntered.promise
    const next = await view.render('b')
    lookupGate.resolve()
    expect(await pending).toEqual({ updated: true })
    const prefix = audience === 'adult' ? 'adult:' : ''
    expect(lookups).toEqual([{ id: canonical.id, namespace: `${prefix}a` }])
    expect(saves).toEqual([{ asset: canonical, namespace: `${prefix}a` }])
    expect(await next.sendToStudio?.(canonical)).toMatchObject({ ok: true })
    expect(saves[1]).toEqual({ asset: canonical, namespace: `${prefix}b` })
  })

  test(`${audience}: unmount during a linked lookup preserves the captured canonical write only`, async () => {
    const view = await harness(audience)
    const adapter = await view.render('a')
    linked = true
    const pending = adapter.resyncToStudio!(canonical)
    await lookupEntered.promise
    await view.unmount()
    lookupGate.resolve()
    expect(await pending).toEqual({ updated: true })
    expect(saves).toEqual([{ asset: canonical, namespace: audience === 'adult' ? 'adult:a' : 'a' }])
  })
}
