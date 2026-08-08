import { describe, expect, it, mock } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import { KidsBackButton } from '../src/components/kids/back-button'

/**
 * O "voltar" é UM componente para todas as telas — este teste é o freio contra
 * voltar a ter uma variante por lugar. Cobre o contrato que as telas dependem:
 * link vs botão, e o nome acessível existir mesmo sem rótulo visível.
 */

describe('KidsBackButton', () => {
  it('com `href` vira link de rota; sem ele, botão de estado local', () => {
    const { unmount } = render(<KidsBackButton href="/cursos" label="Voltar ao mapa" />)
    const link = screen.getByRole('link', { name: 'Voltar ao mapa' })
    expect(link.getAttribute('href')).toBe('/cursos')
    unmount()

    render(<KidsBackButton onClick={() => {}} label="Voltar aos projetos" />)
    expect(screen.getByRole('button', { name: 'Voltar aos projetos' })).toBeDefined()
  })

  it('sem rótulo visível o nome acessível vem do `label` (leitor de tela não fica mudo)', () => {
    render(<KidsBackButton href="/recados" label="Voltar aos recados" />)
    const link = screen.getByRole('link', { name: 'Voltar aos recados' })
    expect(link.getAttribute('aria-label')).toBe('Voltar aos recados')
    expect(link.textContent).toBe('')
  })

  it('o clique de estado local chama o handler', () => {
    const onClick = mock(() => {})
    render(<KidsBackButton onClick={onClick} label="Voltar às conversas" showLabel />)
    fireEvent.click(screen.getByRole('button', { name: 'Voltar às conversas' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('com `showLabel` o texto aparece e aria-label E title saem (senão o leitor repete)', () => {
    render(<KidsBackButton href="/cursos" label="Voltar ao mapa" showLabel />)
    const link = screen.getByRole('link', { name: 'Voltar ao mapa' })
    expect(link.getAttribute('aria-label')).toBeNull()
    // `title` com texto visível vira DESCRIÇÃO acessível → "Voltar ao mapa, Voltar ao mapa".
    expect(link.getAttribute('title')).toBeNull()
    expect(link.textContent).toContain('Voltar ao mapa')
  })

  it('as duas variantes usam o MESMO círculo de 44px (alvo de toque de mão pequena)', () => {
    const { container, unmount } = render(<KidsBackButton href="/a" label="A" />)
    expect(container.querySelector('span.size-11')).not.toBeNull()
    unmount()

    const overlay = render(<KidsBackButton href="/b" label="B" variant="overlay" />)
    expect(overlay.container.querySelector('span.size-11')).not.toBeNull()
  })
})
