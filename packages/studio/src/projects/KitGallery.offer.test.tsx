import { afterEach, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { pythonEnvironmentFixture } from '../state/fixtures/pythonEnvironment'
import { KitGallery } from './KitGallery'

afterEach(cleanup)

const discovery = { loading: false, unavailable: false, retry() {} }
const languageSelect = () => document.querySelector('select[name="kit-language"]')

test('without a host Python offer the gallery shows no language choice', () => {
  render(<KitGallery onOpenProject={() => {}} professional />)
  expect(languageSelect()).toBeNull()
  expect(screen.queryByRole('option', { name: 'Python' })).toBeNull()
})

test('both host language rights show the choice with JavaScript as default', () => {
  render(<KitGallery onOpenProject={() => {}} professional pythonDiscovery={discovery} />)
  expect((languageSelect() as HTMLSelectElement | null)?.value).toBe('javascript')
  expect(screen.getByRole('option', { name: 'Python' })).toBeDefined()
})

test('Python-only achievements never offer JavaScript examples', () => {
  render(
    <KitGallery onOpenProject={() => {}} javascriptAvailable={false} pythonDiscovery={discovery} />,
  )
  expect((languageSelect() as HTMLSelectElement).value).toBe('python')
  expect(screen.queryByRole('option', { name: 'JavaScript' }) === null).toBe(true)
  expect(screen.getByText(/Python ainda não está disponível/).textContent).toBeTruthy()
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

test('o card de um exemplo grande mostra a capa tirada do jogo, decorativa', {
  timeout: 15_000,
}, async () => {
  render(<KitGallery onOpenProject={() => {}} professional />)
  // O grupo do Jogo 2D abre no percurso recomendado; o jogo D aparece em "Ver todos os jogos 2D".
  fireEvent.click(
    await screen.findByRole('button', { name: 'Ver todos os jogos 2D' }, { timeout: 4000 }),
  )
  const nome = await screen.findByText('Mundo das Portas', {}, { timeout: 4000 })
  const card = nome.closest('button') as HTMLButtonElement
  const capa = card.querySelector('img[data-sz-kit-cover]') as HTMLImageElement
  expect(capa).not.toBeNull()
  expect(capa.getAttribute('src')).toMatch(/^data:image\/png;base64,/)
  // O nome do botão continua sendo o texto do card (a imagem não entra nele).
  expect(capa.getAttribute('alt')).toBe('')
  // Os outros cards seguem só com o emoji: a única capa da lista é a do jogo D.
  expect(document.querySelectorAll('img[data-sz-kit-cover]')).toHaveLength(1)
})
