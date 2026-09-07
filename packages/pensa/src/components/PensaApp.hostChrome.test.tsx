import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { PensaHostAdapter, PensaHostChrome } from '../core/types'
import { PensaHostChromeProvider } from './hostChrome'
import { PensaApp } from './PensaApp'

afterEach(cleanup)

/**
 * Chrome do HOST nos cabeçalhos do Pensa (07/09/2026): o botão de esconder o menu da
 * comunidade vem antes do título na home, desenhado com o círculo do próprio Pensa. Sem
 * Provider nada aparece (playground).
 */
function adapter(): PensaHostAdapter {
  return {
    mode: 'kids',
    capabilities: { pintaOwned: true, studioOwned: true },
    onOpenTask: () => undefined,
    transport: {
      request: (async (path: string) => {
        if (path === '/projects') return { projects: [] }
        throw new Error(`Unexpected request: ${path}`)
      }) as PensaHostAdapter['transport']['request'],
      streamChat: () => () => {},
    },
  }
}

describe('PensaApp × chrome do host', () => {
  test('a home desenha o botão do menu (receita compartilhada, aria-pressed, sem title) e o clique é do host', async () => {
    const onToggle = mock(() => {})
    const chrome: PensaHostChrome = { menu: { hidden: false, label: 'Esconder menu', onToggle } }
    render(
      <PensaHostChromeProvider value={chrome}>
        <PensaApp adapter={adapter()} />
      </PensaHostChromeProvider>,
    )
    await waitFor(() => screen.getByRole('heading', { name: 'Meus projetos' }))
    const botao = screen.getByRole('button', { name: 'Esconder menu' })
    // A receita COMPARTILHADA das ferramentas (`@sistemazero/ui/tool-chrome.css`).
    expect(botao.className).toBe('sz-tool-btn-menu')
    expect(botao.getAttribute('aria-pressed')).toBe('false')
    expect(botao.getAttribute('title')).toBeNull()
    // Antes do título, dentro do bloco da esquerda (o header é space-between [título][Zappy]).
    const lead = botao.closest('.pensa-home-lead')
    expect(lead).not.toBeNull()
    expect(lead?.querySelector('h1')?.textContent).toBe('Meus projetos')
    fireEvent.click(botao)
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  test('menu escondido = pressionado com a tinta suave do acento', async () => {
    const chrome: PensaHostChrome = {
      menu: { hidden: true, label: 'Mostrar menu', onToggle: () => {} },
    }
    render(
      <PensaHostChromeProvider value={chrome}>
        <PensaApp adapter={adapter()} />
      </PensaHostChromeProvider>,
    )
    await waitFor(() => screen.getByRole('heading', { name: 'Meus projetos' }))
    const botao = screen.getByRole('button', { name: 'Mostrar menu' })
    // O estado "escondido" é só o `aria-pressed` (a folha compartilhada pinta por ele).
    expect(botao.getAttribute('aria-pressed')).toBe('true')
    expect(botao.className).toBe('sz-tool-btn-menu')
  })

  test('sem Provider (playground) e com menu null nada aparece', async () => {
    const { unmount } = render(<PensaApp adapter={adapter()} />)
    await waitFor(() => screen.getByRole('heading', { name: 'Meus projetos' }))
    expect(screen.queryByRole('button', { name: /menu/i })).toBeNull()
    unmount()

    render(
      <PensaHostChromeProvider value={{ menu: null }}>
        <PensaApp adapter={adapter()} />
      </PensaHostChromeProvider>,
    )
    await waitFor(() => screen.getByRole('heading', { name: 'Meus projetos' }))
    expect(screen.queryByRole('button', { name: /menu/i })).toBeNull()
  })
})
