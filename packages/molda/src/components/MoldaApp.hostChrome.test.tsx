/**
 * O chrome do HOST dentro do Molda (11/09/2026, lote 6b): o menu, a seta de volta para Criar, a
 * pílula da nuvem e a conta, desenhados pelo Molda a partir dos DADOS do Provider.
 */
import { beforeEach, describe, expect, test } from 'bun:test'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { JSX } from 'react'
import { COPY } from '../core/copy'
import { GALLERY_SHELL_COPY } from '../core/galleryShellCopy'
import type { MoldaHostChrome, MoldaHostChromeStatus } from '../core/hostChrome'
import { createMemoryPersistence } from '../state/memoryPersistence'
import { resetMoldaPersistenceForTests } from '../state/persistence'
import { makeSky } from '../testing/fixtures'
import { MoldaHostChromeProvider } from './hostChrome'
import { MoldaApp } from './MoldaApp'

beforeEach(() => {
  resetMoldaPersistenceForTests()
})

const WARN: MoldaHostChromeStatus = {
  tone: 'warn',
  icon: 'offline',
  label: 'Sem internet agora',
  text: 'Sem internet agora. Vou guardar na sua conta quando voltar.',
}
const SAVED: MoldaHostChromeStatus = {
  tone: 'ok',
  icon: 'cloud',
  label: 'Guardado na sua conta',
  text: 'Guardado na sua conta',
}

function chrome(overrides: Partial<MoldaHostChrome> = {}): {
  value: MoldaHostChrome
  calls: { toggles: number; navigations: number }
} {
  const calls = { toggles: 0, navigations: 0 }
  return {
    calls,
    value: {
      menu: { hidden: false, label: 'Esconder menu', onToggle: () => (calls.toggles += 1) },
      status: null,
      back: {
        label: 'Voltar para Criar',
        href: '/criar',
        onNavigate: () => (calls.navigations += 1),
      },
      account: { label: 'Guardado na sua conta' },
      ...overrides,
    },
  }
}

function app(value: MoldaHostChrome | null): JSX.Element {
  const molda = <MoldaApp persistence={createMemoryPersistence([makeSky()])} />
  return value ? <MoldaHostChromeProvider value={value}>{molda}</MoldaHostChromeProvider> : molda
}

describe('chrome do host na galeria', () => {
  test('sem Provider nada aparece, e o cartão lilás fala do APARELHO', async () => {
    render(app(null))
    await screen.findByRole('list', { name: COPY.a11y.galleryGrid })
    expect(screen.queryByRole('button', { name: 'Esconder menu' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Voltar para Criar' })).toBeNull()
    expect(screen.getByRole('region', { name: GALLERY_SHELL_COPY.savedDevice(1) })).toBeDefined()
  })

  test('menu e seta ANTES do título; a conta em repouso vira a pílula e o lilás fala da CONTA', async () => {
    const { value, calls } = chrome()
    render(app(value))
    const heading = await screen.findByRole('heading', { level: 1, name: COPY.gallery.title })
    const header = heading.closest('header')
    if (!header) throw new Error('sem cabeçalho')
    const menu = within(header).getByRole('button', { name: 'Esconder menu' })
    expect(menu.className).toContain('sz-tool-btn-menu')
    expect(menu.getAttribute('aria-pressed')).toBe('false')
    // Sem `title`: com `aria-label` ele viraria descrição e o leitor repetiria o nome.
    expect(menu.getAttribute('title')).toBeNull()
    const back = within(header).getByRole('link', { name: 'Voltar para Criar' })
    expect(back.className).toContain('sz-tool-back')
    expect(back.getAttribute('href')).toBe('/criar')
    expect(menu.compareDocumentPosition(back)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(back.compareDocumentPosition(heading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)

    const pill = within(header).getByRole('status')
    expect(pill.className).toContain('sz-tool-status--ok')
    expect(pill.textContent).toBe('Guardado na sua conta')
    expect(screen.getByRole('region', { name: GALLERY_SHELL_COPY.savedAccount(1) })).toBeDefined()

    fireEvent.click(menu)
    expect(calls.toggles).toBe(1)
  })

  test('a seta: clique simples navega pelo host; com Ctrl fica com o navegador', async () => {
    const { value, calls } = chrome()
    render(app(value))
    const back = await screen.findByRole('link', { name: 'Voltar para Criar' })
    expect(fireEvent.click(back)).toBe(false) // o clique simples é cancelado (o host navega)
    expect(calls.navigations).toBe(1)
    expect(fireEvent.click(back, { ctrlKey: true })).toBe(true)
    expect(calls.navigations).toBe(1)
  })

  test('o selo do host vence a conta: com algo acontecendo, a pílula diz o que é', async () => {
    const { value } = chrome({ status: WARN })
    render(app(value))
    const heading = await screen.findByRole('heading', { level: 1, name: COPY.gallery.title })
    const pill = within(heading.closest('header') as HTMLElement).getByRole('status')
    expect(pill.className).toContain('sz-tool-status--warn')
    expect(pill.textContent).toBe(WARN.text)
  })

  test('menu escondido é marcado por aria-pressed', async () => {
    const { value } = chrome({
      menu: { hidden: true, label: 'Mostrar menu', onToggle: () => {} },
    })
    render(app(value))
    const menu = await screen.findByRole('button', { name: 'Mostrar menu' })
    expect(menu.getAttribute('aria-pressed')).toBe('true')
  })

  test('a seta aparece mesmo sem o menu', async () => {
    const { value } = chrome({ menu: null })
    render(app(value))
    expect(await screen.findByRole('link', { name: 'Voltar para Criar' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Esconder menu' })).toBeNull()
  })
})

describe('chrome do host na barra do editor', () => {
  test('o menu vem ANTES do Voltar, o selo depois do "Salvo", e o editor ignora a seta e a conta', async () => {
    const { value } = chrome({ status: SAVED })
    render(app(value))
    fireEvent.click(
      await screen.findByRole('button', {
        name: COPY.a11y.assetCard('fim-de-tarde', COPY.kinds.sky.title),
      }),
    )
    const heading = await screen.findByRole('heading', { level: 1, name: 'fim-de-tarde' })
    const bar = heading.closest('header')
    if (!bar) throw new Error('sem barra')
    const menu = within(bar).getByRole('button', { name: 'Esconder menu' })
    const back = within(bar).getByRole('button', { name: COPY.editor.backToGallery })
    expect(menu.compareDocumentPosition(back)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(screen.queryByRole('link', { name: 'Voltar para Criar' })).toBeNull()

    const [save, seal] = within(bar).getAllByRole('status')
    expect(save?.getAttribute('aria-label')).toBe(COPY.a11y.editorStatus)
    // Em REPOUSO o selo é só a nuvem: o nome mora no `title`, sem frase ocupando a barra.
    expect(seal?.getAttribute('title')).toBe(SAVED.text)
    expect(seal?.textContent).toBe('')
    expect(save?.compareDocumentPosition(seal as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  test('com aviso, o selo da barra mostra o rótulo curto', async () => {
    const { value } = chrome({ status: WARN })
    render(app(value))
    fireEvent.click(
      await screen.findByRole('button', {
        name: COPY.a11y.assetCard('fim-de-tarde', COPY.kinds.sky.title),
      }),
    )
    const heading = await screen.findByRole('heading', { level: 1, name: 'fim-de-tarde' })
    const bar = heading.closest('header') as HTMLElement
    const seal = within(bar)
      .getAllByRole('status')
      .find((element) => element.getAttribute('title') === WARN.text)
    expect(seal?.textContent).toBe(WARN.label)
  })
})
