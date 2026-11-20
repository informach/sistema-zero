import { afterEach, expect, test } from 'bun:test'
import { act, cleanup, render } from '@testing-library/react'
import { createEmptyProject } from '../../core/project'
import { pythonEnvironmentFixture } from '../../state/fixtures/pythonEnvironment'
import { StudioStoresContext } from '../../state/storesContext'
import { createStudioStores } from '../../state/studioStores'
import { ConsolePanel } from './ConsolePanel'

afterEach(cleanup)

test('o comando Python adiado aparece no console certo e conserva as mensagens ao trocar de projeto', async () => {
  const { project } = await pythonEnvironmentFixture('pro')
  const stores = createStudioStores({ persistence: 'none' })
  stores.project.setState({ project })
  stores.logs.getState().push({
    source: 'sz-preview',
    kind: 'log',
    parts: ['mensagem preservada'],
    timestamp: 1,
  })
  const { findByRole, queryByRole, getByText } = render(
    <StudioStoresContext.Provider value={stores}>
      <ConsolePanel />
    </StudioStoresContext.Provider>,
  )
  // Loading a deferred component cannot grant execution access without a host.
  const command = await findByRole('textbox', { name: 'Comando Python' })
  expect(command.hasAttribute('disabled')).toBe(true)
  expect(getByText('mensagem preservada')).toBeTruthy()
  act(() => stores.project.setState({ project: createEmptyProject('js-console', 'Meu jogo') }))
  expect(queryByRole('textbox', { name: 'Comando Python' })).toBeNull()
  expect(getByText('mensagem preservada')).toBeTruthy()
})
