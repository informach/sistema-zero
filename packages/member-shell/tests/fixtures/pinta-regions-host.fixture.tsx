import { afterEach, beforeEach, expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { PintaCausalViewer } from '@sistemazero/core/creations/pinta-causal'
import type { ReactNode } from 'react'
import { PintaAccountScope } from '../../src/components/creator/pinta-account-scope'

// A oficina com conta e a oficina local compartilham teto nativo 9, leitor e escritor 8.
// O escopo entregue pelo servidor decide a autoridade da conta, sem flags de ambiente.
// Só as fronteiras externas são trocadas: a prova confere a escolha real do PintaClient.
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

const account: PintaCausalViewer = { audience: 'kids', userId: 'perfil', accountId: 'conta' }
beforeEach(() => {
  built.length = clouds.length = mirrors.length = 0
  mounted = null
})
afterEach(async () => {
  await act(async () => {
    for (const cleanup of cleanups.splice(0)) cleanup()
  })
})

async function render({
  scope = null,
  ...props
}: {
  viewerId: string | null
  scope?: PintaCausalViewer | null
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
      <PintaAccountScope viewer={scope}>
        <PintaClient audience="kids" studioAvailable {...props} />
      </PintaAccountScope>,
    )
  })
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  if (!mounted) throw Error('O Pinta não montou')
  return mounted
}

test('LG05: o host monta teto 9, leitor e escritor 8 pelo caminho único da oficina', async () => {
  const view = await render({ viewerId: 'perfil', scope: account })
  expect(clouds.at(-1)).toMatchObject({
    maxFormatVersion: 6,
    pintaCausalEnabled: true,
    pintaPaletteWriteEnabled: true,
    pintaCausalReader: 8,
  })
  expect(built).toEqual([
    {
      kind: 'workshop',
      namespace: 'perfil',
      options: { namespace: 'perfil', guardCausalWrites: true, nativeCeiling: 9 },
    },
  ])
  expect(mirrors).toHaveLength(1)
  expect(mirrors[0]?.local.kind).toBe('workshop')
  expect(mirrors[0]?.causal).toMatchObject({ reader: 8, writer: 8 })
  expect(view.persistence).toMatchObject({ mirrored: 'workshop' })
})

test('sem o escopo da conta (suporte em leitura, sem storage), fica o armazenamento de sempre', async () => {
  await render({ viewerId: 'perfil' })
  expect(clouds.at(-1)).toMatchObject({
    pintaCausalEnabled: false,
    pintaPaletteWriteEnabled: false,
  })
  expect(built.map(({ kind }) => kind)).toEqual(['legacy'])
  expect(mirrors).toEqual([{ local: { kind: 'legacy', namespace: 'perfil' } }])
})

test('o escopo de outro perfil ou de outra audiência nunca liga a fila causal deste', async () => {
  for (const scope of [
    { ...account, userId: 'irmao' },
    { ...account, audience: 'adult' as const },
  ]) {
    built.length = clouds.length = mirrors.length = 0
    await render({ viewerId: 'perfil', scope })
    expect(clouds.at(-1)).toMatchObject({
      pintaCausalEnabled: false,
      pintaPaletteWriteEnabled: false,
    })
    expect(built.map(({ kind }) => kind)).toEqual(['legacy'])
  }
})

test('sem conta, a oficina regional fica só neste aparelho, com o mesmo teto', async () => {
  const view = await render({ viewerId: null })
  expect(clouds).toEqual([])
  expect(mirrors).toEqual([])
  expect(built).toEqual([
    { kind: 'workshop', namespace: '', options: { namespace: '', nativeCeiling: 9 } },
  ])
  expect(view.persistence).toMatchObject({ kind: 'workshop' })
})

test('a galeria focal só perde a vez para a missão que conclui pela oficina', async () => {
  const free = await render({ viewerId: 'perfil', scope: account })
  expect(free.onCompletionControlChange).toBeUndefined()
  const mission = await render({
    viewerId: 'perfil',
    scope: account,
    onCompletionControlChange: () => {},
  })
  expect(typeof mission.onCompletionControlChange).toBe('function')
})

// O Pinta do Arquipélago não recebe prop nenhuma da página: o mesmo escopo da conta o põe na
// fila causal, e a conclusão do objeto confirma pela conta adotada (não pela listagem antiga,
// que um perfil causal recusa).
test('o Pinta do Arquipélago, sob o escopo da conta, monta a oficina causal e conclui por ela', async () => {
  const view = await render({
    viewerId: 'perfil',
    scope: account,
    onCompletionControlChange: () => {},
  })
  expect(clouds.at(-1)).toMatchObject({ pintaCausalEnabled: true })
  expect(built.map(({ kind }) => kind)).toEqual(['workshop'])
  expect(mirrors[0]?.causal).toMatchObject({ reader: 8, writer: 8 })
  expect(typeof view.onCompletionControlChange).toBe('function')
})
