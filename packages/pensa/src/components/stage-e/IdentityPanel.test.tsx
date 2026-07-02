import { describe, expect, it } from 'bun:test'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { getCopy } from '../../core/copy'
import type { PensaHostAdapter } from '../../core/types'
import { createProjectStore } from '../../state/projectStore'
import { createStageEStore, type PensaStageEStore } from '../../state/stageEStore'
import {
  createFakeTransport,
  type FakeTransport,
  makeDetail,
  makeIdentityArtifact,
  makeIdentitySuggestions,
  makeSpecArtifact,
  makeStageView,
} from '../../testing/fakeTransport'
import { PensaAppProvider } from '../appContext'
import { IdentityPanel } from './IdentityPanel'

const ICON_SVGS = [
  '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg"><rect width="16" height="16"/></svg>',
]

function makeIdentityTransport(): FakeTransport {
  return createFakeTransport((path, init) => {
    if (path === '/cycles/cycle-1/stages/e') {
      return makeStageView({ stage: 'e', artifacts: [makeSpecArtifact()] })
    }
    if (path === '/cycles/cycle-1/artifacts/generate' && init?.method === 'POST') {
      const body = init.body as { step?: string; name?: string; iconSvg?: string | null }
      if (body.step === 'suggestions') return { suggestions: makeIdentitySuggestions() }
      if (body.step === 'icons') return { icons: ICON_SVGS }
      if (body.step === 'save') {
        return {
          artifact: makeIdentityArtifact({
            content: {
              name: body.name ?? '',
              palette: makeIdentitySuggestions().palettes[0],
              iconSvg: body.iconSvg ?? null,
            },
          }),
        }
      }
    }
    if (path === '/projects/proj-1' && init?.method === 'PATCH') {
      return { project: makeDetail({ name: 'Dino Turbo' }) }
    }
    throw new Error(`rota inesperada: ${path} ${init?.method ?? 'GET'}`)
  })
}

async function renderPanel(transport: FakeTransport): Promise<{
  store: PensaStageEStore
  container: HTMLElement
}> {
  const store = createStageEStore(transport)
  await store.getState().loadStage('cycle-1')
  const adapter: PensaHostAdapter = { transport, mode: 'kids' }
  const { container } = render(
    <PensaAppProvider
      value={{ adapter, copy: getCopy('kids'), store: createProjectStore(transport) }}
    >
      <IdentityPanel store={store} projectId="proj-1" />
    </PensaAppProvider>,
  )
  // Drena (dentro de act) o carregamento disparado pelo effect de montagem.
  await act(async () => {})
  return { store, container }
}

describe('IdentityPanel', () => {
  it('funil completo: nome sugerido → paleta → ícone (via <img>) → resumo', async () => {
    const transport = makeIdentityTransport()
    const { store, container } = await renderPanel(transport)

    // Passo 1: sugestões carregam sozinhas e viram cards clicáveis.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Dino Turbo' })).toBeTruthy()
    })
    expect(screen.getByText('Como seu jogo vai se chamar?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Dino Turbo' }))

    // Passo 2: paletas com swatches + nome divertido.
    expect(screen.getByText('Quais cores são a cara do jogo?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Floresta Doce' }))

    // Passo 3: ícones chegam como <img src="data:image/svg+xml;utf8,...">.
    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'Símbolo 1' })).toBeTruthy()
    })
    const icon = screen.getByRole('img', { name: 'Símbolo 1' })
    expect(icon.getAttribute('src')).toStartWith('data:image/svg+xml;utf8,')
    expect(icon.getAttribute('src')).toContain(encodeURIComponent('<svg'))
    // Defesa em profundidade: o SVG NUNCA vira markup no DOM (sem
    // dangerouslySetInnerHTML — nenhum elemento <svg> injetado no painel).
    expect(container.querySelector('svg')).toBeNull()
    expect(container.innerHTML).not.toContain('<svg')

    fireEvent.click(screen.getByRole('button', { name: 'Símbolo 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar a cara do jogo' }))

    // Resumo ('done') com nome + swatches + ícone; o PATCH do nome aconteceu.
    await waitFor(() => {
      expect(screen.getByText('A cara do jogo ficou assim')).toBeTruthy()
      // Ciclo completo do save (inclui o PATCH do rename).
      expect(store.getState().savingIdentity).toBe(false)
    })
    expect(screen.getByText('Dino Turbo')).toBeTruthy()
    expect(screen.getByText('Floresta Doce')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Símbolo' })).toBeTruthy()
    expect(container.querySelector('svg')).toBeNull()
    expect(store.getState().identityStep).toBe('done')
    const patch = transport.calls.find((call) => call.method === 'PATCH')
    expect(patch?.path).toBe('/projects/proj-1')
    expect(patch?.body).toEqual({ name: 'Dino Turbo' })
  })

  it('"Quero inventar o meu": valida 2..40 e avança com o nome digitado', async () => {
    const transport = makeIdentityTransport()
    const { store } = await renderPanel(transport)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Quero inventar o meu' })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Quero inventar o meu' }))

    const input = screen.getByLabelText('Nome inventado por você')
    fireEvent.change(input, { target: { value: ' R ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Usar esse nome' }))
    expect(screen.getByRole('alert').textContent).toContain('pelo menos 2 letras')
    expect(store.getState().identityStep).toBe('name')

    fireEvent.change(input, { target: { value: '  Robô Maluco  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Usar esse nome' }))
    expect(store.getState().chosenName).toBe('Robô Maluco')
    expect(store.getState().identityStep).toBe('palette')
    expect(screen.getByText('Quais cores são a cara do jogo?')).toBeTruthy()
  })

  it('passo do ícone: "Gerar outros" regenera (e some no teto); dá pra ficar sem ícone', async () => {
    const transport = makeIdentityTransport()
    const { store } = await renderPanel(transport)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Pulo Jurássico' })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Pulo Jurássico' }))
    fireEvent.click(screen.getByRole('button', { name: 'Céu de Tarde' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Gerar outros' })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Gerar outros' }))
    await waitFor(() => {
      expect(store.getState().iconGenerations).toBe(2)
    })

    // No teto de gerações o botão some.
    act(() => {
      store.setState({ iconGenerations: 4 })
    })
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Gerar outros' })).toBeNull()
    })

    // "Ficar sem ícone por enquanto" salva com iconSvg null.
    fireEvent.click(screen.getByRole('button', { name: 'Ficar sem ícone por enquanto' }))
    await waitFor(() => {
      expect(store.getState().identityStep).toBe('done')
      expect(store.getState().savingIdentity).toBe(false)
    })
    const saveCall = transport.calls.find(
      (call) =>
        call.path === '/cycles/cycle-1/artifacts/generate' &&
        (call.body as { step?: string }).step === 'save',
    )
    expect((saveCall?.body as { iconSvg: string | null }).iconSvg).toBeNull()
    expect(screen.getByText('Sem símbolo por enquanto')).toBeTruthy()
  })

  it('erro ao carregar sugestões mostra aviso gentil com retry', async () => {
    let fail = true
    const transport = createFakeTransport((path, init) => {
      if (path === '/cycles/cycle-1/stages/e') {
        return makeStageView({ stage: 'e', artifacts: [makeSpecArtifact()] })
      }
      if (fail) throw new Error('explodiu')
      if (path === '/cycles/cycle-1/artifacts/generate' && init?.method === 'POST') {
        return { suggestions: makeIdentitySuggestions() }
      }
      throw new Error(`rota inesperada: ${path}`)
    })
    await renderPanel(transport)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy()
    })
    expect(screen.queryByText(/explodiu/)).toBeNull()

    fail = false
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Dino Turbo' })).toBeTruthy()
    })
  })
})
