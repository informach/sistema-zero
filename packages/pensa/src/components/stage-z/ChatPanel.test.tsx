import { describe, expect, it } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { getCopy } from '../../core/copy'
import type { PensaHostAdapter } from '../../core/types'
import { createChatStore } from '../../state/chatStore'
import { createProjectStore } from '../../state/projectStore'
import {
  createFakeTransport,
  type FakeChatEvent,
  type FakeTransport,
} from '../../testing/fakeTransport'
import { PensaAppProvider } from '../appContext'
import { ChatPanel } from './ChatPanel'

function renderPanel(transport: FakeTransport) {
  const chatStore = createChatStore(transport)
  chatStore.setState({ cycleId: 'cycle-1', stageLoaded: true })
  const adapter: PensaHostAdapter = { transport, mode: 'kids' }
  const value = { adapter, copy: getCopy('kids'), store: createProjectStore(transport) }
  const utils = render(
    <PensaAppProvider value={value}>
      <ChatPanel store={chatStore} projectId="proj-1" />
    </PensaAppProvider>,
  )
  return { chatStore, ...utils }
}

const HAPPY_SCRIPT: FakeChatEvent[] = [
  { kind: 'delta', text: 'Boa! O que se faz no jogo?\n' },
  { kind: 'delta', text: 'SUGESTÕES: Correr | Pular' },
  { kind: 'done' },
]

describe('ChatPanel', () => {
  it('conversa vazia mostra boas-vindas LOCAIS + chips de partida (nada vai ao servidor)', () => {
    const transport = createFakeTransport(() => {
      throw new Error('sem rede aqui')
    })
    renderPanel(transport)

    expect(screen.getByText('Oi! Eu sou o Zappy. Me conta: que jogo você quer criar?')).toBeTruthy()
    for (const chip of [
      'Um jogo de desviar',
      'Um jogo de pegar coisas',
      'Um jogo de nave',
      'Ainda não sei, me ajuda',
    ]) {
      expect(screen.getByRole('button', { name: chip })).toBeTruthy()
    }
    expect(screen.getByRole('button', { name: 'Quero escrever' })).toBeTruthy()
    expect(transport.calls).toHaveLength(0)
    expect(transport.chatCalls).toHaveLength(0)
  })

  it('clicar num chip ENVIA o texto do chip como mensagem da criança', async () => {
    const transport = createFakeTransport(
      () => {
        throw new Error('sem rede aqui')
      },
      { chatScript: () => HAPPY_SCRIPT },
    )
    renderPanel(transport)

    fireEvent.click(screen.getByRole('button', { name: 'Um jogo de nave' }))

    expect(transport.chatCalls).toEqual([
      { projectId: 'proj-1', cycleId: 'cycle-1', stage: 'z', message: 'Um jogo de nave' },
    ])
    // Bolha otimista da criança.
    expect(screen.getByText('Um jogo de nave')).toBeTruthy()

    // Resposta do Zappy sem a linha SUGESTÕES: e com os chips novos.
    await waitFor(() => {
      expect(screen.getByText('Boa! O que se faz no jogo?')).toBeTruthy()
    })
    expect(screen.queryByText(/SUGESTÕES/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Correr' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Pular' })).toBeTruthy()
  })

  it('envia pelo input (limpa o rascunho) e desabilita o botão durante o envio', async () => {
    const transport = createFakeTransport(
      () => {
        throw new Error('sem rede aqui')
      },
      // Sem 'done': o turno fica em voo p/ observar o estado de envio.
      { chatScript: () => [{ kind: 'delta', text: 'Hum...' }] },
    )
    renderPanel(transport)

    const input = screen.getByLabelText('Sua mensagem para o Zappy') as HTMLInputElement
    expect(input.maxLength).toBe(2000)
    fireEvent.change(input, { target: { value: 'Quero um labirinto' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(transport.chatCalls[0]?.message).toBe('Quero um labirinto')
    expect(input.value).toBe('')
    const sendButton = screen.getByRole('button', { name: 'Enviar' }) as HTMLButtonElement
    expect(sendButton.disabled).toBe(true)
    // Indicador "pensando" antes do primeiro delta virar bolha ao vivo.
    await waitFor(() => {
      expect(screen.getByText('Hum...')).toBeTruthy()
    })
  })

  it('chip "Quero escrever" leva o foco ao input', () => {
    const transport = createFakeTransport(() => {
      throw new Error('sem rede aqui')
    })
    renderPanel(transport)

    fireEvent.click(screen.getByRole('button', { name: 'Quero escrever' }))

    const input = screen.getByLabelText('Sua mensagem para o Zappy')
    expect(document.activeElement).toBe(input)
  })

  it('erro no turno mostra aviso gentil e "Tentar de novo" reenvia a última mensagem', async () => {
    let turn = 0
    const transport = createFakeTransport(
      () => {
        throw new Error('sem rede aqui')
      },
      {
        chatScript: (): FakeChatEvent[] => {
          turn += 1
          if (turn === 1) return [{ kind: 'error', error: new Error('explodiu') }]
          return HAPPY_SCRIPT
        },
      },
    )
    renderPanel(transport)

    fireEvent.click(screen.getByRole('button', { name: 'Um jogo de desviar' }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy()
    })
    // A mensagem técnica nunca vaza; a otimista foi removida.
    expect(screen.queryByText(/explodiu/)).toBeNull()
    expect(screen.queryByText('Um jogo de desviar', { selector: 'p' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    await waitFor(() => {
      expect(screen.getByText('Boa! O que se faz no jogo?')).toBeTruthy()
    })
    expect(transport.chatCalls).toHaveLength(2)
    expect(transport.chatCalls[1]?.message).toBe('Um jogo de desviar')
  })
})
