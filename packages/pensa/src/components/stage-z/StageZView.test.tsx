import { describe, expect, it } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { getCopy } from '../../core/copy'
import type { PensaHostAdapter } from '../../core/types'
import { createProjectStore } from '../../state/projectStore'
import {
  createFakeTransport,
  type FakeTransport,
  makeDetail,
  makeIdeaArtifact,
  makeStageView,
  makeZState,
} from '../../testing/fakeTransport'
import { PensaAppProvider } from '../appContext'
import { StageZView } from './StageZView'

const IDEA_TEXT = 'Um jogo em que o Dino desvia de meteoros para salvar o piquenique.'

function renderStage(
  transport: FakeTransport,
  callbacks: { onBack?: () => void; onAdvanced?: () => void } = {},
) {
  const projectStore = createProjectStore(transport)
  projectStore.setState({ activeProjectId: 'proj-1', detail: makeDetail() })
  const adapter: PensaHostAdapter = { transport, mode: 'kids' }
  return render(
    <PensaAppProvider value={{ adapter, copy: getCopy('kids'), store: projectStore }}>
      <StageZView
        onBack={callbacks.onBack ?? (() => {})}
        onAdvanced={callbacks.onAdvanced ?? (() => {})}
      />
    </PensaAppProvider>,
  )
}

describe('StageZView', () => {
  it('carrega a etapa e mostra o chat (sem CTA enquanto não está ready)', async () => {
    const transport = createFakeTransport((path) => {
      if (path === '/cycles/cycle-1/stages/z') {
        return makeStageView({ state: makeZState({ answered: { who: true } }) })
      }
      throw new Error(`rota inesperada: ${path}`)
    })
    renderStage(transport)

    await waitFor(() => {
      expect(screen.getByLabelText('Sua mensagem para o Zappy')).toBeTruthy()
    })
    expect(screen.getByText('Zerar a Bagunça')).toBeTruthy()
    expect(screen.getByRole('img', { name: '1 de 5 perguntas respondidas' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Criar a Carta da Ideia' })).toBeNull()
  })

  it('quando ready mostra o CTA; clicar gera a carta e abre o IdeaCard', async () => {
    const transport = createFakeTransport((path, init) => {
      if (path === '/cycles/cycle-1/stages/z') {
        return makeStageView({
          state: makeZState({
            answered: { who: true, problem: true, action: true, screens: true, success: true },
            ready: true,
          }),
        })
      }
      if (path === '/cycles/cycle-1/artifacts/generate' && init?.method === 'POST') {
        return { artifact: makeIdeaArtifact() }
      }
      throw new Error(`rota inesperada: ${path}`)
    })
    renderStage(transport)

    // O CTA aparece nas DUAS pontas: banner do topo + convite no fim do chat
    // (a criança termina a conversa lá embaixo e não pode ter que rolar).
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Criar a Carta da Ideia' })).toHaveLength(2)
    })
    fireEvent.click(screen.getAllByRole('button', { name: 'Criar a Carta da Ideia' })[1]!)

    await waitFor(() => {
      expect(screen.getByText(IDEA_TEXT)).toBeTruthy()
    })
    // A carta traz o nome do projeto (o header também o exibe) e as ações.
    expect(screen.getByRole('heading', { name: 'Aventura do Dino' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'É isso!' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Quero mudar uma coisa' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Refazer a Carta' })).toBeTruthy()
  })

  it('com carta existente abre direto no IdeaCard; dá pra voltar ao chat e à carta', async () => {
    const transport = createFakeTransport((path) => {
      if (path === '/cycles/cycle-1/stages/z') {
        return makeStageView({
          state: makeZState({ ready: true }),
          artifacts: [makeIdeaArtifact()],
        })
      }
      throw new Error(`rota inesperada: ${path}`)
    })
    renderStage(transport)

    await waitFor(() => {
      expect(screen.getByText(IDEA_TEXT)).toBeTruthy()
    })

    // "Quero mudar uma coisa" volta ao chat; banner E convite do fim do chat
    // agora oferecem VER a carta.
    fireEvent.click(screen.getByRole('button', { name: 'Quero mudar uma coisa' }))
    expect(screen.getByLabelText('Sua mensagem para o Zappy')).toBeTruthy()
    fireEvent.click(screen.getAllByRole('button', { name: 'Ver a Carta da Ideia' })[0]!)
    expect(screen.getByText(IDEA_TEXT)).toBeTruthy()
  })

  it('"É isso!" valida, avança e dispara o callback de sucesso', async () => {
    const transport = createFakeTransport((path, init) => {
      if (path === '/cycles/cycle-1/stages/z') {
        return makeStageView({
          state: makeZState({ ready: true }),
          artifacts: [makeIdeaArtifact()],
        })
      }
      if (path === '/cycles/cycle-1/artifacts/idea/validate' && init?.method === 'POST') {
        return { artifact: makeIdeaArtifact({ status: 'validated' }) }
      }
      if (path === '/cycles/cycle-1/advance' && init?.method === 'POST') {
        return { cycle: { id: 'cycle-1', number: 1, goal: null, stage: 'e' } }
      }
      throw new Error(`rota inesperada: ${path}`)
    })
    let advanced = 0
    renderStage(transport, {
      onAdvanced: () => {
        advanced += 1
      },
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'É isso!' })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: 'É isso!' }))

    await waitFor(() => {
      expect(advanced).toBe(1)
    })
    expect(
      transport.calls.some(
        (c) => c.path === '/cycles/cycle-1/artifacts/idea/validate' && c.method === 'POST',
      ),
    ).toBe(true)
    const advance = transport.calls.find((c) => c.path === '/cycles/cycle-1/advance')
    expect(advance?.body).toEqual({ from: 'z' })
  })

  it('erro ao carregar a etapa mostra aviso gentil com retry', async () => {
    let fail = true
    const transport = createFakeTransport((path) => {
      if (fail) throw new Error('explodiu')
      if (path === '/cycles/cycle-1/stages/z') return makeStageView()
      throw new Error(`rota inesperada: ${path}`)
    })
    renderStage(transport)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy()
    })
    expect(screen.queryByText(/explodiu/)).toBeNull()

    fail = false
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    await waitFor(() => {
      expect(screen.getByLabelText('Sua mensagem para o Zappy')).toBeTruthy()
    })
  })

  it('botão voltar chama o onBack (volta ao mapa)', async () => {
    const transport = createFakeTransport((path) => {
      if (path === '/cycles/cycle-1/stages/z') return makeStageView()
      throw new Error(`rota inesperada: ${path}`)
    })
    let back = 0
    renderStage(transport, {
      onBack: () => {
        back += 1
      },
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Voltar ao mapa' })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Voltar ao mapa' }))
    expect(back).toBe(1)
  })
})
