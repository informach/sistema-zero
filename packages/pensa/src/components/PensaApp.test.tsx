import { describe, expect, it } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { PensaHostAdapter } from '../core/types'
import {
  createFakeTransport,
  makeCycle,
  makeDetail,
  makeListProject,
  makeStageView,
} from '../testing/fakeTransport'
import { PensaApp } from './PensaApp'

function makeAdapter(overrides: Partial<PensaHostAdapter> = {}): PensaHostAdapter {
  const transport = createFakeTransport((path) => {
    if (path === '/projects') return { projects: [makeListProject({ name: 'Jogo do Dino' })] }
    if (path === '/projects/proj-1') {
      return {
        project: makeDetail({
          name: 'Jogo do Dino',
          currentCycle: makeCycle({ stage: 'z' }),
        }),
      }
    }
    if (path === '/cycles/cycle-1/stages/z') return makeStageView()
    throw new Error(`rota inesperada: ${path}`)
  })
  return { transport, mode: 'kids', ...overrides }
}

describe('PensaApp', () => {
  it('aplica o tema no root (default light; host pode fixar dark)', async () => {
    const { container, unmount } = render(<PensaApp adapter={makeAdapter()} />)
    expect(container.querySelector('[data-pensa-theme="light"]')).toBeTruthy()
    await waitFor(() => {
      expect(screen.getByText('Jogo do Dino')).toBeTruthy()
    })
    unmount()

    const { container: dark } = render(<PensaApp adapter={makeAdapter({ theme: 'dark' })} />)
    expect(dark.querySelector('[data-pensa-theme="dark"]')).toBeTruthy()
    // Espera a lista carregar antes do cleanup (sem update fora de act).
    await waitFor(() => {
      expect(screen.getByText('Jogo do Dino')).toBeTruthy()
    })
  })

  it('navega lista → projeto ao abrir um card, e volta', async () => {
    render(<PensaApp adapter={makeAdapter()} />)

    // Lista carregada.
    await waitFor(() => {
      expect(screen.getByText('Jogo do Dino')).toBeTruthy()
    })
    expect(screen.getByText('Meus planos de jogo')).toBeTruthy()

    // Abre o projeto pelo card.
    fireEvent.click(screen.getByRole('button', { name: 'Abrir projeto: Jogo do Dino' }))
    await waitFor(() => {
      expect(screen.getByText('Versão 1')).toBeTruthy()
    })
    // Header + mapa + painel da etapa corrente (Z é jogável: convite + botão ativo).
    expect(screen.getByRole('heading', { name: 'Jogo do Dino' })).toBeTruthy()
    expect(screen.getAllByText('Zerar a Bagunça').length).toBeGreaterThan(0)
    expect(
      screen.getByText(
        'O Zappy quer conhecer sua ideia! Vocês vão conversar e deixar tudo organizado para começar.',
      ),
    ).toBeTruthy()
    const continueButton = screen.getByRole('button', { name: 'Continuar' }) as HTMLButtonElement
    expect(continueButton.disabled).toBe(false)

    // Volta para a lista.
    fireEvent.click(screen.getByRole('button', { name: 'Voltar para meus planos' }))
    await waitFor(() => {
      expect(screen.getByText('Meus planos de jogo')).toBeTruthy()
    })
  })

  it('etapa z: Continuar abre o chat de clareza e o voltar retorna ao mapa', async () => {
    render(<PensaApp adapter={makeAdapter()} />)

    await waitFor(() => {
      expect(screen.getByText('Jogo do Dino')).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Abrir projeto: Jogo do Dino' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Continuar' })).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    await waitFor(() => {
      expect(screen.getByLabelText('Sua mensagem para o Zappy')).toBeTruthy()
    })
    // Boas-vindas LOCAL do Zappy (conversa vazia) + tracker zerado.
    expect(screen.getByText('Oi! Eu sou o Zappy. Me conta: que jogo você quer criar?')).toBeTruthy()
    expect(screen.getByRole('img', { name: '0 de 5 perguntas respondidas' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Voltar ao mapa' }))
    await waitFor(() => {
      expect(screen.getByRole('list', { name: 'Mapa da criação' })).toBeTruthy()
    })
  })

  it('etapa e é jogável (convite + Continuar habilitado)', async () => {
    const transport = createFakeTransport((path) => {
      if (path === '/projects') return { projects: [makeListProject({ name: 'Jogo do Dino' })] }
      if (path === '/projects/proj-1') {
        return {
          project: makeDetail({
            name: 'Jogo do Dino',
            currentCycle: makeCycle({ stage: 'e', zCompletedAt: '2026-06-30T12:00:00.000Z' }),
          }),
        }
      }
      throw new Error(`rota inesperada: ${path}`)
    })
    render(<PensaApp adapter={{ transport, mode: 'kids' }} />)

    await waitFor(() => {
      expect(screen.getByText('Jogo do Dino')).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Abrir projeto: Jogo do Dino' }))

    await waitFor(() => {
      expect(
        screen.getByText(
          'Hora de enxergar seu jogo! O Zappy vai desenhar como ele funciona, as telas e a cara dele.',
        ),
      ).toBeTruthy()
    })
    const continueButton = screen.getByRole('button', { name: 'Continuar' }) as HTMLButtonElement
    expect(continueButton.disabled).toBe(false)
  })

  it('etapas r/o são jogáveis (convite + Continuar habilitado)', async () => {
    const transport = createFakeTransport((path) => {
      if (path === '/projects') return { projects: [makeListProject({ name: 'Jogo do Dino' })] }
      if (path === '/projects/proj-1') {
        return {
          project: makeDetail({
            name: 'Jogo do Dino',
            currentCycle: makeCycle({
              stage: 'r',
              zCompletedAt: '2026-06-30T12:00:00.000Z',
              eCompletedAt: '2026-06-30T12:00:00.000Z',
            }),
          }),
        }
      }
      throw new Error(`rota inesperada: ${path}`)
    })
    render(<PensaApp adapter={{ transport, mode: 'kids' }} />)

    await waitFor(() => {
      expect(screen.getByText('Jogo do Dino')).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Abrir projeto: Jogo do Dino' }))

    await waitFor(() => {
      expect(
        screen.getByText(
          'Mãos à obra! O Zappy vai dividir seu jogo em missões pequenas para você construir no Estúdio.',
        ),
      ).toBeTruthy()
    })
    const continueButton = screen.getByRole('button', { name: 'Continuar' }) as HTMLButtonElement
    expect(continueButton.disabled).toBe(false)
  })

  it('erro ao abrir projeto mostra mensagem gentil com retry', async () => {
    const transport = createFakeTransport((path) => {
      if (path === '/projects') return { projects: [makeListProject({ name: 'Jogo do Dino' })] }
      throw new Error('explodiu')
    })
    render(<PensaApp adapter={{ transport, mode: 'kids' }} />)

    await waitFor(() => {
      expect(screen.getByText('Jogo do Dino')).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Abrir projeto: Jogo do Dino' }))

    await waitFor(() => {
      expect(screen.getByText('Ops, algo não deu certo')).toBeTruthy()
    })
    expect(screen.queryByText(/explodiu/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeTruthy()
  })
})
