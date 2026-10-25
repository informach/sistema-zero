import { afterEach, expect, test } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createEmptyProject } from '#core'
import { createStudioRuntimeAuthority } from '../../runtime/authority'
import { pythonEnvironmentFixture } from '../../state/fixtures/pythonEnvironment'
import { StudioStoresContext } from '../../state/storesContext'
import { createStudioStores } from '../../state/studioStores'
import { STANDALONE_CONFIG, StudioConfigProvider } from '../../studio/config'
import { StudioRuntimeEnvironmentProvider } from '../../studio/runtime-environment'
import { ExtensionsPanel } from './ExtensionsPanel'

afterEach(cleanup)

test('same environment updates installation availability and cancels an older pending operation', async () => {
  const { project, environment } = await pythonEnvironmentFixture('classic')
  const initial = {
    available: true,
    pythonAuthoring: [],
    grantedExtensionIds: ['python-turtle'],
    capabilities: ['edit' as const],
    curation: null,
    releaseStatus: 'active' as const,
  }
  const authority = createStudioRuntimeAuthority(initial)
  const dynamic = {
    ...environment,
    authority: authority.authority,
    access: () => ({
      ...environment.access(project),
      grantedExtensionIds: [...authority.authority.getSnapshot().grantedExtensionIds],
    }),
  }
  const stores = createStudioStores({ persistence: 'none' })
  stores.project.getState().setProject(project)
  const gate = Promise.withResolvers<void>()
  const entered = Promise.withResolvers<void>()
  const apply = stores.project.getState().applyPythonExtensions
  stores.project.setState({
    applyPythonExtensions: async (...args) => {
      entered.resolve()
      await gate.promise
      return apply(...args)
    },
  })
  render(
    <StudioStoresContext.Provider value={stores}>
      <StudioRuntimeEnvironmentProvider value={dynamic}>
        <ExtensionsPanel open onClose={() => {}} />
      </StudioRuntimeEnvironmentProvider>
    </StudioStoresContext.Provider>,
  )
  const install = await screen.findByRole('button', { name: 'Instalar Turtle' })
  expect(install.hasAttribute('disabled')).toBe(false)
  fireEvent.click(install)
  await entered.promise
  await act(async () => authority.update({ ...initial, grantedExtensionIds: [] }))
  expect(screen.getByRole('button', { name: 'Instalar Turtle' }).hasAttribute('disabled')).toBe(
    true,
  )
  await act(async () => {
    gate.resolve()
    await gate.promise
  })
  expect(stores.project.getState().project).toBe(project)
  expect(project.installedExtensions).toEqual([])
  await act(async () => authority.update(initial))
  expect(screen.getByRole('button', { name: 'Instalar Turtle' }).hasAttribute('disabled')).toBe(
    false,
  )
})

for (const revoked of ['environment', 'curation'] as const)
  test(`a committed ${revoked} change during installation is checked at publication`, async () => {
    const { project, environment } = await pythonEnvironmentFixture('classic')
    const stores = createStudioStores({ persistence: 'none' })
    stores.project.getState().setProject(project)
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const apply = stores.project.getState().applyPythonExtensions
    stores.project.setState({
      applyPythonExtensions: async (...args) => {
        await gate
        return apply(...args)
      },
    })
    function content(blocked: boolean) {
      const currentEnvironment =
        blocked && revoked === 'environment'
          ? {
              ...environment,
              access: () => ({ ...environment.access(project), grantedExtensionIds: [] }),
            }
          : environment
      const config = {
        ...STANDALONE_CONFIG,
        learning: {
          ...STANDALONE_CONFIG.learning,
          allowExtensions: blocked && revoked === 'curation' ? [] : undefined,
        },
      }
      return (
        <StudioStoresContext.Provider value={stores}>
          <StudioConfigProvider value={config}>
            <StudioRuntimeEnvironmentProvider value={currentEnvironment}>
              <ExtensionsPanel open onClose={() => {}} />
            </StudioRuntimeEnvironmentProvider>
          </StudioConfigProvider>
        </StudioStoresContext.Provider>
      )
    }
    const mounted = render(content(false))
    fireEvent.click(await screen.findByRole('button', { name: 'Instalar Turtle' }))
    mounted.rerender(content(true))
    await act(async () => {
      release()
      await gate
    })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Fechar' }).hasAttribute('disabled')).toBe(false),
    )
    expect(screen.queryByRole('alert')).toBeNull()
    expect(stores.project.getState().project).toBe(project)
    expect(project.installedExtensions).toEqual([])
  })

test('the language panel installs lazily, refuses unavailable removal analysis and routes back to JavaScript', async () => {
  const { project, environment } = await pythonEnvironmentFixture('classic')
  const stores = createStudioStores({ persistence: 'none' })
  let analyses = 0
  environment.resolvePythonAnalysis = async () => {
    analyses++
    throw new Error('Análise indisponível')
  }
  stores.project.getState().setProject(project)
  render(
    <StudioStoresContext.Provider value={stores}>
      <StudioRuntimeEnvironmentProvider value={environment}>
        <ExtensionsPanel open onClose={() => {}} />
      </StudioRuntimeEnvironmentProvider>
    </StudioStoresContext.Provider>,
  )
  const install = await screen.findByRole('button', { name: 'Instalar Turtle' })
  expect(screen.getByText('Turtle')).toBeTruthy()
  expect(screen.queryByText('Jogo 2D')).toBeNull()
  expect(analyses).toBe(0)
  fireEvent.click(install)
  const remove = await screen.findByRole('button', { name: 'Remover Turtle' })
  expect(stores.project.getState().project?.installedExtensions[0]?.id).toBe('python-turtle')
  expect(analyses).toBe(0)
  fireEvent.click(remove)
  const confirmation = await screen.findByRole('dialog', { name: 'Remover extensão?' })
  fireEvent.click(within(confirmation).getByRole('button', { name: 'Cancelar' }))
  expect(stores.project.getState().project?.installedExtensions).toHaveLength(1)
  fireEvent.click(remove)
  const activeConfirmation = await screen.findByRole('dialog', { name: 'Remover extensão?' })
  fireEvent.click(
    within(activeConfirmation).getByRole('button', {
      name: 'Remover',
    }),
  )
  expect((await within(activeConfirmation).findByRole('alert')).textContent).toContain(
    'análise de remoção',
  )
  expect(stores.project.getState().project?.installedExtensions).toHaveLength(1)
  expect(analyses).toBe(1)
  await act(async () => {
    stores.project.getState().setProject(createEmptyProject('javascript', 'JS'))
    // Await the actual lazy module triggered by the language switch inside React's act.
    await import('./JavaScriptExtensionsPanel')
  })
  await screen.findByText('Jogo 2D')
  expect(screen.queryByText('Turtle')).toBeNull()
})

test('a Python project without a host runtime cannot offer an unapproved installation', async () => {
  const { project } = await pythonEnvironmentFixture('pro')
  const stores = createStudioStores({ persistence: 'none' })
  stores.project.getState().setProject(project)
  render(
    <StudioStoresContext.Provider value={stores}>
      <ExtensionsPanel open onClose={() => {}} />
    </StudioStoresContext.Provider>,
  )
  const install = await screen.findByRole('button', { name: 'Instalar Turtle' })
  expect(install.hasAttribute('disabled')).toBe(true)
  fireEvent.click(install)
  expect(stores.project.getState().project?.installedExtensions).toEqual([])
  // Turtle, Pygame Zero, Pygame-ce and both Raylib extensions explain why they cannot be installed here.
  expect(
    screen.getAllByText('O ambiente Python ainda não está disponível nesta página.'),
  ).toHaveLength(5)
})

for (const retirement of ['unmount', 'close', 'source', 'curation'] as const) {
  test(`removal parser reservation is released on ${retirement} without stale feedback or source writes`, async () => {
    const { project, environment } = await pythonEnvironmentFixture('classic')
    const stores = createStudioStores({ persistence: 'none' })
    stores.project.getState().setProject({
      ...project,
      installedExtensions: [{ id: 'python-turtle', version: '1.0.0', installedAt: 1 }],
    })
    const original = stores.project.getState().project
    const requested = Promise.withResolvers<AbortSignal>()
    const result = Promise.withResolvers<never>()
    environment.resolvePythonAnalysis = async (_project, signal) => {
      requested.resolve(signal)
      return result.promise
    }
    function content(open = true, blocked = false) {
      return (
        <StudioStoresContext.Provider value={stores}>
          <StudioConfigProvider
            value={{
              ...STANDALONE_CONFIG,
              learning: {
                ...STANDALONE_CONFIG.learning,
                allowExtensions: blocked ? [] : undefined,
              },
            }}
          >
            <StudioRuntimeEnvironmentProvider value={environment}>
              <ExtensionsPanel open={open} onClose={() => {}} />
            </StudioRuntimeEnvironmentProvider>
          </StudioConfigProvider>
        </StudioStoresContext.Provider>
      )
    }
    const mounted = render(content())
    fireEvent.click(await screen.findByRole('button', { name: 'Remover Turtle' }))
    fireEvent.click(
      within(await screen.findByRole('dialog', { name: 'Remover extensão?' })).getByRole('button', {
        name: 'Remover',
      }),
    )
    const signal = await requested.promise
    await act(async () => {
      if (retirement === 'unmount') mounted.unmount()
      else if (retirement === 'close') mounted.rerender(content(false))
      else if (retirement === 'curation') mounted.rerender(content(true, true))
      else stores.project.getState().setPythonFile('main.py', 'print(9)\n')
      result.reject(new Error('Old reservation failed'))
      await result.promise.catch(() => {})
    })
    expect(signal.aborted).toBe(true)
    expect(stores.project.getState().project?.installedExtensions).toHaveLength(1)
    if (retirement !== 'source') expect(stores.project.getState().project).toBe(original)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(document.querySelectorAll('iframe')).toHaveLength(0)
  })
}
