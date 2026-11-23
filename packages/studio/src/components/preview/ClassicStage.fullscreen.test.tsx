import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { createEmptyProject } from '#core'
import { StudioStoresContext } from '../../state/storesContext'
import { createStudioStores } from '../../state/studioStores'
import { StudioLayoutProvider } from '../../studio/layoutContext'
import { ClassicStage } from './ClassicStage'

/**
 * O botão de tela cheia do palco (pedido de 23/11/2026: entrava, mas para voltar só o Esc
 * funcionava). O happy-dom não tem a API de tela cheia: este navegador de mentira guarda o
 * elemento e avisa pelo `fullscreenchange`, como o de verdade.
 */
let emTelaCheia: Element | null = null
const pedidos: string[] = []
const originais = {
  request: HTMLElement.prototype.requestFullscreen,
  exit: document.exitFullscreen,
  element: Object.getOwnPropertyDescriptor(document, 'fullscreenElement'),
}
const avisar = () => document.dispatchEvent(new Event('fullscreenchange'))

beforeEach(() => {
  emTelaCheia = null
  pedidos.length = 0
  HTMLElement.prototype.requestFullscreen = async function (this: HTMLElement) {
    pedidos.push(`entrar:${this.className.split(' ')[0]}`)
    emTelaCheia = this
    avisar()
  }
  document.exitFullscreen = async () => {
    pedidos.push('sair')
    emTelaCheia = null
    avisar()
  }
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => emTelaCheia,
  })
})

afterEach(() => {
  HTMLElement.prototype.requestFullscreen = originais.request
  document.exitFullscreen = originais.exit
  if (originais.element) Object.defineProperty(document, 'fullscreenElement', originais.element)
  else delete (document as { fullscreenElement?: unknown }).fullscreenElement
})

function palco() {
  const stores = createStudioStores({ persistence: 'none' })
  stores.project.setState({
    project: createEmptyProject('01J0000000000000000000TELA', 'Meu jogo'),
    isDirty: false,
    saveError: null,
  })
  render(
    <StudioStoresContext.Provider value={stores}>
      <StudioLayoutProvider value={{ width: 1440, isNarrow: false, isCompact: false }}>
        <ClassicStage subject="game" phone={false} cards="error">
          <div />
        </ClassicStage>
      </StudioLayoutProvider>
    </StudioStoresContext.Provider>,
  )
}

describe('a tela cheia do palco', () => {
  it('o mesmo botão entra e sai', async () => {
    palco()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Tela cheia' }))
    })
    expect(pedidos).toEqual(['entrar:sz-pro-stage'])
    const sair = screen.getByRole('button', { name: 'Sair da tela cheia' })
    expect(sair.getAttribute('title')).toBe('Sair da tela cheia')
    await act(async () => {
      fireEvent.click(sair)
    })
    expect(pedidos).toEqual(['entrar:sz-pro-stage', 'sair'])
    expect(screen.getByRole('button', { name: 'Tela cheia' })).toBeTruthy()
  })

  it('saindo pelo Esc, o botão volta a ser "Tela cheia" e entra de novo', async () => {
    palco()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Tela cheia' }))
    })
    // O navegador sai sozinho no Esc e só avisa.
    act(() => {
      emTelaCheia = null
      avisar()
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Tela cheia' }))
    })
    expect(pedidos).toEqual(['entrar:sz-pro-stage', 'entrar:sz-pro-stage'])
  })

  it('outro elemento em tela cheia (o próprio jogo) não vira "Sair" no palco', async () => {
    palco()
    act(() => {
      emTelaCheia = document.createElement('iframe')
      avisar()
    })
    expect(screen.getByRole('button', { name: 'Tela cheia' })).toBeTruthy()
  })
})
