import { afterEach, expect, mock, test } from 'bun:test'
import { act, cleanup, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { renderBottomPanel, useVisibleBottomTabs } from '../components/layout/bottomTabs'
import { createEmptyProject } from '../core/project'
import { StudioStoresContext } from '../state/storesContext'
import { createStudioStores } from '../state/studioStores'
import { useUIStore } from '../state/uiStore'
import { LegacyAIEntryPoints } from './legacy-ai'
import { type StudioTutorConfig, StudioTutorProvider, useStudioTutor } from './tutor'

const ask = mock(async () => {
  throw new Error('Opening UI must not send inference')
})
const tutor: StudioTutorConfig = {
  adapter: {
    ask,
    loadHistory: async () => ({ messages: [], nextCursor: null }),
    deleteHistory: async () => {},
    feedback: async () => {},
  },
}
function Probe({ id = 'tutor' }: { id?: string }) {
  const state = useStudioTutor()
  const tabs = useVisibleBottomTabs()
  return (
    <>
      <output aria-label={id}>{String(state.open)}</output>
      <output aria-label={`${id}-tabs`}>{tabs.map((tab) => tab.id).join(',')}</output>
    </>
  )
}
afterEach(() => {
  cleanup()
  ask.mockClear()
  useUIStore.setState({ bottomTab: 'console', showAI: true })
})

test.each([
  'blocks',
  'bridge',
  'code',
] as const)('legacy ai command opens the configured tutor in %s without another tab or inference', (mode) => {
  const stores = createStudioStores({ persistence: 'none' })
  stores.project.setState({ project: { ...createEmptyProject('p', 'Jogo'), mode } })
  render(
    <StrictMode>
      <StudioStoresContext.Provider value={stores}>
        <StudioTutorProvider value={tutor}>
          <LegacyAIEntryPoints />
          <Probe />
        </StudioTutorProvider>
      </StudioStoresContext.Provider>
    </StrictMode>,
  )
  expect(screen.getByLabelText('tutor').textContent).toBe('false')
  act(() => stores.ui.getState().setBottomTab('ai'))
  expect(screen.getByLabelText('tutor').textContent).toBe('true')
  expect(stores.ui.getState().bottomTab).toBe('console')
  expect(screen.getByLabelText('tutor-tabs').textContent).not.toContain('ai')
  expect(ask).toHaveBeenCalledTimes(0)
})

test('without a host tutor old commands stay unavailable and cannot fall back to a provider', () => {
  render(
    <>
      <LegacyAIEntryPoints />
      <Probe />
      {renderBottomPanel('ai')}
    </>,
  )
  act(() => useUIStore.getState().setBottomTab('ai'))
  expect(screen.getByLabelText('tutor').textContent).toBe('false')
  expect(screen.getByText('O Zappy não está disponível neste espaço.')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Abrir Zappy' })).toBeNull()
  expect(ask).toHaveBeenCalledTimes(0)
})

test('legacy visibility command and panel redirect use only their own Studio instance', () => {
  const a = createStudioStores({ persistence: 'none' }),
    b = createStudioStores({ persistence: 'none' })
  render(
    <>
      <StudioStoresContext.Provider value={a}>
        <StudioTutorProvider value={tutor}>
          <LegacyAIEntryPoints />
          <Probe id="first" />
        </StudioTutorProvider>
      </StudioStoresContext.Provider>
      <StudioStoresContext.Provider value={b}>
        <StudioTutorProvider value={tutor}>
          <LegacyAIEntryPoints />
          <Probe id="second" />
        </StudioTutorProvider>
      </StudioStoresContext.Provider>
    </>,
  )
  act(() => a.ui.getState().setShowAI(false))
  act(() => a.ui.getState().setShowAI(true))
  expect(screen.getByLabelText('first').textContent).toBe('true')
  expect(screen.getByLabelText('second').textContent).toBe('false')
  expect(ask).toHaveBeenCalledTimes(0)
})

test('direct legacy panel entry opens the one configured tutor', () => {
  render(
    <StudioTutorProvider value={tutor}>
      <Probe />
      {renderBottomPanel('ai')}
    </StudioTutorProvider>,
  )
  expect(screen.getByLabelText('tutor').textContent).toBe('true')
  expect(screen.queryByRole('textbox')).toBeNull()
  expect(ask).toHaveBeenCalledTimes(0)
})
