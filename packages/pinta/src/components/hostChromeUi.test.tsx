/**
 * Chrome do HOST dentro do Pinta (07/09/2026): o botão de esconder o menu da comunidade e o
 * selo "Guardado na sua conta" entram no cabeçalho da galeria e na barra do editor, desenhados
 * pelo Pinta a partir dos DADOS que o host passa pelo `PintaHostChromeProvider`. Sem Provider
 * nada aparece — é o que mantém playground, adulto e o bloco de aula intocados.
 */
import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../core/copy'
import { createPixelSpriteAsset } from '../core/project'
import type { PintaHostChrome } from '../core/types'
import { clearIdbMock } from '../testing/idbMock'

const { PintaApp } = await import('./PintaApp')
const { PintaHostChromeProvider } = await import('./hostChrome')
const { setPintaStorageNamespace } = await import('../state/persistence')
const { createMemoryPersistence } = await import('../state/memoryPersistence')

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
})

function chromeWith(overrides: Partial<PintaHostChrome> = {}): {
  chrome: PintaHostChrome
  onToggle: ReturnType<typeof mock>
} {
  const onToggle = mock(() => {})
  return {
    onToggle,
    chrome: {
      menu: { hidden: false, label: 'Esconder menu', onToggle },
      status: {
        tone: 'ok',
        icon: 'cloud',
        label: 'Guardado na sua conta',
        text: 'Guardado na sua conta',
      },
      ...overrides,
    },
  }
}

async function esperarGaleria(): Promise<void> {
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: COPY.gallery.title })).toBeTruthy()
  })
}

async function abrirNave(): Promise<void> {
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /Abrir nave/ })).toBeTruthy()
  })
  fireEvent.click(screen.getByRole('button', { name: /Abrir nave/ }))
  await waitFor(() => {
    expect(screen.getByRole('button', { name: COPY.editor.back })).toBeTruthy()
  })
}

describe('chrome do host — galeria', () => {
  it('desenha o botão do menu (aria-pressed) e o selo com a frase inteira; o clique é do host', async () => {
    const { chrome, onToggle } = chromeWith()
    render(
      <PintaHostChromeProvider value={chrome}>
        <PintaApp />
      </PintaHostChromeProvider>,
    )
    await esperarGaleria()
    const botao = screen.getByRole('button', { name: 'Esconder menu' })
    expect(botao.getAttribute('aria-pressed')).toBe('false')
    // Sem `title`: com aria-label presente ele viraria descrição e o leitor repetiria.
    expect(botao.getAttribute('title')).toBeNull()
    fireEvent.click(botao)
    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Guardado na sua conta')).toBeTruthy()
  })

  it('menu escondido = pressionado com a tinta suave do acento (não o preenchimento de ferramenta)', async () => {
    const { chrome } = chromeWith({
      menu: { hidden: true, label: 'Mostrar menu', onToggle: () => {} },
    })
    render(
      <PintaHostChromeProvider value={chrome}>
        <PintaApp />
      </PintaHostChromeProvider>,
    )
    await esperarGaleria()
    const botao = screen.getByRole('button', { name: 'Mostrar menu' })
    expect(botao.getAttribute('aria-pressed')).toBe('true')
    // A receita COMPARTILHADA (`@sistemazero/ui/tool-chrome.css`): o estado "escondido" é o
    // `[aria-pressed="true"]` dela, nunca o preenchimento forte de ferramenta ativa.
    expect(botao.className).toBe('sz-tool-btn-menu')
    expect(botao.className).not.toContain('pin-tool-active')
  })

  it('status null = sem selo; menu null = sem botão (o host decide, o Pinta só desenha)', async () => {
    const { chrome } = chromeWith({ menu: null, status: null })
    render(
      <PintaHostChromeProvider value={chrome}>
        <PintaApp />
      </PintaHostChromeProvider>,
    )
    await esperarGaleria()
    expect(screen.queryByRole('button', { name: /menu/i })).toBeNull()
    expect(screen.queryByText('Guardado na sua conta')).toBeNull()
  })

  it('sem Provider (playground, adulto) nada do host aparece', async () => {
    render(<PintaApp />)
    await esperarGaleria()
    expect(screen.queryByRole('button', { name: /menu/i })).toBeNull()
    expect(screen.queryByText(/na sua conta/)).toBeNull()
  })
})

describe('chrome do host — editor', () => {
  it('o botão do menu vem antes do Voltar e o selo ao lado do "Salvo" (rótulo curto)', async () => {
    const nave = createPixelSpriteAsset({ name: 'nave', frameSize: 32 })
    const { chrome, onToggle } = chromeWith({
      status: {
        tone: 'muted',
        icon: 'upload',
        label: 'Guardando…',
        text: 'Guardando na sua conta…',
      },
    })
    render(
      <PintaHostChromeProvider value={chrome}>
        <PintaApp persistence={createMemoryPersistence([nave])} />
      </PintaHostChromeProvider>,
    )
    await abrirNave()
    const header = screen.getByRole('button', { name: COPY.editor.back }).closest('header')
    expect(header).not.toBeNull()
    const menu = screen.getByRole('button', { name: 'Esconder menu' })
    expect(header?.contains(menu)).toBe(true)
    // Ordem: menu ANTES do Voltar (o canto mais perto do painel que ele controla).
    const botoes: Element[] = Array.from(header?.querySelectorAll('button') ?? [])
    expect(botoes.indexOf(menu)).toBeLessThan(
      botoes.indexOf(screen.getByRole('button', { name: COPY.editor.back })),
    )
    fireEvent.click(menu)
    expect(onToggle).toHaveBeenCalledTimes(1)
    // O selo usa o rótulo CURTO na barra, com a frase inteira no title.
    const selo = screen.getByText('Guardando…').closest('[role="status"]')
    expect(selo?.getAttribute('title')).toBe('Guardando na sua conta…')
    // E o "Salvo" local continua lá, ao lado.
    expect(screen.getByText(COPY.editor.saved)).toBeTruthy()
  })
})
