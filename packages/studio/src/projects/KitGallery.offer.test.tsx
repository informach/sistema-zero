import { afterEach, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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
  expect(screen.getByText(/Python Pro ainda não está disponível/)).toBeDefined()
  view.rerender(<KitGallery onOpenProject={() => {}} professional />)
  expect(languageSelect()).toBeNull()
  expect(screen.queryByText(/Python Pro ainda não está disponível/)).toBeNull()
  // A oferta voltando não reativa a escolha antiga.
  view.rerender(<KitGallery onOpenProject={() => {}} professional pythonDiscovery={discovery} />)
  expect((languageSelect() as HTMLSelectElement).value).toBe('javascript')
})
