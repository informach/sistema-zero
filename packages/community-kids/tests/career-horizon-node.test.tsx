import { describe, expect, it } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import { CareerHorizonNode } from '../src/components/kids/career-horizon-node'

/**
 * O nó "E tem muito mais pela frente" é um AVISO, não uma trilha: ele não navega e não abre
 * painel nenhum (decisão da usuária, 14/08).
 *
 * ⚠️ A ausência do painel é load-bearing, não estética. O `<li>` do nó usa
 * `-translate-x-1/2 -translate-y-1/2`; o Tailwind v4 compila isso na propriedade `translate:`,
 * e um elemento com `translate` vira containing block de `position: fixed`. Qualquer overlay
 * `fixed inset-0` montado aqui dentro se resolve contra o medalhão de 11rem e renderiza como
 * uma "página dentro da bolinha" — foi exatamente o defeito relatado. Este teste é a rede
 * para a armadilha não voltar por um `Dialog` reintroduzido sem querer.
 */

const point = { x: 50, y: 100 }

function renderNode(levels: Parameters<typeof CareerHorizonNode>[0]['levels']) {
  return render(<CareerHorizonNode point={point} viewHeight={400} levels={levels} />)
}

describe('CareerHorizonNode', () => {
  it('não é link e não abre painel, nem depois do clique', () => {
    const { container } = renderNode(['elite', 'architect', 'champion', 'god'])

    expect(container.querySelector('a')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByRole('button'))

    expect(container.querySelector('a')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('o clique sacode o nó, como nos postos travados', () => {
    const { container } = renderNode(['champion', 'god'])

    expect(container.querySelector('.kid-wiggle')).toBeNull()
    fireEvent.click(screen.getByRole('button'))
    expect(container.querySelector('.kid-wiggle')).not.toBeNull()
  })

  it('anuncia que está bloqueado e conta os postos que faltam', () => {
    renderNode(['champion', 'god'])

    const button = screen.getByRole('button')
    expect(button.getAttribute('aria-label')).toContain('sendo construídos')
    expect(button.className).toContain('cursor-not-allowed')
    expect(screen.getByText('Mais 2 postos estão sendo construídos')).toBeDefined()
  })

  it('com um posto só, o texto fica no singular', () => {
    renderNode(['god'])

    expect(screen.getByText('Mais 1 posto está sendo construído')).toBeDefined()
  })
})
