import { describe, expect, it } from 'bun:test'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { getCopy } from '../../core/copy'
import type { PensaChecklistItemView } from '../../core/types'
import { createProjectStore } from '../../state/projectStore'
import {
  createFakeTransport,
  type FakeStudioAdapter,
  makeChecklistItem,
  makeChecklistItems,
  makeChecklistSeedArtifact,
  makeCycle,
  makeDetail,
  makeGamification,
  makeIdeaArtifact,
  makeStageView,
  makeStudioAdapter,
} from '../../testing/fakeTransport'
import { PensaAppProvider } from '../appContext'
import { StageOView } from './StageOView'

const STAGE_PATH = '/cycles/cycle-1/stages/o'
const GENERATE_PATH = '/cycles/cycle-1/artifacts/generate'
const ADVANCE_PATH = '/cycles/cycle-1/advance'

async function renderStage(
  adapter: FakeStudioAdapter,
  callbacks: { onBack?: () => void; onAdvanced?: () => void } = {},
) {
  const projectStore = createProjectStore(adapter.transport)
  projectStore.setState({
    activeProjectId: 'proj-1',
    detail: makeDetail({ currentCycle: makeCycle({ stage: 'o' }) }),
  })
  render(
    <PensaAppProvider value={{ adapter, copy: getCopy('kids'), store: projectStore }}>
      <StageOView
        onBack={callbacks.onBack ?? (() => {})}
        onAdvanced={callbacks.onAdvanced ?? (() => {})}
      />
    </PensaAppProvider>,
  )
  await act(async () => {})
}

function respondWith(
  items: PensaChecklistItemView[],
  extra: (path: string, init?: { method?: string; body?: unknown }) => unknown = () => {
    throw new Error('rota inesperada')
  },
) {
  return (path: string, init?: { method?: string; body?: unknown }) => {
    if (path === STAGE_PATH) return makeStageView({ stage: 'o' })
    if (path === GENERATE_PATH && init?.method === 'POST') return { items }
    return extra(path, init)
  }
}

describe('StageOView', () => {
  it('sem seed: hero "Preparar o lançamento"; gerar abre o checklist com chips "opcional"', async () => {
    const transport = createFakeTransport(respondWith(makeChecklistItems()))
    const adapter = makeStudioAdapter(transport)
    await renderStage(adapter)

    expect(screen.getByText('Chegou o grande dia!')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Preparar o lançamento/ }))
    await waitFor(() => {
      expect(screen.getByText('Caça aos Bugs')).toBeTruthy()
    })
    const generate = transport.calls.find((call) => call.path === GENERATE_PATH)
    expect(generate?.body).toEqual({ type: 'checklist_seed', projectId: 'proj-1' })
    // Toque de Brilho + Mostrar para alguém = opcionais.
    expect(screen.getAllByText('opcional')).toHaveLength(2)
    // Progresso dos obrigatórios (0 de 3) + Lançar! travado.
    expect(screen.getByText('0 de 3 passos obrigatórios prontos')).toBeTruthy()
    expect((screen.getByRole('button', { name: /Lançar!/ }) as HTMLButtonElement).disabled).toBe(
      true,
    )
    // O hint agora diz QUAIS obrigatórios faltam.
    expect(screen.getByText(/Falta pouco! Ainda:/)).toBeTruthy()

    // Item de publicar tem o atalho "Abrir o Estúdio" (host com onOpenStudio).
    fireEvent.click(screen.getByRole('button', { name: /Abrir o Estúdio/ }))
    expect(adapter.openStudioCalls).toHaveLength(1)
    expect(adapter.openStudioCalls[0]?.pensaProjectId).toBe('proj-1')
  })

  it('reload com seed salva: hero avisa que os checks recomeçam', async () => {
    const transport = createFakeTransport((path) => {
      if (path === STAGE_PATH) {
        return makeStageView({ stage: 'o', artifacts: [makeChecklistSeedArtifact()] })
      }
      throw new Error(`rota inesperada: ${path}`)
    })
    await renderStage(makeStudioAdapter(transport))

    expect(
      screen.getByText('Seu checklist recomeça do zero, mas é rapidinho marcar tudo de novo!'),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: /Preparar o lançamento/ })).toBeTruthy()
  })

  it('toggle otimista: marcar um item PATCHa /checklist/:itemId {done}', async () => {
    const transport = createFakeTransport(
      respondWith(makeChecklistItems(), (path, init) => {
        if (path === '/checklist/check-1' && init?.method === 'PATCH') {
          return { item: makeChecklistItem({ done: true, doneAt: '2026-07-01T10:00:00.000Z' }) }
        }
        throw new Error(`rota inesperada: ${path}`)
      }),
    )
    await renderStage(makeStudioAdapter(transport))
    fireEvent.click(screen.getByRole('button', { name: /Preparar o lançamento/ }))
    await waitFor(() => {
      expect(screen.getByText('Caça aos Bugs')).toBeTruthy()
    })

    fireEvent.click(screen.getAllByRole('checkbox')[0] as HTMLElement)

    await waitFor(() => {
      expect(screen.getByText('1 de 3 passos obrigatórios prontos')).toBeTruthy()
    })
    const patch = transport.calls.find((call) => call.method === 'PATCH')
    expect(patch?.path).toBe('/checklist/check-1')
    expect(patch?.body).toEqual({ done: true })
  })

  it('obrigatórios prontos → "Lançar!" avança o→done e abre a festa; fechar volta ao mapa', async () => {
    const readyItems = makeChecklistItems().map((item) =>
      item.required ? { ...item, done: true, doneAt: '2026-07-01T10:00:00.000Z' } : item,
    )
    const transport = createFakeTransport(
      respondWith(readyItems, (path, init) => {
        if (path === ADVANCE_PATH && init?.method === 'POST') {
          return {
            cycle: makeCycle({ stage: 'done' }),
            gamification: makeGamification({
              xpAwarded: 30,
              badgesUnlocked: [
                { slug: 'pensa-first-launch', unlockedAt: '2026-07-01T10:00:00.000Z' },
              ],
            }),
          }
        }
        if (path === '/cycles/cycle-1/stages/z') {
          return makeStageView({ stage: 'z', artifacts: [makeIdeaArtifact()] })
        }
        throw new Error(`rota inesperada: ${path}`)
      }),
    )
    let advanced = 0
    await renderStage(makeStudioAdapter(transport), {
      onAdvanced: () => {
        advanced += 1
      },
    })
    fireEvent.click(screen.getByRole('button', { name: /Preparar o lançamento/ }))
    await waitFor(() => {
      expect(screen.getByText('3 de 3 passos obrigatórios prontos')).toBeTruthy()
    })

    const launch = screen.getByRole('button', { name: /Lançar!/ }) as HTMLButtonElement
    expect(launch.disabled).toBe(false)
    fireEvent.click(launch)

    // Festa: selo carimbado + XP + conquista genérica + Carta da Ideia.
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Você lançou seu jogo!' })).toBeTruthy()
    })
    expect(screen.getByText('Versão 1 lançada')).toBeTruthy()
    expect(screen.getByText('+30 XP')).toBeTruthy()
    expect(screen.getByText('Nova conquista desbloqueada!')).toBeTruthy()
    await waitFor(() => {
      expect(screen.getByText(/piquenique/)).toBeTruthy()
    })
    const advance = transport.calls.find((call) => call.path === ADVANCE_PATH)
    expect(advance?.body).toEqual({ from: 'o' })

    fireEvent.click(screen.getByRole('button', { name: 'Ver meu projeto' }))
    expect(advanced).toBe(1)
  })
})
