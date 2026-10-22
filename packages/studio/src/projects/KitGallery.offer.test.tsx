import { afterEach, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { pythonEnvironmentFixture } from '../state/fixtures/pythonEnvironment'
import { KitGallery } from './KitGallery'

afterEach(cleanup)

const discovery = { loading: false, unavailable: false, retry() {} }
const languageSelect = () => document.querySelector('select[name="kit-language"]')

test('without a host Python offer (staff, customer) the gallery shows no language choice', () => {
  render(<KitGallery onOpenProject={() => {}} professional />)
  expect(languageSelect()).toBeNull()
  expect(screen.queryByRole('option', { name: 'Python' })).toBeNull()
})

test('a host Python offer (admin, superadmin) shows the choice with JavaScript as default', () => {
  render(<KitGallery onOpenProject={() => {}} professional pythonDiscovery={discovery} />)
  expect((languageSelect() as HTMLSelectElement | null)?.value).toBe('javascript')
  expect(screen.getByRole('option', { name: 'Python' })).toBeDefined()
})

test('losing the offer after choosing Python falls back to JavaScript', () => {
  const view = render(
    <KitGallery onOpenProject={() => {}} professional pythonDiscovery={discovery} />,
  )
  fireEvent.change(languageSelect() as HTMLSelectElement, { target: { value: 'python' } })
  expect((languageSelect() as HTMLSelectElement).value).toBe('python')
  expect(screen.getByText(/Python ainda não está disponível/)).toBeDefined()
  view.rerender(<KitGallery onOpenProject={() => {}} professional />)
  expect(languageSelect()).toBeNull()
  expect(screen.queryByText(/Python ainda não está disponível/)).toBeNull()
  // A oferta voltando não reativa a escolha antiga.
  view.rerender(<KitGallery onOpenProject={() => {}} professional pythonDiscovery={discovery} />)
  expect((languageSelect() as HTMLSelectElement).value).toBe('javascript')
})

test('Turtle examples cannot be selected from a free environment without its course grant', async () => {
  const fixture = await pythonEnvironmentFixture('pro')
  const context = {
    catalog: fixture.environment.catalog,
    runtime: fixture.project.runtime,
    releaseStatus: 'active' as const,
    grantedExtensionIds: [] as string[],
  }
  const creation = {
    environments: [{ key: 'test', label: 'Python', kind: 'pro' as const, context }],
    prepare: async () => context,
    authorizeExample: async () => {},
  }
  const view = render(
    <KitGallery onOpenProject={() => {}} professional pythonCreation={creation} />,
  )
  fireEvent.change(languageSelect() as HTMLSelectElement, { target: { value: 'python' } })
  const example = await screen.findByRole('button', { name: /Corrida das Tartarugas/ })
  expect((example as HTMLButtonElement).disabled).toBe(true)
  view.rerender(
    <KitGallery
      onOpenProject={() => {}}
      professional
      pythonCreation={{
        ...creation,
        environments: [
          {
            ...creation.environments[0]!,
            context: { ...context, grantedExtensionIds: ['python-turtle'] },
          },
        ],
      }}
    />,
  )
  await waitFor(() => expect((example as HTMLButtonElement).disabled).toBe(false))
})
