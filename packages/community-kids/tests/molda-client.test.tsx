import { afterAll, expect, mock, test } from 'bun:test'
import { render, screen, waitFor } from '@testing-library/react'
import { type ReactNode, useState } from 'react'

const actualNavigation = await import('next/navigation')
const actualMolda = await import('@sistemazero/molda')
const namespaces: string[] = []

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

function ObservedMoldaApp({ persistence }: { persistence?: object }): ReactNode {
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

const { MoldaClient } = await import('../src/components/kids/molda-client')

afterAll(() => {
  mock.module('next/navigation', () => actualNavigation)
  mock.module('@sistemazero/molda', () => actualMolda)
})

test('trocar de um perfil para o modo local nunca reutiliza a persistência espelhada anterior', async () => {
  const view = render(<MoldaClient viewerId="perfil-a" studioAvailable={false} />)
  await waitFor(() => expect(screen.getByTestId('molda-persistence').textContent).toBe('wrapped'))

  view.rerender(<MoldaClient viewerId={null} studioAvailable={false} />)

  await waitFor(() => expect(screen.getByTestId('molda-persistence').textContent).toBe('local:'))
  expect(namespaces.at(-1)).toBe('')
})
