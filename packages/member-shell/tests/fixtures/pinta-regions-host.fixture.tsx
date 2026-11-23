import { afterEach, beforeEach, expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { ReactNode } from 'react'
import { PintaPaletteScope } from '../../src/components/creator/pinta-palette-scope'

// Etapa 1 das regiões (23/11/2026), sem flag: o host do Pinta solto monta a oficina regional
// (teto nativo 8) sempre que pode guardar o regional, e anuncia leitor e escritor 7 na fila
// causal. Só as fronteiras externas (pacote, nuvem e espelho) são trocadas; o que se confere é a
// escolha real do `PintaClient`.
GlobalRegistrator.register({ settings: { disableIframePageLoading: true } })
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')

type Built = { kind: 'legacy' | 'causal' | 'workshop'; namespace: string; options?: unknown }
const built: Built[] = []
const clouds: Record<string, unknown>[] = []
const mirrors: { local: Built; causal?: Record<string, unknown> }[] = []
let mounted: { persistence?: unknown; onCompletionControlChange?: unknown } | null = null
const cleanups: Array<() => void> = []
const router = { push: () => {}, replace: () => {} }
const search = new URLSearchParams()

mock.module('next/navigation', () => ({
  useRouter: () => router,
  useSearchParams: () => search,
}))
mock.module('@sistemazero/pinta', () => ({
  setPintaStorageNamespace: () => {},
  createPintaPersistence: ({ namespace }: { namespace: string }) => {
    const value: Built = { kind: 'legacy', namespace }
    built.push(value)
    return value
  },
  createPintaCausalPersistence: ({ namespace }: { namespace: string }) => {
    const value: Built = { kind: 'causal', namespace }
    built.push(value)
    return { ...value, causal: {} }
  },
  holdPintaEditorLock: async () => () => {},
  withClosedPintaEditors: async (_: unknown, apply: () => Promise<boolean>) => apply(),
  isPintaAssetOpen: () => false,
  subscribePintaAssetOpenState: () => () => {},
  PintaHostChromeProvider: ({ children }: { children: ReactNode }) => children,
  PintaApp: (props: { persistence?: unknown; onCompletionControlChange?: unknown }) => {
    mounted = props
    return null
  },
}))
mock.module('@sistemazero/pinta/workshop-reader', () => ({
  createWorkshopPintaPersistence: (options: { namespace: string }) => {
    const value: Built = { kind: 'workshop', namespace: options.namespace, options }
    built.push(value)
    return { ...value, causal: {} }
  },
}))
mock.module('../../src/lib/creations-cloud', () => ({
  createCreationsCloud: (options: Record<string, unknown>) => {
    clouds.push(options)
    return {
      pintaCausal: options.pintaCausalEnabled ? {} : undefined,
      flush: async () => {},
      dispose: () => {},
    }
  },
}))
mock.module('../../src/lib/pinta-cloud-persistence', () => ({
  createCloudMirroredPintaPersistence: (options: {
    local: Built
    causal?: Record<string, unknown>
  }) => {
    mirrors.push({ local: options.local, ...(options.causal ? { causal: options.causal } : {}) })
    return { mirrored: options.local.kind, dispose: () => {} }
  },
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
  usePensaMissionOutline: () => null,
  usePensaMissionSession: () => undefined,
}))
const { PintaClient } = await import('../../src/components/creator/pinta-client')

const savedFlag = process.env.NEXT_PUBLIC_PINTA_CAUSAL_CLIENT_V1
beforeEach(() => {
  built.length = clouds.length = mirrors.length = 0
  mounted = null
  process.env.NEXT_PUBLIC_PINTA_CAUSAL_CLIENT_V1 = '1'
})
afterEach(async () => {
  if (savedFlag === undefined) delete process.env.NEXT_PUBLIC_PINTA_CAUSAL_CLIENT_V1
  else process.env.NEXT_PUBLIC_PINTA_CAUSAL_CLIENT_V1 = savedFlag
  await act(async () => {
    for (const cleanup of cleanups.splice(0)) cleanup()
  })
})

async function render(props: {
  viewerId: string | null
  pintaCausalAllowed?: boolean
  onCompletionControlChange?: () => void
}) {
  const element = document.createElement('div')
  document.body.append(element)
  const root = createRoot(element)
  cleanups.push(() => {
    root.unmount()
    element.remove()
  })
  await act(async () => {
    root.render(
      <PintaPaletteScope viewer={null}>
        <PintaClient audience="kids" studioAvailable {...props} />
      </PintaPaletteScope>,
    )
  })
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  if (!mounted) throw Error('O Pinta não montou')
  return mounted
}

test('com a fila causal, o host monta a oficina com teto 8 e anuncia leitor e escritor 7', async () => {
  const view = await render({ viewerId: 'perfil', pintaCausalAllowed: true })
  expect(clouds.at(-1)).toMatchObject({
    maxFormatVersion: 6,
    pintaCausalEnabled: true,
    pintaCausalReader: 7,
  })
  expect(built).toEqual([
    {
      kind: 'workshop',
      namespace: 'perfil',
      options: { namespace: 'perfil', guardCausalWrites: true, nativeCeiling: 8 },
    },
  ])
  expect(mirrors).toHaveLength(1)
  expect(mirrors[0]?.local.kind).toBe('workshop')
  expect(mirrors[0]?.causal).toMatchObject({ reader: 7, writer: 7 })
  expect(view.persistence).toMatchObject({ mirrored: 'workshop' })
})

test('sem a fila causal, a conta fica no armazenamento de sempre e não recebe regiões', async () => {
  await render({ viewerId: 'perfil', pintaCausalAllowed: false })
  expect(clouds.at(-1)).toMatchObject({ pintaCausalEnabled: false })
  expect(built.map(({ kind }) => kind)).toEqual(['legacy'])
  expect(mirrors).toEqual([{ local: { kind: 'legacy', namespace: 'perfil' } }])
})

test('sem conta, a oficina regional fica só neste aparelho, com o mesmo teto', async () => {
  const view = await render({ viewerId: null })
  expect(clouds).toEqual([])
  expect(mirrors).toEqual([])
  expect(built).toEqual([
    { kind: 'workshop', namespace: '', options: { namespace: '', nativeCeiling: 8 } },
  ])
  expect(view.persistence).toMatchObject({ kind: 'workshop' })
})

test('a galeria focal só perde a vez para a missão que conclui pela oficina', async () => {
  const free = await render({ viewerId: 'perfil', pintaCausalAllowed: true })
  expect(free.onCompletionControlChange).toBeUndefined()
  const mission = await render({
    viewerId: 'perfil',
    pintaCausalAllowed: true,
    onCompletionControlChange: () => {},
  })
  expect(typeof mission.onCompletionControlChange).toBe('function')
})
