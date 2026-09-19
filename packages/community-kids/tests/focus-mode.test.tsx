import { afterAll, afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

/**
 * O "modo foco" esconde o menu lateral ao entrar nas aulas e ferramentas de
 * criação. Estes testes verificam onde o controle aparece e se cada entrada
 * começa recolhida, sem afetar o menu das demais páginas.
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

/**
 * A largura da janela na mão: o `useMinWidth` lê `matchMedia`.
 *
 * ⚠️⚠️ Só responde às consultas de `min-width`; qualquer outra (`prefers-reduced-motion`, por exemplo) é
 * `false`, e o original volta no `afterAll` (full review de 16/09/2026). O falso respondia `true` a
 * toda consulta sem `min-width` e nunca era desfeito: como o bun roda os arquivos no mesmo processo,
 * o player de cena de TODO arquivo seguinte rodava com "menos movimento" ligado sem saber, e o teste
 * da barra do quadro em andamento (`lesson-scene-design`) reprovava conforme a ordem dos arquivos.
 */
const matchMediaOriginal = Object.getOwnPropertyDescriptor(window, 'matchMedia')
function setViewportWidth(width: number): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => {
      const min = /\(min-width:\s*(\d+)px\)/.exec(query)?.[1]
      return {
        matches: min !== undefined && width >= Number(min),
        addEventListener: () => {},
        removeEventListener: () => {},
      }
    },
  })
}
afterAll(() => {
  if (matchMediaOriginal) Object.defineProperty(window, 'matchMedia', matchMediaOriginal)
  else Reflect.deleteProperty(window, 'matchMedia')
})

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

/** Sonda do estado que o shell usa para decidir se a alça aparece. */
function Probe() {
  const { navAvailable, outlineAvailable, navCollapsed } = useFocusMode()
  return (
    <output
      data-nav={String(navAvailable)}
      data-outline={String(outlineAvailable)}
      data-collapsed={String(navCollapsed)}
    />
  )
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

  it('não é oferecido abaixo de 768px nem fora das telas de foco', () => {
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
    for (const route of ['/criar', '/cursos', '/perfil', '/']) {
      pathname = route
      const { container, unmount } = render(
        <FocusModeProvider viewerId="perfil-1">
          <Probe />
        </FocusModeProvider>,
      )
      expect(container.querySelector('output')?.getAttribute('data-nav')).toBe('false')
      expect(container.querySelector('output')?.getAttribute('data-collapsed')).toBe('false')
      unmount()
    }
  })
})

describe('modo foco — onde o botão do menu é oferecido', () => {
  it('está disponível nos apps de criação (e no Estúdio Pro), pelo shell', () => {
    for (const route of ['/estudio', '/pensa', '/pinta', '/molda', '/estudio/pro/abc123']) {
      pathname = route
      const { unmount } = renderNav()
      expect(screen.getByRole('button', { name: 'Mostrar menu' })).toBeDefined()
      unmount()
    }
  })

  it('recolhe as duas barras por padrão na aula de notebook e permite reabrir', () => {
    pathname = '/cursos/meu-curso/aulas/abc123'
    const { container } = render(
      <FocusModeProvider viewerId="perfil-1">
        <FocusModeToggle target="nav" />
        <FocusModeToggle target="outline" />
      </FocusModeProvider>,
    )
    expect(screen.getByRole('button', { name: 'Mostrar menu' })).toBeDefined()
    // A lista de aulas segue EXCLUSIVA da aula.
    expect(screen.getByRole('button', { name: 'Mostrar lista de aulas' })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar menu' }))
    expect(screen.getByRole('button', { name: 'Esconder menu' })).toBeDefined()
    expect(localStorage.getItem('sz:kids:hide-nav:perfil-1')).toBeNull()
    expect(container.querySelector('button[data-side="left"]')).not.toBeNull()
    expect(container.querySelector('button[data-side="right"]')).not.toBeNull()
  })

  it('entra em cada aula com os menus recolhidos também em monitor largo', () => {
    pathname = '/cursos/meu-curso/aulas/primeira'
    setViewportWidth(1800)
    const { rerender } = render(
      <FocusModeProvider viewerId="perfil-1">
        <FocusModeToggle target="nav" />
        <FocusModeToggle target="outline" />
      </FocusModeProvider>,
    )
    expect(screen.getByRole('button', { name: 'Mostrar menu' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Mostrar lista de aulas' })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar menu' }))
    pathname = '/cursos/meu-curso/aulas/segunda'
    rerender(
      <FocusModeProvider viewerId="perfil-1">
        <FocusModeToggle target="nav" />
        <FocusModeToggle target="outline" />
      </FocusModeProvider>,
    )
    expect(screen.getByRole('button', { name: 'Mostrar menu' })).toBeDefined()
  })

  it('no celular permite abrir a lista de aulas sem exibir o controle do menu global', () => {
    pathname = '/cursos/meu-curso/aulas/primeira'
    setViewportWidth(390)
    render(
      <FocusModeProvider viewerId="perfil-1">
        <FocusModeToggle target="nav" />
        <FocusModeToggle target="outline" />
      </FocusModeProvider>,
    )
    expect(screen.queryByRole('button', { name: /menu/i })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar lista de aulas' }))
    expect(screen.getByRole('button', { name: 'Esconder lista de aulas' })).toBeDefined()
  })

  it('ao trocar de perfil, a aula volta ao estado recolhido', () => {
    pathname = '/cursos/meu-curso/aulas/primeira'
    const { rerender } = render(
      <FocusModeProvider viewerId="perfil-1">
        <FocusModeToggle target="nav" />
      </FocusModeProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar menu' }))
    expect(screen.getByRole('button', { name: 'Esconder menu' })).toBeDefined()
    rerender(
      <FocusModeProvider viewerId="perfil-2">
        <FocusModeToggle target="nav" />
      </FocusModeProvider>,
    )
    expect(screen.getByRole('button', { name: 'Mostrar menu' })).toBeDefined()
  })

  it('não aparece nas demais telas, inclusive na página Criar', () => {
    for (const route of ['/criar', '/cursos', '/perfil', '/']) {
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
    expect(screen.getByRole('button', { name: 'Mostrar menu' }).getAttribute('title')).toBeNull()
  })

  it('é uma alça presa à borda, não um quadrado no cabeçalho', () => {
    pathname = '/cursos/meu-curso/aulas/abc123'
    const { container } = renderNav()
    const handle = container.querySelector('button[data-side="left"]')
    expect(handle?.classList.contains('fixed')).toBe(true)
    expect(handle?.getAttribute('style')).toContain('left: 0')
    expect(handle?.getAttribute('aria-controls')).toBe('kids-app-sidebar')
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar menu' }))
    expect(handle?.getAttribute('style')).toContain('var(--kids-menu-width)')
  })
})

describe('modo foco — estado por visita', () => {
  it('começa recolhido e o clique alterna o menu sem gravar preferência', () => {
    pathname = '/estudio'
    renderNav('perfil-1')

    const button = screen.getByRole('button', { name: 'Mostrar menu' })
    expect(button.getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(button)

    const pressed = screen.getByRole('button', { name: 'Esconder menu' })
    expect(pressed.getAttribute('aria-pressed')).toBe('false')
    expect(localStorage.getItem('sz:kids:hide-nav:perfil-1')).toBeNull()

    fireEvent.click(pressed)
    expect(screen.getByRole('button', { name: 'Mostrar menu' })).toBeDefined()
    expect(localStorage.getItem('sz:kids:hide-nav:perfil-1')).toBeNull()
  })

  it('ignora preferências antigas e recolhe novamente ao trocar de perfil', () => {
    localStorage.setItem('sz:kids:hide-nav:perfil-1', '1')
    pathname = '/pinta'

    const { rerender } = renderNav('perfil-1')
    expect(screen.getByRole('button', { name: 'Mostrar menu' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar menu' }))

    rerender(
      <FocusModeProvider viewerId="perfil-2">
        <FocusModeToggle target="nav" />
      </FocusModeProvider>,
    )
    expect(screen.getByRole('button', { name: 'Mostrar menu' })).toBeDefined()
  })

  it('abre o menu em Criar e recolhe ao entrar de novo em uma ferramenta', () => {
    pathname = '/pinta'
    const { rerender, container } = render(
      <FocusModeProvider viewerId="perfil-1">
        <Probe />
        <FocusModeToggle target="nav" />
      </FocusModeProvider>,
    )
    expect(container.querySelector('output')?.getAttribute('data-collapsed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar menu' }))
    expect(container.querySelector('output')?.getAttribute('data-collapsed')).toBe('false')

    pathname = '/criar'
    rerender(
      <FocusModeProvider viewerId="perfil-1">
        <Probe />
        <FocusModeToggle target="nav" />
      </FocusModeProvider>,
    )
    expect(container.querySelector('output')?.getAttribute('data-collapsed')).toBe('false')
    expect(screen.queryByRole('button', { name: /menu/i })).toBeNull()

    pathname = '/molda'
    rerender(
      <FocusModeProvider viewerId="perfil-1">
        <Probe />
        <FocusModeToggle target="nav" />
      </FocusModeProvider>,
    )
    expect(container.querySelector('output')?.getAttribute('data-collapsed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Mostrar menu' })).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar menu' }))
    pathname = '/pinta'
    rerender(
      <FocusModeProvider viewerId="perfil-1">
        <Probe />
        <FocusModeToggle target="nav" />
      </FocusModeProvider>,
    )
    expect(container.querySelector('output')?.getAttribute('data-collapsed')).toBe('true')
  })
})
