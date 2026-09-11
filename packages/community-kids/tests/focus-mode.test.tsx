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
      <FocusModeToggle target="nav" />
    </FocusModeProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  setViewportWidth(1280)
})

afterEach(cleanup)

const { useFocusMode } = await import('../src/components/kids/focus-mode')

/** Sonda do que as FERRAMENTAS leem (desde 07/09 o botão vive na barra delas). */
function Probe() {
  const { navAvailable, outlineAvailable } = useFocusMode()
  return <output data-nav={String(navAvailable)} data-outline={String(outlineAvailable)} />
}

describe('modo foco — o que as ferramentas leem (`navAvailable`)', () => {
  it('é oferecido nos QUATRO apps de criação e no Estúdio Pro, a partir de 768px', () => {
    for (const route of ['/estudio', '/pensa', '/pinta', '/molda', '/estudio/pro/abc123']) {
      pathname = route
      const { container, unmount } = render(
        <FocusModeProvider viewerId="perfil-1">
          <Probe />
        </FocusModeProvider>,
      )
      const probe = container.querySelector('output')
      expect(probe?.getAttribute('data-nav')).toBe('true')
      // A lista de aulas segue EXCLUSIVA da aula.
      expect(probe?.getAttribute('data-outline')).toBe('false')
      unmount()
    }
  })

  it('não é oferecido abaixo de 768px nem fora das telas (mesmo com a preferência salva)', () => {
    pathname = '/estudio'
    setViewportWidth(500)
    const narrow = render(
      <FocusModeProvider viewerId="perfil-1">
        <Probe />
      </FocusModeProvider>,
    )
    expect(narrow.container.querySelector('output')?.getAttribute('data-nav')).toBe('false')
    narrow.unmount()

    setViewportWidth(1280)
    localStorage.setItem('sz:kids:hide-nav:perfil-1', '1')
    for (const route of ['/cursos', '/perfil', '/']) {
      pathname = route
      const { container, unmount } = render(
        <FocusModeProvider viewerId="perfil-1">
          <Probe />
        </FocusModeProvider>,
      )
      expect(container.querySelector('output')?.getAttribute('data-nav')).toBe('false')
      unmount()
    }
  })
})

describe('modo foco — onde o botão do menu é oferecido', () => {
  it('está disponível nos apps de criação (e no Estúdio Pro), onde a ferramenta o desenha', () => {
    for (const route of ['/estudio', '/pensa', '/pinta', '/molda', '/estudio/pro/abc123']) {
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

  it('é uma roupa só: o quadrado do cabeçalho, sem o puxador que flutuava na borda', () => {
    // O puxador (`edge`) saiu no lote 6b: nas ferramentas quem desenha o botão é a barra delas.
    pathname = '/cursos/meu-curso/aulas/abc123'
    const { container } = renderNav()
    expect(container.querySelector('button.size-11')).not.toBeNull()
    expect(container.querySelector('button.absolute')).toBeNull()
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
