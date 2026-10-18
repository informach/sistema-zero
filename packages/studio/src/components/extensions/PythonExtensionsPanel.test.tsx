import { afterEach, expect, test } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createEmptyProject } from '#core'
import { pythonEnvironmentFixture } from '../../state/fixtures/pythonEnvironment'
import { StudioStoresContext } from '../../state/storesContext'
import { createStudioStores } from '../../state/studioStores'
import { STANDALONE_CONFIG, StudioConfigProvider } from '../../studio/config'
import { StudioRuntimeEnvironmentProvider } from '../../studio/runtime-environment'
import { ExtensionsPanel } from './ExtensionsPanel'

afterEach(cleanup)

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
    fireEvent.click(await screen.findByRole('button', { name: 'Instalar' }))
    mounted.rerender(content(true))
    await act(async () => {
      release()
      await gate
    })
    await screen.findByRole('alert')
    expect(stores.project.getState().project).toBe(project)
    expect(project.installedExtensions).toEqual([])
  })

test('the language panel installs Turtle, confirms removal and routes back to JavaScript', async () => {
  const { project, environment } = await pythonEnvironmentFixture('classic')
  const stores = createStudioStores({ persistence: 'none' })
  stores.project.getState().setProject(project)
  render(
    <StudioStoresContext.Provider value={stores}>
      <StudioRuntimeEnvironmentProvider value={environment}>
        <ExtensionsPanel open onClose={() => {}} />
      </StudioRuntimeEnvironmentProvider>
    </StudioStoresContext.Provider>,
  )
  const install = await screen.findByRole('button', { name: 'Instalar' })
  expect(screen.getByText('Turtle')).toBeTruthy()
  expect(screen.queryByText('Jogo 2D')).toBeNull()
  fireEvent.click(install)
  const remove = await screen.findByRole('button', { name: 'Remover' })
  expect(stores.project.getState().project?.installedExtensions[0]?.id).toBe('python-turtle')
  fireEvent.click(remove)
  const confirmation = await screen.findByRole('dialog', { name: 'Remover extensão?' })
  fireEvent.click(within(confirmation).getByRole('button', { name: 'Cancelar' }))
  expect(stores.project.getState().project?.installedExtensions).toHaveLength(1)
  fireEvent.click(remove)
  fireEvent.click(
    within(await screen.findByRole('dialog', { name: 'Remover extensão?' })).getByRole('button', {
      name: 'Remover',
    }),
  )
  await waitFor(() => expect(stores.project.getState().project?.installedExtensions).toEqual([]))
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
  const install = await screen.findByRole('button', { name: 'Instalar' })
  expect(install.hasAttribute('disabled')).toBe(true)
  fireEvent.click(install)
  expect(stores.project.getState().project?.installedExtensions).toEqual([])
  expect(screen.getByText('O ambiente Python ainda não está disponível nesta página.')).toBeTruthy()
})
