import { describe, expect, it } from 'bun:test'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { getCopy } from '../../core/copy'
import type { PensaBuildEnv, PensaCycleView } from '../../core/types'
import { createProjectStore } from '../../state/projectStore'
import {
  createFakeTransport,
  type FakeTransport,
  makeCycle,
  makeDetail,
  makeStageView,
  makeStudioAdapter,
} from '../../testing/fakeTransport'
import { PensaAppProvider } from '../appContext'
import { ProjectView } from './ProjectView'

async function renderProject(transport: FakeTransport, cycle: PensaCycleView) {
  const projectStore = createProjectStore(transport)
  projectStore.setState({
    activeProjectId: 'proj-1',
    detail: makeDetail({ cycles: [cycle], currentCycle: cycle }),
  })
  render(
    <PensaAppProvider
      value={{ adapter: makeStudioAdapter(transport), copy: getCopy('kids'), store: projectStore }}
    >
      <ProjectView />
    </PensaAppProvider>,
  )
  await act(async () => {})
  return { projectStore }
}

describe('ProjectView: etapas r/o jogáveis', () => {
  it('etapa r: Continuar abre o quadro de missões (StageRView)', async () => {
    const transport = createFakeTransport((path) => {
      if (path === '/cycles/cycle-1/stages/r') return makeStageView({ stage: 'r' })
      throw new Error(`rota inesperada: ${path}`)
    })
    await renderProject(transport, makeCycle({ stage: 'r' }))

    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    await waitFor(() => {
      expect(screen.getByText('Bora construir de verdade?')).toBeTruthy()
    })
    // Voltar retorna ao mapa.
    fireEvent.click(screen.getByRole('button', { name: 'Voltar ao mapa' }))
    await waitFor(() => {
      expect(screen.getByRole('list', { name: 'Mapa da criação' })).toBeTruthy()
    })
  })

  it('etapa o: Continuar abre o checklist do lançamento (StageOView)', async () => {
    const transport = createFakeTransport((path) => {
      if (path === '/cycles/cycle-1/stages/o') return makeStageView({ stage: 'o' })
      throw new Error(`rota inesperada: ${path}`)
    })
    await renderProject(transport, makeCycle({ stage: 'o' }))

    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    await waitFor(() => {
      expect(screen.getByText('Chegou o grande dia!')).toBeTruthy()
    })
  })
})

describe('ProjectView: fechamento de ciclo (Versão N+1)', () => {
  const doneCycle = makeCycle({
    stage: 'done',
    zCompletedAt: '2026-06-30T12:00:00.000Z',
    eCompletedAt: '2026-06-30T12:00:00.000Z',
    rCompletedAt: '2026-06-30T12:00:00.000Z',
    oCompletedAt: '2026-06-30T12:00:00.000Z',
  })

  it('ciclo done: card "Você ZEROU" + dialog com chips → POST cria a Versão 2 no Z', async () => {
    const cycleTwo = makeCycle({ id: 'cycle-2', number: 2, goal: 'Mais fases', stage: 'z' })
    const transport = createFakeTransport((path, init) => {
      if (path === '/projects/proj-1/cycles' && init?.method === 'POST') {
        return {
          project: makeDetail({ cycles: [doneCycle, cycleTwo], currentCycle: cycleTwo }),
        }
      }
      throw new Error(`rota inesperada: ${path}`)
    })
    await renderProject(transport, doneCycle)

    expect(screen.getByText('Você ZEROU a Versão 1!')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Criar a Versão 2/ }))
    expect(screen.getByRole('dialog', { name: 'O que vem na próxima versão?' })).toBeTruthy()

    // Chip fixo da copy preenche o campo (a criança pode editar).
    fireEvent.click(screen.getByRole('button', { name: 'Mais fases' }))
    const field = screen.getByLabelText('O que vamos adicionar?') as HTMLTextAreaElement
    expect(field.value).toBe('Mais fases')

    fireEvent.click(screen.getByRole('button', { name: 'Começar a nova versão' }))

    // O detalhe absorvido volta o mapa para o Z da versão nova.
    await waitFor(() => {
      expect(screen.getByText('Versão 2')).toBeTruthy()
    })
    const post = transport.calls.find((call) => call.method === 'POST')
    expect(post?.path).toBe('/projects/proj-1/cycles')
    expect(post?.body).toEqual({ goal: 'Mais fases' })
    expect(screen.queryByRole('dialog')).toBeNull()
    // Etapa corrente de novo é o Z (convite do Zappy).
    expect(screen.getAllByText('Zerar a Bagunça').length).toBeGreaterThan(0)
    expect(screen.queryByText('Você ZEROU a Versão 1!')).toBeNull()
  })

  it('goal curto demais não envia e mostra o aviso gentil', async () => {
    const transport = createFakeTransport(() => {
      throw new Error('não deveria chamar a rede')
    })
    await renderProject(transport, doneCycle)

    fireEvent.click(screen.getByRole('button', { name: /Criar a Versão 2/ }))
    const field = screen.getByLabelText('O que vamos adicionar?')
    fireEvent.change(field, { target: { value: 'a' } })
    fireEvent.click(screen.getByRole('button', { name: 'Começar a nova versão' }))

    expect(screen.getByRole('alert').textContent).toContain('um pouquinho mais')
    expect(transport.calls).toHaveLength(0)
  })
})

describe('ProjectView: sync oportunista do snapshot do Estúdio', () => {
  async function renderDetail(options: {
    buildEnv: PensaBuildEnv | null
    studioProjectId?: string | null
    withSync?: boolean
  }) {
    const transport = createFakeTransport(() => {
      throw new Error('não deveria chamar a rede')
    })
    const adapter = makeStudioAdapter(
      transport,
      options.withSync === false ? { withSync: false } : {},
    )
    const projectStore = createProjectStore(transport)
    projectStore.setState({
      activeProjectId: 'proj-1',
      detail: makeDetail({
        currentCycle: makeCycle({ stage: 'r' }),
        buildEnv: options.buildEnv,
        studioProjectId:
          options.studioProjectId !== undefined ? options.studioProjectId : 'studio-7',
      }),
    })
    render(
      <PensaAppProvider value={{ adapter, copy: getCopy('kids'), store: projectStore }}>
        <ProjectView />
      </PensaAppProvider>,
    )
    await act(async () => {})
    return { adapter, projectStore }
  }

  it('embedded: chama syncStudioSnapshot UMA vez por abertura (refetch não repete)', async () => {
    const { adapter, projectStore } = await renderDetail({ buildEnv: 'embedded' })

    expect(adapter.syncCalls).toEqual([{ pensaProjectId: 'proj-1', studioProjectId: 'studio-7' }])

    // Refetch/absorb do MESMO projeto (ex.: pós-avanço) não sincroniza de novo.
    await act(async () => {
      projectStore.getState().absorbDetail(
        makeDetail({
          currentCycle: makeCycle({ stage: 'r' }),
          buildEnv: 'embedded',
          studioProjectId: 'studio-7',
        }),
      )
    })
    expect(adapter.syncCalls).toHaveLength(1)
  })

  it('studio: também sincroniza (mesmos args)', async () => {
    const { adapter } = await renderDetail({ buildEnv: 'studio' })
    expect(adapter.syncCalls).toEqual([{ pensaProjectId: 'proj-1', studioProjectId: 'studio-7' }])
  })

  it('external, sem escolha ou sem projeto semeado: NÃO sincroniza', async () => {
    const external = await renderDetail({ buildEnv: 'external' })
    expect(external.adapter.syncCalls).toHaveLength(0)

    const undecided = await renderDetail({ buildEnv: null })
    expect(undecided.adapter.syncCalls).toHaveLength(0)

    const unseeded = await renderDetail({ buildEnv: 'embedded', studioProjectId: null })
    expect(unseeded.adapter.syncCalls).toHaveLength(0)
  })

  it('host sem a capability: nada acontece (degrade silencioso)', async () => {
    const { adapter } = await renderDetail({ buildEnv: 'embedded', withSync: false })
    expect(adapter.syncStudioSnapshot).toBeUndefined()
    expect(adapter.syncCalls).toHaveLength(0)
  })
})
