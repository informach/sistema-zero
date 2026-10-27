import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { HeadingDisclosure } from '../src/components/ui/heading-disclosure'

function render(defaultOpen: boolean) {
  return renderToStaticMarkup(
    <HeadingDisclosure
      defaultOpen={defaultOpen}
      kicker="Nível II"
      status="Atual"
      title="Fazer um jogo de plataforma"
      details={<span>Núcleo</span>}
      trailing={<span aria-hidden="true">v</span>}
    >
      <p>O núcleo</p>
    </HeadingDisclosure>,
  )
}

describe('HeadingDisclosure', () => {
  test('o título é um h2 de verdade, com o botão dentro dele', () => {
    const html = render(false)
    expect(html).toMatch(/^<div data-sz-disclosure="">\s*<h2[^>]*><button/)
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('type="button"')
  })

  test('o nome é o kicker com o título; o estado e os detalhes são a descrição', () => {
    const html = render(false)
    const labelledBy = /aria-labelledby="([^"]+)"/.exec(html)![1]!.split(' ')
    const describedBy = /aria-describedby="([^"]+)"/.exec(html)![1]!.split(' ')
    const textOf = (id: string) => new RegExp(`id="${id}"[^>]*>([^<]*)<`).exec(html)?.[1]
    expect(labelledBy.map(textOf)).toEqual(['Nível II', 'Fazer um jogo de plataforma'])
    expect(describedBy).toHaveLength(2)
    expect(textOf(describedBy[0]!)).toBe('Atual')
  })

  test('fechado, o painel fica no DOM mas escondido; aberto, aparece e o grupo marca data-open', () => {
    const closed = render(false)
    const controls = /aria-controls="([^"]+)"/.exec(closed)![1]
    expect(closed).toContain(`id="${controls}" role="region"`)
    expect(closed).toMatch(/role="region"[^>]*hidden=""/)
    expect(closed).toContain('O núcleo')
    expect(closed).not.toContain('data-open')

    const open = render(true)
    expect(open).toContain('aria-expanded="true"')
    expect(open).toContain('data-open=""')
    expect(open).not.toMatch(/role="region"[^>]*hidden=""/)
  })

  test('sem kicker nem detalhes, o nome é só o título e não há descrição vazia', () => {
    const html = renderToStaticMarkup(
      <HeadingDisclosure headingLevel={3} title="Só o título">
        <p>Conteúdo</p>
      </HeadingDisclosure>,
    )
    expect(html).toContain('<h3')
    expect(html).not.toContain('aria-describedby')
    const labelledBy = /aria-labelledby="([^"]+)"/.exec(html)![1]!.split(' ')
    expect(labelledBy).toHaveLength(1)
  })
})
