import { describe, expect, mock, test } from 'bun:test'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { RoomBuilderView } from '../src/components/kids/room/room-builder-view'

function viewProps(): ComponentProps<typeof RoomBuilderView> {
  return {
    wallet: { balance: 25, unlimited: false },
    saving: false,
    ready: true,
    onSave: () => {},
    tab: 'moveis',
    onTab: () => {},
    stage: <div>Quarto Morada</div>,
    actions: null,
    pieces: null,
    extras: null,
    tray: <p>Peças da biblioteca</p>,
    notice: null,
  }
}

describe('RoomBuilderView — pele preservada com o documento Morada', () => {
  test('não libera salvamento durante erro e mantém as abas acessíveis', () => {
    const onTab = mock(() => {})
    render(<RoomBuilderView {...viewProps()} ready={false} onTab={onTab} />)
    fireEvent.click(screen.getByRole('button', { name: 'Clima' }))
    expect(onTab).toHaveBeenCalledWith('clima')
    expect(screen.getByRole('button', { name: 'Salvar quarto' }).hasAttribute('disabled')).toBe(
      true,
    )
  })
  test('título, moedas e Salvar continuam na mesma linha', () => {
    render(<RoomBuilderView {...viewProps()} header={<h1>Meu quarto</h1>} />)
    const line = screen.getByRole('button', { name: 'Salvar quarto' }).parentElement
    expect(line?.contains(screen.getByRole('heading', { name: 'Meu quarto' }))).toBe(true)
    expect(within(line as HTMLElement).getByText('25')).toBeDefined()
  })
  test('encaminha Salvar e mantém o estado de gravação visível', () => {
    const onSave = mock(() => {})
    const view = render(<RoomBuilderView {...viewProps()} onSave={onSave} />)
    fireEvent.click(screen.getByRole('button', { name: 'Salvar quarto' }))
    expect(onSave).toHaveBeenCalledTimes(1)
    view.rerender(<RoomBuilderView {...viewProps()} saving />)
    expect(screen.getByRole('button', { name: 'Salvando…' }).hasAttribute('disabled')).toBe(true)
  })
  test('as oito categorias de Decorar ficam no painel, depois do Salvar na ordem de leitura', () => {
    render(<RoomBuilderView {...viewProps()} />)
    const panel = screen.getByRole('region', { name: 'Itens do quarto' })
    // 26/11/2026: o painel ganhou "Decorar", "Construir" e "No quarto"; Piso e Parede foram
    // para Construir (modo construção), e as outras oito categorias moram em Decorar.
    expect(
      within(panel).getByRole('group', { name: 'Categorias' }).querySelectorAll('button'),
    ).toHaveLength(8)
    expect(within(panel).getByRole('button', { name: 'Móveis' })).toBeDefined()
    expect(within(panel).getByRole('button', { name: 'Tema' })).toBeDefined()
    const save = screen.getByRole('button', { name: 'Salvar quarto' })
    expect(panel.contains(save)).toBe(false)
    expect(save.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
  test('os roláveis internos contêm os sr-only (a página não rola por causa deles)', () => {
    // Bandeja (aba Decorar, a primeira)
    const decorar = render(
      <RoomBuilderView
        {...viewProps()}
        tray={<span className="sr-only">moedas da bandeja</span>}
      />,
    )
    {
      let el = screen.getByText('moedas da bandeja').parentElement
      while (el && !/overflow-y-auto/.test(el.className)) el = el.parentElement
      expect(el).not.toBeNull()
      expect((el as HTMLElement).classList.contains('relative')).toBe(true)
    }
    decorar.unmount()
    // 24/11/2026: sem `relative` no rolável, os `sr-only` (absolute) dos cartões se
    // posicionavam pela seção de fora, escapavam do recorte e esticavam a página. O happy-dom
    // não mede layout: a classe é o guarda (o mecanismo foi medido no Chromium).
    render(
      <RoomBuilderView
        {...viewProps()}
        tray={<span className="sr-only">moedas da bandeja</span>}
        pieces={<span className="sr-only">peça colocada</span>}
        placedCount={1}
      />,
    )
    // As peças colocadas moram na aba "No quarto".
    fireEvent.click(screen.getByRole('button', { name: /No quarto/ }))
    expect(screen.getByText('peça colocada')).toBeDefined()
    for (const text of ['peça colocada']) {
      let el = screen.getByText(text).parentElement
      while (el && !/overflow-y-auto/.test(el.className)) el = el.parentElement
      expect(el).not.toBeNull()
      expect((el as HTMLElement).classList.contains('relative')).toBe(true)
    }
  })
  test('o quarto Kids: Decorar e No quarto, avatar na barra, ferramentas por cima do quarto', () => {
    const onPanel = mock(() => {})
    render(
      <RoomBuilderView
        {...viewProps()}
        avatar={<img alt="Meu avatar" src="/a.png" />}
        stageTools={<button type="button">Aproximar</button>}
        placedCount={2}
        pieces={<button type="button">Cama</button>}
        selectedLabel="Cama"
        adjust={<p>ajuste da cama</p>}
        onPanel={onPanel}
      />,
    )
    const line = screen.getByRole('button', { name: 'Salvar quarto' }).parentElement
    expect(line?.contains(screen.getByRole('img', { name: 'Meu avatar' }))).toBe(true)
    const panel = screen.getByRole('region', { name: 'Itens do quarto' })
    expect(panel.contains(screen.getByRole('button', { name: 'Aproximar' }))).toBe(false)
    expect(screen.queryByText('ajuste da cama')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /No quarto/ }))
    expect(onPanel).toHaveBeenCalledWith('quarto')
    expect(screen.getByRole('heading', { name: 'Ajustar Cama' })).toBeDefined()
    expect(screen.getByText('ajuste da cama')).toBeDefined()
  })
})
