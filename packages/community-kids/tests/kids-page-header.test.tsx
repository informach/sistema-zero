import { afterEach, describe, expect, it } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { KidsPageHeader } from '../src/components/kids/kids-page-header'

/**
 * O cabeçalho de toda página da criança. O que se trava aqui é o que uma tela quebra em
 * silêncio: título que é NOME dado por criança (a conversa de recado leva o nome do projeto
 * entregue) e que, sem quebra, estoura a faixa e faz a página rolar de lado no celular
 * (full review de 11/09/2026). happy-dom não faz layout: a régua é a classe.
 */
afterEach(cleanup)

describe('KidsPageHeader', () => {
  it('o título quebra dentro de uma palavra comprida, venha ela de onde vier', () => {
    render(<KidsPageHeader title="NaveContraAsteroidesSuperMegaUltraDoLipe" />)
    const titulo = screen.getByRole('heading', { level: 1 })
    expect(titulo.className.split(' ')).toContain('[overflow-wrap:anywhere]')
  })

  it('a seta só aparece com destino, e leva o nome da seção', () => {
    const { rerender } = render(<KidsPageHeader title="Recados" />)
    expect(screen.queryByRole('link')).toBeNull()
    rerender(
      <KidsPageHeader
        title="Recados"
        back={{ href: '/comunidade', label: 'Voltar à Comunidade' }}
      />,
    )
    const voltar = screen.getByRole('link', { name: 'Voltar à Comunidade' })
    expect(voltar.getAttribute('href')).toBe('/comunidade')
  })
})
