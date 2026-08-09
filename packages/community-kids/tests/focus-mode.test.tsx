import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

/**
 * O "modo foco" (esconder o menu lateral) nasceu só para a página de aula e passou
 * a valer TAMBÉM nos apps de criação (Estúdio/Pensa/Pinta) — as telas que mais
 * pedem área útil. Não havia teste nenhum dele; este fecha a lacuna nas duas
 * derivações que quebram em silêncio: ONDE o botão é oferecido (`navAvailable`) e
 * a preferência ser lembrada POR PERFIL.
 *
 * ⚠️ `mock.module` NÃO é isolado por arquivo no bun: o último registro vale para
 * TODO import seguinte, em qualquer arquivo. Por isso o mock ESPALHA o módulo atual
 * em vez de substituí-lo — assim ele só CRESCE e nenhum arquivo perde um export de
 * que precisa. Um mock estreito derrubou o CI (Linux ordena os arquivos diferente do
 * Windows): `focus-mode.tsx` importa `usePathname`, e o link do ESM falhou com
 * "Export named 'usePathname' not found". Os outros mocks de `next/navigation` do
 * pacote seguem a MESMA receita.
 */
const nav = await import('next/navigation')
let pathname = '/estudio'
const refresh = mock(() => {})
mock.module('next/navigation', () => ({
  ...nav,
  usePathname: () => pathname,
  useRouter: () => ({ refresh }),
}))

const { FocusModeProvider } = await import('../src/components/kids/focus-mode')
const { FocusModeToggle } = await import('../src/components/kids/focus-mode-toggle')

/** happy-dom não implementa `matchMedia`; o `useMinWidth` depende dele. */
function setViewportWidth(width: number): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => {
      const min = Number(/\(min-width:\s*(\d+)px\)/.exec(query)?.[1] ?? '0')
      return {
        matches: width >= min,
        addEventListener: () => {},
        removeEventListener: () => {},
      }
    },
  })
}

function renderNav(viewerId = 'perfil-1') {
  return render(
    <FocusModeProvider viewerId={viewerId}>
      <FocusModeToggle target="nav" variant="edge" />
    </FocusModeProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  setViewportWidth(1280)
})

afterEach(cleanup)

describe('modo foco — onde o botão do menu é oferecido', () => {
  it('aparece nos três apps de criação (e no Estúdio Pro)', () => {
    for (const route of ['/estudio', '/pensa', '/pinta', '/estudio/pro/abc123']) {
      pathname = route
      const { unmount } = renderNav()
      expect(screen.getByRole('button', { name: 'Esconder menu' })).toBeDefined()
      unmount()
    }
  })

  it('aparece na página de aula, na roupa de cabeçalho (sem regressão)', () => {
    pathname = '/cursos/meu-curso/aulas/abc123'
    const { container } = render(
      <FocusModeProvider viewerId="perfil-1">
        <FocusModeToggle target="nav" />
        <FocusModeToggle target="outline" />
      </FocusModeProvider>,
    )
    expect(screen.getByRole('button', { name: 'Esconder menu' })).toBeDefined()
    // A lista de aulas segue EXCLUSIVA da aula.
    expect(screen.getByRole('button', { name: 'Esconder lista de aulas' })).toBeDefined()
    expect(container.querySelector('button.size-11')).not.toBeNull()
  })

  it('não aparece nas demais telas (a preferência salva nunca some o menu fora delas)', () => {
    localStorage.setItem('sz:kids:hide-nav:perfil-1', '1')
    for (const route of ['/cursos', '/perfil', '/']) {
      pathname = route
      const { unmount } = renderNav()
      expect(screen.queryByRole('button', { name: /menu/i })).toBeNull()
      unmount()
    }
  })

  it('não aparece abaixo de 768px, onde a sidebar nem existe', () => {
    pathname = '/estudio'
    setViewportWidth(500)
    renderNav()
    expect(screen.queryByRole('button', { name: /menu/i })).toBeNull()
  })

  it('a lista de aulas NÃO é oferecida nos apps de criação', () => {
    pathname = '/estudio'
    render(
      <FocusModeProvider viewerId="perfil-1">
        <FocusModeToggle target="outline" />
      </FocusModeProvider>,
    )
    expect(screen.queryByRole('button', { name: /lista de aulas/i })).toBeNull()
  })
})

describe('modo foco — o controle em si', () => {
  it('NÃO tem `title` (com aria-label ele viraria descrição e o leitor repetiria)', () => {
    pathname = '/estudio'
    renderNav()
    expect(screen.getByRole('button', { name: 'Esconder menu' }).getAttribute('title')).toBeNull()
  })

  it('o puxador tem anel de foco INSET (a borda de recorte do main cortaria o de fora)', () => {
    pathname = '/estudio'
    const { container } = renderNav()
    const tab = container.querySelector('button')
    // O `<main>` é `overflow-hidden` e o puxador encosta na borda de recorte.
    expect(tab?.className).toContain('focus-visible:shadow-[inset_0_0_0_3px_var(--ring)')
    // A sombra dura cresce p/ a direita/baixo — o lado que o recorte não come.
    expect(tab?.className).toContain('shadow-[2px_2px_0_var(--border)]')
  })

  it('o puxador não usa o círculo do cabeçalho (as roupas não se misturam)', () => {
    pathname = '/estudio'
    const { container, unmount } = renderNav()
    expect(container.querySelector('button.size-11')).toBeNull()
    expect(container.querySelector('button.absolute.left-0')).not.toBeNull()
    unmount()

    pathname = '/cursos/meu-curso/aulas/abc123'
    const header = render(
      <FocusModeProvider viewerId="perfil-1">
        <FocusModeToggle target="nav" />
      </FocusModeProvider>,
    )
    expect(header.container.querySelector('button.size-11')).not.toBeNull()
    expect(header.container.querySelector('button.absolute')).toBeNull()
  })
})

describe('modo foco — preferência por perfil', () => {
  it('o clique alterna o estado e grava na chave do PERFIL', () => {
    pathname = '/estudio'
    renderNav('perfil-1')

    const button = screen.getByRole('button', { name: 'Esconder menu' })
    expect(button.getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(button)

    const pressed = screen.getByRole('button', { name: 'Mostrar menu' })
    expect(pressed.getAttribute('aria-pressed')).toBe('true')
    expect(localStorage.getItem('sz:kids:hide-nav:perfil-1')).toBe('1')

    fireEvent.click(pressed)
    expect(localStorage.getItem('sz:kids:hide-nav:perfil-1')).toBe('0')
  })

  it('lembra a preferência salva do perfil e ignora a do irmão', () => {
    localStorage.setItem('sz:kids:hide-nav:perfil-1', '1')
    pathname = '/pinta'

    const { unmount } = renderNav('perfil-1')
    expect(screen.getByRole('button', { name: 'Mostrar menu' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    unmount()

    renderNav('perfil-2')
    expect(screen.getByRole('button', { name: 'Esconder menu' }).getAttribute('aria-pressed')).toBe(
      'false',
    )
  })
})
