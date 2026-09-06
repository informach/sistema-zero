import { afterAll, expect, mock, test } from 'bun:test'
import type { PintaHostAdapter } from '@sistemazero/pinta'
import { render, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'

const actualNavigation = await import('next/navigation')
const actualPinta = await import('@sistemazero/pinta')
const actualPersonal = await import('@sistemazero/studio/personal-assets')
const namespaces: string[] = []
/** O adapter que o host entregou ao último `<PintaApp>` montado. */
let lastAdapter: PintaHostAdapter | undefined
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
    persistAsset: async () => {},
    persistAssets: async () => {},
    deleteAsset: async () => {},
    loadAssetById: async () => null,
    listAllAssets: async () => [],
    subscribe: () => () => {},
    dispose: () => {},
  }
}

function ObservedPintaApp({
  adapter,
}: {
  adapter?: PintaHostAdapter
  persistence?: object
}): ReactNode {
  lastAdapter = adapter
  return <output data-testid="pinta-app">montado</output>
}

mock.module('next/navigation', () => ({
  ...actualNavigation,
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(),
}))

mock.module('@sistemazero/pinta', () => ({
  ...actualPinta,
  PintaApp: ObservedPintaApp,
  setPintaStorageNamespace: (namespace: string) => namespaces.push(namespace),
  createPintaPersistence: ({ namespace = '' }: { namespace?: string } = {}) =>
    localPersistence(namespace),
  isPintaAssetOpen: () => false,
  subscribePintaAssetOpenState: () => () => {},
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

const { PintaClient } = await import('../src/components/kids/pinta-client')

afterAll(() => {
  mock.module('next/navigation', () => actualNavigation)
  mock.module('@sistemazero/pinta', () => actualPinta)
  mock.module('@sistemazero/studio/personal-assets', () => actualPersonal)
})

test('a volta da ponte diz POR QUE não atualizou (nunca levado ao Estúdio, biblioteca recusou) e regrava o desenho que já está lá', async () => {
  personalSaveFailure = null
  render(<PintaClient viewerId="perfil-b" studioAvailable />)
  await waitFor(() => expect(lastAdapter?.resyncToStudio).toBeDefined())
  const resync = lastAdapter?.resyncToStudio
  if (!resync) throw new Error('sem resyncToStudio')
  const asset = {
    id: 'd1',
    name: 'nave',
    dataUrl: 'data:image/png;base64,AAAA',
    width: 8,
    height: 8,
  }
  // Nunca levado ao Estúdio ("Usar no Estúdio" é a decisão explícita): nada é gravado, e o
  // motivo viaja em vez de um `updated: false` mudo.
  expect(await resync(asset)).toEqual({ updated: false, reason: 'not-linked' })
  expect(savedToStudio).toHaveLength(0)
  // Já está lá: salvar no Pinta regrava o desenho na biblioteca do Estúdio.
  personalRecords.set('d1', { id: 'd1' })
  expect(await resync(asset)).toEqual({ updated: true })
  expect(savedToStudio).toHaveLength(1)
  expect(savedToStudio[0]).toMatchObject({ id: 'd1', name: 'nave' })
  // A biblioteca recusou: o erro dela chega ao pacote, que mostra o recado.
  personalSaveFailure = 'A biblioteca está cheia.'
  expect(await resync(asset)).toEqual({
    updated: false,
    reason: 'failed',
    error: 'A biblioteca está cheia.',
  })
  expect(savedToStudio).toHaveLength(2)
  // Tudo no namespace do PERFIL, sem mexer no namespace global da biblioteca.
  expect(personalNamespaces).toEqual(['perfil-b', 'perfil-b', 'perfil-b', 'perfil-b', 'perfil-b'])
  expect(namespaces).toContain('perfil-b')
  expect(namespaces).not.toContain('personal:perfil-b')
})
