import { afterAll, expect, mock, test } from 'bun:test'
import type { MoldaHostAdapter } from '@sistemazero/molda'
import { render, screen, waitFor } from '@testing-library/react'
import { type ReactNode, useState } from 'react'

const actualNavigation = await import('next/navigation')
const actualMolda = await import('@sistemazero/molda')
const actualPersonal = await import('@sistemazero/studio/personal-assets')
const namespaces: string[] = []
/** O adapter que o host entregou ao último `<MoldaApp>` montado. */
let lastAdapter: MoldaHostAdapter | undefined
/** A biblioteca pessoal do Estúdio, falsa: o que existe e o que foi regravado. */
const personalRecords = new Map<string, { id: string }>()
const savedToStudio: Array<Record<string, unknown>> = []
const personalNamespaces: Array<string | undefined> = []
let personalSaveFailure: string | null = null

const router = {
  back: mock(() => {}),
  forward: mock(() => {}),
  refresh: mock(() => {}),
  push: mock(() => {}),
  replace: mock(() => {}),
  prefetch: mock(async () => {}),
}

function localPersistence(namespace: string) {
  return {
    namespace,
    loadAll: async () => [],
    load: async () => null,
    save: async () => {},
    saveMany: async () => {},
    remove: async () => {},
    removeMany: async () => {},
    subscribe: () => () => {},
    dispose: () => {},
  }
}

function ObservedMoldaApp({
  persistence,
  adapter,
}: {
  persistence?: object
  adapter?: MoldaHostAdapter
}): ReactNode {
  lastAdapter = adapter
  const [initialPersistence] = useState(persistence)
  const namespace = initialPersistence ? Reflect.get(initialPersistence, 'namespace') : undefined
  return (
    <output data-testid="molda-persistence">
      {typeof namespace === 'string'
        ? `local:${namespace}`
        : initialPersistence
          ? 'wrapped'
          : 'default'}
    </output>
  )
}

mock.module('next/navigation', () => ({
  ...actualNavigation,
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(),
}))

mock.module('@sistemazero/molda', () => ({
  ...actualMolda,
  MoldaApp: ObservedMoldaApp,
  setMoldaStorageNamespace: (namespace: string) => namespaces.push(namespace),
  createMoldaPersistence: ({ namespace = '' }: { namespace?: string } = {}) =>
    localPersistence(namespace),
  isMoldaAssetOpen: () => false,
  subscribeMoldaAssetOpenState: () => () => {},
}))

mock.module('@sistemazero/studio/personal-assets', () => ({
  ...actualPersonal,
  setPersonalAssetsNamespace: (namespace: string) => namespaces.push(`personal:${namespace}`),
  getPersonalAsset: async (id: string, options?: { namespace?: string }) => {
    personalNamespaces.push(options?.namespace)
    return personalRecords.get(id) ?? null
  },
  savePersonalAsset: async (input: Record<string, unknown>, options?: { namespace?: string }) => {
    personalNamespaces.push(options?.namespace)
    savedToStudio.push(input)
    if (personalSaveFailure) return { ok: false, error: personalSaveFailure }
    return { ok: true, name: String(input.name), updatedAt: 1 }
  },
}))

const { MoldaClient } = await import('../src/components/kids/molda-client')

afterAll(() => {
  mock.module('next/navigation', () => actualNavigation)
  mock.module('@sistemazero/molda', () => actualMolda)
  mock.module('@sistemazero/studio/personal-assets', () => actualPersonal)
})

test('trocar de um perfil para o modo local nunca reutiliza a persistência espelhada anterior', async () => {
  const view = render(<MoldaClient viewerId="perfil-a" studioAvailable={false} />)
  await waitFor(() => expect(screen.getByTestId('molda-persistence').textContent).toBe('wrapped'))

  view.rerender(<MoldaClient viewerId={null} studioAvailable={false} />)

  await waitFor(() => expect(screen.getByTestId('molda-persistence').textContent).toBe('local:'))
  expect(namespaces.at(-1)).toBe('')
})

test('a volta da ponte só regrava a criação que JÁ está na biblioteca do Estúdio', async () => {
  personalSaveFailure = null
  render(<MoldaClient viewerId="perfil-b" studioAvailable />)
  await waitFor(() => expect(lastAdapter?.resyncToStudio).toBeDefined())
  const resync = lastAdapter?.resyncToStudio
  if (!resync) throw new Error('sem resyncToStudio')
  const asset = {
    id: 'm1',
    name: 'nave',
    kind: 'model3d' as const,
    dataUrl: 'data:model/gltf-binary;base64,AAAA',
    originalFileName: 'nave.glb',
    bytes: 3,
    thumbDataUrl: null,
  }
  // Nunca levada ao Estúdio ("Trazer do Molda" é a decisão explícita): nada é gravado.
  expect(await resync(asset)).toEqual({ updated: false, reason: 'not-linked' })
  expect(savedToStudio).toHaveLength(0)
  // Já está lá: salvar no Molda regrava com o kind, a origem e o nome do arquivo.
  personalRecords.set('m1', { id: 'm1' })
  expect(await resync(asset)).toEqual({ updated: true })
  expect(savedToStudio).toHaveLength(1)
  expect(savedToStudio[0]).toMatchObject({
    id: 'm1',
    name: 'nave',
    kind: 'model3d',
    origin: 'molda',
    originalFileName: 'nave.glb',
  })
  expect(personalNamespaces).toEqual(['perfil-b', 'perfil-b', 'perfil-b'])
  expect(namespaces).not.toContain('personal:perfil-b')

  personalSaveFailure = 'A biblioteca está cheia.'
  expect(await resync(asset)).toEqual({
    updated: false,
    reason: 'failed',
    error: 'A biblioteca está cheia.',
  })
})
