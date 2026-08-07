import { afterEach, describe, expect, it } from 'bun:test'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ProjectSummary } from '../../state/persistence'
import { ProjectCard } from './ProjectCard'

const SUMMARY: ProjectSummary = {
  id: 'p1',
  name: 'Meu Projeto',
  createdAt: 0,
  updatedAt: 0,
  mode: 'code',
}

function renderCard() {
  render(<ProjectCard summary={SUMMARY} onChanged={() => undefined} onOpen={() => undefined} />)
}

// O menu é portalado para document.body — usa `screen` (queries em document.body)
// em vez das queries presas ao container do render.
function openMenu(): HTMLButtonElement {
  const trigger = screen.getByLabelText('Mais ações') as HTMLButtonElement
  act(() => {
    fireEvent.click(trigger)
  })
  return trigger
}

function menuItems(): HTMLButtonElement[] {
  return Array.from(
    screen.getByRole('menu').querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
  )
}

describe('ProjectCard menu (a11y #8)', () => {
  afterEach(() => {
    cleanup()
  })

  it('move o foco para o primeiro item ao abrir o menu', () => {
    renderCard()
    openMenu()

    const items = menuItems()
    expect(items.length).toBe(4)
    expect(document.activeElement).toBe(items[0]!)
    expect(items[0]?.textContent).toContain('Renomear')
  })

  it('Escape fecha o menu e devolve o foco ao gatilho', () => {
    renderCard()
    const trigger = openMenu()
    expect(screen.queryByRole('menu')).toBeTruthy()

    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' })
    })

    // Menu fechado e foco de volta no kebab (não preso no <body>).
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('setas movem o foco entre itens (roving), com Home/End nas pontas', () => {
    renderCard()
    openMenu()
    const items = menuItems()
    const menu = screen.getByRole('menu')

    act(() => {
      fireEvent.keyDown(menu, { key: 'ArrowDown' })
    })
    expect(document.activeElement).toBe(items[1]!)

    act(() => {
      fireEvent.keyDown(menu, { key: 'End' })
    })
    expect(document.activeElement).toBe(items[items.length - 1]!)

    act(() => {
      fireEvent.keyDown(menu, { key: 'Home' })
    })
    expect(document.activeElement).toBe(items[0]!)
  })

  // Achado [LOW]: Excluir fechava o menu via setMenuOpen(false) (sem closeMenu),
  // então o Modal do ConfirmDialog capturava activeElement=<body> e o foco se
  // perdia ao fechar. Excluir agora passa por closeMenu(): foco volta ao kebab
  // ANTES do menu desmontar, o Modal o memoriza e o restaura ao fechar.
  it('Excluir: ao fechar o diálogo de confirmação o foco volta ao gatilho', () => {
    renderCard()
    const trigger = openMenu()

    // Clica em "Excluir" — fecha o menu e abre o ConfirmDialog (Modal).
    const deleteItem = menuItems().find((b) => b.textContent?.includes('Excluir'))
    expect(deleteItem).toBeTruthy()
    act(() => {
      fireEvent.click(deleteItem!)
    })

    // Menu fechou e o diálogo (dialog/modal) está aberto.
    expect(screen.queryByRole('menu')).toBeNull()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeTruthy()

    // Fecha pelo "Cancelar" — o Modal restaura o foco previamente memorizado.
    const cancel = screen.getByText('Cancelar') as HTMLButtonElement
    act(() => {
      fireEvent.click(cancel)
    })

    // Foco de volta no kebab (não preso no <body>).
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })
})

/**
 * O elo que faltava. A miniatura da galeria existe desde 07/2026 e NUNCA teve
 * teste ligando "o resumo tem thumb" a "o card mostra a imagem" — por isso a
 * regressão de 08/2026 (o gatilho da captura ficou órfão quando o Estúdio virou
 * seção da comunidade) passou batida: `projectThumbs.test.ts` cobre só a
 * persistência e fica VERDE com o card vazio.
 */
describe('ProjectCard: a capa do jogo', () => {
  afterEach(() => {
    cleanup()
  })

  it('mostra a miniatura quando o resumo traz uma', () => {
    const comCapa: ProjectSummary = {
      ...SUMMARY,
      thumbDataUrl: 'data:image/jpeg;base64,/9j/PRINT',
    }
    const view = render(
      <ProjectCard summary={comCapa} onChanged={() => undefined} onOpen={() => undefined} />,
    )
    const img = view.container.querySelector('img')
    expect(img).toBeTruthy()
    expect(img?.getAttribute('src')).toBe('data:image/jpeg;base64,/9j/PRINT')
  })

  it('sem capa, reserva o espaço e explica — em vez de o bloco sumir', () => {
    // ⚠️ Antes o bloco inteiro desaparecia: o card ficava só com nome e data, e a
    // ausência lia como "a feature quebrou". O espaço reservado também impede
    // que a capa (assíncrona) empurre o grid ao chegar.
    const view = render(
      <ProjectCard summary={SUMMARY} onChanged={() => undefined} onOpen={() => undefined} />,
    )
    expect(view.container.querySelector('img')).toBeNull()
    expect(view.getByText(/A foto aparece depois/)).toBeTruthy()
  })
})
