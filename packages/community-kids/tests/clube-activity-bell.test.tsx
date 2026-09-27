import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ClubeActivityBell } from '../src/components/kids/clube-activity-bell'
import { KidsHero } from '../src/components/kids/kids-hero'
import type { HubMyThreadView } from '../src/lib/types'

/**
 * O sino "novas respostas" do Clube, que mora nas ações do herói azul (full review de
 * 11/09/2026). Quatro defeitos, os quatro no mesmo lugar:
 *  - o herói cortava o que passava dele (`overflow-hidden`), e a lista do sino sumia no meio
 *    do azul;
 *  - no celular o sino fica à ESQUERDA (as ações descem para baixo do texto), e a lista,
 *    ancorada à direita dele, saía da tela;
 *  - abrir marcava tudo como visto no MESMO clique, então a lista nunca mostrava as respostas
 *    novas que o sino tinha acabado de anunciar;
 *  - dentro do herói a tinta herdada é a branca da marca: o ícone do sino e os títulos da
 *    lista saíam brancos sobre o cartão branco (o corte escondia este).
 * happy-dom não faz layout nem pinta: o recorte, o lado da lista e a tinta se travam pelas
 * classes (medido no navegador na conferência das telas).
 */
const originalFetch = globalThis.fetch

const conversa = (id: string, title: string, commentCount: number): HubMyThreadView => ({
  id,
  title,
  slug: id,
  channelId: 'canal-geral',
  commentCount,
  lastActivityAt: '2026-09-11T12:00:00Z',
  playId: null,
})

function comConversas(items: HubMyThreadView[]) {
  globalThis.fetch = Object.assign(
    mock(async () => Response.json({ items })),
    { preconnect: originalFetch.preconnect },
  )
}

afterEach(() => {
  cleanup()
  globalThis.fetch = originalFetch
  localStorage.clear()
})

describe('o sino do Clube dentro do herói azul', () => {
  it('a FAIXA do herói não corta o que sai dela; a forma ALTA corta (a ilustração)', () => {
    const faixa = render(<KidsHero title="Clube dos Criadores" actions={<span>ações</span>} />)
    expect((faixa.container.firstElementChild as HTMLElement).className).not.toContain(
      'overflow-hidden',
    )
    faixa.unmount()
    const alto = render(<KidsHero variant="alto" title="Criar" art={<span>arte</span>} />)
    expect((alto.container.firstElementChild as HTMLElement).className).toContain('overflow-hidden')
  })

  it('a lista abre para a direita no celular e para a esquerda do md em diante', async () => {
    comConversas([conversa('t1', 'Meu jogo espacial', 2)])
    render(
      <ClubeActivityBell
        viewerId="perfil-1"
        channelIds={['canal-geral']}
        onOpenThread={() => {}}
      />,
    )
    fireEvent.click(await screen.findByRole('button', { name: '1 nova resposta' }))
    const lista = screen.getByRole('list').parentElement as HTMLElement
    const classes = lista.className.split(' ')
    expect(classes).toContain('left-0')
    expect(classes).toContain('md:right-0')
    expect(classes).toContain('md:left-auto')
    // Ancorada à direita no celular, a lista de 256px saía pela esquerda da tela.
    expect(classes).not.toContain('right-0')
  })

  it('abrir mostra as respostas NOVAS e só depois as marca como vistas', async () => {
    comConversas([conversa('t1', 'Meu jogo espacial', 3), conversa('t2', 'Pong da vovó', 1)])
    // A conversa t2 já foi vista com 1 resposta; a t1 cresceu de 1 para 3.
    localStorage.setItem('sz:kids:clube:seen:perfil-1', JSON.stringify({ t1: 1, t2: 1 }))
    render(
      <ClubeActivityBell
        viewerId="perfil-1"
        channelIds={['canal-geral']}
        onOpenThread={() => {}}
      />,
    )
    const sino = await screen.findByRole('button', { name: '1 nova resposta' })

    fireEvent.click(sino)
    expect(screen.getByText('Novas respostas 💬')).toBeTruthy()
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Meu jogo espacial',
    ])
    // E ficou marcada: o sino não anuncia mais nada, e o que ele guardou é o número de agora.
    expect(screen.getByRole('button', { name: 'Suas conversas' })).toBeTruthy()
    expect(JSON.parse(localStorage.getItem('sz:kids:clube:seen:perfil-1') ?? '{}')).toEqual({
      t1: 3,
      t2: 1,
    })

    // Fechar e abrir de novo, sem nada novo: a lista volta a ser "Suas conversas" (todas).
    fireEvent.click(screen.getByRole('button', { name: 'Suas conversas' }))
    fireEvent.click(screen.getByRole('button', { name: 'Suas conversas' }))
    expect(screen.getByText('Suas conversas', { selector: 'p' })).toBeTruthy()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('o sino e a lista pintam a própria tinta (no herói azul a herdada é a branca)', async () => {
    comConversas([conversa('t1', 'Meu jogo espacial', 2)])
    render(
      <ClubeActivityBell
        viewerId="perfil-1"
        channelIds={['canal-geral']}
        onOpenThread={() => {}}
      />,
    )
    const sino = await screen.findByRole('button', { name: '1 nova resposta' })
    // Sem isto o ícone e os títulos das conversas saíam brancos sobre o cartão branco.
    expect(sino.className.split(' ')).toContain('text-foreground')
    fireEvent.click(sino)
    const lista = screen.getByRole('list').parentElement as HTMLElement
    expect(lista.className.split(' ')).toContain('text-foreground')
  })

  it('o número no nome do sino concorda com a quantidade', async () => {
    comConversas([conversa('t1', 'Meu jogo espacial', 2), conversa('t2', 'Pong da vovó', 4)])
    render(
      <ClubeActivityBell
        viewerId="perfil-1"
        channelIds={['canal-geral']}
        onOpenThread={() => {}}
      />,
    )
    expect(await screen.findByRole('button', { name: '2 novas respostas' })).toBeTruthy()
  })
})
