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
      back: null,
      account: null,
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
    expect(screen.queryByRole('link', { name: 'Voltar para Criar' })).toBeNull()
  })

  it('a seta de volta para Criar vem DEPOIS do menu, e o clique simples é do host', async () => {
    const onNavigate = mock(() => {})
    const { chrome } = chromeWith({
      back: { label: 'Voltar para Criar', href: '/criar', onNavigate },
    })
    render(
      <PintaHostChromeProvider value={chrome}>
        <PintaApp />
      </PintaHostChromeProvider>,
    )
    await esperarGaleria()
    const seta = screen.getByRole('link', { name: 'Voltar para Criar' })
    expect(seta.getAttribute('href')).toBe('/criar')
    expect(seta.className).toBe('sz-tool-back')
    // Sem `title` (o nome já está no aria-label; o leitor repetiria).
    expect(seta.getAttribute('title')).toBeNull()
    const menu = screen.getByRole('button', { name: 'Esconder menu' })
    expect(menu.parentElement).toBe(seta.parentElement)
    expect(menu.compareDocumentPosition(seta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    // Com Ctrl o navegador abre outra aba: o host não navega por baixo.
    const comCtrl = fireEvent.click(seta, { ctrlKey: true })
    expect(comCtrl).toBe(true)
    expect(onNavigate).not.toHaveBeenCalled()
    // O clique simples troca de rota sem recarregar (o padrão do link é cancelado).
    const simples = fireEvent.click(seta)
    expect(simples).toBe(false)
    expect(onNavigate).toHaveBeenCalledTimes(1)
  })

  it('a seta aparece sozinha quando o host não manda o menu', async () => {
    const { chrome } = chromeWith({
      menu: null,
      back: { label: 'Voltar para Criar', href: '/criar', onNavigate: () => {} },
    })
    render(
      <PintaHostChromeProvider value={chrome}>
        <PintaApp />
      </PintaHostChromeProvider>,
    )
    await esperarGaleria()
    expect(screen.getByRole('link', { name: 'Voltar para Criar' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /menu/i })).toBeNull()
  })

  it('com a nuvem da conta ligada e nada acontecendo: a pílula em repouso e "na sua conta"', async () => {
    const naves = [
      createPixelSpriteAsset({ name: 'nave', frameSize: 32 }),
      createPixelSpriteAsset({ name: 'lua', frameSize: 32 }),
    ]
    const { chrome } = chromeWith({ status: null, account: { label: 'Guardado na sua conta' } })
    render(
      <PintaHostChromeProvider value={chrome}>
        <PintaApp persistence={createMemoryPersistence(naves)} />
      </PintaHostChromeProvider>,
    )
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Abrir nave/ })).toBeTruthy()
    })
    const pilula = screen.getByText('Guardado na sua conta').closest('[role="status"]')
    expect(pilula?.className).toContain('sz-tool-status--ok')
    expect(screen.getByRole('heading', { name: COPY.gallery.savedAccount(2) })).toBeTruthy()
  })

  it('sem a nuvem da conta o cartão diz "neste aparelho"; e o selo do host vence a conta', async () => {
    const naves = [createPixelSpriteAsset({ name: 'nave', frameSize: 32 })]
    const { chrome } = chromeWith({
      status: {
        tone: 'muted',
        icon: 'upload',
        label: 'Guardando…',
        text: 'Guardando na sua conta…',
      },
      account: null,
    })
    render(
      <PintaHostChromeProvider value={chrome}>
        <PintaApp persistence={createMemoryPersistence(naves)} />
      </PintaHostChromeProvider>,
    )
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Abrir nave/ })).toBeTruthy()
    })
    expect(screen.getByRole('heading', { name: COPY.gallery.savedDevice(1) })).toBeTruthy()
    expect(screen.getByText('Guardando na sua conta…')).toBeTruthy()
  })

  it('o selo do host vence a pílula em repouso da conta', async () => {
    const { chrome } = chromeWith({
      status: { tone: 'warn', icon: 'offline', label: 'Sem internet', text: 'Sem internet agora' },
      account: { label: 'Guardado na sua conta' },
    })
    render(
      <PintaHostChromeProvider value={chrome}>
        <PintaApp />
      </PintaHostChromeProvider>,
    )
    await esperarGaleria()
    expect(screen.getByText('Sem internet agora')).toBeTruthy()
    expect(screen.queryByText('Guardado na sua conta')).toBeNull()
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

  it('o editor ignora a seta da galeria (lá o Voltar leva à galeria)', async () => {
    const nave = createPixelSpriteAsset({ name: 'nave', frameSize: 32 })
    const { chrome } = chromeWith({
      back: { label: 'Voltar para Criar', href: '/criar', onNavigate: () => {} },
    })
    render(
      <PintaHostChromeProvider value={chrome}>
        <PintaApp persistence={createMemoryPersistence([nave])} />
      </PintaHostChromeProvider>,
    )
    await abrirNave()
    expect(screen.queryByRole('link', { name: 'Voltar para Criar' })).toBeNull()
  })
})
