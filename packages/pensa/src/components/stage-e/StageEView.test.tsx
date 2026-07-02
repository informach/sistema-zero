import { describe, expect, it } from 'bun:test'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { getCopy } from '../../core/copy'
import type { PensaArtifactView, PensaHostAdapter } from '../../core/types'
import { createProjectStore } from '../../state/projectStore'
import {
  createFakeTransport,
  type FakeTransport,
  makeCycle,
  makeDetail,
  makeIdentityArtifact,
  makeIdentitySuggestions,
  makeSpecArtifact,
  makeStageView,
} from '../../testing/fakeTransport'
import { PensaAppProvider } from '../appContext'
import { StageEView } from './StageEView'

const STAGE_PATH = '/cycles/cycle-1/stages/e'
const GENERATE_PATH = '/cycles/cycle-1/artifacts/generate'
const VALIDATE_PATH = '/cycles/cycle-1/artifacts/friendly_spec/validate'

function makeRespond(artifacts: PensaArtifactView[]) {
  return (path: string, init?: { method?: string; body?: unknown }) => {
    if (path === STAGE_PATH) return makeStageView({ stage: 'e', artifacts })
    if (path === GENERATE_PATH && init?.method === 'POST') {
      const body = init.body as { type: string; step?: string }
      if (body.type === 'friendly_spec') return { artifact: makeSpecArtifact() }
      if (body.step === 'suggestions') return { suggestions: makeIdentitySuggestions() }
    }
    if (path === VALIDATE_PATH && init?.method === 'POST') {
      return { artifact: makeSpecArtifact({ status: 'validated' }) }
    }
    if (path === '/cycles/cycle-1/advance' && init?.method === 'POST') {
      return { cycle: makeCycle({ stage: 'r' }) }
    }
    throw new Error(`rota inesperada: ${path} ${init?.method ?? 'GET'}`)
  }
}

async function renderStage(
  transport: FakeTransport,
  callbacks: { onBack?: () => void; onAdvanced?: () => void } = {},
) {
  const projectStore = createProjectStore(transport)
  projectStore.setState({
    activeProjectId: 'proj-1',
    detail: makeDetail({ currentCycle: makeCycle({ stage: 'e' }) }),
  })
  const adapter: PensaHostAdapter = { transport, mode: 'kids' }
  const view = render(
    <PensaAppProvider value={{ adapter, copy: getCopy('kids'), store: projectStore }}>
      <StageEView
        onBack={callbacks.onBack ?? (() => {})}
        onAdvanced={callbacks.onAdvanced ?? (() => {})}
      />
    </PensaAppProvider>,
  )
  // Drena (dentro de act) o loadStage disparado pelo effect de montagem.
  await act(async () => {})
  return { view, projectStore }
}

describe('StageEView', () => {
  it('sem spec: hero com CTA "Desenhar meu jogo"; gerar abre as 3 seções', async () => {
    const transport = createFakeTransport(makeRespond([]))
    await renderStage(transport)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Desenhar meu jogo' })).toBeTruthy()
    })
    expect(screen.getByText('Enxergar o Jogo')).toBeTruthy()
    expect(screen.queryByText('Como o jogo funciona')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Desenhar meu jogo' }))

    await waitFor(() => {
      expect(screen.getByText('Como o jogo funciona')).toBeTruthy()
    })
    expect(screen.getByText('As telas do jogo')).toBeTruthy()
    expect(screen.getByText('A cara do jogo')).toBeTruthy()
    const generate = transport.calls.find((call) => call.path === GENERATE_PATH)
    expect(generate?.body).toMatchObject({ type: 'friendly_spec', projectId: 'proj-1' })
  })

  it('com spec carregado mostra as 3 seções e a barra de progresso', async () => {
    const transport = createFakeTransport(makeRespond([makeSpecArtifact()]))
    await renderStage(transport)

    await waitFor(() => {
      expect(screen.getByText('Como o jogo funciona')).toBeTruthy()
    })
    expect(screen.getByText('As telas do jogo')).toBeTruthy()
    expect(screen.getByText('A cara do jogo')).toBeTruthy()
    expect(screen.getByRole('img', { name: '0 de 3 partes prontas' })).toBeTruthy()
    // Duas seções aprováveis (tirinhas + telas).
    expect(screen.getAllByRole('button', { name: 'Tá certo!' })).toHaveLength(2)
  })

  it('aprovar as duas seções valida o spec automaticamente (uma vez)', async () => {
    const transport = createFakeTransport(makeRespond([makeSpecArtifact()]))
    await renderStage(transport)

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Tá certo!' })).toHaveLength(2)
    })
    fireEvent.click(screen.getAllByRole('button', { name: 'Tá certo!' })[0] as HTMLElement)
    expect(transport.calls.some((call) => call.path === VALIDATE_PATH)).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Tá certo!' }))

    await waitFor(() => {
      expect(screen.getAllByText('Aprovado!')).toHaveLength(2)
    })
    expect(transport.calls.filter((call) => call.path === VALIDATE_PATH)).toHaveLength(1)
    expect(screen.getByRole('img', { name: '2 de 3 partes prontas' })).toBeTruthy()
  })

  it('"Mudar" abre a barra de feedback e o envio refaz o desenho', async () => {
    const transport = createFakeTransport(makeRespond([makeSpecArtifact()]))
    await renderStage(transport)

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Mudar' })).toHaveLength(2)
    })
    fireEvent.click(screen.getAllByRole('button', { name: 'Mudar' })[0] as HTMLElement)
    const field = screen.getByLabelText('O que você quer mudar?')
    fireEvent.change(field, { target: { value: 'quero uma tela de recorde' } })
    fireEvent.click(screen.getByRole('button', { name: 'Pedir a mudança' }))

    // Geração ok fecha a barra (drenada dentro de act).
    await act(async () => {})
    expect(screen.queryByLabelText('O que você quer mudar?')).toBeNull()
    const regen = transport.calls.find(
      (call) =>
        call.path === GENERATE_PATH && (call.body as { type: string }).type === 'friendly_spec',
    )
    expect(regen?.body).toEqual({
      type: 'friendly_spec',
      projectId: 'proj-1',
      feedback: 'quero uma tela de recorde',
    })
  })

  it('tudo aprovado (spec validado + identidade salva): CTA final avança e→r', async () => {
    const transport = createFakeTransport(
      makeRespond([makeSpecArtifact({ status: 'validated' }), makeIdentityArtifact()]),
    )
    let advanced = 0
    await renderStage(transport, {
      onAdvanced: () => {
        advanced += 1
      },
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Tudo certo! Rodar as missões' })).toBeTruthy()
    })
    expect(screen.getByRole('img', { name: '3 de 3 partes prontas' })).toBeTruthy()
    // Resumo da identidade no lugar do funil.
    expect(screen.getByText('A cara do jogo ficou assim')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Tudo certo! Rodar as missões' }))
    await waitFor(() => {
      expect(advanced).toBe(1)
    })
    const advance = transport.calls.find((call) => call.path === '/cycles/cycle-1/advance')
    expect(advance?.body).toEqual({ from: 'e' })
  })

  it('erro ao carregar a etapa mostra aviso gentil com retry; voltar chama onBack', async () => {
    let fail = true
    const transport = createFakeTransport((path, init) => {
      if (fail) throw new Error('explodiu')
      return makeRespond([makeSpecArtifact()])(path, init)
    })
    let back = 0
    await renderStage(transport, {
      onBack: () => {
        back += 1
      },
    })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy()
    })
    expect(screen.queryByText(/explodiu/)).toBeNull()

    fail = false
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    await waitFor(() => {
      expect(screen.getByText('Como o jogo funciona')).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Voltar ao mapa' }))
    expect(back).toBe(1)
  })
})
